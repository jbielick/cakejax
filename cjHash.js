
// Hash
;var Hash = new function($) {
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
				for (var path in curr) if(curr.hasOwnProperty(path)) {
					tokens = Hash._tokenize(path).reverse()
					val = typeof curr[path] === 'function' ? curr[path]() : curr[path]
					if (tokens[0] === '{n}' || !isNaN(Number(tokens[0])) ) {
						child = []
						if (typeof val === 'object')
							child = val || ''
						else {
							if (Array.isArray(val))
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
						if (tokens[z] === '' || tokens[z] === '{n}' || !isNaN(Number(tokens[z])))
							parent = [], parent.push(child)
						else
							parent = {}, parent[tokens[z]] = child
						child = parent
					}
					out = Hash.merge(out, child)
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
					//for the love of god, please don't traverse DOM nodes
					if (typeof obs[i][key] === 'object' && out[key] && !out.nodeType && !obs[i][key].nodeType)
						out[key] = Hash.merge(dest, out[key], obs[i][key])
					else if (Number(key) % 1 === 0 && Array.isArray(out) && Array.isArray(obs[i]) && !dest)
						out.push(obs[i][key])
					else
						out[key] = obs[i][key] // but you can store them, k?
				}
			}
			return out
		},
		insert: function(data, path, values) {
			var tokens = Hash._tokenize(path), token, nextPath, expand = {}
			if (path.indexOf('{') === -1 && path.indexOf('[]') === -1) {
				return Hash._simpleOp('insert', data, tokens, values)
			}
			if (!$.isEmptyObject(data)) {
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
			var tokens = Hash._tokenize(path), match, token, nextPath
			if (path.indexOf('{') === -1) {
				return Hash._simpleOp('remove', data, tokens)
			}
			token = tokens.shift()
			nextPath = tokens.join('.')
			for (var key in data) if (data.hasOwnProperty(key)) {
				match = Hash._matchToken(key, token)
				if (match && typeof data[key] === 'object')
					data[key] = Hash.remove(data[key], nextPath)
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
		flatten: function() {
			return Function.callWithCopy.apply(Hash._flatten, arguments)
		},
		_flatten: function(data, separator, limit, wrap) {
			var path = '', stack = [], out = {}, key, el, curr, i = 1,
				separator = separator || '.', limit = limit || false, wrap = wrap || false
			while (Hash.keys(data).length || (Array.isArray(data) && data.length) ) {
				key = Hash.keys(data)[0]
				el = data[key]
				delete data[key]
				if (typeof el !== 'object' || el.nodeType || i>=limit) {
					if(wrap)
						out['data['+path+key+']'] = el
					else
						out[path + key] = el
					i = 1
				}
				else {
					if (Hash.keys(data).length === 0) {
						stack.push([data,path])
					}
					data = el
					path += key + separator
				}
				if (Hash.keys(data).length === 0 && stack.length) {
					curr = stack.pop()
					data = curr[0], path = curr[1]
					i--
				}
				i++
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
