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

var cj = (function()
{
	var cj = {
		data: {},
		listeners: {},
		removeAfter: {},
		validates: {},
		callbacks: {},
		debug: false
	}
	
	cj.init = function()
	{
		if(cj.debug)
			console.log('cj Initialized');
			
		if(typeof CKEDITOR != 'undefined')
		{
			try{
				CKEDITOR.replaceAll();
			}catch(e){
				//don't care
			}
		}
		
		cj._binds()
		cj._formInit()
		
		if(typeof arguments[arguments.length-1] == 'function')
			arguments[arguments.length-1].call(this);
	}
	cj.collect = function($form)
	{
		$form = (typeof $form != 'undefined') ? $form : $('form');
		
		$form.each(function(i) {
			var $el = $(this)
			if(cj.debug)
				console.log('collecting '+$el[0].id)

			var fdata = {data: {},files: []}
			
			fdata.params = {};
			fdata.formId = $el[0].id;
			fdata.action = $el.attr('action');
			fdata.refresh = ($el.data('cj-refresh')) ? true : false;
			fdata.live = ($el.data('cj-live')) ? $el.data('cj-live') : false;

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

					// if(cj.debug)
					// 	console.log({name: inputs[i].name, value: inputs[i].value, type: inputs[i].type});

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
						fdata.files.push({fileElementId: inputs[i].id});
					}
//					if(cj.debug)
//						console.log(relationship);
				}
			}
			if(cj.debug)
				console.log(fdata.data)//JSON.stringify(fdata.data, null, '\t'));

			cj.data[fdata.formId] = fdata;

			if(fdata.live) {
				cj.save({ formId: fdata.formId })
			}
		})
	}
	cj.save = function(ops)
	{
		cj.flash({msg: 'Saving...',autoRemove: false,addClass: 'save'});
		
		var defs = { formId: false }, data = {}, refresh
		
		var defs = {formId: false,},requests = {},refresh
		defs = $.extend({}, defs, ops)
		if(defs.formId) {
			data[defs.formId] = cj.data[defs.formId];
			delete cj.data[defs.formId];
		}
		else
			data = cj.data;

		if(objectSize(data) > 0) {
			if(cj.debug)
				console.log(data)//JSON.stringify(data, null, '\t'));
				
			for (var formId in data)
			{
				if( data.hasOwnProperty(formId) )
				{
					var req = data[formId];
					
					cj.setButton({status:'duringsave', disabled: true, scope: $('#'+formId)});

					if(!req.files || req.files && req.files.length == 0)
					{
						$.ajax({
							url: req.action,
							type: 'POST',
							dataType: 'text',
							data: req.data,
							cache: false,
							success: function(data)
							{
								cj.ajaxResponse(data, formId, function(response, success)
								{
									if(success) {
										cj.setButton({status:'aftersave', disabled: false, highlight: false, scope: $('#'+formId)});
									}
									if(success && req.refresh)
										cj.refresh();
								});
								if(typeof arguments[arguments.length-1] == 'function')
									arguments[arguments.length-1].call(this, response, success);
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
					else if(req.files && req.files.length > 0)
					{
//						var originData = (typeof req._origin != 'undefined') ? req._origin : {};
//						req.files.data = $('#'+formId).serializeArray();
						cj.uploadFiles(req, req.refresh);
					}
					delete cj.data[formId];
				}
			}
		}
		else
			cj.flash('No changes to save!')
	}
	cj._validate = function(ops) {
		// for(var form in request)
		// 		if(request in cj.validates) {
		// 			for(var vtype in cj.validates[request]) {
		// 				if(validates.hasOwnProperty(vtype)) {
		// 					if(vtype == 'notempty') {
		// 						for(var input in validates[request][vtype]) {
		// 							if($(input).val() == '')
		// 							{
		// 								cj.flash('The field '+input.match(/\[[A-Za-z0-9]+\]$/i)[0]+' is required');
		// 								$(input).focus();
		// 								return false;
		// 							}
		// 						}
		// 					}
		// 				}
		// 			}
		// 		}
		// 		else
		// 			return true;
	}
	cj.callback = function(method, $form) {
		for(key in cj.callbacks) {
			if(cj.callbacks.hasOwnProperty(key)) {
				if($form.is(key) && ( method in cj.callbacks[key] ) && typeof cj.callbacks[key][method] == 'function' ) {
					return cj.callbacks[key][method].call(this, $form);
				} else
					return true
			}
		}
	}
	cj.del = function(params) 
	{
		var prettyController = (typeof params.item != 'undefined') ? params.item : 'item',
			refresh = (typeof params.refresh == 'undefined') ? true : params.refresh
			
		if(cj.debug)
			console.log('Deleting: ', params)
			
		if(confirm("Are you sure you want to delete this "+prettyController+"?")) {
			var $deletable = $(params.caller).parents('.deletable').eq(0)
			$deletable.fadeOut(function(){$(this).remove()})
			
			if(typeof params.controller != 'undefined' && typeof params.id != 'undefined')
			{
				var prefix = (typeof params.prefix != 'undefined') ? '/'+params.prefix : '';
				var url = prefix+'/'+params.controller+'/delete/'+params.id;
				
				$.ajax({
					url: url,
					type: 'DELETE',
					cache: false,
					success: function(data) {
						cj.ajaxResponse(data, undefined, function(response, success) {
							if(success && refresh)
								cj.refresh(refresh);
						})
					},
					error: function(e, xhr, req)
					{
						console.log(e, xhr, req);
					}
				});
			}
		}
	}
	cj._formInit = function(form)
	{
		$(document).off('change keyup input', 'input, textarea, select, radio, checkbox')
		if(typeof CKEDITOR != 'undefined' && CKEDITOR.instances )
		{
			var eds = CKEDITOR.instances;
			for(var i in eds)
				if(eds.hasOwnProperty(i)) {
					cj.ck = {}
					cj.ck[i] = eds[i].getData()
					var CKinterval = setInterval(function() {
						if(cj.ck[i] != eds[i].getData()) {
							cj.ck[i] = eds[i].getData()
							$(eds[i].element.$).trigger('change')
						}
					}, 300);
				}
		}
		
		if(!cj.timers)
			cj.timers = {};
		
		var $forms = $('form.cj')
		
		$forms.each(function(index)
		{
			if(cj.debug)
				console.log('Initing Form \n \t (Checking Listen: '+$(this).data('listening')+')');
				
			if(typeof $(this).data('cj-listening') == 'undefined' || $(this).data('cj-listening') == false)
			{
				if(cj.debug)
					console.log('\t\tNow Listening To: '+$(this).attr('id'));
					
				var $el = $(this);
				$el.data('cj-listening', true)
				.on('submit', function(e)
				{
					e.preventDefault();
					var trigger = $(this).attr('data-cj-trigger'),
						$form = $(this);

					if(!cj.callback('beforeSave', $form))
						return false

					cj.collect($form);
					if($form.hasClass('temporary')) {
						cj.save({refresh: true});
					}
					else
						cj.save();
				});
				
				var formId = $el.attr('id');
				
				cj.setButton({status: 'beforechange', disabled: false, scope: $el});
				$el.trigger('init', [$el]);
			}
		});
		$(document).on('change keyup input', 'input, textarea, select, radio, checkbox', function(e) {
			var $scope = $(this).parents('form').first();
			switch(e.type) {
				case 'keyup': 
					setTimeout(function() {
						cj.collect($scope)
					}, 400);
					break;
				default:
					cj.collect($scope)
					break;
			}
			cj.setButton({status: 'beforesave', disabled: false, scope: $scope});
		});
	};
	cj.setButton = function(options)
	{
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
					console.log($content);
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
					$(ops.insertLoc).prepend($content)
					$content.slideDown()
				}
				else cj.flash({msg: data, html: true, autoRemove: false, mask: true})
				
				cj._formInit()

				if(typeof arguments[arguments.length-1] == 'function')
					arguments[arguments.length-1].call(this, $content);
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
		if(!cj.listeners[e+el]) {
			cj.listeners[e+el] = new Date().getTime();
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
					cj.data[sortableInstance] = {
						action: '/admin/'+$(this).data('cj-controller')+'/reorder',
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
		}).disableSelection();
	};
	cj.uploadFiles = function(req, refresh)
	{
		// $el.ajaxStart(function(){
		// 	//
		// })
		// .ajaxComplete(function(){
		// 	//
		// });
		var nocache = new Date().getTime();
		
		cj.ajaxFile.upload({
			url: req.action+'?_='+nocache,
			secureuri:false,
			data: $('#'+req.formId).serializeArray(),
			files: req.files,
			dataType: 'text',
			async: false,
			complete: function (data, status)
			{
				cj.ajaxResponse(data.responseText, req.formId, function(response, success)
				{
					if(success && refresh) {
						cj.refresh();
						cj._formInit();
					}
				});
				cj.setButton({status:'aftersave',disabled: false,highlight: false});
			},
			error: function (err, status, e)
			{
				cj.setButton({status:'savefail',disabled: false,highlight: true});
				console.log(err, status, e);
			}
		});
		return false;
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
		createUploadForm: function(id, files, data) {
			//create form	
			var formId = 'jUploadForm' + id, fileId = 'jUploadFile' + id,
				form = jQuery('<form  action="" method="POST" name="' + formId + '" id="' + formId + '" enctype="multipart/form-data"></form>');	
			if(data) {
				for(var input in data) {
					if(data.hasOwnProperty(input))
						jQuery('<input type="hidden" name="' + data[input]['name'] + '" value="' + data[input]['value'] + '" />').appendTo(form);
				}
			}
			for(var i = 0; i < files.length; i++) {
				var oldElement = jQuery('#' + files[i].fileElementId),newElement = jQuery(oldElement).clone();
				jQuery(oldElement).attr('id', fileId);
				jQuery(oldElement).before(newElement);
				jQuery(oldElement).appendTo(form);
			}
			jQuery(form).css('position', 'absolute');
			jQuery(form).css('top', '-1200px');
			jQuery(form).css('left', '-1200px');
			jQuery(form).appendTo('body');
			return form;
		},
		upload: function(s) {
			s = jQuery.extend({}, jQuery.ajaxSettings, s);
			var id = new Date().getTime()
			var form = cj.ajaxFile.createUploadForm(id, s.files, (typeof(s.data)=='undefined'?false:s.data))
			var io = cj.ajaxFile.createUploadIframe(id, s.secureuri)
			var frameId = 'jUploadFrame'+id, formId = 'jUploadForm'+id;		
			
			if ( s.global && ! jQuery.active++ )
			{
				jQuery.event.trigger( "ajaxStart" );
			}            
			var requestDone = false, xml = {}
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
	cj.ajaxResponse = function(data, formId) {
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

		if(typeof flashMessage == 'string' && flashMessage != '') {
			var flashOps = {msg: flashMessage, mask: false};
			if(flashMessage.toString().indexOf('saved') > -1) {
				flashOps.replace = 'save'
			}
			cj.flash(flashOps)
		}
			
		var $notices = $('p.error, .cake-error, .notice, pre', response),
			errors = '<pre>';

		if($notices.length > 0) {
			$notices.each(function() {
				errors += '\t'+$notices.text()+'\n\n';
			});
			errors += '</pre>';
			console.log(errors);
			cj.flash({msg:errors, html: true, autoRemove: false, mask:true});
			success = false;
		}

		if(flashMessage.toString().indexOf('could not be') > -1)
			success = false

		if(theFormId) {
			$freshForm = $('#'+theFormId, response)
			if($freshForm.length > 0)
				cj.resetForm($freshForm.addClass('temporary'))
		}
		
		if(typeof arguments[arguments.length-1] == 'function')
			arguments[arguments.length-1].call(this, response, success);
	}	
	cj.flash = function(options)
	{
		var modalCount = $('.flashMessageModal > div').length;
		var defs = {
			msg: 'No message supplied',
			mask: false,
			autoRemove: true,
			linger: 3000,
			html: false,
			addClass: '',
			replace: false,
			modalClass: false
		};

		if (typeof options == 'object')
			ops = $.extend({}, defs, options)
		else if (typeof options == 'string')
		{
			ops = defs;
			ops.msg = options;
		}
		if(ops.replace) {
			$('[id^="flashMessage-"].'+ops.replace).fadeOut(function(){$(this).remove()})
		}
		
		if(cj.debug)
			ops.autoRemove = false;
		
		if($('.flashMessageModal').length == 0)
		{
			var $modal = $('<div></div>',
				{
					'class': 'flashMessageModal',
					id: 'flashMessageModal-'+modalCount
				}),
				$close = $('<div></div>').addClass('modal-close').html('&times;'),
				$mask = $('<div></div>').attr('id', 'mask')

			$modal.append($close);

			var htmlPattern = new RegExp('<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)</\1>', 'i');
			if(ops.html || htmlPattern.test( ops.msg ) )
				$modal.html(ops.msg)
			else
				$modal.append('<div id="flashMessage-'+modalCount+'" class="'+ops.addClass+'">'+ops.msg+'</div>')
			
			if(ops.addClass) {
				$modal.addClass(ops.addClass)
			}
			
			$mask.css({height: document.height+'px'});
			$('body').append($modal)
			
			$modal.css({maxHeight: (window.innerHeight - 50)+'px'})

			$modal.fadeIn('slow', function(){ $(this).addClass('open-modal'); })

			if(ops.mask)
			{
				$('body').append($mask)
				$mask.fadeIn('slow')
			}
		}
		else {
			$('.flashMessageModal').append('<div id="flashMessage-'+modalCount+'" class="'+ops.addClass+'">'+ops.msg+'</div>');
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
	}
	cj.close = function() 
	{
		$('.flashMessageModal, #mask').each(function(){
			$(this).fadeOut('fast',function(){$(this).remove()});
		});
	}
	return cj;
})();

function fixHelper(e, ui)
{
	var $original = ui,
		$helper = ui.clone();
	
	$helper.height($original.height());
	$helper.width($original.width());
	
	return $helper;
}
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
}

if (!Array.prototype.indexOf) { 
    Array.prototype.indexOf = function(obj, start) {
         for (var i = (start || 0), j = this.length; i < j; i++) {
             if (this[i] === obj) { return i; }
         }
         return -1;
    }
}

function objectSize(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}
