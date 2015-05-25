=== Smart Countdown FX ===
Contributors: alex3493 
Tags: countdown, counter, count down, timer, event, widget, years, months, FX, animated, responsive, recurring
Requires at least: 3.6
Tested up to: 4.2.2
Stable tag: 0.9
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Smart Countdown FX displays a responsive animated countdown. Supports years and months display and recurring events

== Description ==
Smart Countdown FX implements a lot of features, but two of them make it different from the most of existing web countdowns:

* years and months (along with “traditional” weeks, days, hours, minutes and seconds) can be displayed in the countdown interval.

* counter digits changes are animated and these animations are not hard-coded – site administrator can easily switch between available <a href="http://smartcalc.es/wp/index.php/blog/">animation profiles</a> included with the plugin or added later.
  
**Other features**

Smart Countdown FX can show both countdown and count up counters, and it will switch to the “count up” mode automatically when the event time arrives. Event description can be configured individually for countdown and count up modes and can containt HTML markup allowed for a post.

Smart Countdown FX supports different layouts. Most popular layouts (sidebar, shortcode, shortcode compact, etc.) are included in the package and can be selected in the widget options or using a [shortcode][1] attribute. Custom layout presets can be easily created using existing ones as a starting point. You will find detailed instructions in the [documentation][2].

Smart Countdown FX widget is responsive. Open [Layouts Demo][3] page on different handheld devices or just change your browser window width if you are on a desktop to see “responsive” feature in action.

More than one countdown can be displayed on the same page, each instance with its individual settings and configuration. 

For complete list of features [see this page][4]

**Coming soon**

* Basic plugin stores the event date and time in widget settings or as a shortcode attribute, so only one event date can be configured for each Smart Countdown FX widget instance. A bunch of "event import" plugins is in developement and will be available soon. These plugins will support popular event management plugins and services (like Google Calendar) and will pull events automatically into Smart Countdown FX events queue, so that countdown to the next event will be activated automatically after the current one is over.

* More animation profiles.

 [1]: http://smartcalc.es/wp/index.php/shortcode/
 [2]: http://smartcalc.es/wp/index.php/layout-presets-fine-tuning/
 [3]: http://smartcalc.es/wp/index.php/layouts-demo/
 [4]: http://smartcalc.es/wp/index.php/features/

== Installation ==
Extract the zip file and just drop the contents in the wp-content/plugins/ directory of your WordPress installation and then activate the Plugin from Plugins page.

== Frequently Asked Questions ==
= How does one use the shortcode, exactly? =
<http://smartcalc.es/wp/index.php/shortcode/> - complete list of shortcode attributes has been provided to answer this exact question.

= How can I add new animation effects? =
<http://smartcalc.es/wp/index.php/installing-more-animations/> - detailed instructions on installing additional animation profiles.

= I have installed the plugin, but Smart Countdown FX doesn't appear in available widgets list. =
Do not forget to active the plugin after installation.

= I have configured the widget but it is not displayed. =
Please, check "Counter display mode" setting in the widget options. If "Auto - both countdown and countup" is not selected, the widget might have been automatically hidden because the event is still in the future or already in the past.

= I have inserted the countdown in a post, but it is not displayed. What's wrong? =
Check the spelling of "fx_preset" attribute (if you includeded it in attributes list). Try the standard fx_preset="Sliding_text_fade.xml". Also check "mode" attribute. Set in to "auto".

== Screenshots ==
1. Widget default settings (part 1/2)

2. Widget default settings (part 2/2)

3. Countdown in front end

4. "Time has arrived!" message

== Changelog ==
Version 0.9.5 - support for event import plugins, bug fixes

First release 0.9