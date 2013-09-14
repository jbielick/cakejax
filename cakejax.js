/**==============================================
* CakeJax v0.5.3 BETA
* 9/13/2013
*
*  ___ ___    _   ___ __  __ ___ _  _ _____
* | __| _ \  /_\ / __|  \/  | __| \| |_   _|
* | _||   / / _ \ (_ | |\/| | _|| .` | | |
* |_| |_|_\/_/ \_\___|_|  |_|___|_|\_| |_|
*     FRAGMENTLABS.COM
*
* Author: Josh Bielick
*
*==============================================*/
'use strict';

function cakejax() {
	var _this = this
	this.options = {	
		view: '#view',
		removeAfter: {},
		debug: false,
		enable: 'form.cakejax'
	}
	this.timers = {}
	this.request = {}
	this.params = {
		here: window.location.pathname,
		url: window.location.href
	}
	this.listeners = {}
	this.validates = {}
	this.callbacks = {}
	
	this.init = function(options) {
<<<<<<< HEAD
		_this.options = $.extend(true, {}, _this.options, options)
=======
		_this.options = $.extend({}, _this.options, options)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f

		if (typeof CKEDITOR !== 'undefined') {
			try{CKEDITOR.replaceAll()}catch(e){/*don't care*/}
		}
		_this._binds()
		_this._init()

<<<<<<< HEAD
		if (typeof arguments[arguments.length-1] === 'function')
			arguments[arguments.length-1].call(this)
	}
	this._init = function() {
		if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances ) {
			var eds = CKEDITOR.instances;
			for(var i in eds)
				if (eds.hasOwnProperty(i)) {
					_this.ck = {}
					_this.ck[i] = eds[i].getData();
					var CKinterval = setInterval(function() {
						if (_this.ck[i] !== eds[i].getData()) {
							_this.ck[i] = eds[i].getData()
							$(eds[i].element.$).trigger('change')
=======
		if(typeof arguments[arguments.length-1] === 'function')
			arguments[arguments.length-1].call(this)
	}
	this.collect = function($form, live) {
		var defs = {
				refresh: true,
			},
			options = $form.data('cjOptions'),
			ops = $.extend({}, defs, options),
			uri = $form[0].action,
			inputData = '',
			mcReg = /([a-z_0-9]+)+/ig,
			habtmReg = /\[\]/,
			oneToManyReg = /[a-z_0-9]+\]\[[0-9]+\]\[[a-z_0-9]+\]/i,
			model = '',
			r = {data: {}, files: [], inputs: {}, form: $form, url: uri, refresh: ops.refresh, live: ops.live, method: $form.attr('method'), params: {}},
			controller,
			i,action,
			inputs = $form[0].elements,
			relationship,
			params,
			field,
			belongsToField,
			habtmIndex

		if(_this.options.debug)
			console.log('Collecting: #'+$form[0].id, 'Options: ', options)

		if(uri.indexOf('/') === 0)
			uri = uri.substr(1)
		uri = uri.split('/')
	
		for (var i = inputs.length - 1; i >= 0; i--) {
			if(inputs[i].name && inputs[i].name.indexOf('data') > -1) {
				params = inputs[i].name.replace('data','').match(mcReg)
				model = params[0]
				field = params[1]
				if(params.length > 2)
					belongsToField = (params.length > 2) ? params[2] : false

				// if(_this.options.debug)
				//console.log({name: inputs[i].name, value: inputs[i].value, type: inputs[i].type});

				//controler is inferred from RegExp matching the form's model name to uri segments
				controller = uri.filter(function(v) {return new RegExp('^'+model.toLowerCase().substring(0, Math.round(model.length*0.75))).test(v.toLowerCase())})
				r.params.controller = (uri.length) ? controller[0] : null

				r.params.model = r.params.model || model
				r.data[model] = r.data[model] || {}
				r.inputs[model] = r.inputs[model] || {}

				if(inputs[i].type !== 'file') {
					//if name attr matches format of HABTM checkbox input ([model][model][])
					if(oneToManyReg.test(inputs[i].name) || model == field) 
					{
						//Create the necessary structure for an empty HABTM save
						if(!(model in r.data[model]))
							 r.data[model][model] = ''
						//if a checkbox is found*
						if( inputs[i].type == 'checkbox' && inputs[i].checked || inputs[i].type == 'select-multiple' && inputs[i].value|| inputs[i].type == 'hidden' && inputs[i].value != '') {
							//turn the empty string into an array*
							if(typeof r.data[model][model] !== 'object') {
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
					else if (habtmReg.test(inputs[i].name) && belongsTo)  // HABTM with number indices 
					{
						habtmIndex = inputs[i].name.match(/\[[0-9]+\]/i)[0].match(/[0-9]+/)[0]
						r.data[model][habtmIndex] = r.data[model][habtmIndex] || {}
						r.data[model][habtmIndex][belongsTo] = inputs[i].value
						r.inputs[model][habtmIndex] = r.data[model][habtmIndex] || {}
						r.inputs[model][habtmIndex][belongsTo] = inputs[i]
					}
					else if (!/(^_)|(_$)/.test(inputs[i].id))	//normal input field, add struct of data.model.field: 'value'
					{
						if(inputs[i].type == 'checkbox') {
							r.data[model][field] = (inputs[i].checked) ? 1 : 0
						}
						else if(inputs[i].tagName == 'TEXTAREA' 
								&& typeof window.ck !== 'undefined'
								&& typeof window.ck[inputs[i].id] !== 'undefined') //special handling for CKEDITOR instances
							r.data[model][field] = window.ck[inputs[i].id] //we stored the CKeditor data here on an interval
						else {
							r.data[model][field] = inputs[i].value
							if(field == 'id') {
								r._origin = {
									name: 'data['+model+'][id]',
									value: inputs[i].value
								}
							}
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
						}
					}, 300);
				}
		}
<<<<<<< HEAD
		_this.timers = _this.timers || {}

		var $forms = $('form'), $form, r
		$forms.each(function() {
			$form = $(this)
			if (!$form.data('cjRequest')) {
				if (_this.options.debug)
					console.log('\t\tNow Listening To: '+$(this)[0]);
				r =  _this.collect($form[0])
				$form.data('cjRequest', r)
				// _this.setButton({status: 'beforeChange', disabled: false, scope: $form})
				_this._callback('init', r)
			}
		})
	}
	this.collect = function(form) {
		var defs = {
				refresh: false,
			},
			$form = $(form),
			ops = $.extend({}, defs, $form.data('cjOptions')),
			_serialized = [],
			_serializedDOM = [],
			r = {
				data: {},
				files: [],
				inputs: {},
				form: form,
				url: $form.prop('action'),
				refresh: ops.refresh,
				live: ops.live,
				method: $form.attr('method').toUpperCase(),
				params: {}
			},
			inputs = form.elements,
			obj, obj2

		if (_this.options.debug)
			console.log('Collecting: #'+$(form).attr('id'), 'Options:', ops)

		//collect inputs and prepare for expand
		for (var i = 0; i < inputs.length; i++) {
			if (inputs[i].name && inputs[i].name.indexOf('data') > -1) {
				obj = {}
				obj[inputs[i].name] = $(inputs[i]).val()
				_serialized.push(obj)
				obj2 = {}
				obj2[inputs[i].name] = inputs[i]
				_serializedDOM.push(obj2)
			}
		}
		
		r.data = _this.Hash.expand(_serialized, '][')
		r.inputs = _this.Hash.expand(_serializedDOM, '][')
		
		$form.data('cjRequest', r)
		
		if (_this.options.debug)
			console.log('#'+$(r.form).attr('id')+' Request:', r)//JSON.stringify(r.data, null, '\t'));

		return typeof r.live !== 'undefined' ? _this.save(r) : r
	}
	this.save = function(request) {
		if (!$.isEmptyObject(request.data)) {
			if (_this.options.debug)
				console.log('Saving...', request)

			//_this.flash({msg: 'Saving...', autoRemove: false, addClass: 'save'})
=======
		$form.data('cjRequestData', r)
		_this.request = r
	
		if(_this.options.debug)
			console.log('#'+r.form.attr('id')+' Request:', r)//JSON.stringify(r.data, null, '\t'));
	
		if(live) {
			return _this.save(r)
		}
		return r
	}
	this.save = function(request) {
		if(!$.isEmptyObject(request.data)) {
			if(_this.options.debug)
				console.log('Saving...', request)

			_this.flash({msg: 'Saving...', autoRemove: false, addClass: 'save'});

			_this.setButton({status:'duringSave', disabled: true, scope: request.form});
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f

			_this.setButton({status:'duringSave', disabled: true, scope: request.form})

			if (!request.files || request.files && request.files.length == 0) {
				$.ajax({
					url: request.url,
					type: request.method || 'POST',
					dataType: 'text',
					data: request.data,
					cache: false,
					complete: function(xhr)
					{
<<<<<<< HEAD
						_this.ajaxResponse(xhr, request, function(request, success) {
							_this._callback('afterSave', request)
							if (success) {
								_this.setButton({status:'afterSave', disabled: false, highlight: false, scope: request.form})
								// delete _this.request.data
								if (request.refresh)
									_this.refresh(request.refresh)
							}
						})
					}
				})
			}
			else if (request.files && request.files.length > 0) {
=======
						_this.ajaxResponse(data, function(response, success) {
							if(success) {
								_this.setButton({status:'afterSave', disabled: false, highlight: false, scope: request.form})
								_this._callback('afterSave', request)
								// delete _this.request.data
								if(request.refresh)
									_this.refresh(request.refresh)
							}
						})
					},
					error: function(e, xhr, ms) {
						console.log(e)
						_this.setButton({status:'saveFail', disabled: false, scope: request.form})
						if(e.status == 403) {
							_this.flash({
								msg: 'Please login to continue.',
								html: true,
								autoRemove: false
							})
							$('<div></div>').load('/login', null, function(page)
							{
								$('.flashMessageModal').append($(this))
								$('.flashMessageModal form').addClass('cj')
								_this._init()
							})
							return false
						}
						else _this.flash({msg: ms+xhr.responseText, html: true, autoRemove: false})
					}
				})
			}
			else if(request.files && request.files.length > 0) {
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
				_this.transport.send({
					url: request.url,
					files: request.files,
					data: request.form.serializeArray(),
<<<<<<< HEAD
					complete: function(xhr) {
						_this.ajaxResponse(xhr, request, function(request, success) {
							_this._callback('afterSave', request)
							if (success) {
								_this.setButton({status:'afterSave', disabled: false, highlight: false, scope: request.form})
								if (request.refresh)
=======
					success: function(data) {
						_this.ajaxResponse(data, function(response, success) {
							if(success) {
								_this.setButton({status:'afterSave', disabled: false, highlight: false, scope: request.form})
								_this._callback('afterSave', request)
								if(request.refresh)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
									_this.refresh(request.refresh)
								// delete _this.request.data
							}
						})
					},
					error: function(e, xhr, er, error) {
						console.log(e, xhr, er, error)
					}
				});
			}
			return true
		}
		else
			return _this.flash('No changes to save!')
	}
	this._validate = {
		check: function(request) {
<<<<<<< HEAD
			if (_this.options.debug)
=======
			if(_this.options.debug)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
				console.log('Validating...')
			var model,field,input,value,ruleGroup,rule,rg,msgs = [],msg
			$(request.form).find('.input .error-message').remove()
			$('.error').removeClass('error')
			for(model in _this.validate)
<<<<<<< HEAD
				if (_this.validate.hasOwnProperty(model))
					if (model in request.data)
						for(field in _this.validate[model])
							if (_this.validate[model].hasOwnProperty(field) && field in request.data[model])
								for(ruleGroup in _this.validate[model][field])
									if (_this.validate[model][field].hasOwnProperty(ruleGroup)) {
=======
				if(_this.validate.hasOwnProperty(model))
					if(model in request.data)
						for(field in _this.validate[model])
							if(_this.validate[model].hasOwnProperty(field) && field in request.data[model])
								for(ruleGroup in _this.validate[model][field])
									if(_this.validate[model][field].hasOwnProperty(ruleGroup)) {
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
										input = request.inputs[model][field]
										value = request.data[model][field]
										rg = _this.validate[model][field][ruleGroup]
										if (typeof rg.rule === 'function') {
											if (rg.rule(value) === false)
												msgs.push({input:input,message:rg.message})
										} else {
											rg.rule = rg.rule.toString().split(',')
											for (var i=0; i < rg.rule.length; i++) {
<<<<<<< HEAD
												if (rg.rule[i] in _this._validate.rules && rg.rule[i] !== 'match') {
													if (_this._validate.rules[rg.rule[i]](value) === false) {
=======
												if(rg.rule[i] in _this._validate.rules && rg.rule[i] !== 'match') {
													if(_this._validate.rules[rg.rule[i]](value) === false) {
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
														msgs.push({input:input,message: (typeof rg.message == 'string') ? rg.message : rg.message[i]})
													}
												} else if (rg.rule[i] == 'match') {
													if (!rg.pattern.test(value)) {
														msgs.push({input:input,message:rg.message})
													}
												}
											}
										}
									}
			if (msgs.length > 0) {
				for (var i=0; i < msgs.length; i++) {
					var $input = $(msgs[i].input), 
						$msg = $('<div class="error-message">'+msgs[i].message+'</div>'),
						$cur = $input.parent('.error').find('.error-message'),
						$close = $('<a href="javascript:void(0)" class="right">&times;</a>').click(function(){$(this).parent('.error-message').fadeOut()})
					$msg.append($close)
					if ($cur.length > 0 && msgs[i].message) {
						$cur.append('<br>').append(msgs[i].message)
					} else if (msgs[i].message){
						$input.parent().css('position','relative').addClass('error').append($msg)
					}
				}
				return false
			} else
				return true
		},
		rules: {
			notEmpty: function(i) {
				var i = i.trim()
				if (!i || i == '' || !i || i.length == 0)
					return false
			},
			'boolean': function(i) {
				return (typeof i == 'boolean' || /(0|1)/.test(i))
			},
			alphaNumeric: function(i) {
				return !/[^a-z0-9]/ig.test(i)
			},
			email: function(i) {
				return new RegExp('^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$').test(i)
			},
			url: function(i) {
				return new RegExp('(http[s]?:\/\/){1}((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?', 'i').test(i)
			}
		}
	}
<<<<<<< HEAD
	this._callback = function(method, arg) {
		var $form = (arg.form) ? $(arg.form) : arg, model
		if (typeof arg.data == 'object') {
			try {
				if ($form) {
					for(var selector in _this.callbacks)
						if (_this.callbacks.hasOwnProperty(selector) && $form.is(selector) && ( method in _this.callbacks[selector] ) && typeof _this.callbacks[selector][method] === 'function' )
							if (_this.callbacks[selector][method](arg) === false)
								return false
				}
				for (model in arg.data)
					if (arg.data.hasOwnProperty(model) && model in _this.callbacks && method in _this.callbacks[model]) {
						var returned = _this.callbacks[model][method](arg)
						if (returned === false)
							return false
						else if (method === 'beforeSave')
							return returned
						else
							return null
					}
				if (method.toLowerCase().indexOf('delete') > -1) {
					model = _this.params.controller.modelize()
					if (_this.callbacks[model] && _this.callbacks[model][method] && _this.callbacks[model][method](arguments.shift()) === false) {
=======
	this._callback = function(method, request) {
		var $form = (request.form && request.form.jquery) ? $(request.form) : request, modelized, model
		try{
			if($form) {
				for(var selector in _this.callbacks)
					if(_this.callbacks.hasOwnProperty(selector) && $form.is(selector) && ( method in _this.callbacks[selector] ) && typeof _this.callbacks[selector][method] === 'function' )
						if(_this.callbacks[selector][method](request) === false)
							return false
			}
			for(model in request.data) {
				if(this.request.data.hasOwnProperty(model) && _this.callbacks[model] && _this.callbacks[model][method]) {
					if(_this.callbacks[model][method](request) === false)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
						return false
					}
				}
				return null
			} catch(e) {
				var readable = (model) ? model : selector
				console.log(e, 'An error occured within '+readable+' '+method+' callback.')
				return false
			}
<<<<<<< HEAD
		} else {
=======
			if(method.toLowerCase().indexOf('delete') > -1) {
				model = _this.params.controller.modelize()
				if(_this.callbacks[model] && _this.callbacks[model][method] && _this.callbacks[model][method](request) === false) {
					return false
				}
			}
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
			return true
		}
	}
	this.del = function(params) {
		var item = params.item || 'this item',
			refresh = params.refresh || false,
			$caller = $(params.caller),
			request = {}

		_this.params = params
	
		if (typeof params.controller !== 'undefined' && typeof params.id !== 'undefined')
		{
<<<<<<< HEAD
			var prefix = (typeof _this.params.prefix !== 'undefined') ? '/'+_this.params.prefix : ''
=======
			var prefix = (typeof _this.params.prefix !== 'undefined') ? '/'+this.params.prefix : ''
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
		
			_this.request.url = prefix+'/'+_this.params.controller+'/delete/'+_this.params.id
			request.data = {}

<<<<<<< HEAD
			if (_this._callback('beforeDelete', {}) === false)
				return false

			if (_this.options.debug)
=======
			if(_this._callback('beforeDelete', {}) === false)
				return false

			if(_this.options.debug)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
				console.log('Deleting: ', _this.params)
		
			if (confirm("Are you sure you want to delete "+item+"?")) {

				$.ajax({
					url: _this.request.url,
					type: 'DELETE',
					cache: false,
<<<<<<< HEAD
					complete: function(xhr) {
						_this.ajaxResponse(xhr, request, function(request, success) {
							_this._callback('afterSave', request)
							if (success) {
=======
					success: function(data) {
						_this.ajaxResponse(data, undefined, function(response, success) {
							if(success) {
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
								var $deletable = $caller.parents('.deletable').first()
								if (!$deletable[0])
									$deletable = $caller.parents('tr').first()

								$deletable.fadeOut(function(){$deletable.remove()})
<<<<<<< HEAD
								if (refresh)
=======
								_this._callback('afterDelete', {})
								if(refresh)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
									_this.refresh(refresh)
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
<<<<<<< HEAD
=======
	this._init = function() {
		$(document).off('change keyup input', _this.options.enable+' input, textarea, select, radio, checkbox', _this.handlers.change)
		
		if(typeof CKEDITOR !== 'undefined' && CKEDITOR.instances ) {
			var eds = CKEDITOR.instances;
			for(var i in eds)
				if(eds.hasOwnProperty(i)) {
					_this.ck = {}
					_this.ck[i] = eds[i].getData();
					var CKinterval = setInterval(function() {
						if(_this.ck[i] !== eds[i].getData()) {
							_this.ck[i] = eds[i].getData()
							$(eds[i].element.$).trigger('change')
						}
					}, 300);
				}
		}
		_this.timers = _this.timers || {}

		var $forms = $('form'), $form
		$forms.each(function() {
			$form = $(this)
			if(!$form.data('cjRequest')) {
				if(_this.options.debug)
					console.log('\t\tNow Listening To: '+$(this)[0]);
				$form.data('cjRequest', _this.collect($form))
				_this.setButton({status: 'beforeChange', disabled: false, scope: $form})
				_this._callback('init', _this.collect($form))
			}
		})
	}
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
	this.setButton = function(options) {
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
			text,el,ops = $.extend(true, {}, defs, options),
			classToAdd

		var $el = $('[onclick^="_this.save"], [type="submit"]', ops.scope)

		if ($el[0] && typeof $el.data('cj-nochange') == 'undefined' && !$el.hasClass(ops.statuses[ops.status].addClass)) {
			ops.statuses = $.extend(true, {}, ops.statuses, $el.data('cj-statuses'))
			text = ops.statuses[ops.status].text
			classToAdd = ops.statuses[ops.status].addClass
			el = $el[0]
			if (ops.highlight) $el.addClass('tosave')
			else $el.removeClass('tosave')
			if ( el.tagName == 'INPUT') el.value = text
			else $el.text(text)
			if (el.tagName == 'BUTTON') el.disabled = ops.disabled
		}
	}
	this.refresh = function(options) {
		var defs = {
				selector: _this.options.view,
				url: window.location.pathname
			}, ops = $.extend({}, defs, options),
			SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
			selectors = ops.selector.split(',')
<<<<<<< HEAD
			
		if (_this.options.debug)
=======
	
		if(_this.options.debug)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
			console.log('Refreshing '+ops.selector+' with '+ops.url)
		
		$.ajax({
			url: ops.url,
			type: 'GET',
			cache: false,
			dataType: 'text',
			success: function(data) {
				var $holder = $('<div>'), 
					$content
				while (SCRIPT_REGEX.test(data)) {
				    data = data.replace(SCRIPT_REGEX, "")
				}
				$holder.html(data)
				for (var i = selectors.length - 1; i >= 0; i--){
					$content = $holder.find(selectors[i])
<<<<<<< HEAD
					if (_this.options.debug)
					if ($content.length > 0)
=======
					if(_this.options.debug)
					if($content.length > 0)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
						$(selectors[i]).replaceWith($content)
				}
				_this._init()
			}
		})
	}
	this.get = function(options, callback) {
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
				if (ops.selector)
					$content = $(ops.selector, data).addClass('temporary none cj-got '+ops.addClass)
				else
					$content = $(data)
				if (ops.insertLoc) {
					$(ops.insertLoc).prepend($content.addClass('cj-got').css({display:'none'}))
					$content.slideDown()
				}
				else _this.flash({msg: data, html: true, autoRemove: false, mask: true})

				_this._init()

				if (typeof arguments[arguments.length-1] === 'function')
					arguments[arguments.length-1].call(this, $content);
			},
			error: function(xhr, e, msg) {
				console.log(e)
				_this.ajaxResponse(xhr)
			}
		})
	}
	this._binds = function() {
		_this.bind('submit', 'form', _this.handlers.submit)
		_this.bind('click', '[data-cj-get]', _this.handlers.get)
		_this.bind('keyup', _this.handlers.close)
		//_this.bind('change', 'input[type="file"]:not([multiple])', _this.util.filePreview)
		_this.bind('click', '[data-cj-delete]', _this.handlers.del)
		_this.bind('click', '[data-cj-sort-save]', _this.handlers.sortSave)
		_this.bind('click', '.cj-request', _this.handlers.request)
<<<<<<< HEAD
		var tags = [ 'input', 'textarea', 'select', 'radio', 'checkbox']
		$(document).off('change keyup input', tags.join(', '), _this.handlers.change)
		_this.bind('change keyup input', tags.join(', '), _this.handlers.change)
	}
	this.bind = function(e, el, callback) {
		// if (typeof callback == 'undefined')
		// 	var ui = el.name || new Date().getTime()
		// else
		// 	var ui = callback.name || el
		// if (!_this.listeners[e+':'+ui]) {
		// 	_this.listeners[e+':'+ui] = true
			if (typeof el === 'function') {
=======
		_this.bind('change keyup input', _this.options.enable+' input,'+_this.options.enable+' textarea,'+_this.options.enable+' select,'+_this.options.enable+' radio,'+_this.options.enable+' checkbox', _this.handlers.change)
	}
	this.bind = function(e, el, callback) {
		// if(typeof callback == 'undefined')
		// 	var ui = el.name || new Date().getTime()
		// else
		// 	var ui = callback.name || el
		// if(!_this.listeners[e+':'+ui]) {
		// 	_this.listeners[e+':'+ui] = true
			if(typeof el === 'function') {
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
				$(document).on(e, el)
			} else if (typeof callback === 'function') {
				$(document).on(e, el, callback)
			}
		// }
		// else return false;
	}
	this.sort = function(selector, items, handle) {
		var items = items || 'tr',
			handle = (typeof handle == 'undefined') ? '' : handle

		$(selector).sortable({
			items: items,
			helper: _this.util.fixHelper,
			cursor: 'move',
			handle: handle,
			start: function(e, ui){
				ui.placeholder.height(ui.item.height())
			},
			update: function(event, ui) {
				var action = $(this).data('cjAction')
<<<<<<< HEAD
				if (action) {
=======
				if(action) {
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
					ui.item.parents('[data-cj-action]').first().data('cjSortData', $(this).sortable('serialize'))
				}
				else _this.flash({msg: 'You forgot to define a \'data-cj-action\' attribute on your sortable container!', error: true});
			}
		}).disableSelection()
	}
	this.transport = {
		buildIframe: function(id, uri) {
			var id = 'cjTransportFrame-'+id,
				$iframe = $('<iframe id="'+id+'" name="'+id+'" style="position:absolute; top:-9999px; left:-9999px" />')
			if (window.ActiveXObject) {
				if (typeof uri== 'boolean'){
					$iframe.attr('src', 'about:blank')
				}
				else if (typeof uri== 'string'){
					$iframe.attr('src', uri)
				}	
			}
			return $iframe
		},
		buildForm: function(s, id) {
			var $form = $('<form action="" method="POST" id="cjTransportForm-'+id+'" enctype="multipart/form-data"></form>'),
				$newEl			
			$form.attr('action', s.url).attr('target', '_self')
			if ($form[0].encoding)
				$form.attr('encoding', 'multipart/form-data')
			else
				$form.attr('enctype', 'multipart/form-data')
			if (s.data) {
				for(var input in s.data) {
					if (s.data.hasOwnProperty(input))
						$('<input type="hidden" name="' + s.data[input]['name'] + '" value="' + s.data[input]['value'] + '" />').appendTo($form);
				}
			}
			if (s.files) {
				for(var i = 0; i < s.files.length; i++) {
					$newEl = $(s.files[i]).clone(true)
					$newEl.insertAfter($(s.files[i]))
					$(s.files[i]).appendTo($form)
				}
			}
			$form.css({position:'absolute',top:'-1200px',left:'-99999px'})
			return $form
		},
		send: function(s) {
			s = $.extend({}, $.ajaxSettings, s)
			var id = new Date().getTime(),
				$form = _this.transport.buildForm(s, id),
				$io = _this.transport.buildIframe(id, s.secureuri)
			
			$io.appendTo($('body')).contents().find('body').append($form)

			var requestDone = false, 
				response = {}, 
				uploadCallback = function(e) {
					var $io = $(this), 
						status,
						response = {},
						contents
					
					requestDone = true
					try {
						response.status = 200
						contents = $io.contents().find('body').html()
					} catch(e) {
						response.status = 500
						if ( s.error )
							s.error(response, 'iframe troubles')
					}

					if (response || e.timeout) {
						status = (!e.timeout) ? 'success' : 'error';
						if ( status !== "error" ) {
							if ( s.success ) {
								response.responseText = contents
								s.success(response, status)
							}
						} else {
							if (s.error)
								s.error(status)
						}
					}
					if (s.complete) {
						response.responseText = contents
						s.complete(response)
					}
					setTimeout(function() {
						$io.remove()
						$form.remove()
					},100)
				}
		
			if ( s.timeout ) {
				setTimeout(function() {
					if ( !requestDone ) 
						uploadCallback({timeout:true})
				}, s.timeout)
			}
			$io.one('load', uploadCallback)
			$form.submit()
			return {abort: function () {}}
		}
	}
<<<<<<< HEAD
	this.ajaxResponse = function(xhr, request) {
		var $oldForm = $(request.form),
=======
	this.ajaxResponse = function(data) {
		var $oldForm = _this.request.form,
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
			$holding = $('<div>'),
			replace = '.save',
			$response,
			$flashMessage,
			success = true,
			stop = false,
			$freshForm,
			$newForm
			
		// if (xhr.status == 403) {
// 			cj.flash({
// 				msg: 'Please login to continue.',
// 				html: true,
// 				autoRemove: false
// 			})
// 			cj.setButton({status:'saveFail', disabled: false, scope: request.form})
// 			$('<div></div>').load('/login', null, function(page)
// 			{
// 				$('.flashMessageModal').append($(this))
// 				$('.flashMessageModal form').addClass('cj')
// 				cj._formInit()
// 			})
// 			return false
// 		}
		if (request)
			request.xhr = xhr
		
		if (/^2/.test(xhr.status)) {
			
		} else if (/^4/.test(xhr.status)) {
			
		} else if (/^5/.test(xhr.status)) {
			success = false
		} else {
			
		}
 
		$response = $holding.html(xhr.responseText)
	
		$flashMessage = $response.find('#flashMessage')

<<<<<<< HEAD
		if ($flashMessage.length) {
			if ($('#flashMessage').length)
				$('#flashMessage').remove()
			$(_this.options.view).prepend($flashMessage)
=======
		if(typeof flashMessage == 'string' && flashMessage !== '') {
			var flashOps = {msg: flashMessage, mask: false};
			if(flashMessage.toString().indexOf('saved') > -1) {
				flashOps.replace = 'save'
			}
			_this.flash(flashOps)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
		}

		var logs = (_this.options.debug) ? 'pre.cake-error, .notice, p.error' : 'pre.cake-error, .notice, p.error, pre',
			$notices = $response.find(logs),
			errors = '<pre>';

		if ($notices.length > 0) {
			$notices.each(function() {
				errors += '\t'+$notices.text()+'<br><br>'
			});
			errors += '</pre>'
			console.log(errors)
			_this.flash({msg:errors, html: true, autoRemove: false, mask:true})
			success = false
		}

		if ($oldForm) {
			$freshForm = $response.find('#'+$oldForm[0].id)
			if ($freshForm.length) {
				$oldForm.replaceWith($freshForm.addClass('cj-replaced'))
<<<<<<< HEAD
				cj._init()
			}
		}
		if (typeof arguments[arguments.length-1] === 'function')
			arguments[arguments.length-1].call(this, request, success)
		
=======
				_this._init()
			}
		}
		if(typeof arguments[arguments.length-1] === 'function')
			arguments[arguments.length-1].call(this, $response, success);
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
	}
	this.flash = function(options) {
		var modalCount = $('.flashMessageModal [id^="flashMessage-"]').length,
			defs = {
				msg: 'No message supplied',
				mask: false,
				autoRemove: true,
				linger: 6000,
				html: false,
				addClass: '',
				replace: 'save',
				modalClass: false
			},
			ops

		if (typeof options == 'object')
			ops = $.extend(true, {}, defs, options)
		else if (typeof options == 'string') {
			ops = defs;
			ops.msg = options;
		}
		else throw new TypeError('Method \'flash\' cannot be called without arguments.')

		if (ops.replace) {
			$('[id^="flashMessage-"].'+ops.replace).fadeOut(function(){$(this).remove()})
		}

<<<<<<< HEAD
		if (_this.options.debug)
=======
		if(_this.options.debug)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
			ops.autoRemove = false

		if ($('.flashMessageModal').length == 0) {
			var $modal = $('<div></div>', {
					'class': 'flashMessageModal',
					id: 'flashMessageModal-'+modalCount
				}),
				$close = $('<div></div>').addClass('modal-close').html('&times;'),
				$mask = $('<div></div>').attr('id', 'mask'),
				htmlPattern = new RegExp('<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)</[A-Z][A-Z0-9]*>', 'i')
			$modal.append($close),$([$close[0],$mask[0]]).click(_this.handlers.close)
<<<<<<< HEAD
			if (ops.html || htmlPattern.test( ops.msg ) )
=======
			if(ops.html || htmlPattern.test( ops.msg ) )
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
				$modal.html(ops.msg)
			else
				$modal.append('<div id="flashMessage-'+modalCount+'" class="'+ops.addClass+'">'+ops.msg+'</div>')

			if (ops.addClass) {
				$modal.addClass(ops.addClass)
			}

			$mask.css({height: document.height+'px'});
			$('#view').prepend($modal)

			$modal.css({maxHeight: (window.innerHeight - 50)+'px'})

			$modal.fadeIn('slow', function(){ $(this).addClass('open-modal'); })

<<<<<<< HEAD
			if (ops.mask) {
=======
			if(ops.mask) {
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
				$('body').append($mask)
				$mask.fadeIn('slow')
			}
		}
		else {
			$('.flashMessageModal').append('<div id="flashMessage-'+modalCount+'" class="'+ops.addClass+'">'+ops.msg+'</div>');
		}
		if (ops.autoRemove) {
			setTimeout(function() {
				var $m = $('#flashMessage-'+modalCount)
<<<<<<< HEAD
				if ($('.flashMessageModal > [id^="flashMessage-"]').length == 1)
=======
				if($('.flashMessageModal > [id^="flashMessage-"]').length == 1)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
					_this.close()
				else
					$m.fadeOut(function() {$m.remove()})
			}, ops.linger);
		}
	}
	this.close = function() {
		$('.flashMessageModal, #mask').each(function(){
			$(this).fadeOut('fast',function(){$(this).remove()})
		})
	}
	this.handlers = {
		sortSave: function(e) {
			var selector = $(e.currentTarget).data('cjSortSave'), request
			$(selector).each(function() {
				var $el = $(this)
<<<<<<< HEAD
				if ($el.data('cjSortData')) {
=======
				if($el.data('cjSortData')) {
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
					_this.save(request)
				}
			})
		},
		del: function(e) {
			var params = $(e.currentTarget).data('cjDelete')
			params = $.extend({}, params, {caller: e.currentTarget})
			_this.del(params)
		},
		close: function(e) {
			if (e.keyCode == 27 
				|| e.target.className.indexOf('modal-close') > -1 
				|| e.target.id == 'mask')
				_this.close()
		},
		get: function(e) {
			e.preventDefault()
			var defs = {
				insertLoc: false,
				addClass: null,
				getOnce: null,
				selector: null
			}, $el = $(e.currentTarget), ops = $.extend({}, defs, $el.data('cj-get'))
<<<<<<< HEAD
			if (!$el.data('cj-got') || !ops.getOnce) {
=======
			if(!$el.data('cj-got') || !ops.getOnce) {
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
				_this.get({
					url: ops.url,
					addClass: ops.addClass,
					insertLoc: ops.insertLoc,
					selector: ops.selector
				})
			}
			if (ops.getOnce) $el.data('cj-got', true)
		},
		change: function(e) {
			var $form = $(e.target.form),
				ops = $form.data('cjOptions') || {}
<<<<<<< HEAD
			if (e.type == 'input' || e.type == 'keyup') {
				clearTimeout(_this.collectTimeout)
				_this.collectTimeout = setTimeout(function() {
						_this.collect(e.target.form, ops.live)
					}, 400)
			} else {
				_this.collect(e.target.form, ops.live)
=======
			if(e.type == 'input' || e.type == 'keyup') {
				clearTimeout(_this.collectTimeout)
				_this.collectTimeout = setTimeout(function() {
						_this.collect($form, ops.live)
					}, 400)
			} else {
				_this.collect($form, ops.live)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
			}
			_this.setButton({status: 'beforeSave', disabled: false, scope: $form})
		},
		request: function(e) {
			var ops = $(e.currentTarget).data('cjRequest'),
				request = {
					url: ops.url,
					type: ops.type
				}
<<<<<<< HEAD
			if (ops.data && ops.type.toLowerCase() == 'post')
				request.data = ops.data
				_this.save(request)
=======
			if(ops.data && ops.type.toLowerCase() == 'post')
				request.data = ops.data
				_this.save(request)
		},
		submit: function(e) {
			var request = _this.collect($(e.currentTarget))
			if(_this._callback('beforeValidate', request) === false)
				return false
			if(_this._validate.check(request) === false)
				return false
			if(_this._callback('beforeSave', request) === false)
				return false
			if(request.form && request.form.is(_this.options.enable))
				_this.save(request)
		}
	},
	this.util = {
		modelize: function(c) {
			return c.charAt(0).toUpperCase() + c.slice(1)
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
		},
		submit: function(e) {
			var request = _this.collect(e.currentTarget), beforeSave
			if (_this._callback('beforeValidate', request) === false)
				return false
			if (_this._validate.check(request) === false)
				return false
				
			beforeSave = _this._callback('beforeSave', request)
			
			if (beforeSave === false)
				return false
			else if (beforeSave && beforeSave !== true)
				request = beforeSave
			if (request.form && $(request.form).is(_this.options.enable)) {
				_this.save(request)
				return false
			}
		}
	}
	this.util = {
		fixHelper: function(e, ui) {
			var $original = ui,
				$helper = ui.clone()
			return $helper.width($original.width()).height($original.height())
		},
		filePreview: function(e) {
			var files = e.target.files
			for (var i=0; f = files[i]; i++) {
				if (!f.type.match('image.*'))
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
				reader.readAsDataURL(f)
<<<<<<< HEAD
			}
		}
	},
	this.Hash = {
		expand: function(data, delimiter) {
			var path, tokens ,delimiter = delimiter || '.',
				parent, child, out = {}, cleanPath, val, curr
				
			if(!data.length)
				data = [data]
			
			for (var i = 0; i < data.length; i++) {
				curr = data[i]
				for (var path in curr) if(curr.hasOwnProperty(path)) {
					tokens = this._tokenize(path, delimiter).reverse()
					val = typeof curr[path] === 'function' ? curr[path]() : curr[path]
					if (tokens[0] === '' || tokens[0] === '{n}') {
						child = []
						if (typeof val === 'object')
							child = val || ''
						else
							$.merge(child, val)
					} else {
						child = {}
						child[tokens[0]] = val
					}
					tokens.shift()
					for (var z = 0; z < tokens.length; z++) {
						if (tokens[z] === '' || tokens[z] === '{n}')
							parent = [], parent.push(child)
						else
							parent = {}, parent[tokens[z]] = child
						child = parent
					}
					out = this.merge(out, child)
				}
			}
			return out
		},
		get: function(data, path, delimiter) {
			var out = data,
				tokens = this._tokenize(path, delimiter)
			for (var i = 0; i < tokens.length; i++) {
				if (typeof out === 'object' && typeof out[tokens[i]] !== 'undefined')
					out = out[tokens[i]]
				else
					return null
			}
			return out
		},
		merge: function() {
			var obs = Array.prototype.slice.call(arguments),
				out = obs.shift()
			for (var i = 0; i < obs.length; i++) {
				for (var key in obs[i]) if (obs[i].hasOwnProperty(key)) {
					//for the love of god, please don't traverse DOM nodes
					if (typeof obs[i][key] === 'object' && out[key] && !out.nodeType && !obs[i][key].nodeType)
						out[key] = this.merge(out[key], obs[i][key])
					else if (Number(key) % 1 === 0)
						out.push(obs[i][key])
					else
						out[key] = obs[i][key]
				}
			}
			return out
		},
		insert: function(data, path, values, delimiter) {
			var tokens = this._tokenize(path, delimiter)
			if (path.indexOf('{') === -1) {
				
			} else {
				
=======
>>>>>>> d69b39fa48ce51983d792a69fbc923f6977ca35f
			}
		},
		_simpleOp: function(op, data, path, values) {
			
		},
		_tokenize: function(path, delimiter) {
			return ( (path.indexOf('data[') > -100) ? path.replace(/^data\[|^\[/, '').replace(/\]$/, '') : path ).split(delimiter || '.')
		}
	}
}

var cj = cj || new cakejax()

if (!Array.prototype.indexOf) { 
	Array.prototype.indexOf = function(obj, start) {
		for (var i = (start || 0), j = this.length; i < j; i++) {
			if (this[i] === obj) { return i; }
		}
		return -1;
	}
}
if (!Array.prototype.filter) {
	Array.prototype.filter = function(fun) {
		"use strict";
		if (this === void 0 || this === null)
			throw new TypeError();
		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function")
			throw new TypeError();
		var res = [];
		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t) {
				var val = t[i]; // in case fun mutates this
				if (fun.call(thisp, val, i, t))
				res.push(val);
			}
		}
		return res;
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
