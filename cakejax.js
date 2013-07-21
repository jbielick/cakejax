/**==============================================
*	CakeJax v0.5.5 BETA
*	7/21/2013
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

'use strict';

function cj(options) {
	this.options = {
		view: '#view',
		removeAfter: {},
		debug: false,
		enable: 'form'
	}
	this.request = {}
	this.params = {
		here: window.location.pathname,
		url: window.location.href
	}
	this.listeners = {}
	this.validates = {}
	this.callbacks = {}
}

cj.prototype.init = function(options) {
	if(cj.options.debug)
		console.log('cj Initialized');

	this.options = this.options = $.extend({}, this.options, options)

	if(typeof CKEDITOR != 'undefined') {
		try{CKEDITOR.replaceAll()}catch(e){/*don't care*/}
	}

	cj._binds()
	cj._formInit()

	if(typeof arguments[arguments.length-1] == 'function')
		arguments[arguments.length-1].call(this);
}

cj.prototype.collect = function($form) {
	var $el = $form, 
		defs = {
			refresh: false,
		},
		options = $el.data('cjOptions'),
		ops = $.extend({}, defs, options),
		uri = $el.attr('action'),
		_this,
		inputData = '',
		mcReg = /([a-z_0-9]+)+/ig,
		habtm = /\[\]/,
		hasMany = /[a-z_0-9]+\]\[[0-9]+\]\[[a-z_0-9]+\]/i,
		model = '',
		inputs = $el[0].elements,
		relationship,
		saveInfo,
		field,
		habtmField,
		habtmIndex,
		r = {data: {}, files: [], inputs: {}, form: $el, url: uri, refresh: ops.refresh, live: ops.live, method: $el.attr('method')}

	if(cj.options.debug)
		console.log('Collecting: '+$el[0].id, 'Options: ', options)

	if(uri.indexOf('/') === 0)
		uri = uri.substr(1)
	uri = uri.split('/')

	this.params.prefix = uri[0] || ''
	this.params.controller = (this.params.prefix) ? uri[1] : uri[0]
	this.params.action = (this.params.prefix) ? uri[2] : uri[1]
	
	if(/([0-9]+)$/.test(r.url)) {
		if(this.params.action == 'add')
			this.params.foreignKey = r.url.match(/([0-9]+)$/)[0]
		else if (this.params.action == 'edit')
			this.params.id = r.url.match(/([0-9]+)$/)[0]
	}
	
	for (var i = inputs.length - 1; i >= 0; i--) {
		if(inputs[i].name && inputs[i].name.indexOf('data') > -1) {
			saveInfo = inputs[i].name.replace('data','').match(mcReg),model = saveInfo[0],field = saveInfo[1],
			habtmField = (typeof saveInfo[2] != 'undefined') ? saveInfo[2] : false
			// if(cj.options.debug)
			//console.log({name: inputs[i].name, value: inputs[i].value, type: inputs[i].type});

			if(inputs[i].type != 'file') {
				r.data[model] = r.data[model] || {}
				r.inputs[model] = r.inputs[model] || {}
				//if name attr matches format of HABTM checkbox input ([model][model][])
				if(hasMany.test(inputs[i].name) || model == field) {
					relationship = 'hasMany'
					//Create the necessary structure for an empty HABTM save
					if(!(model in r.data[model]))
						 r.data[model][model] = ''
					//if a checkbox is found*
					if(inputs[i].type == 'checkbox' && inputs[i].checked || inputs[i].type == 'select-multiple' && inputs[i].value
						|| inputs[i].type == 'hidden' && inputs[i].value != '') {
						//turn the empty string into an array*
						if(typeof r.data[model][model] != 'object') {
							r.data[model][model] = []
							r.inputs[model][model] = []
						}
						//and add the ID of that HABTM record
						if(inputs[i].type == 'select-multiple' && typeof $(inputs[i]).val() == 'object') {
							r.data[model][model] = $(inputs[i]).val()
						} else {
							r.data[model][model].push(inputs[i].value)
							r.inputs[model][model].push(inputs[i])
						}
					}
				}
				else if (habtm.test(inputs[i].name) && habtmField)  // HABTM with number indices 
				{
					relationship = 'habtm'
					var habtmIndex = inputs[i].name.match(/\[[0-9]+\]/i)[0].match(/[0-9]+/)[0]
					r.data[model][habtmIndex] = r.data[model][habtmIndex] || {}
					r.data[model][habtmIndex][habtmField] = inputs[i].value
					r.inputs[model][habtmIndex] = r.data[model][habtmIndex] || {}
					r.inputs[model][habtmIndex][habtmField] = inputs[i]
				}
				else if (!/(^_)|(_$)/.test(inputs[i].id))	//normal input field, add struct of data.model.field: 'value'
				{
					if(inputs[i].type == 'checkbox') {
						r.data[model][field] = (inputs[i].checked) ? 1 : 0
					}
					else if(inputs[i].tagName == 'TEXTAREA' 
							&& typeof window.ck != 'undefined'
							&& typeof window.ck[inputs[i].id] != 'undefined') //special handling for CKEDITOR instances
						r.data[model][field] = window.ck[inputs[i].id] //we stored the CKeditor data here on an interval
					else {
						r.data[model][field] = inputs[i].value
						if(field == 'id') {
							r._origin = {
								name: 'data['+model+'][id]',
								value: inputs[i].value
							}
						}
					}
					r.inputs[model][field] = inputs[i]
					//disclaimer: I've not done much testing with multiple select/radio buttons/multiple file input.
				}
			} else if (inputs[i].type == 'file' && inputs[i].value != '') {
				//if action is add, the id in the URI may be the file's foreign (belongsTo) entry,
				// not the file's ID itself.
				//throw the files inputs' ids in the files array and it'll be ajax transported on save.
				// for (var z = inputs[i].files.length - 1; z >= 0; z--){
				// 	console.log(inputs[i].files[z]);
				// }
				
				r.inputs[model] = r.inputs[model] || {}
				if(hasMany.test(inputs[i].name)) {
					r.inputs[model] = r.inputs[model] || []
					r.inputs[model].push({})
					r.inputs[model][r.inputs[model].length-1][field] = inputs[i]
				} else {
					r.inputs[model][field] = inputs[i]
				}
				r.files.push(inputs[i])
			}
		}
	}
	$el.data('cj-data', r)
	this.request = r
	
	if(cj.options.debug)
		console.log(r.data)//JSON.stringify(r.data, null, '\t'));
	
	if(r.live) {
		return cj.save()
	}
	
	return r
}
cj.prototype.save = function(options) {
	
	var defs = {},
		ops = $.extend({}, defs, options)
	
	if(!$.isEmptyObject(this.request.data)) {
		if(cj.options.debug)
			console.log('Saving...', this.request)
			
		if(this.request.form) {
			
			if(!cj._callback('beforeValidate', this.request))
				return false
			
			if(!cj._validate(this.request))
				return false
		}
		
		if(!cj._callback('beforeSave', this.request))
			return false

		cj.flash({msg: 'Saving...', autoRemove: false, addClass: 'save'});

		cj.setButton({status:'duringSave', disabled: true, scope: this.request.form});

		if(!this.request.files || this.request.files && this.request.files.length == 0) {
			$.ajax({
				url: this.request.url,
				type: this.request.method || 'POST',
				dataType: 'text',
				data: this.request.data,
				cache: false,
				success: function(data)
				{
					cj.ajaxResponse(data, function(response, success) {
						if(success) {
							cj.setButton({status:'afterSave', disabled: false, highlight: false, scope: this.request.form})
							console.log(this.request)
							cj._callback('afterSave', this.request)
							// delete cj.request.data
						}
						if(success && this.request.refresh)
							cj.refresh(this.request.refresh)
					})
				},
				error: function(e, xhr, ms) {
					console.log(e)
					cj.setButton({status:'saveFail', disabled: false, scope: this.request.form})
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
		else if(this.request.files && this.request.files.length > 0) {
			cj.transport.send({
				url: this.request.url,
				files: this.request.files,
				data: this.request.form.serializeArray(),
				success: function(data) {
					cj.ajaxResponse(data, this.request)
				},
				error: function(e, xhr, er, error) {
					console.log(e, xhr, er, error)
				}
			});
		}
	}
	else
		cj.flash('No changes to save!')
}
cj.prototype._validate = function(request) {
	if(cj.options.debug)
		console.log('Validating...')
	var model,field,input,value,ruleGroup,rule,rg,msgs = [],msg
	$('form .input .verror').remove()
	$('.verror').removeClass('verror')
	for(model in cj.validate)
		if(cj.validate.hasOwnProperty(model))
			if(model in request.data)
				for(field in cj.validate[model])
					if(cj.validate[model].hasOwnProperty(field) && field in request.data[model])
						for(ruleGroup in cj.validate[model][field])
							if(cj.validate[model][field].hasOwnProperty(ruleGroup)) {
								input = request.inputs[model][field]
								value = request.data[model][field]
								rg = cj.validate[model][field][ruleGroup]
								if (typeof rg.rule == 'function') {
									if(rg.rule(value) === false)
										msgs.push({input:input,message:rg.message})
								} else {
									rg.rule = rg.rule.toString().split(',')
									for (var i=0; i < rg.rule.length; i++) {
										if(rg.rule[i] in cj._validate.rules && rg.rule[i] != 'match') {
											if(cj._validate.rules[rg.rule[i]](value) === false) {
												msgs.push({input:input,message: (typeof rg.message == 'string') ? rg.message : rg.message[i]})
											}
										} else if (rg.rule[i] == 'match') {
											if(!rg.pattern.test(value)) {
												msgs.push({input:input,message:rg.message})
											}
										}
									}
								}
							}
	if(msgs.length > 0) {
		for (var i=0; i < msgs.length; i++) {
			var $input = $(msgs[i].input), $cont = $('<div class="verror justadded"></div>'), $msg = $('<div class="verror-message">'+msgs[i].message+'</div>'),
				$cur = $input.parent('.input').find('.verror .verror-message')
			$cont.append($msg)
			if($cur.length > 0 && msgs[i].message) {
				$cur.append('<br>').append(msgs[i].message)
			} else if (msgs[i].message){
				$input.parent().css('position','relative').addClass('hasError').append($cont)
			}
		}
	} else
		return true
}
cj.prototype._validate.rules = {
	notEmpty: function(i) {
		var i = i.trim()
		if(!i || i == '' || !i || i.length == 0)
			return false
	},
	'boolean': function(i) {
		return (typeof i == 'boolean' || /(0|1)/.test(i))
	},
	alphaNumeric: function(i) {
		return !/[^a-z0-9]/ig.test(i)
	},
	email: function(i) {
		var r = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/
		return r.test(i)
	},
	url: function(i) {
		var r = /(http[s]?:\/\/){1}((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?/i
		return r.test(i)
	}
}
cj.prototype._callback = function(method, form) {
	var $form = $(this.request.form), modelized, model
	try{
		if(form) {
			for(var selector in cj.callbacks)
				if(cj.callbacks.hasOwnProperty(selector) && $form.is(selector) && ( method in cj.callbacks[selector] ) && typeof cj.callbacks[selector][method] == 'function' )
					if(cj.callbacks[selector][method].call(this, this.request) === false)
						return false
		}
		for(model in this.request.data) {
			if(this.request.data.hasOwnProperty(model) && cj.callbacks[model] && cj.callbacks[model][method]) {
				if(cj.callbacks[model][method].call(this, this.request) === false)
					return false
			}
		}
		if(method.toLowerCase().indexOf('delete') > -1) {
			model = this.params.controller.modelize()
			if(cj.callbacks[model] && cj.callbacks[model][method] && cj.callbacks[model][method].call(this, this.request) === false) {
				return false
			}
		}
		return true
	} catch(e) {
		return e
	}
}
cj.prototype.del = function(params) {
	var item = params.item || 'this item',
		refresh = params.refresh || false,
		$caller = $(params.caller)

	this.params = params
	
	if(typeof params.controller != 'undefined' && typeof params.id != 'undefined')
	{
		var prefix = (typeof this.params.prefix != 'undefined') ? '/'+this.params.prefix : ''
		
		this.request.url = prefix+'/'+this.params.controller+'/delete/'+this.params.id
		this.request.data = {}

		if(cj._callback('beforeDelete') === false)
			return false

		if(cj.options.debug)
			console.log('Deleting: ', this.params)
		
		if(confirm("Are you sure you want to delete "+item+"?")) {
			
			var $deletable = $caller.parents('.deletable').first()
			if(!$deletable[0])
				$deletable = $caller.parents('tr').first()

			$deletable.fadeOut(function(){$deletable.remove()})

			$.ajax({
				url: this.request.url,
				type: 'DELETE',
				cache: false,
				success: function(data) {
					cj.ajaxResponse(data, undefined, function(response, success) {
						if(success) {
							cj._callback('afterDelete')
							if(refresh)
								cj.refresh(refresh)
						}
					})
				},
				error: function(xhr, e, msg) {
					console.log(xhr, e, msg);
				}
			})
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

	var $forms = $(cj.options.enable)

	$forms.each(function(index) {
		if(!$(this).data('cj-data') || $(this).data('cj-data') == false) {
			
			if(cj.options.debug)
				console.log('\t\tNow Listening To: '+$(this).attr('id'));

			var $el = $(this), formId = $el.attr('id')

				$el
				.data('cj-data', cj.collect($el).data)
				.on('submit', function(e) {
					cj.collect($el)
					cj.save()
					return false
			})

			cj.setButton({status: 'beforeChange', disabled: false, scope: $el})
			cj._callback('init', $el)
		}
	});
	$(document).on('change keyup input', 'input, textarea, select, radio, checkbox', function(e) {
		var $form = $(e.target.form), formId = e.target.form.id
		if(e.type == 'input' || e.type == 'keyup') {
			clearTimeout(cj.collectTimeout)
			cj.collectTimeout = setTimeout(function() {
					cj.collect($form)
				}, 400)
		} else {
			cj.collect($form)
		}
		cj.setButton({status: 'beforeSave', disabled: false, scope: $form})
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
		text,el,ops = $.extend({}, defs, options),
		classToAdd

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
		console.log('Refreshing '+ops.selector+' with '+ops.url)

	$.ajax({
		url: ops.url,
		type: 'GET',
		cache: false,
		dataType: 'text',
		success: function(data) {
			var SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,selectors = ops.selector.split(','), $content
			while (SCRIPT_REGEX.test(data)) {
			    data = data.replace(SCRIPT_REGEX, "")
			}
			for (var i = selectors.length - 1; i >= 0; i--){
				$content = $(selectors[i], data)
				if(cj.options.debug)
					console.log($(selectors[i], data))
				if($content.length > 0)
					$(selectors[i]).replaceWith($content)
			}
			cj._formInit()
		}
	})
}
cj.prototype.get = function(options, callback) {
	var ops = {
		selector: 'form',
		insertLoc: false,
		addClass: ''
	}, $content
	ops = $.extend({}, ops, options)

	$.ajax({
		method: 'GET',
		url: ops.url,
		dataType: 'text',
		cache: false,
		success: function(data) {
			if(ops.selector)
				$content = $(ops.selector, data).addClass('temporary none cj-got '+ops.addClass)
			else
				$content = $(data)
			if(ops.insertLoc) {
				$(ops.insertLoc).prepend($content.addClass('cj-got').css({display:'none'}))
				$content.slideDown()
			}
			else cj.flash({msg: data, html: true, autoRemove: false, mask: true})

			cj._formInit()

			if(typeof arguments[arguments.length-1] == 'function')
				arguments[arguments.length-1].call(this, $content);
		},
		error: function(xhr, e, msg) {
			console.log(e)
			cj.ajaxResponse(xhr)
		}
	})
}
cj.prototype._binds = function() {
	cj.bind('click', '[data-cj-get]', cj.handlers.get)
	cj.bind('keyup', cj.handlers.close)
	//cj.bind('change', 'input[type="file"]:not([multiple])', cj.util.filePreview)
	cj.bind('click', '[data-cj-delete]', cj.handlers.del)
	cj.bind('click', '[data-cj-sort-save]', cj.handlers.sortSave)
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
		start: function(e, ui){
			ui.placeholder.height(ui.item.height())
		},
		update: function(event, ui) {
			var action = $(this).data('cjAction')
			if(action) {
				ui.item.parents('[data-cj-action]').first().data('cjSortData', $(this).sortable('serialize'))
				// cj.setButton({status: 'beforeSave', disabled: false})
			}
			else cj.flash({msg: 'You forgot to define a \'data-cj-action\' attribute on your sortable container!', error: true});
		}
	}).disableSelection()
}
cj.prototype.transport = {
	frame: null,
	buildIframe: function(id, uri) {
		var id = 'cjTransportFrame-'+id,
			$iframe = $('<iframe id="'+id+'" name="'+id+'" style="position:absolute; top:-9999px; left:-9999px" />')
		if(window.ActiveXObject) {
			if(typeof uri== 'boolean'){
				$iframe.attr('src', 'about:blank')
			}
			else if(typeof uri== 'string'){
				$iframe.attr('src', uri)
			}	
		}
		return $iframe
	},
	buildForm: function(id, files, data) {
		var formId = 'cjTransportForm-'+id,
			$form = $('<form action="" method="POST" id="' + formId + '" enctype="multipart/form-data"></form>'),
			$newEl
		if(data) {
			for(var input in data) {
				if(data.hasOwnProperty(input))
					$('<input type="hidden" name="' + data[input]['name'] + '" value="' + data[input]['value'] + '" />').appendTo($form);
			}
		}
		for(var i = 0; i < files.length; i++) {
			$newEl = $(files[i]).clone(true)
			$newEl.insertAfter($(files[i]))
			$(files[i]).appendTo($form)
		}
		$form.css({position:'absolute',top:'-1200px',left:'-99999px'})
		return $form
	},
	send: function(s) {
		s = $.extend({}, $.ajaxSettings, s)
		var id = new Date().getTime(),
			$form = cj.transport.buildForm(id, s.files, (typeof(s.data)=='undefined'?false:s.data)),
			$io = cj.transport.buildIframe(id, s.secureuri)
			
		$io.appendTo($('body')).contents().find('body').append($form)

		var requestDone = false, xml = {}
		
		var uploadCallback = function(isTimeout) {
			var io = $(this)[0]
			try {
				if(io.contentWindow) {
					xml.responseText = io.contentWindow.document.body?io.contentWindow.document.body.innerHTML:null;
					xml.responseXML = io.contentWindow.document.XMLDocument?io.contentWindow.document.XMLDocument:io.contentWindow.document;
				} else if(io.contentDocument) {
					xml.responseText = io.contentDocument.document.body?io.contentDocument.document.body.innerHTML:null;
					xml.responseXML = io.contentDocument.document.XMLDocument?io.contentDocument.document.XMLDocument:io.contentDocument.document;
				}
			} catch(e) {
				cj.transport.handleError(s, xml, null, e);
			}
			if ( xml || isTimeout == "timeout") {
				requestDone = true
				var status
				try {
					status = isTimeout != "timeout" ? "success" : "error";
					if ( status != "error" ) {
						var data = cj.transport.uploadHttpData( xml, s.dataType )
						if ( s.success )
							s.success( data, status )
					} else
						cj.transport.handleError(s, xml, status)
				} catch(e) {
					status = "error"
					cj.transport.handleError(s, xml, status, e)
				}
				if ( s.complete )
					s.complete(xml, status)
				setTimeout(function() {
					try {
						$io.remove()
						$form.remove()
					} catch(e) {
						cj.transport.handleError(s, xml, null, e)
					}
				}, 100)
				xml = null
			}
		}
		if ( s.timeout > 0 ) {
			setTimeout(function(){
				if( !requestDone ) uploadCallback( "timeout" )
				}, s.timeout)
		}
		try {
			$form.attr('action', s.url).attr('method', 'POST').attr('target', '_self')
			if($form[0].encoding)
				$form.attr('encoding', 'multipart/form-data')
			else
				$form.attr('enctype', 'multipart/form-data')
			$form.submit()
		} catch(e) {
			cj.transport.handleError(s, xml, null, e)
		}
		$io.one('load', uploadCallback)
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
		throw e
		if ( s.error )
			s.error.call( s.context || window, xhr, status, e )
	}
},
cj.prototype.ajaxResponse = function(data) {
	var $oldForm = this.request.form,
		response, flashMessage = undefined, success = true, stop = false,
		$freshForm

	if(!$(data).contents().length) {
		if(typeof data == 'object' && !data.jQuery) {
			response = data.responseText
		}else{
			try {
				response = $.parseHTML(data, document, false)
			} catch(e) {
				response = data
			}
		}
	} else {
		response = $(data).contents()
	}
	flashMessage = $('#flashMessage', response).text()

	if(typeof flashMessage == 'string' && flashMessage != '') {
		var flashOps = {msg: flashMessage, mask: false};
		if(flashMessage.toString().indexOf('saved') > -1) {
			flashOps.replace = 'save'
		}
		cj.flash(flashOps)
	}

	var logs = (cj.options.debug) ? 'pre.cake-error, .notice, p.error' : 'pre.cake-error, .notice, p.error, pre',
		$notices = $(logs, response),
		errors = '<pre>';

	if($notices.length > 0) {
		$notices.each(function() {
			errors += '\t'+$notices.text()+'<br><br>'
		});
		errors += '</pre>'
		console.log(errors)
		cj.flash({msg:errors, html: true, autoRemove: false, mask:true})
		success = false
	}

	if(flashMessage.toString().indexOf('could not be') > -1)
		success = false

	if($oldForm) {
		$freshForm = $('#'+$oldForm[0].id, response)
		if($freshForm.length) {
			$oldForm.replaceWith($freshForm.addClass('cj-replaced'))
			cj._formInit()
		}
	}
	if(typeof arguments[arguments.length-1] == 'function')
		arguments[arguments.length-1].call(this, response, success);
}
cj.prototype.flash = function(options) {
	var modalCount = $('.flashMessageModal [id^="flashMessage-"]').length,
		defs = {
			msg: 'No message supplied',
			mask: false,
			autoRemove: true,
			linger: 3000,
			html: false,
			addClass: '',
			replace: false,
			modalClass: false
		},
		ops

	if (typeof options == 'object')
		ops = $.extend({}, defs, options)
	else if (typeof options == 'string') {
		ops = defs;
		ops.msg = options;
	}
	else throw new TypeError('Method \'flash\' cannot be called without arguments.')

	if(ops.replace) {
		$('[id^="flashMessage-"].'+ops.replace).fadeOut(function(){$(this).remove()})
	}

	if(cj.options.debug)
		ops.autoRemove = false;

	if($('.flashMessageModal').length == 0) {
		var $modal = $('<div></div>', {
				'class': 'flashMessageModal',
				id: 'flashMessageModal-'+modalCount
			}),
			$close = $('<div></div>').addClass('modal-close').html('&times;'),
			$mask = $('<div></div>').attr('id', 'mask'),
			htmlPattern = new RegExp('<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)</[A-Z][A-Z0-9]*>', 'i')
		$modal.append($close),$([$close[0],$mask[0]]).click(cj.handlers.close)
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
	if (ops.autoRemove) {
		setTimeout(function() {
			$('#flashMessage-'+modalCount).fadeOut(function() {
				$(this).remove();
				if($('.flashMessageModal > [id^="flashMessage-"]').length == 1)
					cj.close();
			});
		}, ops.linger);
	}
}
cj.prototype.close = function() {
	$('.flashMessageModal, #mask').each(function(){
		$(this).fadeOut('fast',function(){$(this).remove()})
	})
}
cj.prototype.handlers = {
	sortSave: function(e) {
		var selector = $(e.currentTarget).data('cjSortSave'), uid, requests = []
		$(selector).each(function() {
			var $el = $(this)
			if($el.data('cjSortData')) {
				uid = new Date().getTime()
				requests.push(String(uid))
				cj.data[uid] = {
					action: $el.data('cjAction'),
					data: $el.data('cjSortData'),
					formId: uid,
					refresh: false
				}
			}
		})
		cj.save({requests: requests})
	},
	del: function(e) {
		var params = $(e.currentTarget).data('cjDelete')
		params = $.extend({}, params, {caller: e.currentTarget})
		cj.del(params)
	},
	close: function(e) {
		if(e.keyCode == 27 
			|| e.target.className.indexOf('modal-close') > -1 
			|| e.target.id == 'mask')
			cj.close()
	},
	get: function(e) {
		e.preventDefault()
		var defs = {
			insertLoc: false,
			addClass: null,
			getOnce: null,
			selector: null
		}, $el = $(e.currentTarget), ops = $.extend({}, defs, $el.data('cj-get'))
		if(!$el.data('cj-got') || !ops.getOnce) {
			cj.get({
				url: ops.url,
				addClass: ops.addClass,
				insertLoc: ops.insertLoc,
				selector: ops.selector
			})
		}
		if(ops.getOnce) $el.data('cj-got', true)
	}
}
cj.prototype.util = {
	modelize: function(c) {
		return c.charAt(0).toUpperCase() + c.slice(1)
	},
	fixHelper: function(e, ui) {
		var $original = ui,
			$helper = ui.clone();
		return $helper.width($original.width()).height($original.height())
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

if (!Array.prototype.indexOf) { 
    Array.prototype.indexOf = function(obj, start) {
         for (var i = (start || 0), j = this.length; i < j; i++) {
             if (this[i] === obj) { return i; }
         }
         return -1;
    }
}
String.prototype.modelize = function() {
	var s = this.charAt(0).toUpperCase() + this.slice(1)
	return s.replace(/(s)$/, '').replace(/_([A-Za-z]{1})/, function(v) {return v.replace('_', '').toUpperCase()}).replace(/ie$/, 'y')
}
function objectSize(obj) {
	var size = 0, key;
for (key in obj)
    if (obj.hasOwnProperty(key)) 
		size++;
return size;
}
