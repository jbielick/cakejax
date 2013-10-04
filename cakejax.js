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
	$.extend(true, cj, {
		options: {
			debug: true,
			enable: 'form'
		},
		ajaxSetup: {
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
		},
		callbacks: {},
		validate: {}
	})
	cj.xhr = $.ajax
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
		cj.bind('click', '.cj-request', cj._handlers.request)
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
	cj.bind = function() {
		$.fn.on.apply($(document), Array.prototype.slice.call(arguments))
	}
	cj.collect = function(ctrl, liveOverride) {
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
			inputs = $ctrl.is('form') ? ctrl.elements : $ctrl.find('[data-name]'),
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
		if (cj.options.debug)
			console.log('Controller: #'+$ctrl.attr('id')+' ;; Request:', r)
			
		return r.live && !liveOverride ? cj.save(r) : r
	}
	cj.save = function(r) {
		var ajaxOps
		if (Hash.keys(r.data).length > 0) {
			// cj.setButton({status:'duringSave', disabled: true, scope: r.controller})
			ajaxOps = {
				url: r.url,
				type: r.method || 'POST',
				complete: function(xhr) {
					cj.parseResponse(xhr, r, function(r, success) {
						cj.setButton({status:'afterSave', disabled: false, highlight: false, scope: r.controller})
						return cj.callback('afterSave', r)
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
	cj._validate = {
		check: function(r) {
			var model,field,input,value,ruleGroup,rule,rg,msgs = [],msg
			$(r.controller).find('.input .error-message').remove()
			$('.error').removeClass('error')
			for(model in cj.validate)
				if (cj.validate.hasOwnProperty(model))
					if (r.data && model in r.data)
						for(field in cj.validate[model])
							if (cj.validate[model].hasOwnProperty(field) && field in r.data[model])
								for(ruleGroup in cj.validate[model][field])
									if (cj.validate[model][field].hasOwnProperty(ruleGroup)) {
										input = r.inputs[model][field]
										value = r.data[model][field]
										rg = cj.validate[model][field][ruleGroup]
										if (typeof rg.rule === 'function') {
											if (rg.rule(value) === false)
												msgs.push({input:input,message:rg.message})
										} else {
											rg.rule = rg.rule.toString().split(',')
											for (var i=0; i < rg.rule.length; i++) {
												if (rg.rule[i] in cj._validate.rules && rg.rule[i] !== 'match') {
													if (cj._validate.rules[rg.rule[i]](value) === false) {
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
						$close = $('<a href="javascript:void(0)" class="right">&times;</a>').click(function(){$(this).parent('.error-message').fadeOut()}).appendTo($msg)
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
			notEmpty: function(i) {var i = i.trim();if (!i || i == '' || !i || i.length == 0)return false},
			'boolean': function(i) {return (typeof i == 'boolean' || /(0|1)/.test(i))},
			alphaNumeric: function(i) {return !/[^a-z0-9]/ig.test(i)},
			email: function(i) {return new RegExp('^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$').test(i)},
			url: function(i) {return new RegExp('(http[s]?:\/\/){1}((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?', 'i').test(i)}
		}
	}
	cj.callback = function(method, arg) {
		var $ctrl = (arg.controller) ? $(arg.controller) : arg, model
		if (typeof arg.data == 'object') {
			try {
				if ($ctrl.jQuery) {
					for(var selector in cj.callbacks)
						if (cj.callbacks.hasOwnProperty(selector) && $ctrl.is(selector) && ( method in cj.callbacks[selector] ) && typeof cj.callbacks[selector][method] === 'function' )
							if (cj.callbacks[selector][method].call(cj, arg) === false)
								return false
				}
				for (model in arg.data)
					if (arg.data.hasOwnProperty(model) && model in cj.callbacks && method in cj.callbacks[model]) {
						var returned = cj.callbacks[model][method].call(cj, arg)
						if (returned === false)
							return false
						else if (method === 'beforeSave')
							return returned
						else
							return null
					}
				if (method.toLowerCase().indexOf('delete') > -1) {
					model = cj.params.controller.modelize()
					if (cj.callbacks[model] && cj.callbacks[model][method] && cj.callbacks[model][method](arguments.shift()) === false) {
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
	cj.parseResponse = function(xhr) {
		console.log(xhr)
	}
	cj._handlers = {
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
			if (cj._validate.check(r) === false)
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
	cj.setButton = function(options) {
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
String.prototype.modelize = function() {var s = this.charAt(0).toUpperCase() + this.slice(1);return s.replace(/(s)$/, '').replace(/_([A-Za-z]{1})/, function(v) {return v.replace('_', '').toUpperCase()}).replace(/ie$/, 'y')}

// Hash
;var Hash = new function($) {
	var Hash = {
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
		expand: function(data) {
			var path, tokens, parent, child, out = {}, cleanPath, val, curr
				
			if(!data.length)
				data = [data]
			
			for (var i = 0; i < data.length; i++) {
				curr = data[i]
				for (var path in curr) if(curr.hasOwnProperty(path)) {
					tokens = this._tokenize(path).reverse()
					val = typeof curr[path] === 'function' ? curr[path]() : curr[path]
					if (tokens[0] === '{n}') {
						child = []
						if (typeof val === 'object')
							child = val || ''
						else {
							if ($.isArray(val))
								$.merge(child, val)
							else
								child.push(val)
						}
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
		get: function(data, path) {
			var out = data,
				tokens = this._tokenize(path)
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
					//for the love of god, please don't traverse DOM nodes
					if (typeof obs[i][key] === 'object' && out[key] && !out.nodeType && !obs[i][key].nodeType)
						out[key] = this.merge(dest, out[key], obs[i][key])
					else if (Number(key) % 1 === 0 && $.isArray(out) && $.isArray(obs[i]) && !dest)
						out.push(obs[i][key])
					else
						out[key] = obs[i][key] // but you can store them, k?
				}
			}
			return out
		},
		insert: function(data, path, values) {
			var tokens = this._tokenize(path), token, nextPath, expand = {}
			if (path.indexOf('{') === -1 && path.indexOf('[]') === -1) {
				return this._simpleOp('insert', data, tokens, values)
			}
			if (!$.isEmptyObject(data)) {
				token = tokens.shift()
				nextPath = tokens.join('.')
				for (var key in data) if (data.hasOwnProperty(key)) {
					if (this._matchToken(key, token)) {
						if(!nextPath)
							data[key] = values
						else
							data[key] = this.insert(data[key], nextPath, values)
					}
				}
			} else {
				expand[path] = values
				return this.expand([expand])
			}
			return data
		},
		remove: function(data, path) {
			var tokens = this._tokenize(path), match, token, nextPath
			if (path.indexOf('{') === -1) {
				return this._simpleOp('remove', data, tokens)
			}
			token = tokens.shift()
			nextPath = tokens.join('.')
			for (var key in data) if (data.hasOwnProperty(key)) {
				match = this._matchToken(key, token)
				if (match && typeof data[key] === 'object')
					data[key] = this.remove(data[key], nextPath)
				else if (match)
					delete data[key]
			}
			return data
		},
		_simpleOp: function(op, data, tokens, value) {
			var hold = data
			for (var i = 0; i < tokens.length; i++) {
				if (op === 'insert') {
					if (i === tokens.length-1) {
						hold[tokens[i]] = value
						return data
					}
					if (typeof hold[tokens[i]] !== 'object') {
						hold[tokens[i]] = {}
					}
					hold = hold[tokens[i]]
				} else if (op === 'remove') {
					if (i === tokens.length -1) {
						delete hold[tokens[i]]
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
		flatten: function(data, separator, wrap) {
			var path = '', stack = [], out = {}, key, el, curr, 
				separator = separator ? separator : '.', data = JSON.parse(JSON.stringify(data))
			while (!$.isEmptyObject(data)) {
				key = this.keys(data)[0]
				el = data[key]
				delete data[key]
				if (typeof el !== 'object') {
					if(wrap)
						out['data['+path+key+']'] = el
					else
						out[path + key] = el
				}
				else {
					if (!$.isEmptyObject(data)) {
						stack.push([data,path])
					}
					data = el
					path += key + separator
				}
				if ($.isEmptyObject(data) && !$.isEmptyObject(stack)) {
					curr = stack.pop()
					data = curr[0], path = curr[1]
				}
			}
			return out
		},
		keys: function(obj) {
			var keys = []
			for (var key in obj) if (obj.hasOwnProperty(key))
				keys.push(key)
			return keys
		}
	}
	return Hash
}(jQuery)

var cj = cj || new cakejax()
