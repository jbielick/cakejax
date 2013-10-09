/**==============================================
* CakeJax v0.8.5 BETA
* 10/6/2013
*
*  ___ ___    _   ___ __  __ ___ _  _ _____
* | __| _ \  /_\ / __|  \/  | __| \| |_   _|
* | _||   / / _ \ (_ | |\/| | _|| .` | | |
* |_| |_|_\/_/ \_\___|_|  |_|___|_|\_| |_|
*     FRAGMENTLABS.COM
*
* Author: Josh Bielick
*==============================================*/
'use strict';

function cakejax() {
	var cj = this
	this.options = {
		debug: true,
		enable: 'form.cakejax, [cj-controller]'
	}
	this.ajaxSetup = {
		headers: { 
			Accept : 'application/json, application/javascript',
			'Content-Type': 'application/json'
		},
		cache: false,
		processData: false,
		dataType: 'json',
		beforeSend: function(xhr, request) {
			if(request.data && request.type.toLowerCase() === 'post') {
				try {
					request.data = JSON.stringify(request.data)
				} catch(e) {
					
				}
			}
			request.url += '.json'
		}
	}
	this.callbacks = {},
	this.validate = {}
	this.xhr = $.ajax
	cj.init = function(config) {
		$.extend(true, cj, config)
		cj._binds()
		cj._init()
	}
	cj._init = function() {
		var $ctrls = $('[cj-controller], '+cj.options.enable), r
		$ctrls.each(function() {
			if (!$(this).data('cjRequest')) {
				r =  cj.collect($(this).get(0), true)
				$(this).data('cjRequest', r)
				// cj.setButton({status: 'beforeChange', disabled: false, scope: $(this)})
				cj.callback('init', r)
			}
		})
	}
	this._binds = function() {
		cj.bind('click', '[type="submit"]', cj._handlers.whichSubmit)
		cj.bind('submit', 'form', cj._handlers.submit)
		cj.bind('click', '[cj-controller] [cj-save]', cj._handlers.submit)
		cj.bind('keyup', cj._handlers.keyup)
		cj.bind('change', 'input[type="file"]:not([multiple])', cj._handlers.filePreview)
		cj.bind('click', '[cj-delete]', cj._handlers.del)
		cj.bind('click', '[cj-get]', cj._handlers.get)
		cj.bind('click', '[cj-request]', cj._handlers.request)
		var tags = [ 'input', 'textarea', 'select', 'radio', 'checkbox']
		$(document).off('change keyup input', tags.join(', '), cj._handlers.change)
		cj.bind('change keyup input', tags.join(', '), cj._handlers.change)
		
		$(document)
			.ajaxStart(function() {
				$('<div class="loading none">').append('<i class="i-spin5 animate-spin">').css({position:'absolute',top:'1%',right:'1%',color:'white',zIndex:'10',fontSize:'35px'}).appendTo($(document.body)).fadeIn(150)
			})
			.ajaxComplete(function() {
				$('.loading').fadeOut(150, function(){$(this).remove()})
			})
	}
	this.bind = function() {
		$.fn.on.apply($(document), Array.prototype.slice.call(arguments))
	}
	this.collect = function(ctrl, liveOverride) {
		var $ctrl = $(ctrl),
			ops = $.extend({}, {refresh:false,live:false}, $ctrl.data('cjOptions')),
			_flattened = {},
			_flattenedDOM = {},
			r = {
				files: [],
				controller: ctrl,
				url: $ctrl.attr('action') || '',
				refresh: ops.refresh || false,
				live: ops.live || false,
				method: $ctrl.attr('method') || 'POST'
			},
			inputs = $ctrl.is('form') ? ctrl.elements : $ctrl.find('[cj-name]'),
			obj, obj2, name, idxd

		for (var i = 0; i < inputs.length; i++) {
			name = inputs[i].getAttribute('name')
			if (name && name.indexOf('data') > -1 && inputs[i].type !== 'submit') {
				if (!inputs[name].tagName && inputs[name].length > 1)
					name = name.replace(/\[.{0}\]/g, function() {return '['+Array.prototype.slice.apply(inputs[name]).indexOf(inputs[i])+']'})
				if(inputs[i].type === 'file' && inputs[i].value !== '')
					r.files.push(inputs[i])
				_flattenedDOM[name] = inputs[i]
				if (inputs[i].type === 'checkbox')
					_flattened[name] = inputs[i].checked ? '1' : '0'
				else
					_flattened[name] = $(inputs[i]).val()
			}
		}
		
		r.data = Hash.expand(_flattened)
		r.inputs = Hash.expand(_flattenedDOM)
		
		$ctrl.data('cjRequest', r)
			
		return (r.live && !liveOverride ? cj.save(r) : r)
	}
	this.save = function(r) {
		var ajaxOps
		if (Hash.keys(r.data).length > 0) {
			// cj.setButton({status:'duringSave', disabled: true, scope: r.controller})
			ajaxOps = {
				url: r.url,
				type: r.method || 'POST',
				complete: function(xhr) {
					cj.parseResponse(r, xhr, function(r, xhr) {
						// cj.setButton({status:'afterSave', disabled: false, highlight: false, scope: r.controller})
						return cj.callback('afterSave', r, xhr)
					})
				}
			}
			if (!r.files || r.files.length === 0) {
				ajaxOps.data = r.data
				cj.xhr(Hash.merge(ajaxOps, cj.ajaxSetup))
			}
			else if (r.files.length > 0) {
				ajaxOps.files = r.files
				ajaxOps.data = r.data
				cj.transport.send(ajaxOps)
			}
			return true
		}
		else
			return false
	}
	this._validate = {
		validateRequest: function(r) {
			var data = this.hoistModels($.extend(true, {}, r.inputs)), errors = {}, error
			
			for (var model in cj.validate) if (cj.validate.hasOwnProperty(model)) {
				if (Array.isArray(data[model])) {
					for (var i = 0; i < data[model].length; i++)
						if (error = this.checkFields(model, data[model][i]))
							errors[model] = error
				} else {
					if (error = this.checkFields(model, data[model]))
						errors[model] = error
				}
			}
			if (Hash.keys(errors).length) {
				errors = Hash.flatten(errors, '.', 2)
				for (var name in errors) if (errors.hasOwnProperty(name)) {
					cj._validate.displayError(errors[name].input, errors[name].message)
				}
				return false
			} else
				return true
		},
		checkFields: function(model, data) {
			var rg, errors = {}
			for (var field in cj.validate[model]) if (cj.validate[model].hasOwnProperty(field) && field in data) {
				for (var ruleGroup in cj.validate[model][field]) if (cj.validate[model][field].hasOwnProperty(ruleGroup)) {
					rg = cj.validate[model][field][ruleGroup]
					if (typeof rg.rule === 'function') {
						if (rg.rule.call(data[field], $(data[field]).val()) === false) errors[field] = {input: data[field], message: rg.message}
					} else {
						rg.rule = rg.rule.toString().split(',')
						for (var i=0; i < rg.rule.length; i++) {
							if (rg.rule[i] in cj._validate.rules && rg.rule[i] !== 'match')
								if (cj._validate.rules[rg.rule[i]]($(data[field]).val()) === false)
									errors[field] = {input: data[field], message: (typeof rg.message === 'string') ? rg.message : rg.message ? rg.message[i] : 'Invalid input. ['+rg.rule[i]+']'}
							else if (rg.rule[i] == 'match' && !rg.pattern.test($(data[field]).val())) errors[field] = {input: data[field], message: rg.message}
						}
					}
				}
			}
			return (Hash.keys(errors).length ? errors : false)
		},
		hoistModels: function(data, out) {
			var out = out || {}, key
			for (var key in data) if (data.hasOwnProperty(key)) {
				if (new RegExp('^[A-Z]{1}').test(key) && typeof data[key] === 'object') {
						out[key] = data[key]
						delete data[key]
						this.hoistModels(out[key], out)
				}
			}
			return out
		},
		displayError: function(el, msg) {
			var $input = $(el), 
				$msg = $('<div class="error-message">'+msg+'</div>'),
				$cur = $input.parent('.error').find('.error-message'),
				$close = $('<a href="javascript:void(0)" class="right">&times;</a>').click(function(){$(this).parent('.error-message').fadeOut().parents('.error').removeClass('error')}).appendTo($msg)
			if ($cur.length > 0 && msg) {
				$cur.append('<br>').append(msg)
			} else if (msg) {
				$input.parent().css('position','relative').addClass('error').append($msg)
			}
		},
		rules: {
			notEmpty: function(i) {var i = i.trim();if (!i || i === '' || i.length === 0 || Hash.keys(i).length === 0) return false},
			'boolean': function(i) {return (typeof i == 'boolean' || /(0|1)/.test(i))},
			alphaNumeric: function(i) {return !new RegExp('[^a-z0-9]+', 'ig').test(i)},
			numeric: function(i) {return !new RegExp('[^0-9]+', 'g').test(i)},
			email: function(i) {return new RegExp('^([A-Za-z0-9_\-\.\+])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$').test(i)},
			url: function(i) {return new RegExp('(http[s]?:\/\/){1}((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?', 'i').test(i)}
		}
	}
	this.callback = function(method, r, xhr) {
		var $ctrl = (r.controller) ? $(r.controller) : r, model
		if (typeof r.data == 'object') {
			try {
				if ($ctrl.jQuery) {
					for(var selector in cj.callbacks)
						if (cj.callbacks.hasOwnProperty(selector) && $ctrl.is(selector) && ( method in cj.callbacks[selector] ) && typeof cj.callbacks[selector][method] === 'function' )
							if (cj.callbacks[selector][method].call(r, xhr) === false)
								return false
				}
				for (model in r.data)
					if (r.data.hasOwnProperty(model) && model in cj.callbacks && method in cj.callbacks[model]) {
						var returned = cj.callbacks[model][method].call(r, xhr)
						if (returned === false)
							return false
						else if (method === 'beforeSave')
							return returned
						else
							return null
					}
				if (method.toLowerCase().indexOf('delete') > -1) {
					model = cj.params.controller.modelize()
					if (cj.callbacks[model] && cj.callbacks[model][method] && cj.callbacks[model][method].call(r, xhr) === false) {
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
	this.parseResponse = function(r, xhr) {
		try {
			xhr.responseJSON = JSON.parse(xhr.responseText)
		} catch(e) {
			
		}
		
		if (xhr.responseJSON) {
			
			if (xhr.responseJSON._flash) {
				if ($('#flashMessage').length)
					$('#flashMessage').text(xhr.responseJSON._flash)
				else
				$('<div class="message" id="flashMessage">'+xhr.responseJSON._flash+'</div>').insertBefore($(r.controller))
			}
			
			if (r.method.toLowerCase() === 'post' && xhr.responseJSON._validationErrors) {
				var vErrors = Hash.flatten(xhr.responseJSON._validationErrors, '][', 2, true), inputs = Hash.flatten(r.inputs, '][', false, true)
				for (var name in vErrors) if (vErrors.hasOwnProperty(name)) {
					var iname = name.replace(new RegExp('\[[0-9]{1,}\]$'), '')
					if(iname in inputs)
						for (var i = 0; i < vErrors[name].length; i++) {
							cj._validate.displayError(inputs[iname], vErrors[name][i])
						}
				}
			}
			
		}
		
		if (typeof arguments[arguments.length - 1] === 'function')
			arguments[arguments.length - 1](r, xhr)
	}
	this._handlers = {
		del: function(e) {
			var params = $(e.currentTarget).data('cjDelete')
			params = $.extend({}, params, {caller: e.currentTarget})
			cj.del(params)
		},
		keydown: function(e) {
			
		},
		keyup: function(e) {
			// if(e.keyCode === 27) {
			// 	if (e.target.className.indexOf('modal-close') > -1 || e.target.id == 'mask')
			// 		cj.close()
			// }
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
				$el.data('cj-got', true)
				cj.get({
					url: ops.url,
					addClass: ops.addClass,
					insertLoc: ops.insertLoc,
					selector: ops.selector
				})
			}
		},
		change: function(e) {
			var el = e.target, name = el.getAttribute('name')
			if (name) {
				var data = Hash.get($(el.form).data('cjRequest'), 'data'),
				serialized = [], hold = {}
				clearTimeout(cj.collectTimeout)
				cj.collectTimeout = setTimeout(function() {
					cj.collect(el.form)
				}, 100)
				cj.setButton({status: 'beforeSave', disabled: false, scope: $(e.target.form)})
			}
		},
		request: function(e) {
			var ops = $(e.currentTarget).data('cjRequest'),
				request = {
					url: ops.url,
					type: ops.type
				}
			if (ops.data && ops.type.toLowerCase() == 'post')
				request.data = ops.data
				cj.save(request)
		},
		submit: function(e) {
			var r = cj.collect(e.currentTarget), beforeSave
			if (cj.callback('beforeValidate', r) === false)
				return false
			if (r.data && cj._validate.validateRequest(r) === false)
				return false
			beforeSave = cj.callback('beforeSave', r)
			if (beforeSave === false)
				return false
			if (r.controller && $(r.controller).is(cj.options.enable)) {
				if (beforeSave && beforeSave !== true)
					r = beforeSave
				cj.save(r)
				return false
			}
		},
		whichSubmit: function(e) {
			if(e.currentTarget.value) {
				$(e.currentTarget).parents('[cj-controller]').first().append($('<input>', {
					name: e.currentTarget.name,
					value: e.currentTarget.value,
					style: 'display:none'
				}))
			}
		},
		filePreview: function(e) {
			var files = e.target.files, f
			if(window.FileReader) {
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
					})(f)
					reader.readAsDataURL(f)
				}
			}
		}
	}
	this.setButton = function(options) {
		// var defs = {
		// 		status: 'beforeChange',
		// 		disabled: false,
		// 		scope: $('form').first(),
		// 		statuses: {
		// 			beforeChange: {text: 'Saved',addClass: 'cj-static'},
		// 			duringSave: {text: 'Saving...',addClass: 'cj-saving'},
		// 			beforeSave: {text: 'Save Changes',addClass: 'cj-ready'},
		// 			afterSave: {text: 'Saved!',addClass: 'cj-saved'},
		// 			saveFail: {text: 'Retry Save',addClass: 'cj-failed'}
		// 		}
		// 	},
		// 	text,el,ops = $.extend(true, {}, defs, options),
		// 	classToAdd
		// 
		// var $el = $('[onclick^="_this.save"], [type="submit"]', ops.scope)
		// 
		// if ($el[0] && typeof $el.data('cj-nochange') == 'undefined' && !$el.hasClass(ops.statuses[ops.status].addClass)) {
		// 	ops.statuses = $.extend(true, {}, ops.statuses, $el.data('cj-statuses'))
		// 	classToAdd = ops.statuses[ops.status].addClass
		// 	if (ops.highlight) $el.addClass('tosave')
		// 	else $el.removeClass('tosave')
		// 	if ( $el.is('input') ) $el.val(ops.statuses[ops.status].text || '')
		// 	else $el.text(text)
		// 	if ( $el.is('button') ) $el.prop('disabled', ops.disabled)
		// }
	}
}

// POLYFILLS
if (!Array.prototype.map) {Array.prototype.map=function(a,t){for(var c=this,b=c.length,d=[],e=0;e<b;)e in c&&(d[e]=a.call(t,c[e],e++,c));d.lengh=b;return d}}
if (!Array.prototype.indexOf) {Array.prototype.indexOf = function(obj, start) {for (var i = (start || 0), j = this.length; i < j; i++) {if (this[i] === obj) { return i; }}return -1;}}
if (!Array.prototype.filter) {Array.prototype.filter = function(fun) {if (this === void 0 || this === null)throw new TypeError();var t = Object(this);	var len = t.length >>> 0;if (typeof fun !== "function")throw new TypeError();var res = [];var thisp = arguments[1];for (var i = 0; i < len; i++) {if (i in t) {var val = t[i];if (fun.call(thisp, val, i, t))res.push(val);}}return res;}}
if (!Array.isArray) {Array.isArray = function (vArg) {return Object.prototype.toString.call(vArg) === "[object Array]"}}
Function.prototype.callWithCopy = function() {var args = Array.prototype.slice.call(arguments);args.unshift($.extend(true, {}, args.shift()));return this.apply(this, args)}
String.prototype.modelize = function() {var s = this.charAt(0).toUpperCase() + this.slice(1);return s.replace(/(s)$/, '').replace(/_([A-Za-z]{1})/, function(v) {return v.replace('_', '').toUpperCase()}).replace(/ie$/, 'y')}

// Hash
;var Hash = new function() {
	var Hash = {
		extract: function(data, path) {
			if(!new RegExp('[{\[]').test(path))
				return Hash.get(data, path) || []
			var tokens = Hash._tokenize(path),
				got = [], out = [], context = {set: [data]}
				
			for (var i = 0; i < tokens.length; i++) {
				got = []
				for (var z = 0; z < context.set.length; z++) {
					for (var key in context.set[z]) if (context.set[z].hasOwnProperty(key)) {
						if (Hash._matchToken(key, tokens[i]))
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
		expand: function(data) {
			var path, tokens, parent, child, out = {}, cleanPath, val, curr
				
			if(!data.length)
				data = [data]
			
			for (var i = 0; i < data.length; i++) {
				curr = data[i]
				for (var path in curr) if (curr.hasOwnProperty(path)) {
					tokens = Hash._tokenize(path).reverse()
					val = typeof curr[path] === 'function' ? curr[path]() : curr[path]
					if (tokens[0] === '{n}' || !isNaN(Number(tokens[0])) ) {
						child = []
						child[tokens[0]] = val
					} else {
						child = {}
						child[tokens[0]] = val
					}
					tokens.shift()
					for (var z = 0; z < tokens.length; z++) {
						if (tokens[z] === '{n}' || !isNaN(Number(tokens[z])))
							parent = [], parent[tokens[z]] = child
						else
							parent = {}, parent[tokens[z]] = child
						child = parent
					}
					out = Hash.merge(false, out, child)
				}
			}
			return out
		},
		get: function(data, path) {
			var out = data,
				tokens = Hash._tokenize(path)
			for (var i = 0; i < tokens.length; i++) {
				if (typeof out === 'object' && typeof out[tokens[i]] !== 'undefined')
					out = out[tokens[i]]
				else
					return null
			}
			return out
		},
		merge: function() {
			var obs = Array.prototype.slice.call(arguments), out, dest = false
			
			if (typeof arguments[0] === 'boolean')
				dest = obs.shift()
				
			out = obs.shift()
			for (var i = 0; i < obs.length; i++) {
				for (var key in obs[i]) if (obs[i].hasOwnProperty(key)) {
					if (typeof obs[i][key] === 'object' && out[key] && !obs[i][key].nodeType)
						out[key] = Hash.merge(dest, out[key], obs[i][key])
					else
						out[key] = obs[i][key]
				}
			}
			return out
		},
		insert: function(data, path, values) {
			var tokens = Hash._tokenize(path), token, nextPath, expand = {}
			if (path.indexOf('{') === -1 && path.indexOf('[]') === -1) {
				return Hash._simpleOp('insert', data, tokens, values)
			}
			if (Hash.keys(data).length) {
				token = tokens.shift()
				nextPath = tokens.join('.')
				for (var key in data) if (data.hasOwnProperty(key)) {
					if (Hash._matchToken(key, token)) {
						if(!nextPath)
							data[key] = values
						else
							data[key] = Hash.insert(data[key], nextPath, values)
					}
				}
			} else {
				expand[path] = values
				return Hash.expand([expand])
			}
			return data
		},
		remove: function(data, path) {
			var tokens = Hash._tokenize(path), match, token, nextPath, removed
			if (path.indexOf('{') === -1) {
				return Hash._simpleOp('remove', data, tokens)
			}
			token = tokens.shift()
			nextPath = tokens.join('.')
			for (var key in data) if (data.hasOwnProperty(key)) {
				match = Hash._matchToken(key, token)
				if (match && typeof data[key] === 'object') {
					data[key] = Hash.remove(data[key], nextPath)
				} else if (match) {
					if (Array.isArray(data)) {
						data.splice(key,1)
					} else {
						delete data[key]
					}
				}
			}
			return data
		},
		_simpleOp: function(op, data, tokens, value) {
			var hold = data, removed
			for (var i = 0; i < tokens.length; i++) {
				if (op === 'insert') {
					if (i === tokens.length-1) {
						hold[tokens[i]] = value
						return data
					}
					if (typeof hold[tokens[i]] !== 'object') {
						if (!isNaN(Number(tokens[i+1]))) {
							hold[tokens[i]] = []
						} else {
							hold[tokens[i]] = {}
						}
					}
					hold = hold[tokens[i]]
				} else if (op === 'remove') {
					if (i === tokens.length-1) {
						removed = Hash.insert({}, 'item', hold[tokens[i]])
						if (Array.isArray(hold)) {
							hold.splice(tokens[i],1)
						} else {
							delete hold[tokens[i]]
						}
						data = removed.item
						return data
					}
					if (typeof hold[tokens[i]] === 'undefined') {
						return data
					}
					hold = hold[tokens[i]]
				}
			}
		},
		_tokenize: function(path) {
			if (path.indexOf('data[') === -1) {
				return path.split('.')
			} else {
				return path.replace(/^data/, '').replace(/^\[|\]$/g, '').split('][').map(function(v) {return v === '' ? '{n}' : v })
			}
		},
		flatten: function() {
			return Function.callWithCopy.apply(Hash._flatten, arguments)
		},
		_flatten: function(data, separator, limit) {
			var path = '', stack = [], out = {}, key, el, curr,
				separator = separator || '.', limit = limit || false, wrap = separator === ']['
			while (Hash.keys(data).length || (Array.isArray(data) && data.length) ) {
				if (Array.isArray(data)) {
					key = data.length-1
					el = data.pop()
				}
				else {
					key = Hash.keys(data)[0]
					el = data[key]
					delete data[key]
				}
				
				if (path.split(separator).length === limit || typeof el !== 'object' || el == null || el.nodeType) {
					if(wrap)
						out['data['+path+key+']'] = el || ''
					else
						out[path + key] = el || ''
				}
				else {
					if (Hash.keys(data).length > 0) {
						stack.push([data,path])
					}
					data = el
					path += key + separator
				}
				if (Hash.keys(data).length === 0 && stack.length) {
					curr = stack.pop()
					data = curr[0], path = curr[1]
				}
			}
			return out
		},
		keys: function(obj) {
			var keys = []
			if (Array.isArray(obj)) {
				obj.map(function(v, i) {keys.push(i)})
			} else {
				for (var key in obj) if (obj.hasOwnProperty(key))
					keys.push(key)
			}
			return keys
		}
	}
	return Hash
}()

var cj = cj || new cakejax()
