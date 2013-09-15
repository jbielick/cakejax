//cj.
this.sort = function(selector, items, handle) {
	var items = items || 'tr',
		handle = (typeof handle == 'undefined') ? '' : handle

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
			if (action) {
				ui.item.parents('[data-cj-action]').first().data('cjSortData', $(this).sortable('serialize'))
			}
			else _this.flash({msg: 'You forgot to define a \'data-cj-action\' attribute on your sortable container!', error: true});
		}
	}).disableSelection()
}


//cj.handlers.
sortSave: function(e) {
	var selector = $(e.currentTarget).data('cjSortSave'), request
	$(selector).each(function() {
		var $el = $(this)
		if ($el.data('cjSortData')) {
			_this.save(request)
		}
	})
},


//cj.util.
fixHelper: function(e, ui) {
	var $original = ui,
		$helper = ui.clone()
	return $helper.width($original.width()).height($original.height())
},