$(function(){
	cj.init({
		callbacks: {
			Page: {
				beforeSave: function(r, xhr) {
					
				},
				afterSave: function(r, xhr) {
					console.log(this)
					// window.location = document.referrer
				},
				init: function(r, xhr) {
					console.log(this)
				}
			}
		},
		validate: {
			User: {
				first_name: {
					group: {
						rule: function() {
							return false
						},
						message: 'it works'
					}
				}
			}
		}
	})
	Hash.insert(cj.validate, 'Page.title.notempty.rule.0', 'numeric')
	Hash.insert(cj.validate, 'Page.title.notempty.rule.1', 'notEmpty')
	Hash.insert(cj.validate, 'Page.body.rulegroup.rule', function(i) {return false})
	Hash.insert(cj.validate, 'Page.body.rulegroup.message', 'Mystery')
})