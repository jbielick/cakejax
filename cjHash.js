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
