/**==============================================
*	cakeJAX v0.4.4 BETA
*	4/22/013
*	 
*	 ___ ___    _   ___ __  __ ___ _  _ _____
*	| __| _ \  /_\ / __|  \/  | __| \| |_   _|
*	| _||   / / _ \ (_ | |\/| | _|| .` | | |
*	|_| |_|_\/_/ \_\___|_|  |_|___|_|\_| |_|
*							FRAGMENTLABS.COM
*	
*	Author: Josh Bielick
*	
*==============================================*/

var cj = (function() {
	
	var cj = cj || {}
	cj.requests = {}
	window.listeners = {}
	cj.removeAfter = {}
	cj.validates = {}
	cj.debug = false
	
	cj.init = function(callback) {
//		$(cj).trigger('init');
		if(typeof CKEDITOR != 'undefined')
		{
			try{
				CKEDITOR.replaceAll();
			}catch(e){
				//don't care
			}
		}
		
		cj._binds();
		cj._formInit();
		
		if(typeof callback == 'function')
			callback.call(this);
	};
	cj.collect = function($form) {
//		$(cj).trigger('collect');
		$form = (typeof $form != 'undefined') ? $form : $('form')
		
		$form.each(function(i) {
			var $el = $(this)
			if(this.debug)
				console.log('collecting '+$el[0].id)

			var fdata = {data: {},files: []}
			
			fdata.params = {}
			fdata.formId = $el[0].id
			fdata.action = $el.attr('action')
			fdata.refresh = ($el.attr('data-cj-refresh')) ? true : false
			fdata.live = $el.attr('data-cj-live') || false

			var uri = fdata.action.substr(1).split('/'),
				inputData = ''

			fdata.params.prefix = uri[0] || ''
			fdata.params.controller = (fdata.params.prefix != '') ? uri[1] : uri[0]
			fdata.params.action = (fdata.params.prefix != '') ? uri[2] : uri[1]
			if(fdata.params.action == 'add')
				if(fdata.action.match('[0-9]+'))
					fdata.params.foreignId = fdata.action.match('[0-9]+')[0]
			else if (fdata.params.action == 'edit') {
				if(fdata.action.match('[0-9]+'))
					fdata.params.id = fdata.action.match('[0-9]+')[0]
			}

			var mcReg = /([a-z_0-9]+)+/ig,
				habtmRegCbox = /\[\]/,
				habtmRegNo = /[a-z_0-9]+\]\[[0-9]+\]\[[a-z_0-9]+\]/i,
				model = '',
				inputs = $el[0].elements,
				relationship

			for (var i = inputs.length - 1; i >= 0; i--) {
				if(inputs[i].name.indexOf('data') > -1) {
					saveInfo = inputs[i].name.replace('data','').match(mcReg);
					model = saveInfo[0],
					field = saveInfo[1],
					habtmField = (typeof saveInfo[2] != 'undefined') ? saveInfo[2] : undefined

					if(cj.debug)
						console.log({name: inputs[i].name, value: inputs[i].value, type: inputs[i].type});

					if(inputs[i].type !== 'submit' && inputs[i].type != 'file') {
						fdata.data[model] = fdata.data[model] || {}
						//if name attr matches format of HABTM checkbox input
						if(habtmRegCbox.test(inputs[i].name) || model == field) {
							relationship = 'HABTM Simple'
							//Create the necessary structure for an empty HABTM save
							if (!(model in fdata.data[model]))
								 fdata.data[model][model] = ''
							//if a checkbox is found*
							if(inputs[i].type == 'checkbox' && inputs[i].checked
								|| inputs[i].type == 'hidden' && inputs[i].value != '') {
								//turn the empty string into an array*
								if(typeof fdata.data[model][model] != 'object')
									fdata.data[model][model] = []
								//and add the ID of that HABTM record
								fdata.data[model][model].push(inputs[i].value)
							}
						}
						else if (habtmRegNo.test(inputs[i].name) && habtmField)  // HABTM with number indices 
						{
							relationship = 'HABTM Deep'
							var habtmIndex = inputs[i].name.match(/\[[0-9]+\]/i)[0].match(/[0-9]+/)[0]
							fdata.data[model][habtmIndex] = fdata.data[model][habtmIndex] || {}
							fdata.data[model][habtmIndex][habtmField] = inputs[i].value
						}
						else if (!/_$/.test(inputs[i].id))	//normal input field, add struct of data.model.field: 'value'
						{
							relationship = 'hasOne, hasMany, or ownProperty'
							if(inputs[i].type == 'checkbox') {
								//special handling for non-habtm checkboxes boolean.
								fdata.data[model][field] = (inputs[i].checked) ? 1 : 0
							}
							else if(inputs[i].tagName == 'TEXTAREA' 
									&& typeof window.ck != 'undefined'
									&& typeof window.ck[inputs[i].id] != 'undefined') //special handling for CKEDITOR instances
								fdata.data[model][field] = window.ck[inputs[i].id]
							else {
								fdata.data[model][field] = inputs[i].value
								if(field == 'id') {
									fdata._origin = {}
									fdata._origin['data['+model+'][id]'] = inputs[i].value
								}
							}
						}
					}
					else if (inputs[i].type == 'file' && inputs[i].value != '') {
						var fileMeta = {}
						//if action is add, the id in the URI may be the file's foreign (belongsTo) entry,
						// not the file's ID itself.
						fdata.files.push({
							fileElementId: inputs[i].id,
							action: fdata.action,
							data: {}
						})
					}
					if(cj.debug)
						console.log(relationship)
				}
			}
			if(cj.debug)
				console.log(JSON.stringify(fdata.data, null, '\t'))

			cj.requests[fdata.formId] = fdata
	//		$(cj).trigger('requestCollected', [cj.requests[fdata.formId]]);

			if(fdata.live) {
				cj.save({ formId: fdata.formId })
			}
		})
	}
	cj.save = function(ops, callback) {
//		$(cj).trigger('saveStart');
		
		cj.flash('saving...')
		
		var defs = {formId: false,},requests = {},refresh
		defs = $.extend({}, defs, ops)
		if(defs.formId) {
			requests[defs.formId] = this.requests[defs.formId];
			delete this.requests[defs.formId];
		}
		else requests = this.requests;

		if(Object.size(requests) > 0) {
			if(cj.debug)
				console.log(JSON.stringify(requests, null, '\t'))
				
			for (var formId in requests) {
				if( requests.hasOwnProperty(formId) ) {
					var req = requests[formId]
					cj.setButton({status:'duringsave', disabled: true, scope: $('#'+formId)})
					if(!req.files || req.files && req.files.length == 0) {
	//					$(cj).trigger('saveSimpleStart', req);
						$.ajax({
							url: req.action,
							type: 'POST',
							dataType: 'text',
							data: req.data,
							cache: false,
							success: function(data) {
								cj.ajaxResponse(data, formId, function(response, success) {
									if(success) {
	//									$(cj).trigger('saveSimpleSuccess')
										cj.setButton({status:'aftersave', disabled: false, highlight: false, scope: $('#'+formId)})
									}
									if(success && req.refresh)
										cj.refresh()
								})
								if(typeof callback != 'undefined')
									callback.call(this, response, success)
							},
							error: function(e, xhr, ms) {
	//							$(cj).trigger('error', [e, xhr, ms]).trigger('saveSimpleFail');
								console.log(e)
								cj.setButton({status:'savefail', disabled: false, scope: $('#'+formId)})
								if(e.status == 403) {
									cj.flash({
										msg: 'Please login to continue.',
										html:true,
										autoRemove:false
									})
									$('<div></div>').load('/users/login', null, function(page)
									{
										$('.flashMessageModal').append($(this))
										$('.flashMessageModal form').addClass('cj')
										cj._formInit()
									})
									return false
								}
								else cj.flash({ msg: ms+e.responseText,html: true,autoRemove: false})
							}
						})
					}
					else if(req.files && req.files.length > 0) {
//						$(cj).trigger('saveFile')
//						var originData = (typeof req._origin != 'undefined') ? req._origin : {}
						for (var i = req.files.length - 1; i >= 0; i--) {
							req.files[i].data = $('#'+formId).serializeArray()
							cj.uploadFile(req.files[i], formId, req.refresh)
						}
					}
					delete cj.requests[formId]
				}
			}
		}
		else
			cj.flash('No changes to save!')
	}
	cj.validate = function(request) {
		for(var form in request)
		if(request in cj.validates) {
			for(var vtype in cj.validates[request]) {
				if(validates.hasOwnProperty(vtype)) {
					if(vtype == 'notempty') {
						for(var input in validates[request][vtype]) {
							if($(input).val() == '')
							{
								cj.flash('The field '+input.match(/\[[A-Za-z0-9]+\]$/i)[0]+' is required');
								$(input).focus();
								return false;
							}
						}
					}
				}
			}
		}
		else return true;
	};
	cj.del = function(params) {
//		$(cj).trigger('delete', params);
		var prettyController = (typeof params.item != 'undefined') ? params.item : 'item',
			refresh = (typeof params.refresh == 'undefined') ? true : params.refresh
			
		if(cj.debug)
			console.log('Deleting: ', params)
			
		if(confirm("Are you sure you want to delete this "+prettyController+"?")) {
			var $deletable = $(params.caller).parents('.deletable').eq(0)
			$deletable.fadeOut(function(){$(this).remove()})
			
			if(typeof params.controller != 'undefined' && typeof params.id != 'undefined') {
				var prefix = (typeof params.prefix != 'undefined') ? '/'+params.prefix : '',
					url = prefix+'/'+params.controller+'/delete/'+params.id

				$.post(url, function(data) {
					cj.ajaxResponse(data, undefined, function(response, success) {
						if(success && refresh) cj.refresh(refresh)
					})
				})
			}
		}
	}
	cj._formInit = function(form, callback) {
//		$(cj).trigger('formInit', [form])
		if(typeof CKEDITOR != 'undefined' && CKEDITOR.instances ) {
			var eds = CKEDITOR.instances
			for(var i in eds)
				if(eds.hasOwnProperty(i)) {
					cj.ck = {}
					cj.ck[i] = eds[i].getData()
					var CKinterval = setInterval(function() {
						if(cj.ck[i] != eds[i].getData()) {
							cj.ck[i] = eds[i].getData()
							$(eds[i].element.$).trigger('change')
						}
					}, 800)
				}
		}
		var $forms = $('form.cj')
		
		if(!cj.timers)
			cj.timers = {}

		$forms.each(function(index) {
			if(typeof $(this).data('listening') == 'undefined' || $(this).data('listening') == false) {
				var $el = $(this)
				$el.data('listening', true)
				.on('submit', function(e) {
					e.preventDefault()
					var trigger = $(this).attr('data-cj-trigger'),
						$form = $(this)
					if(typeof trigger != 'undefined') {
						switch(trigger) {
							case 'all':
								$('form').each(function(index) {
									cj.collect($(this))
								})
							break
						}
					}
					cj.collect($form)
					if($form.hasClass('temporary')) {
						cj.save({refresh: true})
					} else cj.save()
				})
				var formId = $el.attr('id')
				cj.setButton({status: 'beforechange', disabled: false, scope: $el})
				$('input, textarea, select', $el).on('change keyup input', function(e) {
					cj.setButton({status: 'beforesave', disabled: false, scope: $el})
					cj.collect($el)
				})
				$el.trigger('init', [$el])
			}
		})
	}
	cj.setButton = function(options) {
		var defs = {
				status: 'beforechange',
				disabled: false,
				highlight: true,
				scope: $('form')
			},
			obj,
			messages = {
				beforechange: 'Saved',
				duringsave: 'Saving...',
				beforesave: 'Save Changes',
				aftersave: 'Saved!',
				savefail: 'Retry Save'
			},
			text
		
		ops = $.extend({}, defs, options)
		
		$('[onclick^="cj.save"], [type="submit"]', defs.scope).each(function() {
			if(!$(this).attr('data-cj-nochange')) {
				text = ($(this).attr('data-cj-'+ops.status)) ? $(this).attr('data-cj-'+ops.status) : messages[ops.status]
				el = $(this)[0]
				if(defs.highlight) $(el).addClass('tosave')
				else $(el).removeClass('tosave')
				if( el.tagName == 'INPUT') el.value = text
				else $(el).text(text)
				if(el.tagName == 'BUTTON') el.disabled = ops.disabled
			}
		})
	}
	cj.refresh = function(options) {
		var defs = {
			selector: '#view',
			url: window.location.pathname
		}
		
		var ops = $.extend({}, defs, options)
//		$(cj).trigger('refresh');
		if(cj.debug)
			console.log('refreshing', ops.selector, ops.url)
			
		$.ajax({
			url: ops.url,
			type: 'GET',
			cache: false,
			dataType: 'text',
			success: function(data) {
				var $content = $(ops.selector, data).children()
				if(cj.debug)
					console.log(ops.selector)
				if($content.length > 0)
					$(ops.selector).empty().append($content)
				cj._formInit()
			}
			})
	}
	cj.resetForm = function($form) {
		if(cj.debug) console.log('Form Reset', $form)
		var formId = $form[0].id, $parent = $('#'+formId).parent()

		$('#'+formId).remove()
		$parent.append($form)
		cj.init()
		cj._formInit()
		if(typeof CKEDITOR != 'undefined'){	//reinit ckeditor on form
			try{
				CKEDITOR.replaceAll();
			}catch(e){
				//don't care
			}
		}
	}
	cj.get = function(options, callback) {
		var ops = {
			selector: 'form',
			insertLoc: false,
			addClass: ''
		}
		ops = $.extend({}, ops, options)
		
		$.ajax({
			method: 'GET',
			url: ops.url,
			dataType: 'text',
			cache: false,
			success: function(data) {
				var $content = $(ops.selector, data).addClass('temporary none '+ops.addClass)
				if(ops.insertLoc) {
					$(ops.insertLoc).prepend($content.parent())
					$content.slideDown()
				}
				else cj.flash({msg: data, html: true, autoRemove: false, mask: true})
				
				cj._formInit()
				if(typeof callback == 'function')
					callback.call(this, $content)
			},
			error: function(e, xhr, message) {
				console.log(e)
				cj.ajaxResponse(e)
			}
		})
	}
	cj._binds = function() {
		cj.bind('click', '[data-cj-get]', function(e) {
			e.preventDefault()
			var insertLoc = $(this).attr('data-cj-insert') || false,
				url = $(this).attr('data-cj-get'),
				addClass = $(this).attr('data-cj-addclass') || '',
				getonce = ($(this).attr('data-cj-getonce')) ? true : false,
				selector = $(this).attr('data-cj-selector') || 'form'
			
			if(!$(this).hasClass('got') || !getonce) {
				cj.get({
					url: url,
					addClass: addClass,
					insertLoc: insertLoc,
					selector:selector
				})
			}
			if(getonce) $(this).addClass('got');
		})
		cj.bind('click', '.modal-close, #mask', function(e) {
			cj.close()
		})
		$(document).on('keyup', function(e) {
			if(e.keyCode == 27)
				cj.close()
		})
//		.on('change', 'input[type="file"]', filePreview);
	}
	cj.bind = function(e, el, callback) {
		if(!window.listeners[e+el]) {
			window.listeners[e+el] = new Date().getTime()
			$(document).on(e, el, function(e, a, b, c, d) {
				callback.call(this, e, a, b, c, d);
			})
		}
		else return false;
	}
	cj.sort = function(selector, items, handle) {
		var items = items || 'tr',
			handle = (typeof handle == 'undefined') ? '' : handle

		$(selector).sortable({
			items: items,
			helper: fixHelper,
			cursor: 'move',
			handle: handle,
			update: function(event, ui) {
				var controller = $(this).attr('data-cj-controller')
				if(controller) {
					var sortableInstance = (ui.item[0].parentNode.id || ui.item[0].parentNode.className);
					cj.requests[sortableInstance] = {
						action: '/admin/'+$(this).attr('data-cj-controller')+'/reorder',
						data: $(this).sortable('serialize'),
						type: 'order'
					}
					cj.setButton({
						status: 'beforesave',
						disabled: false
						})
				}
				else cj.flash({msg: 'You forgot to define a \'data-cj-controller\' attribute on your sortable container!', error: true});
			}
		}).disableSelection()
	}
	cj.uploadFile = function(req, formId, refresh) {
		var $el = $('#'+req.fileElementId)
		$el.ajaxStart(function(){
			//
		})
		.ajaxComplete(function(){
			//
		})
		var nocache = new Date().getTime()
//		$(cj).trigger('saveFileStart');
		cj.ajaxFile.upload({
			url: req.action+'?_='+nocache,
			secureuri:false,
			data: req.data,
			fileElementId: req.fileElementId,
			dataType: 'text',
			async: false,
			complete: function (data, status) {
				cj.ajaxResponse(data.responseText, formId, function(response, success) {
					if(success && refresh)
						cj.refresh()
				})
				cj.setButton({status:'aftersave',disabled: false,highlight: false})
			},
			error: function (err, status, e) {
				cj.setButton({status:'savefail',disabled: false,highlight: true})
				console.log(err, status, e)
			}
		})
		return false
	}
	cj.ajaxFile = {
		createUploadIframe: function(id, uri) {
			//create frame
			var frameId = 'jUploadFrame' + id
			var iframeHtml = '<iframe id="' + frameId + '" name="' + frameId + '" style="position:absolute; top:-9999px; left:-9999px"'
			if(window.ActiveXObject) {
				if(typeof uri== 'boolean'){
					iframeHtml += ' src="' + 'about:blank' + '"'
				}
				else if(typeof uri== 'string'){
					iframeHtml += ' src="' + uri + '"'
				}	
			}
			iframeHtml += ' />'
			jQuery(iframeHtml).appendTo(document.body)

			return jQuery('#' + frameId).get(0)
		},
		createUploadForm: function(id, fileElementId, data) {
			//create form	
			var formId = 'jUploadForm' + id, fileId = 'jUploadFile' + id,
				form = jQuery('<form  action="" method="POST" name="' + formId + '" id="' + formId + '" enctype="multipart/form-data"></form>');	
			if(data) {
				for(var input in data) {
					if(data.hasOwnProperty(input))
						jQuery('<input type="hidden" name="' + data[input]['name'] + '" value="' + data[input]['value'] + '" />').appendTo(form);
				}
			}
			var oldElement = jQuery('#' + fileElementId),
				newElement = jQuery(oldElement).clone()
			jQuery(oldElement).attr('id', fileId)
			jQuery(oldElement).before(newElement)
			jQuery(oldElement).appendTo(form)
			jQuery(form).css('position', 'absolute')
			jQuery(form).css('top', '-1200px')
			jQuery(form).css('left', '-1200px')
			jQuery(form).appendTo('body')
			return form
		},
		upload: function(s) {
			// TODO introduce global settings, allowing the client to modify them for all requests, not only timeout		
			s = jQuery.extend({}, jQuery.ajaxSettings, s)
			var id = new Date().getTime(),
				form = cj.ajaxFile.createUploadForm(id, s.fileElementId, (typeof(s.data)=='undefined'?false:s.data)),
				io = cj.ajaxFile.createUploadIframe(id, s.secureuri),
				frameId = 'jUploadFrame' + id,
				formId = 'jUploadForm' + id
			// Watch for a new set of requests
			if ( s.global && ! jQuery.active++ ) {
				jQuery.event.trigger( "ajaxStart" )
			}
			var requestDone = false,
				xml = {}
			if ( s.global )
				jQuery.event.trigger("ajaxSend", [xml, s]);
			var uploadCallback = function(isTimeout) {
				var io = document.getElementById(frameId);
				try {
					if(io.contentWindow) {
						xml.responseText = io.contentWindow.document.body?io.contentWindow.document.body.innerHTML:null;
						xml.responseXML = io.contentWindow.document.XMLDocument?io.contentWindow.document.XMLDocument:io.contentWindow.document;
					} else if(io.contentDocument) {
						xml.responseText = io.contentDocument.document.body?io.contentDocument.document.body.innerHTML:null;
						xml.responseXML = io.contentDocument.document.XMLDocument?io.contentDocument.document.XMLDocument:io.contentDocument.document;
					}
				}
				catch(e) {
					cj.ajaxFile.handleError(s, xml, null, e);
				}
				if ( xml || isTimeout == "timeout") {
					requestDone = true
					var status
					try {
						status = isTimeout != "timeout" ? "success" : "error";
						// Make sure that the request was successful or notmodified
						if ( status != "error" ) {
							// process the data (runs the xml through httpData regardless of callback)
							var data = cj.ajaxFile.uploadHttpData( xml, s.dataType )
							// If a local callback was specified, fire it and pass it the data
							if ( s.success )
								s.success( data, status );
							// Fire the global callback
							if( s.global )
								jQuery.event.trigger( "ajaxSuccess", [xml, s] );
						} else
							cj.ajaxFile.handleError(s, xml, status);
					}
					catch(e) {
						status = "error"
						cj.ajaxFile.handleError(s, xml, status, e)
					}
					// The request was completed
					if( s.global )
						jQuery.event.trigger( "ajaxComplete", [xml, s] );
					// Handle the global AJAX counter
					if ( s.global && ! --jQuery.active )
						jQuery.event.trigger( "ajaxStop" );
					// Process result
					if ( s.complete )
						s.complete(xml, status)
					jQuery(io).unbind()
					setTimeout(function() {
						try {
							jQuery(io).remove()
							jQuery(form).remove()
						}
						catch(e) {
							cj.ajaxFile.handleError(s, xml, null, e)
						}
					}, 100)
					xml = null
				}
			}
			// Timeout checker
			if ( s.timeout > 0 ) {
				setTimeout(function(){
					// Check to see if the request is still happening
					if( !requestDone ) uploadCallback( "timeout" )
					}, s.timeout)
			}
			try {
				var form = jQuery('#' + formId)
				jQuery(form).attr('action', s.url)
				jQuery(form).attr('method', 'POST')
				jQuery(form).attr('target', frameId)
				if(form.encoding) {
					jQuery(form).attr('encoding', 'multipart/form-data')
				} else {
					jQuery(form).attr('enctype', 'multipart/form-data')
				}
				jQuery(form).submit()
			}
			catch(e) {
				cj.ajaxFile.handleError(s, xml, null, e)
			}
			jQuery('#' + frameId).load(uploadCallback)
			return {abort: function () {}}
		},
		uploadHttpData: function( r, type ) {
			var data = !type
			data = type == "xml" || data ? r.responseXML : r.responseText
			if ( type == "script" )
				jQuery.globalEval( data )
			if ( type == "json" )
				eval( "data = " + data )
			if ( type == "html" )
				jQuery("<div>").html(data).evalScripts()
			return data
		},
		handleError: function( s, xhr, status, e ) {
		// If a local callback was specified, fire it
		if ( s.error )
			s.error.call( s.context || window, xhr, status, e );
		// Fire the global callback
		if ( s.global )
			(s.context ? jQuery(s.context) : jQuery.event).trigger( "ajaxError", [xhr, s, e] )
		}
	}
	cj.ajaxResponse = function(data, formId, callback) {
		var theFormId = (typeof formId == 'undefined') ? false : formId,
			response, flashMessage = undefined, success = true, stop = false
		if(typeof data == 'object') {
			response = data.responseText
		}else{
			try {
				response = $.parseHTML(data, document, false);
			} catch(e) {
				response = data;
			}
		}
		flashMessage = $('#flashMessage', response).text();
		if(typeof flashMessage == 'string' && flashMessage != '')
			cj.flash({msg: flashMessage, mask: false })
			
		var $notices = $('.cake-error, .notice, pre', response),
			errors = '<pre>'

		if($notices.length > 0) {
			$notices.each(function() {
				errors += '\t'+$notices.text()+'\n';
			})
			errors += '</pre>'
			console.log(errors)
			cj.flash({msg:errors, html: true, autoRemove: false, mask:true})
			success = false
		}

		if(flashMessage.toString().indexOf('could not be') > -1)
			success = false

		if(theFormId) {
			$freshForm = $('#'+theFormId, response)
			if($freshForm.length > 0)
				cj.resetForm($freshForm.addClass('temporary'))
		}
		
		if(typeof callback == 'function')
			callback.call(this, response, success)
	}
	cj.flash = function(options) {
		var modalCount = $('.flashMessageModal > div').length
		var defs = {
			msg: 'No message supplied',
			mask: false,
			autoRemove: true,
			linger: '2300',
			html: false
		}

		if(cj.debug)
			ops.autoRemove = false;

		if (typeof options == 'object')
			ops = $.extend({}, defs, options)
		else if (typeof options == 'string')
		{
			ops = defs;
			ops.msg = options;
		}

		if($('.flashMessageModal').length == 0)
		{
			var $modal = $('<div></div>', 
				{
					'class': 'flashMessageModal',
					id: 'flashMessageModal-'+modalCount
				}),
				$close = $('<div></div>').addClass('modal-close').html('&times;'),
				$mask = $('<div></div>').attr('id', 'mask');

			$modal.append($close);

			var htmlPattern = new RegExp('<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)</\1>', 'i');
			if(ops.html || htmlPattern.test( ops.msg ) )
				$modal.html(ops.msg);
			else
				$modal.append('<div id="flashMessage-'+modalCount+'">'+ops.msg+'</div>');
			
			$mask.css({height: document.height+'px'});
			$('body').append($modal);
			
			$modal.css({maxHeight: (window.innerHeight - 50)+'px'});

			$modal.fadeIn('slow', function(){ $(this).addClass('open-modal'); });

			if(ops.mask)
			{
				$('body').append($mask);
				$mask.fadeIn('slow');
			}
		}
		else
		{
			$('.flashMessageModal').append('<div id="flashMessage-'+modalCount+'">'+ops.msg+'</div>');
		}

		if (ops.autoRemove)
		{
			cj.removeAfter[modalCount] = setTimeout(function()
				{
					$('#flashMessage-'+modalCount).fadeOut(function() {
						$(this).remove();
						if($('.flashMessageModal > div').length == 1)
							cj.close();
					});
				}, ops.linger);
		}
	};
	cj.close = function() 
	{
		$('.flashMessageModal, #mask').each(function(){
			$(this).fadeOut('fast',function(){$(this).remove()});
		});
	};
	return cj;
})();

var fixHelper = function(e, ui) 
{
	var $original = ui,
		$helper = ui.clone();
	
	$helper.height($original.height());
	$helper.width($original.width());
	
	return $helper;
};

function filePreview(e)
{
	var files = e.target.files
	
	for (var i=0; f = files[i]; i++) 
	{
		if(!f.type.match('image.*'))
			continue
			
		var reader = new FileReader()
		
		reader.onload = (function(theFile) {
			return function(e) {
				$(evt.target).css({
					backgroundImage: 'url('+e.target.result+')',
					backgroundRepeat: 'no-repeat',
					backgroundSize: 'cover'
				})
				.siblings('label').text('File: '+theFile.name)
//				var $div = $('<div class="thumb">'+theFile.name+'</div>').append('<img src="'+e.target.result+'" />');
///				$div.insertAfter($(evt.target))
			}
		})(f);
		
		reader.readAsDataURL(f);
	};
};

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
