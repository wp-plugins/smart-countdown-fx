(function($) {
	
	const MILIS_IN_DAY = 86400000;
	const MILIS_IN_HOUR = 3600000;
	const MILIS_IN_MINUTE = 60000;
	const MILIS_IN_SECOND = 1000;
	
	const SECONDS_IN_DAY = 86400;
	const SECONDS_IN_HOUR = 3600;
	const SECONDS_IN_MINUTE = 60;
	const MINUTES_IN_DAY = SECONDS_IN_DAY / 60;
	const MINUTES_IN_HOUR = 60;
	
	const HOURS_IN_DAY = 24;
	
	const MONTHS_IN_YEAR = 12;
	
	// global container for smart countdown objects
	scds_container = {
		timer : false,
		instances : {},
		add : function(options) {
			// scd_counter is a generic object. We have to use a fresh copy
			// each time we add a counter, so that scd_counter instance is
			// always intact.
			var working_copy = $.extend(true, {}, scd_counter);
			
			// call init method. Depending on the counter type - widget or
			// embedded with a shortcode, the recently created counter will
			// be added to scds_container after it's setup is complete
			working_copy.init(options);
			
			// create the tick timer if not created yet
			if(this.timer === false) {
				this.timer = window.setInterval(function() {
					scds_container.fireAllCounters();
				}, MILIS_IN_SECOND);
				$(window).resize(function() {
					scds_container.responsiveAdjust();
				});
			}
		},
		remove : function(id) {
			delete(scds_container.instances[id]);
		},
		updateInstance : function(id, instance) {
			scds_container.instances[id] = instance;
			scds_container.responsiveAdjust();
		},
		fireAllCounters : function() {
			$.each(this.instances, function() {
				this.tick();
			});
		},
		responsiveAdjust : function() {
			$.each(this.instances, function(id, counter) {
				var width = window.innerWidth
					|| document.documentElement.clientWidth
					|| document.body.clientWidth;
				counter.responsiveAdjust(width);
			});
		}
	}
	
	var scd_counter = {
		options : {
			now : null,
			units : {
				years : 1,
				months : 1,
				weeks : 1,
				days : 1,
				hours : 1,
				minutes : 1,
				seconds : 1
			},
			hide_lower_units : [],
			limits : {
				// default overflow limits for up mode. If some of related time units
				// are not displayed these limits will be updated in getCounterValues()
				seconds : SECONDS_IN_HOUR,
				minutes : MINUTES_IN_HOUR,
				hours : HOURS_IN_DAY
			},
			paddings : {
				years : 1,
				months : 1,
				weeks : 1,
				days : 2,
				hours : 2,
				minutes : 2,
				seconds : 2
			},
			animations : {},
			labels_vert_align : 'middle',
			initDisplay : true,
			allow_lowest_zero : 0,
			replace_lowest_zero : 1,
			hide_highest_zeros : 0,
			hide_countup_counter : 0,
			shortcode : 0,
			redirect_url : '',
			click_url : '',
			import_config : '',
			base_font_size : 12
		},
		current_values : {},
		elements : {},
		init : function(options) {
			$.extend(true, this.options, options);
			
			// backup original event titles - we'll need them later
			// for appending imported event titles
			this.options.original_title_before_down = this.options.title_before_down;
			this.options.original_title_before_up = this.options.title_before_up;
			
			// backup countup limit from shortcode or widget settings. We will need this
			// value when requesting next event. this.options.countup_limit will change
			// during counter life to indicate the next query interval
			this.options.original_countup_limit = this.options.countup_limit;
			
			/* reserved - "titles after" currently not needed, imported event titles are
			 * appended to "titles before" only
			this.options.original_title_after_down = this.options.title_after_down;
			this.options.original_title_after_up = this.options.title_after_up;
			*/
			
			if(this.options.customize_preview == 1) {
				// Customize preview - get deadline from temporal instance
				// or TODO: event import plugin ?
				
				/* Actually we have a full-featured temporal instance here (this.options), 
				 * so we could implement a real preview using queryNextEvent() with some
				 * additional params (?) - we have to block widget SQL query by ID, because
				 * it will provide main instance settings, not the temporal one... $$$
				 */
				
				this.options.deadline = new Date(new Date(this.options.deadline).getTime() /* + 0 put a value here if we need initial correction */).toString();
				
				this.updateCounter(this.getCounterValues(this.options.now));
				
				scds_container.updateInstance(this.getId(), this);
				
				// init awake detect timestamp
				this.awake_detect = new Date().getTime();
			} else {
				// normal view - get next event from server
				this.queryNextEvent(true);
			}
		},
		getId : function() {
			return this.options.id || 0;
		},
		tick : function() {
			var delta = this.options.mode == 'up' ? 1 : -1;
			
			// Check if browser was suspended or js was paused
			var current = new Date().getTime();
			var elapsed = current - this.awake_detect;
			// Immediately update awake_detect value
			this.awake_detect = current;
			
			if(elapsed > 1050) {
				// suspend-resume detected. Adjust timestamps by the time
				// actually elapsed while suspended
				this.options.now += elapsed;
				this.diff = this.diff + elapsed * delta;
				
				if(this.options.mode == 'down' && this.diff <= 0) {
					// deadline reached while suspended, change mode and send current
					// adjusted coutup diff
					this.deadlineReached(this.diff * -1);
				} else {
					// recalculate counter values
					// when browser is resumed, values queue can contain
					// values which are not sequential. We pass "resumed"
					// parameter here to indicate that counter units
					// visibility has to be checked during at least 4 tick
					// cycles (so that entire queue is checked)
					this.softInitCounter(true);
				}
				// simplify animations on resume
				this.initDisplay = true;
				return;
			}
			
			// normal run, modify timestamps by 1000 exactly, so that
			// small timer fluctuations will not accumulate timing errors
			this.diff += delta * MILIS_IN_SECOND;
			this.options.now += MILIS_IN_SECOND;

			// copy current values to new_values
			var new_values = $.extend({},this.current_values);
			
			// always advance seconds, even if they are not displayed
			new_values.seconds += delta;
			
			// update time units on seconds limit according to counter display
			// settings
			
			// 'up' mode
			if(new_values.seconds >= this.options.limits.seconds) {
				// if seconds value reaches 24h threshhold we always recalculate
				// counter values
				if(new_values.seconds >= SECONDS_IN_DAY) {
					this.softInitCounter();
					return;
				}
				// normal overflow, increment next higher displayed unit
				new_values.seconds = 0;
				if(this.options.units.minutes == 1) {
					// minutes displayed
					new_values.minutes++;
					if(new_values.minutes >= this.options.limits.minutes) {
						new_values.minutes = 0;
						if(this.options.units.hours == 1) {
							// minutes and hours displayed
							new_values.hours++;
							if(new_values.hours >= this.options.limits.hours) {
								this.softInitCounter();
								return;
							}
						} else {
							// hours are not displayed but minutes have reached the
							// MINUTES_IN_DAY limit, recalculate counter values
							this.softInitCounter();
							return;
						}
					}
				} else if(this.options.units.hours == 1) {
					// only hours are displayed
					new_values.hours++;
					if(new_values.hours >= this.options.limits.hours) {
						this.softInitCounter();
						return;
					}
				}
				// if neither minutes nor hours are displayed, we shouldn't
				// ever get to this point. Counter values recalculation method
				// should have been already called		
			}
			
			// 'down' mode
			if(new_values.seconds < 0) {
				// check for deadline
				if(this.diff <= 0) {
					return this.deadlineReached(0);
				}
				new_values.seconds = this.options.limits.seconds - 1;
				if(this.options.units.minutes == 1) {
					// minutes displayed
					new_values.minutes--;
					if(new_values.minutes < 0) {
						new_values.minutes = this.options.limits.minutes - 1;
						if(this.options.units.hours == 1) {
							// minutes and hours displayed
							new_values.hours--;
							if(new_values.hours < 0) {
								this.softInitCounter();
								return;
							}
						} else {
							// hours are not displayed but minutes have crossed zero,
							// recalculate counter values
							this.softInitCounter();
							return;
						}
					}
				} else if(this.options.units.hours == 1) {
					// only hours are displayed
					new_values.hours--;
					if(new_values.hours < 0) {
						// recalculate counter values
						this.softInitCounter();
						return;
					}
				} else {
					// neither minutes nor hours are displayed.
					// recalculate counter values
					this.softInitCounter();
					return;
				}
			}
			
			this.display(new_values);
		},
		/**
		 * A set of calls for soft counter init:
		 * - Recalulate the counter values
		 * - If "resumed" param is set, set validate queue mode
		 */
		softInitCounter : function(resumed) {
			if(resumed) {
				// additional actions on resume. Reserved ***
			}
			this.updateCounter(this.getCounterValues(this.options.now));
		},
		deadlineReached : function(new_diff) {
			// test only!!!
			// Force animations re-init in new mode. Document it better
			// or move to modeChanged() or hardInit()...
			$('#' + this.options.id + ' .scd-digit').remove();

			this.options.mode = 'up';
			this.diff = new_diff;
			var new_values = this.getCounterValues(this.options.now);
			this.updateCounter(new_values);

			// update units visibilty, new_diff may be far from zero if the
			// deadline was reached while suspended, so we must counter
			// visibility here
			this.setCounterUnitsVisibility(new_values);
			
			// redirect if set so in options
			if(this.options.redirect_url != '') {
				window.location = this.options.redirect_url;
			}
		},
		/*
		 * This method performs the main work of calculating counter values
		 * It uses current instance display options along with event deadline
		 * (target date and time) to set correct values relative to "now"
		 * argument. On widget initialization "now" is read from options
		 * (system time) but later, e.g. on suspend/resume event this value
		 * will be corrected by suspend time, so that a valid "now" will not
		 * be requested from server - can be useful in case of short and repeated
		 * suspend periods
		 */
		getCounterValues : function(now_ts) {
			// init Date objects from this.options.deadline and now
			var t, dateFrom, dateTo;
			
			dateFrom = new Date(now_ts);
			
			// we expect ISO format here
			var dateTo = new Date(this.options.deadline);
			if(isNaN(dateTo.getTime())) {
				// panic fallback
				dateTo = new Date();
			}
			
			// swap dateTo and dateFrom for 'up' mode and
			// set surrent counter mode ('down'/'up')
			this.diff = dateTo - dateFrom;
			
			if(this.diff <= 0) {
				this.options.mode = 'up';
				var tmp = dateFrom;
				dateFrom = dateTo;
				dateTo = tmp;
				this.diff = this.diff * -1;
			} else {
				this.options.mode = 'down';
			}
			
			// get dates components as properties for faster access
			var target = dateToObject(dateTo);
			var now = dateToObject(dateFrom);
			
			// calculate this.difference in units (years, months, days, hours,
			// minutes and seconds)
			
			var yearsDiff = target.year - now.year;
			var monthsDiff = target.month - now.month;
			var daysDiff = target.day - now.day;
			var hoursDiff = target.hours - now.hours;
			var minutesDiff = target.minutes - now.minutes;
			var secondsDiff = target.seconds - now.seconds;
			
			if(secondsDiff < 0) {
				minutesDiff--;
				secondsDiff += SECONDS_IN_MINUTE;
			}
			if(minutesDiff < 0) {
				hoursDiff--;
				minutesDiff += MINUTES_IN_HOUR;
			}
			if(hoursDiff < 0) {
				daysDiff--;
				hoursDiff += HOURS_IN_DAY;
			}
			if(daysDiff < 0) {
				monthsDiff--;
				daysDiff += daysInPrevMonth(target.year, target.month);
			}
			if(monthsDiff < 0) {
				yearsDiff--;
				monthsDiff += MONTHS_IN_YEAR;
			}
			// Year diff must be always >= 0: if initial now is greated than initial target we swap them!
			
			// Set counter values according to display settigns
			
			// days-hours-seconds part of the interval
			var timeSpan = (hoursDiff * SECONDS_IN_HOUR + minutesDiff * SECONDS_IN_MINUTE + secondsDiff) * MILIS_IN_SECOND;
			
			// get months part end date by subtracting days and time parts from target
			var monthsEnd = new Date(dateTo.valueOf() - daysDiff * MILIS_IN_DAY - timeSpan);
			
			// get months part of the diff interval
			var startMonth = monthsEnd.getMonth() - monthsDiff;
			var startYear = target.year;
			if(startMonth < 0) {
				startYear--;
			}
			var monthsStart = new Date(startYear, startMonth, monthsEnd.getDate(), monthsEnd.getHours(), monthsEnd.getMinutes(), monthsEnd.getSeconds());
			var monthsSpan = monthsEnd.valueOf() - monthsStart.valueOf();
			
			// years part of the interval
			var yearsSpan = this.diff - monthsSpan - daysDiff * MILIS_IN_DAY - timeSpan;
			
			// construct resulting values
			var result = {
					/*
					years : null,
					months : null,
					days : null,
					hours : null,
					minutes : null,
					seconds : null
					*/
			};
			var restDiff = this.diff;
			
			// tricky cases
			
			// if years or months are displayed we have to subtract yearsSpan
			// from restDiff
			if(this.options.units.years == 1 || this.options.units.months == 1) {
				restDiff = restDiff - yearsSpan;
			}
			if(this.options.units.years == 1) {
				result.years = yearsDiff;
			} else if(this.options.units.months == 1) {
				// no years but months present: adjust monthsDiff
				monthsDiff = monthsDiff + yearsDiff * MONTHS_IN_YEAR;
			}
			if(this.options.units.months == 1) {
				// show months value, monthsDiff could have already been adjusted if
				// years are hidden
				restDiff = restDiff - monthsSpan;
				result.months = monthsDiff;
			} else {
				// no month display. We can rely on restDiff to calculate remainig
				// days value (restDiff could be already adjusted due to year and/or
				// month display settings
				daysDiff = Math.floor(restDiff / MILIS_IN_DAY);
			}
			// easy cases: starting from weeks unit and lower we can use simple
			// division to calculate values. No days-in-month and leap years stuff.
			// We chain restDiff subtraction on each unit that is displayed, so that
			// next lower unit showes correct value
			if(this.options.units.weeks == 1) {
				var weeksDif = Math.floor(daysDiff / 7); // entire weeks
				daysDiff = daysDiff % 7; // days left
				restDiff = restDiff - weeksDif * 7 * MILIS_IN_DAY;
				result.weeks = weeksDif;
			}
			if(this.options.units.days == 1) {
				result.days = Math.floor(restDiff / MILIS_IN_DAY);
				restDiff = restDiff - daysDiff * MILIS_IN_DAY;
			}
			if(this.options.units.hours == 1) {
				result.hours = Math.floor(restDiff / MILIS_IN_HOUR);
				restDiff = restDiff - result.hours * MILIS_IN_HOUR;
			}
			if(this.options.units.minutes == 1) {
				result.minutes = Math.floor(restDiff / MILIS_IN_MINUTE);
				restDiff = restDiff - result.minutes * MILIS_IN_MINUTE;
			}
			// always include seconds in result. Even if seconds are not displayed on
			// screen according to widget configuration, they will be rendered as hidden.
			// Also seconds must be there for the "easy inc/dec" method to work -
			// performance optimization to avoid heavy calculations in tick() method
			result.seconds = Math.floor(restDiff / MILIS_IN_SECOND);
			
			// set overflow limits
			if(this.options.units.minutes == 1) {
				this.options.limits.seconds = SECONDS_IN_MINUTE;
			} else {
				if(this.options.units.hours == 1) {
					this.options.limits.seconds = SECONDS_IN_HOUR;
				} else {
					this.options.limits.seconds = SECONDS_IN_DAY;
				}
			}
			if(this.options.units.hours == 1) {
				this.options.limits.minutes = MINUTES_IN_HOUR;
			} else {
				this.options.limits.minutes = MINUTES_IN_DAY;
			}
			
			return result;
			
			// Helper functions
			function dateToObject(date) {
				return {
					year : date.getUTCFullYear(),
					month : date.getUTCMonth() + 1,
					day : date.getUTCDate(),
					hours : date.getUTCHours(),
					minutes : date.getUTCMinutes(),
					seconds : date.getUTCSeconds()
				}
			}
			function daysInPrevMonth(year, month) {
				month = month - 2; // -1 for JS Date month notaion (0-11) - 1 for previous month
				if(month < 0) {
					year--;
				}
				return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
			}
		},
		updateCounter : function(new_values) {
			this.display(new_values);
			this.displayTexts(); // *** this call is required only on mode down/up change
			// e.g. texts are dirty
		},
		display : function(new_values) {
			
			var prev, next;
			if(typeof this.current_values.seconds === 'undefined') {
				// first hard init case. Make this logic better!!! ***
				this.initDisplay = true;
				this.current_values = new_values;
				this.tick();
				return;
			} else {
				prev = this.current_values;
			}
			
			next = new_values;
			
			// Update counter output
			var i, self = this, updateUnitsWidth = false;
			$.each(this.options.units, function(asset, display) {
				if(display == 0 || (!self.initDisplay && next[asset] == prev[asset])) {
					return; // no display or unit has not changed - continue loop
				}
				// only update on init or if the value actually changed
				if(self.updateCounterUnit(asset, prev[asset], next[asset], self.initDisplay) === true) {
					// if number of digits displayed has change for a counter unit,
					// updateCounterUnit() will return true
					updateUnitsWidth = true;
				}
			});
			
			// Update digits width if required
			if(updateUnitsWidth) {
				this.setRowVerticalAlign();
			}
			
			if(this.initDisplay ||
					(this.options.mode == 'down' && next.seconds == this.options.limits.seconds - 1) || 
					(this.options.mode == 'up' && next.seconds == 0)) {
				this.setCounterUnitsVisibility(next);
			}
			
			this.initDisplay = false;
			
			this.current_values = new_values;
			
			// check for counter mode limits every tick
			this.applyCounterLimits();
		},
		displayTexts : function() {
			if(this.options.mode == 'up') {
				$('#' + this.getId() + '-title-before').html(this.options.title_before_up);
				$('#' + this.getId() + '-title-after').html(this.options.title_after_up);
			} else {
				$('#' + this.getId() + '-title-before').html(this.options.title_before_down);
				$('#' + this.getId() + '-title-after').html(this.options.title_after_down);
			}
		},
		/**
		 * Update counter unit - digits and label
		 */
		updateCounterUnit : function(asset, old_value, new_value, initDisplay) {
			old_value = this.padLeft(old_value, this.options.paddings[asset]);
			new_value = this.padLeft(new_value, this.options.paddings[asset]);
			
			// test only labels!
			$('#' + this.options.id + '-' + asset + '-label').text(this.getLabel(asset, new_value));
			
			var wrapper = $('#' + this.options.id + '-' + asset + '-digits');
			var count = wrapper.children('.scd-digit').length;
			
			var updateDigitsWidth = false, new_digits;
			
			if(new_value.length != count) {
				new_digits = this.updateDigitsCount(asset, count, old_value, new_value, wrapper);
				old_value = new_digits.old_value;
				new_value = new_digits.new_value;
				updateDigitsWidth = true;
			}
			
			// we have to split the values by digits to check which one actually must
			// be updated
			var values = {
					'prev' : old_value.split(''),
					'next' : new_value.split(''),
			};
			
			for(i = 0; i < values['next'].length; i++) {
				if(values['prev'][i] != values['next'][i] || initDisplay) {
					// pass both old and new digit value, also scalar new unit value for
					// margin digits calculation basing on current counter display options
					// and the unit in question (asset parameter)
					this.updateCounterDigit(asset, $(wrapper).children('.scd-digit').eq(i), values['next'].length - i - 1, values['prev'][i], values['next'][i], old_value, new_value, initDisplay);
				}
			}
			
			return updateDigitsWidth;
		},
		// left pad with zero helper
		padLeft : function(value, len) {
			value = value + '';
			if(value.length < len) {
				value = Array(len + 1 - value.length).join('0') + value;
			}
			return value;
		},
		
		updateDigitsCount : function(asset, current_count, old_value, new_value, wrapper) {
			var i;
			if(new_value.length < current_count) {
				// remove unused high digit(s)
				for(i = current_count - 1; i >= new_value.length; i--) {
					delete(this.elements[asset + i]);
					wrapper.children('.scd-digit').first().remove();
				}
				old_value = old_value.slice(old_value.length - new_value.length);
				return { old_value : old_value, new_value : new_value };
			} else {
				// initialize digits or add missing high digit(s)
				var new_digit, guess_prev_value, config_index, config;
				
				for(i = current_count; i < new_value.length; i++) {
					new_digit = $('<div class="scd-digit"></div>');
					wrapper.prepend(new_digit);
					// in init mode we use old_value as previous digit value, otherwise we are
					// processing a "digits count changed" case, so we assume that previous
					// digit value is always "0" (as if the old value were padded by zeros)
					guess_prev_value = current_count == 0 ?  old_value[i] : '0';
					
					// When adding a new digit we look for custom digit configuration. For now we support "0"
					// for compatibility with existing fx profiles - it will mostly be used to make seconds-low
					// animations faster. The rest of custom digit position must be expressed in asset+index form
					// (less index = lower digit) but should be used with caution because the number of digits in
					// real counters may differ due to options.unts setting
					config_index = (i == 0 && asset == 'seconds' ? 0 : asset + i);
					config = typeof this.options.animations.digits[config_index] === 'undefined' ? this.options.animations.digits['*'] : this.options.animations.digits[config_index];
					
					this.setElements(new_digit, { 'prev' : guess_prev_value, 'next' : new_value[i - current_count] }, asset + i, config);
				}
				old_value = this.padLeft(old_value, new_value.length);
				return { old_value : old_value, new_value : new_value };
			}
		},
		/**
		 * Method to actually update a counter digit. All digit transition and animation must be
		 * performed here.
		 */
		updateCounterDigit : function(asset, wrapper, index, old_digit, new_digit, old_unit_value, new_unit_value, initDisplay) {
			var hash_prefix = asset + index;
			
			var values = {
					'prev' : old_digit,
					'next' : new_digit
			}
			// test-only not a bullet-proof guess! ***
			if(this.options.animations.uses_margin_values == 1) {
				if(this.options.mode == 'down') {
					values['pre-prev'] = this.guessIncrValue(asset, index, old_digit, old_unit_value);
					values['post-next'] = this.guessDecrValue(asset, index, new_digit, new_unit_value);
				} else {
					values['pre-prev'] = this.guessDecrValue(asset, index, old_digit, old_unit_value);
					values['post-next'] = this.guessIncrValue(asset, index, new_digit, new_unit_value);
				}
				if(initDisplay) {
					// on init "next" and "prev" are equal (this is a design flaw)
					// calculated "pre-prev" will never be visible, so we can use it
					// as simple "prev" (*** WORKAROUND, not beautiful at all...)
					values['prev'] = values['pre-prev'];
				}
			}
			
			var config_index = (index == 0 && asset == 'seconds' ? 0 : asset + index);
			var config = typeof this.options.animations.digits[config_index] === 'undefined' ? this.options.animations.digits['*'] : this.options.animations.digits[config_index];
			var groups = config[this.options.mode];
			
			if(initDisplay) {
				this.setElements(wrapper, values, hash_prefix, config);
			}
			this.animateElements(values, hash_prefix, groups);
		},
		guessIncrValue : function(asset, index, digit_value, unit_value) {
			var limit = this.guessDigitLimit(asset, index, digit_value, unit_value);
			if(++digit_value > limit) {
				digit_value = 0;
			}
			return digit_value;
		},
		guessDecrValue : function(asset, index, digit_value, unit_value) {
			var limit = this.guessDigitLimit(asset, index, digit_value, unit_value);
			if(--digit_value < 0) {
				digit_value = limit;
			}
			return digit_value;
		},
		guessDigitLimit : function(asset, index, digit_value, unit_value) {
			var limit = 9;
			if(asset == 'seconds') {
				if(this.options.units['minutes'] == 1) {
					if(index != 0) {
						limit = 5
					}
				}
			} else if(asset == 'minutes') {
				if(this.options.units['hours'] == 1) {
					if(index != 0) {
						limit = 5
					}
				}
			} else if(asset == 'hours' && this.options.units['days'] == 1) {
				if(index == 1) {
					limit = 2;
				} else if(index == 0 && unit_value >= 20) {
					limit = 3;
				}
			}
			return limit;
		},
		
		setElements : function(wrapper, values, prefix, config) {
			wrapper.empty();
			this.elements[prefix] = {};
			
			wrapper.css(config.style);
			var groups = config[this.options.mode];
			
			var i, group;
			for(i = 0; i < groups.length; i++) {
				group = groups[i];
				var els = group.elements, j, el, $el, hash;
				for(j = 0; j < els.length; j++) {
					el = els[j];
					hash = this.getElementHash(el);
					$el = this.createElement(el, values);
					
					if(el.content_type == 'static-bg') {
						$el.attr('src', this.options.animations.images_folder + el.filename_base + el.filename_ext);
					}
					
					// we have to add created element to collection by unique hash,
					// so that element duplicates are not appended to wrapper, but can
					// be referenced without ambiguity when we prodeed with animations
					// *** store only first unique occurrence
					if(typeof this.elements[prefix][hash] === 'undefined') {
						this.elements[prefix][hash] = $el;
					}
				}
			}
			
			$.each(this.elements[prefix], function(hash, el) {
				wrapper.append(el);
			});
		},
		
		animateElements : function(values, prefix, groups) {
			var i, group;
			
			for(i = 0; i < groups.length; i++) {
				group = groups[i];
				var j, el, $el, value;
				for(j = 0; j < group.elements.length; j++) {
					el = group.elements[j];
					
					if(el.content_type == 'static-bg') {
						// no animation for static background
						continue;
					}
					
					$el = this.elements[prefix][this.getElementHash(el)];
					
					// resore original style(s) for all elements before we start the real animation
					$el.css(el.styles);
				}
			}
			
			// animate first group, next group animation (if any) will be launched after the
			// previous group's animation is finished
			this.animateGroup(values, 0, prefix, groups);
		},
		animateGroup : function(values, group_index, prefix, groups) {
			if(group_index >= groups.length) {
				return;
			}
			var i, group = groups[group_index], el, $el, styles, self = this;
			var duration = this.initDisplay ? 0 : +group.duration; // in initDisplay mode we make all animations instant, i.e. duration = 0
			var transition = group.transition;
			var elements_count = group.elements.length, cur_element_index = 0, group_processed = false;
			
			for(i = 0; i < group.elements.length; i++) {
				// get stored element
				el = group.elements[i];
				
				if(el.content_type == 'static-bg') {
					// no animation for static background
					elements_count--; // the element is not included in group for
					// animation, adjust elements_count, so that we can detect
					// when all elements in group are processed
					continue;
				}
				
				$el = this.elements[prefix][this.getElementHash(el)];
				
				// overload standard style with twins-from and apply
				// Now we do in on server, no need to repeat same action every second...
				//styles = $.extend(el.styles, el.tweens.from);
				// $el.css(styles);
				
				// apply tween.from styles
				$el.css(el.tweens.from);
				
				value = el.content_type == 'uni-img' ? '' : values[el.value_type];
				if(el.content_type == 'txt') {
					$el.text(value);
				} else {
					var src = this.options.animations.images_folder + el.filename_base + value + el.filename_ext;
					$el.attr('src', src);
				}
				
				// We are sure that at least 1 element qualified for animation was found in the group
				group_processed = true;
				
				if(el.tweens.to.length === 0) { // objects have length undefined, so only empty array
					// will pass this condition
					// if tweens are empty we have to simulate animation duration. Of course,
					// it is possible to use a "trivial" tween hack, e.g. <width>100,100</width>,
					// but using native setTimeout() shoud be better.
					if(duration > 0) {
						// even timeout zero causes animations on init, so if group duration = 0
						// we increment cur_element_index directly and proceed to next group if
						// required.
						window.setTimeout(function() {
							cur_element_index++;
							if(cur_element_index >= elements_count) {
								self.animateGroup(values, group_index + 1, prefix, groups);
							}
						}, duration);
					} else {
						cur_element_index++;
						if(cur_element_index >= elements_count) {
							this.animateGroup(values, group_index + 1, prefix, groups);
						}
					}
				} else {
					// we have tweens defined. Proceed with animation. Do not animate
					// elements that are currently being animated - prevent
					// animations mess up on tab switch back and resume in some
					// browsers
					if($el.is(':animated')) {
						// decrement elements-left count
						cur_element_index++;
						if(cur_element_index >= elements_count) {
							this.animateGroup(values, group_index + 1, prefix, groups);
						}
					} else {
						// actually start animation
						$el.animate(el.tweens.to, duration, transition, function() {
							cur_element_index++;
							if(cur_element_index >= elements_count) {
								self.animateGroup(values, group_index + 1, prefix, groups);
							}
						});
					}
				}
			}
			
			if(!group_processed) {
				// empty group or a group containing only 'static-bg' elements.
				// In some animations this kind of a group serves as a pause in animations queue
				window.setTimeout(function() {
					self.animateGroup(values, group_index + 1, prefix, groups);
				}, duration);
			}
			
		},
		getElementHash : function(el) {
			return [el.content_type, el.value_type, el.filename_base, el.filename_ext].join('::');
		},
		/*
		 * Create DOM element using jQuery, basing on "el" object properties (content_type, tag, etc...)
		 */
		createElement : function(el, values) {
			var $el;
			if(el.content_type == 'txt') {
				$el = $('<' + el.tag + '/>');
				$el.text(values[el.value_type]);
			} else {
				var value = el.content_type == 'img' ? values[el.value_type] : '', src;
				src = this.options.animations.images_folder + el.filename_base + value + el.filename_ext;
				
				$el = $('<' + el.tag + '/>');
				$el.attr('src', src);
			}
			$el.css(el.styles);
			return $el;
		},
		getLabel : function(asset, value) {
			var labels = {
				years : 'Y',
				months : 'M',
				weeks : 'W',
				days : 'D',
				hours : 'H',
				minutes : 'Min',
				seconds : 'Sec'
			};
			
			var suffix = smartcountdown_plural(value);
			return smartcountdownstrings[asset + suffix] || labels[asset];
			
			return labels[asset];
		},
		/**
		 * Set counter units visibility according to units display configuration and counter values.
		 * Related settings:
		 * - allow_lowest_zero: show zero in the lowest counter unit, if not allowed, the unit with zero
		 * value will be replaced by a lower non-zero unit and replaced with original unit once its value
		 * is grater than zero
		 * - hide_highest_zeros: hide highest counter units until a non-zero unit is found, even if these
		 * high units are set up as "displayed" in units configuration
		 */
		setCounterUnitsVisibility : function(new_values) {
			// restore original hide_lower_units from configuration
			var hide_units = $.extend([], this.options.hide_lower_units);
			var i, assets = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'];
			
			// allow_lowest_zero feature
			if(this.options.allow_lowest_zero == 0 && $.inArray('seconds', hide_units) != -1) {
				var index;
				var lowest_displayed_unit = -1;
				for(i = 0; i < assets.length; i++) {
					index = $.inArray(assets[i], hide_units);
					if(index == -1) {
						lowest_displayed_unit = i;
					}
				}
				if(lowest_displayed_unit >= 0 && new_values[assets[lowest_displayed_unit]] == 0) {
					for(i = lowest_displayed_unit; i < assets.length; i++) {
						if(new_values[assets[i]] > 0 || assets[i] == 'seconds') {
							index = $.inArray(assets[i], hide_units);
							if(index > -1) {
								hide_units.splice(index, 1);
								// replace unit with zero values with a non-zero lower one
								if(this.options.replace_lowest_zero == 1) {
									hide_units.push(assets[lowest_displayed_unit]);
								}
								break;
							}
						}
					}
				}
			}
			
			// hide_highest_zeros feature
			if(this.options.hide_highest_zeros == 1) {
				var lowest_displayed_unit = -1;
				for(i = 0; i < assets.length; i++) {
					if(this.options.units[assets[i]] == 0) {
						continue;
					}
					lowest_displayed_unit = i;
					if(new_values[assets[i]] == 0) {
						if($.inArray(assets[i], hide_units) == -1) {
							hide_units.push(assets[i]);
						}
					} else {
						break;
					}
				}
				
				// if lowest zero unit found, remove it from hide_units
				if(lowest_displayed_unit > -1 && new_values[assets[lowest_displayed_unit]] == 0) {
					hide_units.splice(lowest_displayed_unit, 1);
				}
			}
			
			// apply calculated hide_units configuration
			var self = this;
			$.each(this.options.units, function(asset, display) {
				var unit_wrapper = $('#' + self.options.id + '-' + asset);
				if(display == 1 && $.inArray(asset, hide_units) == -1) {
					unit_wrapper.show();
				} else {
					unit_wrapper.hide();
				}
			});
			
			this.setLabelsPosition();
			
			var counter_container = $('#' + this.options.id);
			
			/* *** a sort of a panic action - no counter units are displayed, we have to hide the whole widget*/
			if(hide_units.length < 7) {
				counter_container.show();
			} else {
				counter_container.hide();
			}
			/**/
			
			// For count up mode we implement an option to completely hide
			// counter digits block after the event time is reached
			if(this.options.mode == 'up') {
				if(this.options.hide_countup_counter == 1) {
					counter_container.find('.scd-counter').hide();
					counter_container.show();
				} else {
					counter_container.find('.scd-counter').show();
				}
			} else {
				// in "down" mode we always show counter block. The whole
				// widget will be hidden if required in applyCounterLimits()
				counter_container.find('.scd-counter').show();
			}
			
			// if the counter is clickable, set the handler
			if(this.options.click_url != '') {
				counter_container.css('cursor', 'pointer');
				counter_container.off('click');
				counter_container.on('click', function() {
					window.location = self.options.click_url;
				});
			} else {
				counter_container.css('cursor', 'default');
				counter_container.off('click');
			}
			
			// add quick check for counter display mode limits
			this.applyCounterLimits();
		},
		
		applyCounterLimits : function() {
			var counter_container = $('#' + this.options.id);
			
			// show widget before/after event limits
			if(this.options.mode == 'down') {
				if(this.options.countdown_limit >= 0 && this.diff >= this.options.countdown_limit * MILIS_IN_SECOND) {
					counter_container.hide();
				} else {
					counter_container.show();
				}
			}
			if(this.options.mode == 'up') {
				if(this.options.countup_limit >= 0 && this.diff >= this.options.countup_limit * MILIS_IN_SECOND) {
					/*
					 * POSSIBLE ISSUE HERE: when switching to the next event, 2 AJAX requests are registered
					 * in network console, with same response. This is not OK...
					 * 
					 * *** when resumed after sleep, only 1 request is done - OK.
					 * when running - 2 requests - WHY? $$$
					 */
					
					// go for the next event
					this.queryNextEvent();
					
					// disable countup limit temporarly, so that no more queryNextEvent() are
					// done. Correct countup limit will be set when the event request is done.
					// *** we do countup limit reset after calling queryNextEvent(), so that
					// actual limit value can be used inside queryNextEvent() method. Anyway,
					// resetting countup limit here will guarantee that no more queries will
					// be done while current one is in progress
					this.options.countup_limit = -1;
				}
			}
		},
		
		setRowVerticalAlign : function() {
			// align digits - for counter column layout only
			var digits = $('#' + this.options.id + ' .scd-unit-vert .scd-digits-row:visible');
			if(digits.length > 0) {
				var maxWidth = 0, width;
				digits.css('min-width', '');
				digits.each(function() {
					width = $(this).width();
					if(width > maxWidth) {
						maxWidth = width;
					}
				});
				digits.css('min-width', maxWidth);
			}
			// align labels
			// here we rely on maximum width of visible labels
			// if at the moment of measurement the longest plural/singular
			// form is not dipslayed, the calculation below may give wrong results
			// *** TODO: of course we can call this every second... find a better solution!
			// We can simply not allow "left" labels position - no need for the code below
			// ALTERNATIVES: get maximum labels width on init, set min-width for lables in styles -
			// Also important for horizontal counter layout! *** for now we only check vertical
			// layout
			var labels = $('#' + this.options.id + ' .scd-unit-vert .scd-label-row:visible');
			if(labels.length > 0) {
				var maxWidth = 0, width;
				labels.css('min-width', '');
				labels.each(function() {
					width = $(this).width();
					if(width > maxWidth) {
						maxWidth = width;
					}
				});
				labels.css('min-width', maxWidth);
			}
		},
		
		// update labels vertical position for left or right labels placement
		setLabelsPosition : function() {
			// adjust labels position if neeed (if vertical label position is set)
			var labels = $('#' + this.options.id + ' .scd-label-row:visible');
			if(labels.length > 0) {
				var digitsDiv, digitsHeight, labelHeight, top, self = this;
				//labels.css('height', '');
				labels.each(function() {
					digitsDiv = $(this).siblings('.scd-digits-row');
					digitsHeight = digitsDiv.height();
					labelHeight = $(this).height();
					$(this).css('position', 'relative');
					switch(self.options.labels_vert_align) {
					case 'top' :
						top = 0;
						break;
					case 'bottom' :
						top = digitsHeight - labelHeight;
						break;
					case 'high' :
						top = labelHeight * 0.5;
						break;
					case 'low' :
						top = digitsHeight - labelHeight * 1.5;
						break;
					case 'superscript' :
						top = labelHeight * -0.5;
						break;
					case 'subscript' :
						top = digitsHeight - labelHeight / 2;
						break;
					default:
						top = digitsHeight / 2 - labelHeight / 2;
					}
					$(this).css('top', top);
				});
			}
		},
		
		resetAlignments : function(counter_container) {
			counter_container.find('.scd-label').css({position : '', top : ''});
			counter_container.find('.scd-label, .scd-digits').css('min-width', '');
		},
		
		responsiveAdjust : function(width) {
			var responsive = this.options.responsive;
			if(!responsive || responsive.length == 0) {
				return;
			}	
			var counter_container = $('#' + this.options.id), i, size_preset, adjusted = false;
			
			// we have to reset all existing labels and digits alignment before proceeding with
			// responsive adjust
			this.resetAlignments(counter_container);
			
			// iterate through responsive sizes, except the last node, because it has a special role:
			// it is a generic default preset for the rest of screen widths (normally a "desktop" case)
			
			// IMPORTANT: sizes nodes must be sorted ascending, otherwise responsive behavior will be
			// unpredictable
			for(i = 0; i < responsive.length - 1; i++) {
				size_preset = responsive[i];
				if(width < size_preset.sizes.value) {
					// the first size that is grater than current width will win
					
					// apply scale
					counter_container.css('font-size', this.options.base_font_size * size_preset.sizes.scale);
					
					// apply additional classes (if any)
					if(size_preset.alt_classes.length > 0) {
						$.each(size_preset.alt_classes, function(index, classes) {
							if($.isArray(classes)) {
								$.each(classes, function(ci, c) {
									counter_container.find(c.selector).removeClass(c.remove).addClass(c.add);
								});
							} else {
								counter_container.find(classes.selector).removeClass(classes.remove).addClass(classes.add);
							}
						});
					}
					
					// we are done - no need to continue looping
					adjusted = true;
					break;
				}
			}
			if(!adjusted) {
				// apply default scale and layout: we rely on the last node in responsive sizes, as it
				// defines the scale and classes for all sizes that are greater that the listed ones
				counter_container.css('font-size', this.options.base_font_size);
				standard_preset = responsive[responsive.length - 1];
				if(standard_preset.alt_classes.length > 0) {
					$.each(standard_preset.alt_classes, function(index, classes) {
						if($.isArray(classes)) {
							$.each(classes, function(ci, c) {
								counter_container.find(c.selector).removeClass(c.remove).addClass(c.add);
							});
						} else {
							counter_container.find(classes.selector).removeClass(classes.remove).addClass(classes.add);
						}
					});
				}
			}
			// realign labels and measure units (for column layouts)
			this.setRowVerticalAlign();
			this.setLabelsPosition();
		},
		
		queryNextEvent : function(isNew) {
			var self = this;
			
			// show spinner
			$('#' + self.getId() + '-loading').show();
			
			$('#' + self.getId() + ' .scd-all-wrapper').hide();
			
			var queryData = {
				action : 'scd_query_next_event',
				smartcountdown_nonce : smartcountdownajax.nonce /*,
				// possible caching bugs workaround
				unique : new Date().getTime() */
			};
			if(this.options.shortcode == 1) {
				// shortcode - include deadline date and time and import_plugins in query
				queryData.deadline = this.options.deadline;
				queryData.import_config = this.options.import_config;
				
				// we have to add countup limit from original settings to query data.
				queryData.countup_limit = this.options.original_countup_limit;
			} else {
				// widget - include widget id in query, the rest of widget configuration
				// will be read on server from wp database
				queryData.id = this.options.id;
			}
			$.getJSON(
					smartcountdownajax.url,
					queryData,
					function(response) {
						// hide spinner
						$('#' + self.getId() + '-loading').hide();
						
						$('#' + self.getId() + ' .scd-all-wrapper').show();
						
						if(response.err_code == 0) {
							// Actually we have "self" object already initialized and
							// setup with options (for both widget and shorcode modes)
							
							// we have to add actual "now" and "deadline" here, it
							// should work for plain counters (caching workaround) and
							// also for events import plugins
							
							self.options.deadline = response.options.deadline;
							self.options.now = response.options.now;
							
							// we append imported event title (if any) to counter titles
							// or insert imported title if a placeholder found in original
							if(typeof response.options.imported_title !== 'undefined') {
								// we have imported title
								if(self.options.original_title_before_down != '') {
									if(self.options.original_title_before_down.indexOf('%imported%') != -1) {
										// replace placeholder with imported title
										self.options.title_before_down = self.options.original_title_before_down.replace('%imported%', response.options.imported_title);
									} else {
										// no placeholder - append imported title
										self.options.title_before_down = self.options.original_title_before_down + ' ' + response.options.imported_title;
									}
								} else {
									// generic title empty - use imported title as is
									self.options.title_before_down = response.options.imported_title;
								}
								if(self.options.original_title_before_up != '') {
									if(self.options.original_title_before_up.indexOf('%imported%') != -1) {
										// replace placeholder with imported title
										self.options.title_before_up = self.options.original_title_before_up.replace('%imported%', response.options.imported_title);
									} else {
										// no placeholder - append imported title
										self.options.title_before_up = self.options.original_title_before_up + ' ' + response.options.imported_title;
									}
								} else {
									// generic title empty - use imported title as is
									self.options.title_before_up = response.options.imported_title;
								}
							} else {
								// just in case - remove "imported" placeholders
								self.options.title_before_down = self.options.original_title_before_down.replace('%imported%', '');
								self.options.title_before_up = self.options.original_title_before_up.replace('%imported%', '');
							}
							self.options.countup_limit = response.options.countup_limit;
							
							if(response.options.deadline == '') {
								// no next events. TODO: display message(?), etc.
								
								// detach counter from container - this is a definitive
								// shut-down for this counter instance, as there are no future events
								scds_container.remove(self.getId());
								
								$('#' + self.options.id).hide();
								return;
							}
							// *** TEST ***
							//self.options.deadline = new Date(new Date().getTime() + 10000).toString();
							// *** ***
							
							// convert deadline to javascript Date
							self.options.deadline = new Date(new Date(self.options.deadline).getTime() /* + 0 put a value here if we need initial correction */).toString();
							
							self.updateCounter(self.getCounterValues(self.options.now));
							
							// widget registration in container is
							// required only for the first event query, switching
							// to next event in a running widgets doesn't require
							// adding widget to container because it is already there
							if(isNew) {
								scds_container.updateInstance(self.getId(), self);
							}
							
							// We have to set counter mode limits and units display after geeting new event
							self.setCounterUnitsVisibility(self.current_values);
							
							// init awake detect timestamp
							self.awake_detect = new Date().getTime();
						} else {
							// error
						}
					}
				).fail(function(jqxhr, textStatus, error) {
					// report error here...
					$('#' + self.getId() + '-loading').hide();
					
					$('#' + self.getId() + ' .scd-all-wrapper').show();
				});
		}
	}
})(jQuery);