$.popbox = function(){};

$.popbox.defaultOptions = {
	loader: $("<div data-popbox-tooltip-loader>Loading...</div>"),
	content: "",
	wait: false,
	position: {
		my: "center bottom",
		at: "center top",
		collision: "none none"
	}
};

$.fn.popbox = function(options) {

	$(this)
		.attr("data-popbox", "")
		.data("popbox", options);
}

$(document)
	.on('mouseover.popbox', '[data-popbox]', function(event) {

		var anchor = $(this),

			popbox = anchor.data("popbox"),

			defaultOptions = function() {

				return $.extend(true, {}, $.popbox.defaultOptions, {
					anchor: anchor,
					position: {
						of: anchor
					}
				});
			};

		// If we're waiting for module to resolve, stop.
		if ($.isPlainObject(popbox)) {
			if (popbox.wait) return;
		}

		if ($.isModule(popbox)) {
		
			var moduleUrl = popbox,

				popbox = $.extend({}, defaultOptions(), {
					enabled: true,
					wait: true
				});

				anchor.data("popbox", popbox);

			$.module(moduleUrl)
				.done(function(options){

					// Popbox options
					if ($.isPlainObject(options)) {

						// Merge popbox options
						$.extend(popbox, options);
					}

					// Popbox initiator
					if ($.isFunction(options)) {

						popbox.content = options;
					}

					popbox.wait = false;

					// If popbox is still enabled, show tooltip.
					if (popbox.enabled) {

						anchor.trigger("mouseover.popbox");
					}
				});
		}

		if ($.isString(popbox)) {

			popbox = $.extend({}, defaultOptions(), {content: popbox});

			anchor.data("popbox", popbox);
		}

		// Flag this popbox as enabled
		popbox.enabled = true;

		// Stop any task that hides popover
		clearTimeout(popbox.hideTask);

		// If tooltip exists, just show tootip
		if (popbox.tooltip) {

			popbox.tooltip
				.appendTo("body")
				.position(popbox.position);

			return;
		}

		// Determine tooltip content
		var content = popbox.content;

		// Unwrap tooltip content
		if ($.isFunction(content) {
			content = $.extend(popbox, popbox.content.call(popbox, anchor));
		}

		// String content we'll just rewrap in deferred
		// so we don't have to write the same code twice.
		if ($.isString(content)) {
			content = $.Deferred().resolve(content);
		}

		if (content.state()=="pending") {

			popbox.loader
				.appendTo("body")
				.position(popbox.loaderPosition || popbox.position);
		}

		content
			.done(function(html){

				// If popbox is disabled, don't show it.
				if (!popbox.enabled) return;

				// Remove loading indicator
				if (popbox.loader) {
					popbox.loader.detach();	
				}
				
				var tooltip = $.buildHTML(html);

				if (tooltip.filter("data-popbox-tooltip").length < 1) {

					tooltip = 
						// Create wrapper
						$('<div data-popbox-tooltip></div>')
							// append to body first because
							.appendTo("body")
							// we want any possible scripts within the
							// tooltip content to execute when it is
							// visible in DOM.
							.append(tooltip);

				} else {

					// Just append the tooltip
					tooltip.appendTo("body");
				}

				
				tooltip
					// Store a reference to the anchor
					.data("anchor", anchor)
					// Position tooltip
					.position(popbox.tooltipPosition || popbox.position);

				// Assign it back
				popbox.tooltip = tooltip;
			});
	})
	.on('mouseout.popbox', '[data-popbox]', function(event) {

		var anchor = $(this),
			popbox = $(this).data("popbox");

		if (!$.isPlainObject(popbox)) return;

		if (popbox.wait) return;

		// Trigger popboxDeactivate event
		$(anchor).trigger("popboxDeactivate", [popbox, anchor]);

		// Detach popbox loader
		popbox.loader.detach();

		// Flag popbox as disabled
		popbox.enabled = false;				

		// If there's no tooltip yet, stop.
		if (!popbox.tooltip) return;

		popbox.hideTask = setTimeout(function(){

			// If we want to show the tooltip again, stop.
			if (popbox.enabled) return;

			// If tooltip is locked, stop.
			if (!popbox.locked)  {

				// Else hide tooltip
				popbox.tooltip.detach();
			}

		}, 100);

	})
	.on('mouseover.popbox.tooltip', '[data-popbox-tooltip]', function(){

		var anchor = $(this).data("anchor"),
			popbox = anchor.data("popbox");

		// Lock popbox
		popbox.locked = true;
	})
	.on('mouseout.popbox.tooltip', '[data-popbox-tooltip]', function(){

		var anchor = $(this).data("anchor"),
			popbox = anchor.data("popbox");

		// Unlock popbox
		popbox.locked = false;

		// Trigger hiding of popbox
		anchor.trigger("mouseout.popbox");
	});