/**==============================================
* CakeJax v0.5.3 BETA
* 8/16/2013
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
		_this.options = $.extend(true, {}, _this.options, options)

		if (typeof CKEDITOR !== 'undefined') {
			try{CKEDITOR.replaceAll()}catch(e){/*don't care*/}
		}
		_this._binds()
		_this._init()

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
						}
					}, 300);
				}
		}
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

			_this.setButton({status:'duringSave', disabled: true, scope: request.form})

			var ajaxOps = {
				url: request.url,
				type: requst.method || 'POST',
				dataType: 'text',
				cache: false,
				complete: function(xhr) {
					_this.ajaxResponse(xhr, request, function(request, success) {
						_this._callback('afterSave', request)
						if (success) {
							_this.setButton({status:'afterSave', disabled: false, highlight: false, scope: request.form})
							if (request.refresh)
								_this.refresh(request.refresh)
						}
					})
				}
			}

			if (!request.files || request.files.length === 0) {
				ajaxOps.data = request.data
				$.ajax(ajaxOps)
			}
			else if (request.files && request.files.length > 0) {
				ajaxOps.files = request.files
				ajaxOps.data = request.form.serializeArray()
				_this.transport.send(ajaxOps)
			}
			return true
		}
		else
			return false
	}
	this._validate = {
		check: function(request) {
			if (_this.options.debug)
				console.log('Validating...')
			var model,field,input,value,ruleGroup,rule,rg,msgs = [],msg
			$(request.form).find('.input .error-message').remove()
			$('.error').removeClass('error')
			for(model in _this.validate)
				if (_this.validate.hasOwnProperty(model))
					if (model in request.data)
						for(field in _this.validate[model])
							if (_this.validate[model].hasOwnProperty(field) && field in request.data[model])
								for(ruleGroup in _this.validate[model][field])
									if (_this.validate[model][field].hasOwnProperty(ruleGroup)) {
										input = request.inputs[model][field]
										value = request.data[model][field]
										rg = _this.validate[model][field][ruleGroup]
										if (typeof rg.rule === 'function') {
											if (rg.rule(value) === false)
												msgs.push({input:input,message:rg.message})
										} else {
											rg.rule = rg.rule.toString().split(',')
											for (var i=0; i < rg.rule.length; i++) {
												if (rg.rule[i] in _this._validate.rules && rg.rule[i] !== 'match') {
													if (_this._validate.rules[rg.rule[i]](value) === false) {
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
						return false
					}
				}
				return null
			} catch(e) {
				var readable = (model) ? model : selector
				console.log(e, 'An error occured within '+readable+' '+method+' callback.')
				return false
			}
		} else {
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
			var prefix = (typeof _this.params.prefix !== 'undefined') ? '/'+_this.params.prefix : ''
		
			_this.request.url = prefix+'/'+_this.params.controller+'/delete/'+_this.params.id
			request.data = {}

			if (_this._callback('beforeDelete', {}) === false)
				return false

			if (_this.options.debug)
				console.log('Deleting: ', _this.params)
		
			if (confirm("Are you sure you want to delete "+item+"?")) {

				$.ajax({
					url: _this.request.url,
					type: 'DELETE',
					cache: false,
					complete: function(xhr) {
						_this.ajaxResponse(xhr, request, function(request, success) {
							_this._callback('afterSave', request)
							if (success) {
								var $deletable = $caller.parents('.deletable').first()
								if (!$deletable[0])
									$deletable = $caller.parents('tr').first()

								$deletable.fadeOut(function(){$deletable.remove()})
								if (refresh)
									_this.refresh(refresh)
							}
						})
					}
				})
			}
		}
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
			
		if (_this.options.debug)
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
					if (_this.options.debug)
					if ($content.length > 0)
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
		var tags = [ 'input', 'textarea', 'select', 'radio', 'checkbox']
		$(document).off('change keyup input', tags.join(', '), _this.handlers.change)
		_this.bind('change keyup input', tags.join(', '), _this.handlers.change)
	}
	this.bind = function() {
		$(document).on.apply(Array.prototype.slice.call(arguments))
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
	this.ajaxResponse = function(xhr, request) {
		var $oldForm = $(request.form),
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

		if ($flashMessage.length) {
			if ($('#flashMessage').length)
				$('#flashMessage').remove()
			$(_this.options.view).prepend($flashMessage)
		}

		var logs = (cj.options.debug) ? 'pre.cake-error, .notice, p.error' : 'pre.cake-error, .notice, p.error, pre',
			$notices = $response.find(logs),
			errors = '<pre>';

		if ($notices.length > 0) {
			$notices.each(function() {
				errors += '\t'+$notices.text()+'<br><br>'
			});
			errors += '</pre>'
			console.log(errors)
			cj.flash({msg:errors, html: true, autoRemove: false, mask:true})
			success = false
		}

		if ($oldForm) {
			$freshForm = $response.find('#'+$oldForm[0].id)
			if ($freshForm.length) {
				$oldForm.replaceWith($freshForm.addClass('cj-replaced'))
				cj._init()
			}
		}
		if (typeof arguments[arguments.length-1] === 'function')
			arguments[arguments.length-1].call(this, request, success)
		
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

		if (_this.options.debug)
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
			if (ops.html || htmlPattern.test( ops.msg ) )
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

			if (ops.mask) {
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
				if ($('.flashMessageModal > [id^="flashMessage-"]').length == 1)
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
			if (!$el.data('cj-got') || !ops.getOnce) {
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
			if (e.type == 'input' || e.type == 'keyup') {
				clearTimeout(_this.collectTimeout)
				_this.collectTimeout = setTimeout(function() {
						_this.collect(e.target.form, ops.live)
					}, 400)
			} else {
				_this.collect(e.target.form, ops.live)
			}
			_this.setButton({status: 'beforeSave', disabled: false, scope: $form})
		},
		request: function(e) {
			var ops = $(e.currentTarget).data('cjRequest'),
				request = {
					url: ops.url,
					type: ops.type
				}
			if (ops.data && ops.type.toLowerCase() == 'post')
				request.data = ops.data
				_this.save(request)
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
			}
		}
	},
	this.Hash = {
		extract: function(data, path) {
			if(!new RegExp('[{\[]').test(path))
				return this.get(data, path) || []
			var tokens = this._tokenize(path),
				got = [], out = [], context = {set: [data]}
				
			for (var i = 0; i < tokens.length; i++) {
				got = []
				for (var z = 0; z < context.set.length; z++) {
					for (var key in context.set[z]) if (context.set[z].hasOwnProperty(key)) {
						if (this._matchToken(key, tokens[i]))
							got.push(context.set[z][key])
					}
				}
				context.set = got
			}
			return context.set
		},
		_matchToken: function(key, token) {
			if (token === '{n}')
				return (Number(key) % 1 === 0)
			if (token === '{s}')
				return typeof key === 'string'
			if (Number(token) % 1 === 0)
				return (key == token)
			return (key === token)
		},
		_matches: function(val, condition) {
			
		},
		expand: function(data, delimiter) {
			var path, tokens, delimiter = delimiter || '.',
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
