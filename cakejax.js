cj.callbacks = {
	'#PageAdminAddForm': {
		init: function() {
			
		}
	},
	PagePhoto: {
		beforeDelete: function(request) {
			alert('DELETE PAGE PHOTO')
		}
	},
	Page: {
		init: function(req) {
			req.inputs.Page.title.value = 'New Post'
			req.inputs.Page.title.focus()
			req.inputs.Page.active.checked = true
			req.inputs.Page.body.value = 'Insert a body of content for the page'
			$(req.inputs.Page.img).trigger('click')
		},
		afterSave: function(request) {
			alert('afterSave fired')
		},
		beforeDelete: function(request) {
			alert('beforeDelete fired')
		},
		beforeSave: function(request) {
			console.log('beforeSave Page:', request)
		},
		beforeDelete: function(request) {
			$.ajax({url:'/', method: 'get', async: false, success: function(data) {console.log('before Delete!')}})
		}
	}
}

cj.validate = {
	Page: {
		body: {
			'notEmpty': {
				rule: ['notEmpty'],
				message: ['Body musn\'t be left blank']
			},
			'fapowiej': {
				rule: ['email'],
				message: 'Body must be an email address!'
			}
		},
		title: {
			'notDefaultTitle': {
				rule: function(value) {
					if(value.toLowerCase() == 'new post')
						return false
				},
				message: 'Title cannot be "New Post".'
			},
			'notEmpty': {
				rule: ['notEmpty'],
				message: 'Title cannot be blank.'
			},
			'customValidationGroupName': {
				rule: ['match'],
				pattern: new RegExp('category', 'i'),
				message: 'The word category must be present in the title.'
			}
		}
	}
}

$(function() {
	cj.init({debug:true, enable: 'form', view: '#content'})
})