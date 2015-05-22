<?php
/*
Version: 1.0
Author: Alex Polonski
Author URI: http://smartcalc.es
License: GPL2
*/

defined( 'ABSPATH' ) or die();

define( 'SCD_BASE_FONT_SIZE', 12 );
abstract class SmartCountdown_Helper {
	private static $assets = array (
			'years',
			'months',
			'weeks',
			'days',
			'hours',
			'minutes',
			'seconds' 
	);
	
	// Responsive Classes actions
	private static $layout_tpls = array (
			'labels_pos' => array (
					'row' => array (
							array (
									'selector' => '.scd-label',
									'remove' => 'scd-label-col scd-label-row',
									'add' => 'scd-label-row' 
							),
							array (
									'selector' => '.scd-digits',
									'remove' => 'scd-digits-col scd-digits-row',
									'add' => 'scd-digits-row' 
							) 
					),
					'col' => array (
							array (
									'selector' => '.scd-label',
									'remove' => 'scd-label-col scd-label-row',
									'add' => 'scd-label-col' 
							),
							array (
									'selector' => '.scd-digits',
									'remove' => 'scd-digits-col scd-digits-row',
									'add' => 'scd-digits-col' 
							) 
					) 
			),
			'layout' => array (
					'vert' => array (
							array (
									'selector' => '.scd-unit',
									'remove' => 'scd-unit-vert scd-unit-horz',
									'add' => 'scd-unit-vert' 
							),
							array (
									'selector' => '.scd-counter',
									'remove' => 'scd-counter-col scd-counter-horz',
									'add' => 'scd-counter-col' 
							) 
					),
					'horz' => array (
							array (
									'selector' => '.scd-unit',
									'remove' => 'scd-unit-vert scd-unit-horz',
									'add' => 'scd-unit-horz' 
							),
							array (
									'selector' => '.scd-counter',
									'remove' => 'scd-counter-col scd-counter-horz',
									'add' => 'scd-counter-horz' 
							) 
					) 
			) 
	);
	public static function getCounterConfig( $instance ) {
		if ( !empty( $instance ['layout_preset'] ) ) {
			$file_name = dirname( __FILE__ ) . '/layouts/' . $instance ['layout_preset'];
			if ( file_exists( $file_name ) ) {
				$xml = file_get_contents( $file_name );
			}
			
			// now XML document should be valid
			libxml_use_internal_errors( true );
			
			$xml = simplexml_load_string( $xml );
			
			foreach ( libxml_get_errors() as $error ) {
				// log errors here...
			}
			if ( empty( $xml ) ) {
				return $instance;
			}
			
			// counter units padding settings
			foreach ( $xml->paddings->children() as $padding ) {
				$padding = $padding->getName();
				$instance ['paddings'] [$padding] = ( int ) $xml->paddings->$padding;
			}
			
			$responsive = array ();
			
			$is_responsive = $xml->responsive->attributes();
			$is_responsive = ( int ) $is_responsive ['value'];
			
			if ( $is_responsive ) {
				// counter units padding settings
				foreach ( $xml->responsive->children() as $size ) {
					$attrs = array ();
					foreach ( $size->attributes() as $k => $v ) {
						$attrs [$k] = ( string ) $v;
					}
					$classes = array ();
					foreach ( $size->children() as $layout ) {
						$name = $layout->getName();
						$value = ( string ) $layout;
						
						if ( isset( static::$layout_tpls [$name] ) && isset( static::$layout_tpls [$name] [$value] ) ) {
							$classes [] = static::$layout_tpls [$name] [$value];
						}
					}
					
					$responsive [] = array (
							'sizes' => $attrs,
							'alt_classes' => $classes 
					);
				}
			}
			
			$instance ['responsive'] = $responsive;
			
			$instance ['layout'] = ( string ) $xml->layout;
			$instance ['event_text_pos'] = ( string ) $xml->event_text_pos;
			$instance ['labels_pos'] = ( string ) $xml->labels_pos;
			$instance ['labels_vert_align'] = ( string ) $xml->labels_vert_align;
			
			$instance ['hide_highest_zeros'] = ( string ) $xml->hide_highest_zeros;
			$instance ['allow_lowest_zero'] = ( string ) $xml->allow_lowest_zero;
			
			$instance ['base_font_size'] = SCD_BASE_FONT_SIZE;
		}
		return $instance;
	}
	
	/**
	 * Set widget layout properties based on the widget config
	 * 
	 * @param Array $instance
	 *        	- widget config
	 * @return Array: layout config
	 */
	private static function getCounterLayout( $instance ) {
		$layout = array ();
		
		$title_before_size = $instance ['title_before_size'] / SCD_BASE_FONT_SIZE;
		$title_after_size = $instance ['title_after_size'] / SCD_BASE_FONT_SIZE;
		$labels_size = $instance ['labels_size'] / SCD_BASE_FONT_SIZE;
		
		$layout ['event_text_pos'] = $instance ['event_text_pos'];
		$layout ['labels_pos'] = $instance ['labels_pos'];
		
		$layout ['title_before_style'] = 'font-size:' . $title_before_size . 'em;' . $instance ['title_before_style'];
		$layout ['title_after_style'] = 'font-size:' . $title_after_size . 'em;' . $instance ['title_after_style'];
		
		$layout ['labels_style'] = 'font-size:' . $labels_size . 'em;' . $instance ['labels_style'];
		
		$layout ['title_before_style'] = empty( $layout ['title_before_style'] ) ? '' : ' style="' . $layout ['title_before_style'] . '"';
		$layout ['title_after_style'] = empty( $layout ['title_after_style'] ) ? '' : ' style="' . $layout ['title_after_style'] . '"';
		$layout ['digits_style'] = empty( $instance ['digits_style'] ) ? '' : ' style="' . $instance ['digits_style'] . '"';
		$layout ['labels_style'] = empty( $layout ['labels_style'] ) ? '' : ' style="' . $layout ['labels_style'] . '"';
		
		switch ( $layout ['labels_pos'] ) {
			case 'left' :
			case 'right' :
				$layout ['labels_class'] = 'scd-label scd-label-row';
				$layout ['digits_class'] = 'scd-digits scd-digits-row';
				break;
			case 'top' :
			case 'bottom' :
			default :
				$layout ['labels_class'] = 'scd-label scd-label-col';
				$layout ['digits_class'] = 'scd-digits scd-digits-col';
				break;
		}
		switch ( $layout ['event_text_pos'] ) {
			case 'horz' :
				$layout ['text_class'] = 'scd-title-row';
				$layout ['counter_class'] = 'scd-counter scd-counter-row scd-counter-' . $instance ['layout'];
				break;
			case 'vert' :
			default :
				$layout ['text_class'] = 'scd-title-col';
				$layout ['counter_class'] = 'scd-counter scd-counter-col';
		}
		
		$layout ['units_class'] = 'scd-unit scd-unit-' . $instance ['layout'];
		if ( $instance ['layout'] == 'vert' ) {
			$layout ['units_class'] .= ' clearfix';
		}
		
		return $layout;
	}
	public static function getInternalCounter( $options ) {
		/*
		 * Dates management: we work with UTC time here. All DST effects will be
		 * calculated here and both current "now" and "deadline" will be passed
		 * to client script, so that the interval (dates difference) will be kept
		 * intact - this is the basis of a countdown. On suspend/resume events
		 * we use corrected now and inmutable deadline for correct calendar
		 * calculations only - timezones and DST will not be needed
		 */
		
		// For now we use current WP system time (aware of time zone in settings)
		$tz_string = get_option( 'timezone_string', 'UTC' );
		if ( empty( $tz_string ) ) {
			// direct offset if TZ
			$offset = get_option( 'gmt_offset' );
			$tz_string = 'GMT' . ( $offset >= 0 ? '+' : '' ) . $offset;
		}
		
		// get current UNIX timestamp
		$now = current_time( 'timestamp', true );
		// convert deadline to UTC
		$deadline = new DateTime( $options ['deadline']/*, new DateTimeZone('UTC')*/);
		$tz = new DateTimeZone( $tz_string );
		$offset = $tz->getOffset( $deadline );
		$deadline->modify( ( $offset < 0 ? '+' : '-' ) . abs( $offset ) . ' second' );
		
		$options ['deadline'] = $deadline->format( 'c' );
		$options ['now'] = $now * 1000;
		
		return $options;
	}
	public static function getCounterHtml( $instance ) {
		$layout = SmartCountdown_Helper::getCounterLayout( $instance );
		if ( $layout === false ) {
			// log error here!!!
			// echo '<h3>Layout preset invalid!</h3>';
			return;
		}
		ob_start();
		?>
<style>
.spinner {
	background:
		url('<?php echo get_site_url();?>/wp-admin/images/wpspin_light.gif')
		no-repeat;
}
</style>
<div id="<?php echo $instance['id']; ?>-loading" class="spinner"></div>
<div class="<?php echo $layout['text_class']; ?>"
	id="<?php echo $instance['id']; ?>-title-before"
	<?php echo $layout['title_before_style']; ?>></div>
<div class="<?php echo ($layout['counter_class']); ?>">
			
			<?php foreach(static::$assets as $asset) : ?>
				<div id="<?php echo $instance['id']; ?>-<?php echo $asset; ?>"
		class="<?php echo $layout['units_class']; ?>"
		<?php echo ($instance['units'][$asset] ? '' : ' style="display:none;"'); ?>>
					<?php if($instance['labels_pos'] == 'left' || $instance['labels_pos'] == 'top') : ?>
						<div class="<?php echo $layout['labels_class']; ?>"
			id="<?php echo $instance['id']; ?>-<?php echo $asset; ?>-label"
			<?php echo $layout['labels_style']; ?>></div>
		<div class="<?php echo $layout['digits_class']; ?>"
			id="<?php echo $instance['id']; ?>-<?php echo $asset; ?>-digits"
			<?php echo $layout['digits_style']; ?>></div>
					<?php else : ?>
						<div class="<?php echo $layout['digits_class']; ?>"
			id="<?php echo $instance['id']; ?>-<?php echo $asset; ?>-digits"
			<?php echo $layout['digits_style']; ?>></div>
		<div class="<?php echo $layout['labels_class']; ?>"
			id="<?php echo $instance['id']; ?>-<?php echo $asset; ?>-label"
			<?php echo $layout['labels_style']; ?>></div>
					<?php endif; ?>
				</div>
			<?php endforeach; ?>
			</div>
<div class="<?php echo $layout['text_class']; ?>"
	id="<?php echo $instance['id']; ?>-title-after"
	<?php echo $layout['title_after_style']; ?>></div>
<?php
		
		$html = ob_get_clean();
		return $html;
	}
	public static function getAnimations( $instance ) {
		$file_name = dirname( __FILE__ ) . '/animations/' . $instance ['fx_preset'];
		if ( file_exists( $file_name ) ) {
			$xml = file_get_contents( $file_name );
		} else {
			return false;
		}
		
		libxml_use_internal_errors( true );
		
		$xml = simplexml_load_string( $xml );
		
		foreach ( libxml_get_errors() as $error ) {
			// log errors here...
		}
		if ( empty( $xml ) ) {
			return false;
		}
		
		$digitsConfig = array ();
		
		// global settings
		$digitsConfig ['name'] = $xml ['name'] ? ( string ) $xml ['name'] : 'Custom';
		$digitsConfig ['description'] = $xml ['description'] ? ( string ) $xml ['description'] : '';
		
		$digitsConfig ['images_folder'] = plugins_url() . '/' . dirname( plugin_basename( __FILE__ ) ) . '/animations/' . ( $xml ['images_folder'] ? ( string ) $xml ['images_folder'] : '' );
		$digitsConfig ['uses_margin_values'] = false;
		
		// *** TEST ONLY - for debugging to see previous values for all digits on init
		// $digitsConfig['uses_margin_values'] = true;
		
		// get all digit scopes configurations
		foreach ( $xml->digit as $digit ) {
			
			// scope attribute may contain more than one value (comma-separated list)
			$scopes = explode( ',', ( string ) $digit ['scope'] );
			
			foreach ( $scopes as $scope ) {
				// init config for all scopes in list
				$digitsConfig ['digits'] [$scope] = array ();
			}
			
			// Calculate digits scale. We look for height and font-size scalable styles and calculate the
			// effective scaling (basing on SCD_BASE_FONT_SIZE)
			$scale = 1; // prepare for a fallback if no scalable relevant style is found
			$digits_size = empty( $instance ['digits_size'] ) ? 24 : $instance ['digits_size'];
			
			foreach ( $digit->styles->style as $value ) {
				$attrs = array ();
				foreach ( $value->attributes() as $k => $v ) {
					$attrs [$k] = ( string ) $v;
				}
				/*
				 * *** CHECK LOGIC with text based animations - EM setting and line-height:1em; (causes extra margin!)
				 */
				if ( ( $attrs ['name'] == 'height' || $attrs ['name'] == 'font-size' ) && !empty( $attrs ['scalable'] ) ) {
					if ( $attrs ['unit'] == 'px' ) {
						$scale = $digits_size / $attrs ['value'];
					} elseif ( $attrs ['unit'] == 'em' ) {
						$scale = ( $digits_size / SCD_BASE_FONT_SIZE ) / $attrs ['value'];
					}
				}
			}
			
			// construct digit style
			$styles = array ();
			
			foreach ( $digit->styles->style as $value ) {
				$attrs = array ();
				foreach ( $value->attributes() as $k => $v ) {
					$attrs [$k] = ( string ) $v;
				}
				
				// If attribute unit is "px" we translate it to "em" using global base font size
				// setting
				if ( $attrs ['unit'] == 'px' ) {
					$attrs ['unit'] = 'em';
					$attrs ['value'] = $attrs ['value'] / SCD_BASE_FONT_SIZE;
				}
				// Scale the value if it has 'scalable' attribute set
				$result = ( !empty( $attrs ['scalable'] ) ? $scale * $attrs ['value'] : $attrs ['value'] ) . ( !empty( $attrs ['unit'] ) ? $attrs ['unit'] : '' );
				
				$result = preg_replace( '#url\((\S+)\)#', 'url(' . $digitsConfig ['images_folder'] . '$1)', $result );
				
				// We save styles as array, must be joined by ";" before applying directly to style attribute!
				$styles [$attrs ['name']] = $result;
			}
			
			// *** old version: styles as a string
			// for digit style - if background set, prepend images_folder
			// $styles = preg_replace('#url\((\S+)\)#', 'url('.$digitsConfig['images_folder'].'$1)', $styles);
			
			foreach ( $scopes as $scope ) {
				// set styles for all scopes in list
				$digitsConfig ['digits'] [$scope] ['style'] = $styles;
			}
			
			// get modes (down and up)
			foreach ( $digit->modes->mode as $groups ) {
				
				$attrs = $groups->attributes();
				$mode = ( string ) $attrs ['name'];
				
				foreach ( $groups as $group ) {
					
					$grConfig = array ();
					
					$grAttrs = $group->attributes();
					foreach ( $grAttrs as $k => $v ) {
						$grConfig [$k] = ( string ) $v;
						if ( $k == 'transition' ) {
							$grConfig [$k] = static::translateTransitions( $grConfig [$k] );
						}
					}
					
					$grConfig ['elements'] = array ();
					
					// get all elements for the group
					foreach ( $group as $element ) {
						// default values to use if attribute is missing
						$elConfig = array (
								'filename_base' => '',
								'filename_ext' => '',
								'value_type' => '' 
						);
						
						$elAttrs = $element->attributes();
						foreach ( $elAttrs as $k => $v ) {
							$elConfig [$k] = ( string ) $v;
						}
						
						if ( $elConfig ['value_type'] == 'pre-prev' || $elConfig ['value_type'] == 'post-next' ) {
							// working with pre-prev and post-next requires significant
							// calculation in client script, so for performance sake we set the
							// flag here, so that this calculation is performed only if needed
							$digitsConfig ['uses_margin_values'] = true;
						}
						
						$elConfig ['styles'] = static::getElementStyles( $element->styles, $digitsConfig ['images_folder'] );
						$elConfig ['tweens'] = static::getElementTweens( $element->tweens, empty( $grConfig ['unit'] ) ? '%' : $grConfig ['unit'] );
						
						// if a style is missing in tweens['from'] we must add it here
						$elConfig ['tweens'] ['from'] = array_merge( $elConfig ['styles'], $elConfig ['tweens'] ['from'] );
						
						// if a tweens rule (CSS property) is missing in element's styles, existing animations profiles
						// get broken. At the moment we implement this workaround - explicitly add a style if a "tween.from"
						// property is missing. Later we can check if this can be done in client script and/or if there are
						// clear guidelines for correcting existing animation profiles
						foreach ( $elConfig ['tweens'] ['from'] as $style => &$value ) {
							if ( !isset( $elConfig ['styles'] [$style] ) ) {
								$elConfig ['styles'] [$style] = $value;
							}
						}
						$grConfig ['elements'] [] = $elConfig;
					}
					
					foreach ( $scopes as $scope ) {
						// set fx configuration for all scopes in list
						$digitsConfig ['digits'] [$scope] [$mode] [] = $grConfig;
					}
				}
			}
		}
		
		return $digitsConfig;
	}
	
	/**
	 * Translate old mootools easing directives to jQuery UI easing standards.
	 * When using native jQuery
	 * easing or unknown, returns $transition param without changes
	 * 
	 * @param string $transition
	 *        	- sourse easing directive
	 * @return string - jQuery UI standard easing directive
	 */
	private static function translateTransitions( $transition ) {
		$parts = explode( ':', $transition );
		if ( count( $parts ) == 2 ) {
			return 'ease' . ucfirst( $parts [1] ) . ucfirst( $parts [0] );
		} else {
			return $transition;
		}
	}
	private static function getElementStyles( $styles, $images_folder ) {
		$result = array ();
		
		if ( empty( $styles ) ) {
			return $result;
		}
		
		$styles = $styles->children();
		for ( $i = 0; $count = count( $styles ), $i < $count; $i++ ) {
			$result [$styles [$i]->getName()] = trim( preg_replace( '#url\((\S+)\)#', 'url(' . $images_folder . '$1)', ( string ) $styles [$i] ) );
		}
		
		return $result;
	}
	
	/*
	 * Split tweens to "from" and "to" CSS rules. Must-have for jQuery animation
	 */
	private static function getElementTweens( $tweens, $unit ) {
		$result = array (
				'from' => array (),
				'to' => array () 
		);
		if ( empty( $tweens ) ) {
			return $result;
		}
		
		$tweens = $tweens->children();
		
		for ( $i = 0; $count = count( $tweens ), $i < $count; $i++ ) {
			$name = $tweens [$i]->getName();
			if ( !in_array( $name, array (
					'top',
					'bottom',
					'left',
					'right',
					'height',
					'width',
					'font-size' 
			) ) ) {
				// discard unit for css rules that do not accept units
				$unit = '';
			}
			$values = explode( ',', ( string ) $tweens [$i] );
			$result ['from'] [$name] = trim( $values [0] . $unit );
			$result ['to'] [$name] = trim( $values [1] . $unit );
		}
		
		return $result;
	}
	public static function selectInput( $id, $name, $selected = '', $config = array() ) {
		$config = array_merge( array (
				'type' => 'integer',
				'start' => 10,
				'end' => 50,
				'step' => 2,
				'default' => 30,
				'unit' => 'px' 
		), $config );
		
		$html = array ();
		
		if ( $config ['type'] == 'integer' ) {
			$html [] = '<select id="' . $id . '" name="' . $name . '">';
			
			for ( $v = $config ['start']; $v <= $config ['end']; $v += $config ['step'] ) {
				$html [] = '<option value="' . $v . '"' . ( $selected == $v ? ' selected' : '' ) . '>' . $v . $config ['unit'] . '</option>';
			}
		} elseif ( $config ['type'] == 'filelist' ) {
			$html [] = '<select class="widefat" id="' . $id . '" name="' . $name . '">';
			
			$dir = $config ['folder'];
			$files = scandir( $dir );
			$filter_ext = empty( $config ['extension'] ) ? '' : $config ['extension'];
			
			foreach ( $files as $filename ) {
				$parts = explode( '.', $filename );
				$ext = array_pop( $parts );
				$name = str_replace( array (
						'.',
						'_' 
				), ' ', implode( '.', $parts ) );
				
				if ( $filter_ext && $ext != $filter_ext ) {
					continue;
				}
				$html [] = '<option value="' . $filename . '"' . ( $selected == $filename ? ' selected' : '' ) . '>' . ucwords( esc_html( $name ) ) . '</option>';
			}
		} elseif ( $config ['type'] == 'optgroups' ) {
			// plain lists and option groups supported
			$html [] = '<select class="widefat" id="' . $id . '" name="' . $name . '">';
			
			foreach ( $config ['options'] as $value => $option ) {
				if ( is_array( $option ) ) {
					// this is an option group
					$html [] = '<optgroup label="' . esc_html( $value ) . '">';
					foreach ( $option as $v => $text ) {
						$html [] = '<option value="' . $v . '"' . ( $v == $selected ? ' selected' : '' ) . '>';
						$html [] = esc_html( $text );
						$html [] = '</option>';
					}
					$html [] = '</optgroup>';
				} else {
					// this is a plain select option
					$html [] = '<option value="' . $value . '"' . ( $value == $selected ? ' selected' : '' ) . '>';
					$html [] = esc_html( $option );
					$html [] = '</option>';
				}
			}
		}
		
		$html [] = '</select>';
		
		return implode( "\n", $html );
	}
	public static function checkboxesInput( $widget, $values, $config = array() ) {
		$lang_key_units = array (
				'years' => __( 'years', 'smart-countdown' ),
				'months' => __( 'months', 'smart-countdown' ),
				'weeks' => __( 'weeks', 'smart-countdown' ),
				'days' => __( 'days', 'smart-countdown' ),
				'hours' => __( 'hours', 'smart-countdown' ),
				'minutes' => __( 'minutes', 'smart-countdown' ),
				'seconds' => __( 'seconds', 'smart-countdown' ) 
		);
		$html = array ();
		if ( !empty( $config ['legend'] ) ) {
			$html [] = '<fieldset><legend>' . $config ['legend'] . '</legend>';
		}
		foreach ( $values as $unit => $value ) {
			$field_id = $widget->get_field_id( 'units_' . $unit );
			$field_name = $widget->get_field_name( 'units_' . $unit );
			$html [] = '<p><input type="checkbox" class="checkbox" id="' . $field_id . '" name="' . $field_name . '"' . ( $value ? ' checked' : '' ) . ' />';
			$html [] = '<label for="' . $field_id . '">' . $lang_key_units [$unit];
			$html [] = '</label></p>';
		}
		if ( !empty( $config ['legend'] ) ) {
			$html [] = '</fieldset>';
		}
		return implode( "\n", $html );
	}
}