$.popbox = function(){};

$.popbox.defaultOptions = {
	loader: $("<div data-popbox-tooltip-loader>Loading...</div>"),
	tooltip: $(),
	content: "",
	enabled: false,
	wait: false,
	locked: false,
	hide: null,
	position: {
		my: "center bottom",
		at: "center top",
		collision: "none none"
	}
};

$.popbox.updateOptions = function(options) {

	$.extend(true, this, options);

	if (this.tooltipPosition) {
		this.tooltipPosition.of = this.anchor;
	}

	if (this.loaderPosition) {
		this.loaderPosition.of = this.anchor;
	}
};

$.popbox.show = function() {

	var anchor = $(this),
		popbox = anchor.data("popbox");

		// If popbox is not initialized, create one.
		if (!$.isPlainObject(popbox)) {

			var content = popbox;

			popbox = $.extend(true, {}, $.popbox.defaultOptions,
				{
					anchor: anchor,
					position: {
						of: anchor
					},
					content: content
				}
			);				

			anchor.data("popbox", popbox);
		};

	// If we're waiting for module to resolve, stop.
	if (popbox.wait) return;

	if ($.isModule(popbox.content)) {
	
		popbox.enabled = true;
		popbox.wait = true;

		$.module(popbox.content)
			.done(function(options){

				// Popbox options
				if ($.isPlainObject(options)) {
					$.popbox.updateOptions.call(popbox, options);
				}

				// Callback that returns customized popbox options
				if ($.isFunction(options)) {
					popbox.content = options;
				}

				popbox.wait = false;

				// If popbox is still enabled, show tooltip.
				if (popbox.enabled) {
					$.popbox.show.call(anchor);
				}
			});

		return;
	}

	// Enable popbox
	popbox.enabled = true;

	// Stop any task that hides popover
	clearTimeout(popbox.hide);

	// If tooltip exists, just show tootip
	if (popbox.tooltip.length > 0) {

		popbox.tooltip
			.appendTo("body")
			.position(popbox.tooltipPosition || popbox.position);

		anchor.trigger("popboxActivate", [popbox, anchor]);

		return;
	}

	// Unwrap tooltip content
	if ($.isFunction(popbox.content)) {

		$.popbox.updateOptions.call(popbox, popbox.content.call(popbox, anchor));
	}

	// String content we'll just rewrap in deferred.
	if ($.isString(popbox.content)) {

		popbox.content = $.Deferred().resolve(content);
	}

	if (popbox.content.state()=="pending") {

		popbox.loader
			.appendTo("body")
			.position(popbox.loaderPosition || popbox.position);
	}

	popbox.content
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

				tooltip = tooltip.appendTo("body").filter("[data-popbox-tooltip]");
			}
			
			// Position & assign it back
			popbox.tooltip = 
				tooltip
					// Store a reference to the popbox
					.data("popbox", popbox)
					// Position tooltip
					.position(popbox.tooltipPosition || popbox.position);

			anchor.trigger("popboxActivate", [popbox, anchor]);
		})
		.always(function(){

			popbox.wait = false;
		});
}

$.popbox.hide = function() {

	var anchor = $(this),
		popbox = anchor.data("popbox");		

	// Popbox not initialized yet, stop.
	if (!$.isPlainObject(popbox)) return;

	// Disable popbox
	popbox.enabled = false;

	// Stop any previous hide task
	clearTimeout(popbox.hide);

	// Detach popbox loader
	popbox.loader.detach();

	popbox.hide = setTimeout(function(){

		if (popbox.locked) return;

		popbox.tooltip.detach();

		// Trigger popboxDeactivate event
		anchor.trigger("popboxDeactivate", [popbox, anchor]);

	}, 100);
}

$.fn.popbox = function(options) {

	$(this)
		.attr("data-popbox", "")
		.data("popbox", options);
}

$(document)
	.on('click.popbox', '[data-popbox-toggle=click]', function(){

		var anchor = $(this),

			// Generate uid if doesn't exist
			uid = anchor.data("popboxUid");
			
			if (!uid) {
				uid = $.uid();
				anchor.data("popboxUid", uid);
			}

		// Show popbox
		$.popbox.show.call(anchor);

		$(document).on('click.popbox.' + uid, function(event){

			// Don't do anything if we're clicking ourselves
			if ($(event.target).parents().andSelf().filter(anchor).length > 0) return;

			// Unbind hide event
			$(document).off('click.popbox.' + uid);

			// Hide popbox
			$.popbox.hide.call(this);
		});
	})
	.on('mouseover.popbox', '[data-popbox]', function(){

		var toggle = $(this).data("popboxToggle") || "hover";

		if (toggle=="hover") {

			$.popbox.show.call(this);
		}
	})
	.on('mouseout.popbox', '[data-popbox]', function(){

		var toggle = $(this).data("popboxToggle") || "hover";

		if (toggle=="hover") {

			$.popbox.hide.call(this);
		}
	})
	.on('mouseover.popbox.tooltip', '[data-popbox-tooltip]', function(){

		var popbox = $(this).data("popbox");

		popbox.locked = true;

		clearTimeout(popbox.hide);
	})
	.on('mouseout.popbox.tooltip', '[data-popbox-tooltip]', function(){

		var popbox = $(this).data("popbox");

		popbox.locked = false;

		// Trigger hiding of popbox
		$.popbox.hide.call(popbox.anchor);
 	});
