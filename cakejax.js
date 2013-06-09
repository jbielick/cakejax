/**==============================================
*	CakeJax v0.5.3 BETA
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

function cj() {
	this.options = {}
	this.data = {}
	this.listeners = {}
	this.options.removeAfter = {}
	this.validates = {}
	this.callbacks = {}
	this.options.debug = false
}

cj.prototype.init = function() {
	if(cj.options.debug)
		console.log('cj Initialized');

	if(typeof CKEDITOR != 'undefined') {
		try{CKEDITOR.replaceAll()}catch(e){/*don't care*/}
	}

	cj._binds()
	cj._formInit()

	if(typeof arguments[arguments.length-1] == 'function')
		arguments[arguments.length-1].call(this);
}

cj.prototype.collect = function($form) {
	$form.each(function(i) {
		var $el = $(this)

		if(cj.options.debug)
			console.log('Collecting: '+$el[0].id)

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

				// if(cj.options.debug)
				// 	console.log({name: inputs[i].name, value: inputs[i].value, type: inputs[i].type});

				if(inputs[i].type !== 'submit' && inputs[i].type != 'file') {
					fdata.data[model] = fdata.data[model] || {}
					//if name attr matches format of HABTM checkbox input
					if(habtmRegCbox.test(inputs[i].name) || model == field) {
						relationship = 'HABTM Simple'
						//Create the necessary structure for an empty HABTM save
						if(!(model in fdata.data[model]))
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
//				if(cj.options.debug)
//					console.log(relationship);
			}
		}
		if(cj.options.debug)
			console.log(fdata.data)//JSON.stringify(fdata.data, null, '\t'));

		if(fdata.live) {
			return cj.save({ form: $($form) })
		}
		return fdata
	})
}
cj.prototype.save = function(ops) {
	
	var defs = { form: false }, data = {}, refresh

	ops = $.extend({}, defs, ops)

	if(ops.form) {
		var formId = $(ops.form).attr('id')
		data[formId] = cj.data[formId]
	}
	else
		data = cj.data;

	if(objectSize(data) > 0) {

		cj.flash({msg: 'Saving...', autoRemove: false, addClass: 'save'});

		if(cj.options.debug)
			console.log(data)

		for (var formId in data) {
			if( data.hasOwnProperty( formId ) ) {
				var req = data[formId];

				cj.setButton({status:'duringSave', disabled: true, scope: $('#'+formId)});

				if(!req.files || req.files && req.files.length == 0) {
					$.ajax({
						url: req.action,
						type: 'POST',
						dataType: 'text',
						data: req.data,
						cache: false,
						success: function(data)
						{
							cj.ajaxResponse(data, formId, function(response, success) {
								if(success) {
									cj.setButton({status:'afterSave', disabled: false, highlight: false, scope: $('#'+formId)})
									delete cj.data[formId]
								}
								if(success && req.refresh)
									cj.refresh()
								cj._callback('afterSave', $form, success)
							})
						},
						error: function(e, xhr, ms) {
							console.log(e)
							cj.setButton({status:'saveFail', disabled: false, scope: $('#'+formId)})
							if(e.status == 403) {
								cj.flash({
									msg: 'Please login to continue.',
									html: true,
									autoRemove: false
								})
								$('<div></div>').load('/login', null, function(page)
								{
									$('.flashMessageModal').append($(this))
									$('.flashMessageModal form').addClass('cj')
									cj._formInit()
								})
								return false
							}
							else cj.flash({msg: ms+e.responseText, html: true, autoRemove: false})
						}
					})
				}
				else if(req.files && req.files.length > 0) {
					cj.uploadFiles(req, req.refresh);
				}
			}
		}
	}
	else
		cj.flash('No changes to save!')
}
cj.prototype._validate = function(ops) {
	// for(var form in cj.validates)
	// 	if(cj.validates.hasOwnProperty(form))
	// 		for(var model in form)
	// 			if(form.hasOwnProperty(model))
	// 				{
	// 					
	// 				}
	// 
	
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
			else
				return true;
}
cj.prototype._callback = function(method, $form) {
	var $form = $form || null
	for(var selector in cj.callbacks)
		if(cj.callbacks.hasOwnProperty(selector) && $form.is(selector) && ( method in cj.callbacks[selector] ) && typeof cj.callbacks[selector][method] == 'function' )
			return cj.callbacks[selector][method].call(this, $form)
	return true
}
cj.prototype.del = function(params) {
	var prettyController = params.item || 'item',
		refresh = params.refresh || false;

	if(cj.options.debug)
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
cj.prototype._formInit = function(form) {
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

	var $forms = $('form')

	$forms.each(function(index)
	{
		if(cj.options.debug)
			console.log('Initing Form \n \t (Checking Listen: '+$(this).data('listening')+')');

		if(typeof $(this).data('cj') == 'undefined' || $(this).data('cj') == false)
		{
			if(cj.options.debug)
				console.log('\t\tNow Listening To: '+$(this).attr('id'));

			var $el = $(this), formId = $el.attr('id')
			
				$el.data('cj', {formId: formId || 'Form'})
				.on('submit', function(e)
				{
					var trigger = $(this).data('cj-trigger'),
						$form = $(this);

					window.prompted = true

					cj.data[fdata.formId] = cj.collect($form)

					if(!cj._callback('beforeSave', $form))
						return false

					if($form.hasClass('temporary'))
						cj.save({form: $el, refresh: true});
					else
						cj.save({form: $el});
			});

			cj.setButton({status: 'beforeChange', disabled: false, scope: $el});
			cj._callback('init', $el)
		}
	});
	$(document).on('change keyup input', 'input, textarea, select, radio, checkbox', function(e) {
		var $scope = $(e.target.form)
		if(e.type == 'input' || e.type == 'keyup') {
			clearTimeout(cj.collectTimeout)
			cj.collectTimeout = setTimeout(function() {
					cj.collect($scope)
				}, 400)
		} else {
			cj.collect($scope)
		}
		cj.setButton({status: 'beforeSave', disabled: false, scope: $scope})
	});
}
cj.prototype.setButton = function(options) {
	var defs = {
			status: 'beforeChange',
			disabled: false,
			scope: $('form').first(),
			statuses: {
				beforeChange: {text: 'Saved',addClass: 'cj-static'},
				duringSave: {text: 'Saving...',addClass: 'cj-saving'},
				beforeSave: {text: 'Save Changes',addClass: 'cj-ready'},
				afterSave: {text: 'Saved!',addClass: 'cj-saved'},
				saveFail: {text: 'Retry Save',addClass: 'cj-failed'}
			}
		},
		text,classToAdd,el
		ops = $.extend({}, defs, options)

	var $el = $('[onclick^="cj.save"], [type="submit"]', ops.scope)

	if($el[0] && typeof $el.data('cj-nochange') == 'undefined' && !$el.hasClass(ops.statuses[ops.status].addClass)) {
		ops.statuses = $.extend({}, ops.statuses, $el.data('cj-statuses'))
		text = ops.statuses[ops.status].text
		classToAdd = ops.statuses[ops.status].addClass
		el = $el[0]
		if(ops.highlight) $el.addClass('tosave')
		else $el.removeClass('tosave')
		if( el.tagName == 'INPUT') el.value = text
		else $el.text(text)
		if(el.tagName == 'BUTTON') el.disabled = ops.disabled
	}
}
cj.prototype.refresh = function(options) {
	var defs = {
		selector: '#view',
		url: window.location.pathname
	}, ops = $.extend({}, defs, options)
	
	if(cj.options.debug)
		console.log('refreshing', ops.selector, ops.url)

	$.ajax({
		url: ops.url,
		type: 'GET',
		cache: false,
		dataType: 'text',
		success: function(data) {
			var SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,items = ops.selector.split(','), $content
			while (SCRIPT_REGEX.test(data)) {
			    data = data.replace(SCRIPT_REGEX, "")
			}
			for (var i = items.length - 1; i >= 0; i--){
				$content = $(items[i], data).children()
				if(cj.options.debug)
					console.log($content);
				if($content.length > 0)
					$(items[i]).empty().append($content)
			}
			cj._formInit()
		}
	})
}
cj.prototype.resetForm = function($form) {
	if(cj.options.debug) console.log('Form Reset', $form)
	var formId = $form[0].id, $parent = $('#'+formId).parent()

	$('#'+formId).remove()
	$parent.append($form)
	cj.init()
	cj._formInit()
	if(typeof CKEDITOR != 'undefined'){
		try{
			CKEDITOR.replaceAll();
		}catch(e){
			//don't care
		}
	}
}
cj.prototype.get = function(options, callback) {
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
		error: function(xhr, status, e) {
			console.log(e)
			cj.ajaxResponse(xhr.responseText)
		}
	})
}
cj.prototype._binds = function() {
	cj.bind('click', '[data-cj-get]', cj.util.getHandler)
	cj.bind('click', '.modal-close, #mask', cj.util.closeHandler)
	cj.bind('keyup', cj.util.closeHandler)
	cj.bind('change', 'input[type="file"]', cj.util.filePreview)
}
cj.prototype.bind = function(e, el, callback) {
	// if(typeof callback == 'undefined')
	// 	var ui = el.name || new Date().getTime()
	// else
	// 	var ui = callback.name || el
	// if(!cj.listeners[e+':'+ui]) {
	// 	cj.listeners[e+':'+ui] = true
		if(typeof el == 'function') {
			$(document).on(e, el)
		} else if(typeof callback == 'function') {
			$(document).on(e, el, callback)
		}
	// }
	// else return false;
}
cj.prototype.sort = function(selector, items, handle) {
	var items = items || 'tr',
		handle = (typeof handle == 'undefined') ? '' : handle

	$(selector).sortable({
		items: items,
		helper: cj.util.fixHelper,
		cursor: 'move',
		handle: handle,
		update: function(event, ui) {
			var controller = $(this).data('cj-controller')
			if(controller) {
				var sortableInstance = (ui.item[0].parentNode.id || ui.item[0].parentNode.className);
				cj.data[sortableInstance] = {
					action: '/admin/'+$(this).data('cj-controller')+'/reorder',
					data: $(this).sortable('serialize'),
					type: 'order'
				}
				cj.setButton({
					status: 'beforeSave',
					disabled: false
					})
			}
			else cj.flash({msg: 'You forgot to define a \'data-cj-controller\' attribute on your sortable container!', error: true});
		}
	}).disableSelection();
}
cj.prototype.uploadFiles = function(req, refresh)
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
					delete cj.data[req.formId]
				}
			});
			cj.setButton({status:'afterSave',disabled: false,highlight: false});
		},
		error: function (err, status, e)
		{
			cj.setButton({status:'saveFail',disabled: false,highlight: true});
			console.log(err, status, e);
		}
	})
	return false;
}
cj.prototype.ajaxFile = {
	createUploadIframe: function(id, uri) {
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
		$(iframeHtml).appendTo(d.body)

		return $('#' + frameId).get(0)
	},
	createUploadForm: function(id, files, data) {
		var formId = 'jUploadForm' + id, fileId = 'jUploadFile' + id,
			form = $('<form  action="" method="POST" name="' + formId + '" id="' + formId + '" enctype="multipart/form-data"></form>');	
		if(data) {
			for(var input in data) {
				if(data.hasOwnProperty(input))
					$('<input type="hidden" name="' + data[input]['name'] + '" value="' + data[input]['value'] + '" />').appendTo(form);
			}
		}
		for(var i = 0; i < files.length; i++) {
			var oldElement = $('#' + files[i].fileElementId),newElement = $(oldElement).clone();
			$(oldElement).attr('id', fileId);
			$(oldElement).before(newElement);
			$(oldElement).appendTo(form);
		}
		$(form).css({position:'absolute',top:'-1200px',left:'-99999px'}).appendTo('body');
		return form;
	},
	upload: function(s) {
		s = $.extend({}, $.ajaxSettings, s);
		var id = new Date().getTime(),
			form = cj.ajaxFile.createUploadForm(id, s.files, (typeof(s.data)=='undefined'?false:s.data)),
			io = cj.ajaxFile.createUploadIframe(id, s.secureuri),
			frameId = 'jUploadFrame'+id, formId = 'jUploadForm'+id;

		if ( s.global && ! $.active++ )
		{
			$.event.trigger( "ajaxStart" );
		}            
		var requestDone = false, xml = {}
		if ( s.global )
			$.event.trigger("ajaxSend", [xml, s]);
		var uploadCallback = function(isTimeout) {
			var io = d.getElementById(frameId);
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
							$.event.trigger( "ajaxSuccess", [xml, s] );
					} else
						cj.ajaxFile.handleError(s, xml, status);
				}
				catch(e) {
					status = "error"
					cj.ajaxFile.handleError(s, xml, status, e)
				}
				// The request was completed
				if( s.global )
					$.event.trigger( "ajaxComplete", [xml, s] );
				// Handle the global AJAX counter
				if ( s.global && ! --$.active )
					$.event.trigger( "ajaxStop" );
				// Process result
				if ( s.complete )
					s.complete(xml, status)
				$(io).unbind()
				setTimeout(function() {
					try {
						$(io).remove()
						$(form).remove()
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
			var form = $('#' + formId)
			$(form).attr('action', s.url)
			$(form).attr('method', 'POST')
			$(form).attr('target', frameId)
			if(form.encoding) {
				$(form).attr('encoding', 'multipart/form-data')
			} else {
				$(form).attr('enctype', 'multipart/form-data')
			}
			$(form).submit()
		}
		catch(e) {
			cj.ajaxFile.handleError(s, xml, null, e)
		}
		$('#' + frameId).load(uploadCallback)
		return {abort: function () {}}
	},
	uploadHttpData: function( r, type ) {
		var data = !type
		data = type == "xml" || data ? r.responseXML : r.responseText
		if ( type == "script" )
			$.globalEval( data )
		if ( type == "json" )
			eval( "data = " + data )
		if ( type == "html" )
			$("<div>").html(data).evalScripts()
		return data
	},
	handleError: function( s, xhr, status, e ) {
	// If a local callback was specified, fire it
	if ( s.error )
		s.error.call( s.context || window, xhr, status, e );
	// Fire the global callback
	if ( s.global )
		(s.context ? $(s.context) : $.event).trigger( "ajaxError", [xhr, s, e] )
	}
},
cj.prototype.ajaxResponse = function(data, formId) {
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
cj.prototype.flash = function(options)
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
	else return

	if(ops.replace) {
		$('[id^="flashMessage-"].'+ops.replace).fadeOut(function(){$(this).remove()})
	}

	if(cj.options.debug)
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

		var htmlPattern = new RegExp('<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)</[A-Z][A-Z0-9]*>', 'i');
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
cj.prototype.close = function() 
{
	$('.flashMessageModal, #mask').each(function(){
		$(this).fadeOut('fast',function(){$(this).remove()});
	});
}
cj.prototype.util = {
	closeHandler: function(e) {
		if( e.keyCode == 27 
			|| e.target.className.indexOf('.modal-close') > -1 
			|| e.target.id == 'mask')
			cj.close()
	},
	getHandler: function(e) {
		e.preventDefault()
		var defs = {
			insertLoc: false,
			addClass: '',
			getOnce: '',
			selector: 'form'
		}, $el = $(e.target), ops = $.extend({}, defs, $el.data('cj-get'))
		if(!$el.data('cj-got') || !getonce) {
			cj.get({
				url: url,
				addClass: addClass,
				insertLoc: insertLoc,
				selector: selector
			})
		}
		if(getonce) $(this).data('cj-got', true)
	},
	fixHelper: function(e, ui) {
		var $original = ui,
			$helper = ui.clone();

		$helper.height($original.height());
		$helper.width($original.width());

		return $helper;
	},
	filePreview: function(e) {
		var files = e.target.files
		for (var i=0; f = files[i]; i++) {
			if(!f.type.match('image.*'))
				continue
			var reader = new FileReader()
			reader.onload = (function(theFile) {
				return function(evt) {
					$(e.target).css({
						backgroundImage: 'url('+evt.target.result+')',
						backgroundRepeat: 'no-repeat',
						backgroundSize: 'cover'
					})
					.siblings('label').text('File: '+theFile.name)
					var $p = $('<img src="'+evt.target.result+'" alt="Image Preview">')
					return $p
				}
			})(f);
			reader.readAsDataURL(f);
		}
	}
}

var cj = new cj()
cj.init()

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
for (var key in obj)
    if (this.hasOwnProperty(obj)) 
		size++;
return size;
}