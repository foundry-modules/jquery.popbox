
$.fn.popbox = function(options) {

	// Creating or updating popbox options
	if ($.isPlainObject(options)) {

		this.each(function(){

			var button = $(this),
				popbox = Popbox.get(button);

			// Update popbox options
			if (!popbox) {
				popbox.update(options);

			// Or create a new popbox
			} else {
				popbox = new Popbox(button, options);
			}
		});

		return this;
	}

	// Calling a method in popbox
	if ($.isString(options)) {

		var button = $(this[0]),

			// Create new popbox instance if 
			// it hasn't been created yet		
			popbox = Popbox.get(button) || new Popbox(button),

			method = popbox[options],

			ret;

		if ($.isFunction(method)) {

			ret = method.apply(popbox, $.makeArray(arguments).slice(1));
		}

		return ret || this;
	}

	return this;
}

var Popbox = function(button, options) {

	var popbox = this;

	// Store popbox instance within button
	button.data("popbox", popbox);

	// Normalize arguments
	if ($.isString(options)) {
		options = {content: options}
	}

	// Gather element options
	var elementOptions = {},
		content = button.attr("data-popbox"),
		toggle  = button.attr("data-popbox-toggle");

	if (content) elementOptions.content = content;
	if (toggle)  elementOptions.toggle  = toggle;

	// Build final options
	popbox.update(
		$.extend(true,
			{},
			Popbox.defaultOptions,
			{
				uid: $.uid(),
				button: button,
				position: {
					of: button
				}
			},
			elementOptions,
			options
		)
	);
};

// Default options
Popbox.defaultOptions = {
	loader: $("<div data-popbox-tooltip-loader>Loading...</div>"),
	tooltip: $(),
	content: "",
	enabled: false,
	wait: false,
	locked: false,
	hideTimer: null,
	hideDelay: 50,
	toggle: "hover",
	position: {
		my: "center bottom",
		at: "center top",
		collision: "none none"
	}
};

Popbox.get = function(el) {

	var popbox = $(el).data("popbox");

	if (popbox instanceof Popbox) return popbox;
}

$.extend(Popbox.prototype, {

	update: function(options) {

		var popbox = this;

		// Update popbox options
		$.extend(true, popbox, options);

		// If popbox content is a module
		if ($.isModule(popbox.content)) {
		
			// Don't let anything happen until module is resolved.
			popbox.wait = true;

			$.module(popbox.content)
				.done(function(options){

					// Popbox options
					if ($.isPlainObject(options)) {
						popbox.update(options);
					}

					// Callback that returns customized popbox options
					if ($.isFunction(options)) {

						popbox.update({
							content: options
						});
					}
				})
				.fail(function(){

					popbox.update({
						content: "Unable to load tooltip content."
					});
				})
				.always(function(){
					popbox.wait = false;
				});

			return;
		}

		// If popbox content is a string,
		// we'll just rewrap it in deferred.
		if ($.isString(popbox.content)) {
			popbox.content = $.Deferred().resolve(popbox.content);
		}

		// If there's a custom tooltip position,
		// ensure it is anchoring to the popbox.button.
		var tooltipPosition = popbox.position.tooltip;
		if (tooltipPosition) {
			tooltipPosition.of = popbox.button;
		}

		// If there's a custom loader position,
		// ensure it is anchoring to the popbox.button.
		var loaderPosition = popbox.position.loader;
		if (loaderPosition) {
			loaderPosition.of = popbox.button;
		}

		// If popbox is enabled, show tooltip with new options.
		if (popbox.enabled) {
			popbox.show();
		}
	},

	toggle: function() {

		var popbox = this;

		if (popbox.enabled) {
			popbox.hide();
		} else {
			popbox.show();
		}
	},

	show: function() {

		var popbox = this;

		// Enable popbox
		popbox.enabled = true;

		// If we're waiting for module to resolve, stop.
		if (popbox.wait) return;

		// Stop any task that hides popover
		clearTimeout(popbox.hideTimer);

		// Hide when popbox is blurred
		if (popbox.toggle=="click") {

			var doc = $(document),
				hideOnClick = "click.popbox." + popbox.uid;

			doc
				.off(hideOnClick)
				.on(hideOnClick, function(event){

					// Collect list of bubbled elements
					var targets = $(event.target).parents().andSelf();

					// Don't hide popbox is popbox button or tooltip is one of those elements.
					if (targets.filter(popbox.button).length  > 0 ||
						targets.filter(popbox.tooltip).length > 0) return;

					// Unbind hiding
					doc.off(hideOnClick);

					popbox.hide();
				});
		}

		// If tooltip exists, just show tootip
		if (popbox.tooltip.length > 0) {

			popbox.tooltip
				.appendTo("body")
				.position(popbox.position.tooltip || popbox.position);

			// Trigger popboxActivate event
			popbox.button
				.trigger("popboxActivate", [popbox]);

			return;
		}

		// If popbox content is a function,
		if ($.isFunction(popbox.content)) {

			// Execute the function and to get popbox options
			var options = popbox.content(popbox);

			// Update popbox with the new options
			popbox.update(options);

			// If updating popbox causes it to fall into wait mode, stop.
			if (popbox.wait) return;
		}

		// If at this point, popbox is not a deferred object,
		// then we don't have any tooltip to show.
		if (!$.isDeferred(popbox.content)) return;

		// If the popbox content is still loading,
		// show loading indicator.
		if (popbox.content.state()=="pending") {

			popbox.loader
				.appendTo("body")
				.position(popbox.position.loader || popbox.position);
		}

		popbox.content
			.always(function(){

				popbox.wait = false;
			})
			.done(function(html){

				// If popbox already has a tooltip, stop.
				if (popbox.tooltip.length > 0) return;

				// If popbox is disabled, don't show it.
				if (!popbox.enabled) return;

				// Remove loading indicator
				popbox.loader.detach();
				
				var tooltip = $.buildHTML(html);

				if (tooltip.filter("[data-popbox-tooltip]").length < 1) {

					tooltip = 
						// Create wrapper and
						$("<div data-popbox-tooltip></div>")
							// append to body first because
							.appendTo("body")
							// we want any possible scripts within the tooltip
							// content to execute when it is visible in DOM.
							.append(tooltip);

				} else {

					tooltip =
						// This tooltip might be an array of elements, e.g.
						// tooltip div, scripts and text nodes.
						tooltip
							// we append to body first to
							// let the scripts execute
							.appendTo("body")
							// then filter out the popbox tooltip
							// to assign it back as our variable
							.filter("[data-popbox-tooltip]");
				}
				
				// Store tooltip property in popbox
				popbox.tooltip = 
					tooltip
						// and let tooltip has a reference back to popbox
						.data("popbox", popbox)
						// reposition tooltip
						.position(popbox.position.tooltip || popbox.position);

				// Trigger popboxActivate event
				popbox.button
					.trigger("popboxActivate", [popbox]);
			})
			.fail(function(){

				popbox.update({
					content: "Unable to load tooltip content."
				});
			});
	},

	hide: function() {

		var popbox = this;

		// Disable popbox
		popbox.enabled = false;

		// Stop any previous hide timer
		clearTimeout(popbox.hideTimer);

		// Detach popbox loader
		popbox.loader.detach();

		popbox.hideTimer = setTimeout(function(){

			if (popbox.locked) return;

			// Detach tooltip
			popbox.tooltip
				.detach();

			// Trigger popboxDeactivate event
			popbox.button
				.trigger("popboxDeactivate", [popbox]);

		}, popbox.hideDelay);
	}
});

// Data API
$(document)
	.on('click.popbox', '[data-popbox]', function(){

		$(this).popbox("toggle");
	})
	.on('mouseover.popbox', '[data-popbox]', function(){

		$(this).popbox("show");
	})
	.on('mouseout.popbox', '[data-popbox]', function(){

		$(this).popbox("hide");
	})
	.on('mouseover.popbox.tooltip', '[data-popbox-tooltip]', function(){

		var popbox = Popbox.get(this);

		if (!popbox) return;

		if (popbox.toggle!=="hover") return;

		// Lock popbox
		popbox.locked = true;

		clearTimeout(popbox.hideTimer);
	})
	.on('mouseout.popbox.tooltip', '[data-popbox-tooltip]', function(){

		var popbox = Popbox.get(this);

		if (!popbox) return;

		if (popbox.toggle!=="hover") return;

		// Unlock popbox
		popbox.locked = false;

		// Hide popbox
		popbox.hide();
 	});
