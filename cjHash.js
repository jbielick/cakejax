var Hash = new function() {
	this.extract = function(data, path) {
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
	this._matchToken = function(key, token) {
		if (token === '{n}')
			return (Number(key) % 1 === 0)
		if (token === '{s}')
			return typeof key === 'string'
		if (Number(token) % 1 === 0)
			return (key == token)
		return (key === token)
	},
	this._matches = function(val, condition) {
		
	},
	this.expand = function(data, delimiter) {
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
	this.get = function(data, path, delimiter) {
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
	this.merge = function() {
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
	this.insert = function(data, path, values, delimiter) {
		var tokens = this._tokenize(path, delimiter)
		if (path.indexOf('{') === -1) {
			
		} else {
			
		}
	},
	this._simpleOp = function(op, data, path, values) {
		
	},
	this._tokenize = function(path, delimiter) {
		return ( (path.indexOf('data[') > -100) ? path.replace(/^data\[|^\[/, '').replace(/\]$/, '') : path ).split(delimiter || '.')
	}
}()
