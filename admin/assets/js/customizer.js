var $ = jQuery.noConflict(), timer;

$(function() {

	$('body').ready(function(){
		connect_sortable();
	});

	function connect_sortable() {
		$('.sortable').sortable({
			connectWith: '.connectable',
			opacity: 0.5,
			handle: '.fcm-title',
			placeholder: 'placeholder',
			receive: function( event, ui ) {
				var area = $(ui.item).parents('ul').data('area');
				var parent = $(ui.item).parents('ul.sortable li').find('input[name^=post_id]').val();

				$(ui.item).find('input[name^=area]').first().val(area);

				if( parent === undefined ){
					$(ui.item).children('.fcm-inside').find('input[name^=child]').val('false');
				} else {
					$(ui.item).find('input[name^=child]').val( 'true' );
				}
			},
			sort: function( event, ui ) {
			},
			stop: function( event, ui ) {
				update_preview();
				changeState = true;
			}
		});
	}

	function update_preview(){
		$('ul.featured-area').each( function(index) {
			var customize_control = $(this).parents('li.customize-control');
			var customize_setting = $(customize_control).children('input.customizer-setting');
			var featured_item_index = 1;

			// ReIndexing Areas and menu_order;
			$(this).children('li').each( function(i) {
				$(this).first('fieldset').find('input, textarea, select').each( function(x) {
					var name = $(this).attr('name'), pattern = /\[(.*?)\]/g;
					$(this).attr('name', name.replace(/\[(.+?)\]/g, '['+featured_item_index+']') );
				});
				$(this).first('fieldset').find('input[name^=menu_order]').val(i);

				featured_item_index = featured_item_index + 1;
				$(this).find('li').each( function(y) {
					$(this).first('fieldset').find('input, textarea, select').each( function(x) {
						var name = $(this).attr('name'), pattern = /\[(.*?)\]/g;
						$(this).attr('name', name.replace(/\[(.+?)\]/g, '['+featured_item_index+']') );
					});
					$(this).first('fieldset').find('input[name^=menu_order]').val(y);
					featured_item_index = featured_item_index + 1;
				});
			});

			var serialized_form = $(customize_control).find('ul.featured-area:first :input').serialize();
			if( $(customize_setting).val() != serialized_form ){
				$.ajax({
					type: 'POST',
					dataType: 'json',
					url: ajaxurl,
					data: serialized_form,
					success: function(data){
						if(data.error === false){
							$(customize_setting).val( serialized_form );
							$(customize_setting).trigger("change");
						}
					}
				});
			}
		});
	}

	function start_update_preview_timer(){
		clearTimeout(timer);
		var ms = 500; // milliseconds
		var val = this.value;
		timer = setTimeout(function() {
			update_preview();
		}, ms);
	}

	$(document).on('click', '.sidebar-name-arrow, .fcm-title h4', function(){
		$(this).closest('li').toggleClass('closed');
	});

	$(document).on('click', '.sidebar-parent-arrow', function(){
		$(this).parents('li').toggleClass('parent');
	});

	$(document).on('click', '.remove', function(){
		$(this).closest('li').remove();
		start_update_preview_timer();
	});

	$(document).on('click', '.sidebar-delete-icon', function(){
		$(this).closest('li').remove();
		start_update_preview_timer();
	});

	$('body').on('click', '.edit-thumbnail', function(e) {

		var send_attachment_bkp = wp.media.editor.send.attachment, container = $(this).closest('li');

		wp.media.editor.send.attachment = function(props, attachment) {
			$(container).find('.edit-thumbnail').first().html( '<img src="' + attachment.url + '">' );
			$(container).find('input[name^=post_thumbnail]').first().val( attachment.id );
			$(container).find('input[name^=post_thumbnail]').first().trigger("change");
			$(container).find('.remove-thumbnail').show();

			wp.media.editor.send.attachment = send_attachment_bkp;
		};

		wp.media.editor.open();

		return false;
	});

	$('body').on('click', '.remove-thumbnail', function(e) {
		var container = $(this).closest('li');

		$(container).find('.edit-thumbnail').first().html( 'Ange utvald bild' );
		$(container).find('input[name^=post_thumbnail]').first().val( '' );
		$(container).find('input[name^=post_thumbnail]').first().trigger("change");
		$(container).find('.remove-thumbnail').first().hide();
	});

	$('body.wp-customizer').on('click', function(event){
		var target = $(event.target);
		if (target.closest('div#available-featured-items').length) {
			return;
		} else if ( $(target).hasClass('sidebar-delete-icon') ){
			return;
		} else if( $('body.wp-customizer').hasClass('adding-featured-items') ) {
			$('body').removeClass('adding-featured-items');
			$('.adding-featured-items-target').removeClass('adding-featured-items-target');
		} else if( $(target).hasClass('add-featured-items') ) {
			// console.log($(event.target).parent().children('ul.featured-area'));
			$(event.target).parent().parent().children('ul.featured-area').addClass('adding-featured-items-target');
			$('body').addClass('adding-featured-items');
			$('#featured-items-search').focus();
		}
	});


	$('body').on('click', 'li.featured-area-search-result-item', function(event){
		var post_id = $(this).data('id');
		var site_id = '';
		if ( $(this).data('site_id') ) {
			site_id = $(this).data('site_id');
		}
		var target = $('.adding-featured-items-target');

		$(this).addClass('added');

		var data = {
			action: 'get_post',
			post_id: post_id,
			site_id: site_id,
			target: ''
		};

		$.post( ajaxurl, data, function(response) {
			var new_index = $('.adding-featured-items-target li').length+1, template;
			template = wp.template( 'featured-item' );

			response.post.ID = 'new';
			response.index = new_index;

			var output = template( response );

			$(target).append( output );
			start_update_preview_timer();
			connect_sortable();
		}, "JSON");
	});

	$('body').on('click', 'a.featured-item-add-url-item', function(event){
		event.preventDefault();
		var post_id = 0;
		var new_index = $('.adding-featured-items-target li').length+1, template;
		template = wp.template( 'featured-item-url' );
		var target = $('.adding-featured-items-target');

		var site_id = 1;

		var response = {
			post: {
				'ID': 'new',
				'post_title': ''
			},
			post_original: {'ID': 0},
			post_thumbnail: '',
			index: new_index,
			site_id: site_id,
			url: ''
		};

		var output = template( response );

		$(target).append( output );
		start_update_preview_timer();
		connect_sortable();
	});

	function start_search_timer(){
		clearTimeout(timer);
		var ms = 500; // milliseconds
		var val = this.value;
		timer = setTimeout(function() {
			search_feature_item();
		}, ms);
	}

	function search_feature_item(){
		var search_term = $('#featured-items-search').val(), template, output;

		if( search_term.length <= 2 )
			return;

		// Shows a loading symbol in input field
		$('#featured-items-search').addClass('loading');

		var data = {
			action: 'search_content',
			search_term: search_term
		};

		$.post( ajaxurl, data, function(response) {

			// Hides a loading symbol in input field
			$('#featured-items-search').removeClass('loading');

			if( !response.error ){
				$('#featured-items-filter-result ul').html('');
				template = wp.template( 'featured-area-search-result-item' );
				$(response.result).each( function(index){
					output = template( this );
					$('#featured-items-filter-result ul').append(output);
				});
			} else {
				$('#featured-items-filter-result ul').html('<li class="error">'+response.message+'</li>');
			}
		}, "JSON");
	}

	function update_sortable_title(event){
		var title = $(event.currentTarget).val();
		$(event.currentTarget).closest('li').find('.fcm-title h4').eq(0).text( title );
	}

	$(document).on('keyup', '#featured-items-search', start_search_timer );
	$(document).on('keyup', '.sortable li input[type=text], .sortable li textarea, .sortable li input[type=url]', start_update_preview_timer );
	$(document).on('keyup', '.sortable li input[name^=post_title]', update_sortable_title );
	$(document).on('change', '.sortable li input[type=hidden], .sortable li select', start_update_preview_timer );

});