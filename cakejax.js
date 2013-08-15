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

function cj() {
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
}

cj.prototype = {
	init: function(options) {
		this.options = $.extend({}, this.options, options)

		if(typeof CKEDITOR !== 'undefined') {
			try{CKEDITOR.replaceAll()}catch(e){/*don't care*/}
		}

		cj._binds()
		cj._formInit()

		if(typeof arguments[arguments.length-1] === 'function')
			arguments[arguments.length-1].call(this)
	},
	collect: function($form, live) {
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

		if(cj.options.debug)
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

				// if(cj.options.debug)
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
		this.request = r
	
		if(cj.options.debug)
			console.log('#'+r.form.attr('id')+' Request:', r)//JSON.stringify(r.data, null, '\t'));
	
		if(live) {
			return cj.save(r)
		}
		return r
	},
	save: function(request) {
		if(!$.isEmptyObject(request.data)) {
			if(cj.options.debug)
				console.log('Saving...', request)
			
			if(request.form) {
			
				if(cj._callback('beforeValidate', request) === false)
					return false
			
				if(cj._validate.check(request) === false)
					return false
			}
		
			if(cj._callback('beforeSave', request) === false)
				return false

			cj.flash({msg: 'Saving...', autoRemove: false, addClass: 'save'});

			cj.setButton({status:'duringSave', disabled: true, scope: request.form});

			if(!request.files || request.files && request.files.length == 0) {
				$.ajax({
					url: request.url,
					type: request.method || 'POST',
					dataType: 'text',
					data: request.data,
					cache: false,
					success: function(data)
					{
						cj.ajaxResponse(data, function(response, success) {
							if(success) {
								cj.setButton({status:'afterSave', disabled: false, highlight: false, scope: request.form})
								cj._callback('afterSave', request)
								// delete cj.request.data
								if(request.refresh)
									cj.refresh(request.refresh)
							}
						})
					},
					error: function(e, xhr, ms) {
						console.log(e)
						cj.setButton({status:'saveFail', disabled: false, scope: request.form})
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
						else cj.flash({msg: ms+xhr.responseText, html: true, autoRemove: false})
					}
				})
			}
			else if(request.files && request.files.length > 0) {
				cj.transport.send({
					url: request.url,
					files: request.files,
					data: request.form.serializeArray(),
					success: function(data) {
						cj.ajaxResponse(data, function(response, success) {
							if(success) {
								cj.setButton({status:'afterSave', disabled: false, highlight: false, scope: request.form})
								cj._callback('afterSave', request)
								if(request.refresh)
									cj.refresh(request.refresh)
								// delete cj.request.data
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
			return cj.flash('No changes to save!')
	},
	_validate: {
		check: function(request) {
			if(cj.options.debug)
				console.log('Validating...')
			var model,field,input,value,ruleGroup,rule,rg,msgs = [],msg
			request.form.find('.input .error-message').remove()
			$('.error').removeClass('error')
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
										if (typeof rg.rule === 'function') {
											if(rg.rule(value) === false)
												msgs.push({input:input,message:rg.message})
										} else {
											rg.rule = rg.rule.toString().split(',')
											for (var i=0; i < rg.rule.length; i++) {
												if(rg.rule[i] in cj._validate.rules && rg.rule[i] !== 'match') {
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
	},
	_callback: function(method, request) {
		var $form = (request.form && request.form.jquery) ? $(request.form) : request, modelized, model
		try{
			if($form) {
				for(var selector in cj.callbacks)
					if(cj.callbacks.hasOwnProperty(selector) && $form.is(selector) && ( method in cj.callbacks[selector] ) && typeof cj.callbacks[selector][method] === 'function' )
						if(cj.callbacks[selector][method](request) === false)
							return false
			}
			for(model in request.data) {
				if(this.request.data.hasOwnProperty(model) && cj.callbacks[model] && cj.callbacks[model][method]) {
					if(cj.callbacks[model][method](request) === false)
						return false
				}
			}
			if(method.toLowerCase().indexOf('delete') > -1) {
				model = this.params.controller.modelize()
				if(cj.callbacks[model] && cj.callbacks[model][method] && cj.callbacks[model][method](request) === false) {
					return false
				}
			}
			return true
		} catch(e) {
			var readable = (model) ? model : selector
			console.log(e, 'An error occured within '+readable+' '+method+' callback.')
			return false
		}
	},
	del: function(params) {
		var item = params.item || 'this item',
			refresh = params.refresh || false,
			$caller = $(params.caller)

		this.params = params
	
		if(typeof params.controller !== 'undefined' && typeof params.id !== 'undefined')
		{
			var prefix = (typeof this.params.prefix !== 'undefined') ? '/'+this.params.prefix : ''
		
			this.request.url = prefix+'/'+this.params.controller+'/delete/'+this.params.id
			this.request.data = {}

			if(cj._callback('beforeDelete', {}) === false)
				return false

			if(cj.options.debug)
				console.log('Deleting: ', this.params)
		
			if(confirm("Are you sure you want to delete "+item+"?")) {

				$.ajax({
					url: this.request.url,
					type: 'DELETE',
					cache: false,
					success: function(data) {
						cj.ajaxResponse(data, undefined, function(response, success) {
							if(success) {
								var $deletable = $caller.parents('.deletable').first()
								if(!$deletable[0])
									$deletable = $caller.parents('tr').first()

								$deletable.fadeOut(function(){$deletable.remove()})
								cj._callback('afterDelete', {})
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
	},
	_formInit: function(form) {
		$(document).off('change keyup input', cj.options.enable+' input, textarea, select, radio, checkbox', cj.handlers.change)
		if(typeof CKEDITOR !== 'undefined' && CKEDITOR.instances )
		{
			var eds = CKEDITOR.instances;
			for(var i in eds)
				if(eds.hasOwnProperty(i)) {
					cj.ck = {}
					cj.ck[i] = eds[i].getData()
					var CKinterval = setInterval(function() {
						if(cj.ck[i] !== eds[i].getData()) {
							cj.ck[i] = eds[i].getData()
							$(eds[i].element.$).trigger('change')
						}
					}, 300);
				}
		}

		if(!cj.timers)
			cj.timers = {}

		var $forms = $(cj.options.enable), $form
		
		$forms.each(function() {
			$form = $(this)
			if(!$(this).data('cakejax')) {
				if(cj.options.debug)
					console.log('\t\tNow Listening To: '+$(this).attr('id'));
				$form
					.data('cakejax', true)
					.on('submit', function(e) {
						cj.save(cj.collect($(this)))
						return false
					})
				cj.setButton({status: 'beforeChange', disabled: false, scope: $form})
				cj._callback('init', cj.collect($form))
			}
		})
	},
	setButton: function(options) {
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
	},
	refresh: function(options) {
		var defs = {
				selector: cj.options.view,
				url: window.location.pathname
			}, ops = $.extend({}, defs, options),
			SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
			selectors = ops.selector.split(',')
	
		if(cj.options.debug)
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
					if(cj.options.debug)
					if($content.length > 0)
						$(selectors[i]).replaceWith($content)
				}
				cj._formInit()
			}
		})
	},
	get: function(options, callback) {
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

				if(typeof arguments[arguments.length-1] === 'function')
					arguments[arguments.length-1].call(this, $content);
			},
			error: function(xhr, e, msg) {
				console.log(e)
				cj.ajaxResponse(xhr)
			}
		})
	},
	_binds: function() {
		cj.bind('click', '[data-cj-get]', cj.handlers.get)
		cj.bind('keyup', cj.handlers.close)
		//cj.bind('change', 'input[type="file"]:not([multiple])', cj.util.filePreview)
		cj.bind('click', '[data-cj-delete]', cj.handlers.del)
		cj.bind('click', '[data-cj-sort-save]', cj.handlers.sortSave)
		cj.bind('click', '.cj-request', cj.handlers.request)
		cj.bind('change keyup input', cj.options.enable+' input,'+cj.options.enable+' textarea,'+cj.options.enable+' select,'+cj.options.enable+' radio,'+cj.options.enable+' checkbox', cj.handlers.change)
	},
	bind: function(e, el, callback) {
		// if(typeof callback == 'undefined')
		// 	var ui = el.name || new Date().getTime()
		// else
		// 	var ui = callback.name || el
		// if(!cj.listeners[e+':'+ui]) {
		// 	cj.listeners[e+':'+ui] = true
			if(typeof el === 'function') {
				$(document).on(e, el)
			} else if(typeof callback === 'function') {
				$(document).on(e, el, callback)
			}
		// }
		// else return false;
	},
	sort: function(selector, items, handle) {
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
	},
	transport: {
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
				$form = cj.transport.buildForm(s, id),
				$io = cj.transport.buildIframe(id, s.secureuri)
			
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
	},
	ajaxResponse: function(data) {
		var $oldForm = cj.request.form,
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
			cj.flash(flashOps)
		}

		var logs = (cj.options.debug) ? 'pre.cake-error, .notice, p.error' : 'pre.cake-error, .notice, p.error, pre',
			$notices = $response.find(logs),
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
			$freshForm = $response.find('#'+$oldForm[0].id)
			if($freshForm.length) {
				$oldForm.replaceWith($freshForm.addClass('cj-replaced'))
				cj._formInit()
			}
		}
		if(typeof arguments[arguments.length-1] === 'function')
			arguments[arguments.length-1].call(this, $response, success);
	},
	flash: function(options) {
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
					cj.close()
				else
					$m.fadeOut(function() {$m.remove()})
			}, ops.linger);
		}
	},
	close: function() {
		$('.flashMessageModal, #mask').each(function(){
			$(this).fadeOut('fast',function(){$(this).remove()})
		})
	},
	handlers: {
		sortSave: function(e) {
			var selector = $(e.currentTarget).data('cjSortSave'), request
			$(selector).each(function() {
				var $el = $(this)
				if($el.data('cjSortData')) {
					cj.save(request)
				}
			})
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
		},
		change: function(e) {
			var $form = $(e.target.form),
				ops = $form.data('cjOptions') || {}
			if(e.type == 'input' || e.type == 'keyup') {
				clearTimeout(cj.collectTimeout)
				cj.collectTimeout = setTimeout(function() {
						cj.collect($form, ops.live)
					}, 400)
			} else {
				cj.collect($form, ops.live)
			}
			cj.setButton({status: 'beforeSave', disabled: false, scope: $form})
		},
		request: function(e) {
			var ops = $(e.currentTarget).data('cjRequest'),
				ajaxOps = {
					url: ops.url,
					type: ops.type,
					success: function(data) {
						Hist.get(window.location.pathname)
					}
				}
			if(ops.data && ops.type.toLowerCase() == 'post')
				ajaxOps.data = ops.data
			cj.flash({msg:'Saving...',addClass: '.save'})
			$.ajax(ajaxOps)
		}
	},
	util: {
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
}

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
var cj = new cj()
