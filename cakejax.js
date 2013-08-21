/**==============================================
* CakeJax v0.5.3 BETA
* 8/20/2013
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
	this.request = {}
	this.params = {
		here: window.location.pathname,
		url: window.location.href
	}
	this.listeners = {}
	this.validates = {}
	this.callbacks = {}
	
	this.init = function(options) {
		_this.options = $.extend({}, _this.options, options)

		if(typeof CKEDITOR !== 'undefined') {
			try{CKEDITOR.replaceAll()}catch(e){/*don't care*/}
		}

		_this._binds()
		_this._formInit()

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
			controller,
			i,action,
			inputs = $form[0].elements,
			_this,relationship,params,field,belongsToField,habtmIndex,
			r = {data: {}, files: [], inputs: {}, form: $form, url: uri, refresh: ops.refresh, live: ops.live, method: $form.attr('method'), params: {}}

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
						}
						r.inputs[model][field] = inputs[i]
						//disclaimer: I've not done much testing with multiple select/radio buttons/multiple file input.
					}
				} else if (inputs[i].type === 'file') {
					if(oneToManyReg.test(inputs[i].name)) {
						r.inputs[model] = r.inputs[model] || []
						r.data[model].push({})
						r.data[model][r.data[model].length-1][field] = inputs[i].value
						r.inputs[model].push({})
						r.inputs[model][r.inputs[model].length-1][field] = inputs[i]
					} else {
						r.data[model][field] = inputs[i].value
						r.inputs[model] = r.inputs[model] || {}
						r.inputs[model][field] = inputs[i]
					}
					if(inputs[i].value) {
						r.files.push(inputs[i])
					}
				}
			}
		}
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
			
			if(request.form) {
			
				if(_this._callback('beforeValidate', request) === false)
					return false
			
				if(_this._validate.check(request) === false)
					return false
			}
		
			if(_this._callback('beforeSave', request) === false)
				return false

			_this.flash({msg: 'Saving...', autoRemove: false, addClass: 'save'});

			_this.setButton({status:'duringSave', disabled: true, scope: request.form});

			if(!request.files || request.files && request.files.length == 0) {
				$.ajax({
					url: request.url,
					type: request.method || 'POST',
					dataType: 'text',
					data: request.data,
					cache: false,
					success: function(data)
					{
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
								_this._formInit()
							})
							return false
						}
						else _this.flash({msg: ms+xhr.responseText, html: true, autoRemove: false})
					}
				})
			}
			else if(request.files && request.files.length > 0) {
				_this.transport.send({
					url: request.url,
					files: request.files,
					data: request.form.serializeArray(),
					success: function(data) {
						_this.ajaxResponse(data, function(response, success) {
							if(success) {
								_this.setButton({status:'afterSave', disabled: false, highlight: false, scope: request.form})
								_this._callback('afterSave', request)
								if(request.refresh)
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
			if(_this.options.debug)
				console.log('Validating...')
			var model,field,input,value,ruleGroup,rule,rg,msgs = [],msg
			request.form.find('.input .error-message').remove()
			$('.error').removeClass('error')
			for(model in _this.validate)
				if(_this.validate.hasOwnProperty(model))
					if(model in request.data)
						for(field in _this.validate[model])
							if(_this.validate[model].hasOwnProperty(field) && field in request.data[model])
								for(ruleGroup in _this.validate[model][field])
									if(_this.validate[model][field].hasOwnProperty(ruleGroup)) {
										input = request.inputs[model][field]
										value = request.data[model][field]
										rg = _this.validate[model][field][ruleGroup]
										if (typeof rg.rule === 'function') {
											if(rg.rule(value) === false)
												msgs.push({input:input,message:rg.message})
										} else {
											rg.rule = rg.rule.toString().split(',')
											for (var i=0; i < rg.rule.length; i++) {
												if(rg.rule[i] in _this._validate.rules && rg.rule[i] !== 'match') {
													if(_this._validate.rules[rg.rule[i]](value) === false) {
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
					var $input = $(msgs[i].input), 
						$msg = $('<div class="error-message">'+msgs[i].message+'</div>'),
						$cur = $input.parent('.error').find('.error-message'),
						$close = $('<a href="javascript:void(0)" class="right">&times;</a>').click(function(){$(this).parent('.error-message').fadeOut()})
					$msg.append($close)
					if($cur.length > 0 && msgs[i].message) {
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
	}
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
<<<<<<< HEAD
				if(this.request.data.hasOwnProperty(model) && _this.callbacks[model] && _this.callbacks[model][method]) {
					if(_this.callbacks[model][method](request) === false)
=======
				if(request.data.hasOwnProperty(model) && cj.callbacks[model] && cj.callbacks[model][method]) {
					if(cj.callbacks[model][method](request) === false)
>>>>>>> 3184749ffc7a7f89462c366afb56e4cff0177f87
						return false
				}
			}
			if(method.toLowerCase().indexOf('delete') > -1) {
				model = _this.params.controller.modelize()
				if(_this.callbacks[model] && _this.callbacks[model][method] && _this.callbacks[model][method](request) === false) {
					return false
				}
			}
			return true
		} catch(e) {
			var readable = (model) ? model : selector
			console.log(e, 'An error occured within '+readable+' '+method+' callback.')
			return false
		}
	}
	this.del = function(params) {
		var item = params.item || 'this item',
			refresh = params.refresh || false,
			$caller = $(params.caller)

		this.params = params
	
		if(typeof params.controller !== 'undefined' && typeof params.id !== 'undefined')
		{
			var prefix = (typeof _this.params.prefix !== 'undefined') ? '/'+this.params.prefix : ''
		
			this.request.url = prefix+'/'+this.params.controller+'/delete/'+this.params.id
			this.request.data = {}

			if(_this._callback('beforeDelete', {}) === false)
				return false

			if(_this.options.debug)
				console.log('Deleting: ', _this.params)
		
			if(confirm("Are you sure you want to delete "+item+"?")) {

				$.ajax({
					url: _this.request.url,
					type: 'DELETE',
					cache: false,
					success: function(data) {
						_this.ajaxResponse(data, undefined, function(response, success) {
							if(success) {
								var $deletable = $caller.parents('.deletable').first()
								if(!$deletable[0])
									$deletable = $caller.parents('tr').first()

								$deletable.fadeOut(function(){$deletable.remove()})
								_this._callback('afterDelete', {})
								if(refresh)
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
	this._formInit = function(form) {
		$(document).off('change keyup input', _this.options.enable+' input, textarea, select, radio, checkbox', _this.handlers.change)
		if(typeof CKEDITOR !== 'undefined' && CKEDITOR.instances )
		{
			var eds = CKEDITOR.instances;
			for(var i in eds)
				if(eds.hasOwnProperty(i)) {
					_this.ck = {}
					_this.ck[i] = eds[i].getData()
					var CKinterval = setInterval(function() {
						if(_this.ck[i] !== eds[i].getData()) {
							_this.ck[i] = eds[i].getData()
							$(eds[i].element.$).trigger('change')
						}
					}, 300);
				}
		}

		if(!_this.timers)
			_this.timers = {}

		var $forms = $(_this.options.enable), $form
		
		$forms.each(function() {
			$form = $(this)
			if(!$(this).data('cakejax')) {
				if(_this.options.debug)
					console.log('\t\tNow Listening To: '+$(this).attr('id'));
				$form
					.data('cakejax', true)
					.on('submit', function(e) {
						_this.save(_this.collect($(this)))
						return false
					})
				_this.setButton({status: 'beforeChange', disabled: false, scope: $form})
				_this._callback('init', _this.collect($form))
			}
		})
	}
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
			text,el,ops = $.extend({}, defs, options),
			classToAdd

		var $el = $('[onclick^="_this.save"], [type="submit"]', ops.scope)

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
	this.refresh = function(options) {
		var defs = {
				selector: _this.options.view,
				url: window.location.pathname
			}, ops = $.extend({}, defs, options),
			SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
			selectors = ops.selector.split(',')
	
		if(_this.options.debug)
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
					if(_this.options.debug)
					if($content.length > 0)
						$(selectors[i]).replaceWith($content)
				}
				_this._formInit()
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
				if(ops.selector)
					$content = $(ops.selector, data).addClass('temporary none cj-got '+ops.addClass)
				else
					$content = $(data)
				if(ops.insertLoc) {
					$(ops.insertLoc).prepend($content.addClass('cj-got').css({display:'none'}))
					$content.slideDown()
				}
				else _this.flash({msg: data, html: true, autoRemove: false, mask: true})

				_this._formInit()

				if(typeof arguments[arguments.length-1] === 'function')
					arguments[arguments.length-1].call(this, $content);
			},
			error: function(xhr, e, msg) {
				console.log(e)
				_this.ajaxResponse(xhr)
			}
		})
	}
	this._binds = function() {
		_this.bind('click', '[data-cj-get]', _this.handlers.get)
		_this.bind('keyup', _this.handlers.close)
		//_this.bind('change', 'input[type="file"]:not([multiple])', _this.util.filePreview)
		_this.bind('click', '[data-cj-delete]', _this.handlers.del)
		_this.bind('click', '[data-cj-sort-save]', _this.handlers.sortSave)
		_this.bind('click', '.cj-request', _this.handlers.request)
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
				$(document).on(e, el)
			} else if(typeof callback === 'function') {
				$(document).on(e, el, callback)
			}
		// }
		// else return false;
	}
	this.sort = function(selector, items, handle) {
		var items = items || 'tr',
			handle = (typeof handle == 'undefined') ? '' : handle,
			request

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
				if(action) {
<<<<<<< HEAD
					ui.item.parents('[data-cj-action]').first().data('cjSortData', $(this).sortable('serialize'))
=======
					request = { url : action, data : $(this).sortable('serialize') }
					ui.item.parents('[data-cj-action]').first().data('cjSortData', request)
					// cj.setButton({status: 'beforeSave', disabled: false})
>>>>>>> 3184749ffc7a7f89462c366afb56e4cff0177f87
				}
				else _this.flash({msg: 'You forgot to define a \'data-cj-action\' attribute on your sortable container!', error: true});
			}
		}).disableSelection()
	}
	this.transport = {
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
		buildForm: function(s, id) {
			var $form = $('<form action="" method="POST" id="cjTransportForm-'+id+'" enctype="multipart/form-data"></form>'),
				$newEl			
			$form.attr('action', s.url).attr('target', '_self')
			if($form[0].encoding)
				$form.attr('encoding', 'multipart/form-data')
			else
				$form.attr('enctype', 'multipart/form-data')
			if(s.data) {
				for(var input in s.data) {
					if(s.data.hasOwnProperty(input))
						$('<input type="hidden" name="' + s.data[input]['name'] + '" value="' + s.data[input]['value'] + '" />').appendTo($form);
				}
			}
			if(s.files) {
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
						response
					
					requestDone = true
					try {
						response = $io.contents().find('body').html()
					} catch(e) {
						if( s.error )
							s.error('iframe troubles')
					}

					if ( response || e.timeout ) {
						status = (!e.timeout) ? 'success' : 'error';
						if ( status !== "error" ) {
							if ( s.success )
								s.success( response, status )
						} else {
							if(s.error)
								s.error(status)
						}
					}
					if ( s.complete )
						s.complete( response, status )

					setTimeout(function() {
						$io.remove()
						$form.remove()
					},100)
				}
		
			if ( s.timeout ) {
				setTimeout(function() {
					if( !requestDone ) 
						uploadCallback({timeout:true})
				}, s.timeout)
			}
			$io.one('load', uploadCallback)
			$form.submit()
			return {abort: function () {}}
		}
	}
	this.ajaxResponse = function(data) {
		var $oldForm = _this.request.form,
			$holding = $('<div>'),
			$response,
			flashMessage,
			success = true,
			stop = false,
			$freshForm,
			$newForm
 
		$response = $holding.html(data)
	
		flashMessage = $response.find('#flashMessage').text()

		if(typeof flashMessage == 'string' && flashMessage !== '') {
			var flashOps = {msg: flashMessage, mask: false};
			if(flashMessage.toString().indexOf('saved') > -1) {
				flashOps.replace = 'save'
			}
			_this.flash(flashOps)
		}

		var logs = (_this.options.debug) ? 'pre.cake-error, .notice, p.error' : 'pre.cake-error, .notice, p.error, pre',
			$notices = $response.find(logs),
			errors = '<pre>';

		if($notices.length > 0) {
			$notices.each(function() {
				errors += '\t'+$notices.text()+'<br><br>'
			});
			errors += '</pre>'
			console.log(errors)
			_this.flash({msg:errors, html: true, autoRemove: false, mask:true})
			success = false
		}

		if(flashMessage.toString().indexOf('could not be') > -1)
			success = false

		if($oldForm) {
			$freshForm = $response.find('#'+$oldForm[0].id)
			if($freshForm.length) {
				$oldForm.replaceWith($freshForm.addClass('cj-replaced'))
				_this._formInit()
			}
		}
		if(typeof arguments[arguments.length-1] === 'function')
			arguments[arguments.length-1].call(this, $response, success);
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
			ops = $.extend({}, defs, options)
		else if (typeof options == 'string') {
			ops = defs;
			ops.msg = options;
		}
		else throw new TypeError('Method \'flash\' cannot be called without arguments.')

		if(ops.replace) {
			$('[id^="flashMessage-"].'+ops.replace).fadeOut(function(){$(this).remove()})
		}

		if(_this.options.debug)
			ops.autoRemove = false;

		if($('.flashMessageModal').length == 0) {
			var $modal = $('<div></div>', {
					'class': 'flashMessageModal',
					id: 'flashMessageModal-'+modalCount
				}),
				$close = $('<div></div>').addClass('modal-close').html('&times;'),
				$mask = $('<div></div>').attr('id', 'mask'),
				htmlPattern = new RegExp('<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)</[A-Z][A-Z0-9]*>', 'i')
			$modal.append($close),$([$close[0],$mask[0]]).click(_this.handlers.close)
			if(ops.html || htmlPattern.test( ops.msg ) )
				$modal.html(ops.msg)
			else
				$modal.append('<div id="flashMessage-'+modalCount+'" class="'+ops.addClass+'">'+ops.msg+'</div>')

			if(ops.addClass) {
				$modal.addClass(ops.addClass)
			}

			$mask.css({height: document.height+'px'});
			$('#view').prepend($modal)

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
				var $m = $('#flashMessage-'+modalCount)
				if($('.flashMessageModal > [id^="flashMessage-"]').length == 1)
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
				if($el.data('cjSortData')) {
					request = $el.data('cjSortData')
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
			if(e.keyCode == 27 
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
			if(!$el.data('cj-got') || !ops.getOnce) {
				_this.get({
					url: ops.url,
					addClass: ops.addClass,
					insertLoc: ops.insertLoc,
					selector: ops.selector
				})
			}
			if(ops.getOnce) $el.data('cj-got', true)
		},
		change: function(e) {
			var $form = $(e.target.form),
				ops = $form.data('cjOptions') || {}
			if(e.type == 'input' || e.type == 'keyup') {
				clearTimeout(_this.collectTimeout)
				_this.collectTimeout = setTimeout(function() {
						_this.collect($form, ops.live)
					}, 400)
			} else {
				_this.collect($form, ops.live)
			}
			_this.setButton({status: 'beforeSave', disabled: false, scope: $form})
		},
		request: function(e) {
			var ops = $(e.currentTarget).data('cjRequest'),
				request = {
					url: ops.url,
					type: ops.type
				}
			if(ops.data && ops.type.toLowerCase() == 'post')
				request.data = ops.data
				_this.save(request)
		}
	},
	this.util = {
		modelize: function(c) {
			return c.charAt(0).toUpperCase() + c.slice(1)
		},
		fixHelper: function(e, ui) {
			var $original = ui,
				$helper = ui.clone()
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
				reader.readAsDataURL(f)
			}
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
