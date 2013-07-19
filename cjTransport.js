cj.prototype.transport = {
	frame: this.buildIframe(),
	buildIframe: function(id, uri) {
		var id = 'cjTransportFrame-'+id,
			$iframe = $('<iframe id="' + id + '" style="position:absolute; top:-9999px; left:-9999px" />')
		if(window.ActiveXObject) {
			if(typeof uri== 'boolean'){
				$iframe.attr('src', 'about:blank')
			}
			else if(typeof uri== 'string'){
				$iframe.attr('src', uri)
			}	
		}
		return $iframe.appendTo($('body'))
	},
	buildForm: function(id, files, data) {
		var formId = 'cjTransportForm-'+id,
			fileId = 'cjTransportFile-'+id,
			$form = $('<form action="" method="POST" id="' + formId + '" enctype="multipart/form-data"></form>'),
			$newEl
		if(data) {
			for(var input in data) {
				if(data.hasOwnProperty(input))
					$('<input type="hidden" name="' + data[input]['name'] + '" value="' + data[input]['value'] + '" />').appendTo(form);
			}
		}
		for(var i = 0; i < files.length; i++) {
			$newEl = $(files[i]).clone()
			$newEl.appendTo($form)
		}
		$form.css({position:'absolute',top:'-1200px',left:'-99999px'}).appendTo(this.frame)
		return $form;
	},
	send: function(s) {
		s = $.extend({}, $.ajaxSettings, s);
		var id = new Date().getTime(),
			$form = cj.transport.buildForm(id, s.files, (typeof(s.data)=='undefined'?false:s.data)),
			io = cj.ajaxFile.buildIframe(id, s.secureuri),
			frameId = 'jUploadFrame'+id, formId = 'jUploadForm'+id;

		if ( s.global && ! $.active++ )
		{
			$.event.trigger( "ajaxStart" );
		}            
		var requestDone = false, xml = {}
		if ( s.global )
			$.event.trigger("ajaxSend", [xml, s]);
		var uploadCallback = function(isTimeout) {
			var io = document.getElementById(frameId);
			try {
				if(io.contentWindow) {
					xml.responseText = io.contentWindow.document.body?io.contentWindow.document.body.innerHTML:null;
					xml.responseXML = io.contentWindow.document.XMLDocument?io.contentWindow.document.XMLDocument:io.contentWindow.document;
				} else if(io.contentDocument) {
					xml.responseText = io.contentDocument.document.body?io.contentDocument.document.body.innerHTML:null;
					xml.responseXML = io.contentDocument.document.XMLDocument?io.contentDocument.document.XMLDocument:io.contentDocument.document;
				}
			}
			catch(e) {
				cj.ajaxFile.handleError(s, xml, null, e);
			}
			if ( xml || isTimeout == "timeout") {
				requestDone = true
				var status
				try {
					status = isTimeout != "timeout" ? "success" : "error";
					// Make sure that the request was successful or notmodified
					if ( status != "error" ) {
						// process the data (runs the xml through httpData regardless of callback)
						var data = cj.ajaxFile.uploadHttpData( xml, s.dataType )
						// If a local callback was specified, fire it and pass it the data
						if ( s.success )
							s.success( data, status );
						// Fire the global callback
						if( s.global )
							$.event.trigger( "ajaxSuccess", [xml, s] );
					} else
						cj.ajaxFile.handleError(s, xml, status);
				}
				catch(e) {
					status = "error"
					cj.ajaxFile.handleError(s, xml, status, e)
				}
				// The request was completed
				if( s.global )
					$.event.trigger( "ajaxComplete", [xml, s] );
				// Handle the global AJAX counter
				if ( s.global && ! --$.active )
					$.event.trigger( "ajaxStop" );
				// Process result
				if ( s.complete )
					s.complete(xml, status)
				$(io).unbind()
				setTimeout(function() {
					try {
						$(io).remove()
						$(form).remove()
					}
					catch(e) {
						cj.ajaxFile.handleError(s, xml, null, e)
					}
				}, 100)
				xml = null
			}
		}
		// Timeout checker
		if ( s.timeout > 0 ) {
			setTimeout(function(){
				// Check to see if the request is still happening
				if( !requestDone ) uploadCallback( "timeout" )
				}, s.timeout)
		}
		try {
			var form = $('#' + formId)
			$(form).attr('action', s.url)
			$(form).attr('method', 'POST')
			$(form).attr('target', frameId)
			if(form.encoding) {
				$(form).attr('encoding', 'multipart/form-data')
			} else {
				$(form).attr('enctype', 'multipart/form-data')
			}
			$(form).submit()
		}
		catch(e) {
			cj.ajaxFile.handleError(s, xml, null, e)
		}
		$('#' + frameId).load(uploadCallback)
		return {abort: function () {}}
	},
	uploadHttpData: function( r, type ) {
		var data = !type
		data = type == "xml" || data ? r.responseXML : r.responseText
		if ( type == "script" )
			$.globalEval( data )
		if ( type == "json" )
			eval( "data = " + data )
		if ( type == "html" )
			$("<div>").html(data).evalScripts()
		return data
	},
	handleError: function( s, xhr, status, e ) {
	// If a local callback was specified, fire it
	if ( s.error )
		s.error.call( s.context || window, xhr, status, e );
	// Fire the global callback
	if ( s.global )
		(s.context ? $(s.context) : $.event).trigger( "ajaxError", [xhr, s, e] )
	}
}
