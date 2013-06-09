<?
	if($HTTP_RAW_POST_DATA || !empty($_POST)) {
		$data = json_decode($HTTP_RAW_POST_DATA);
		echo '<pre>';
		print_r($_POST);
		print_r($HTTP_RAW_POST_DATA);
		print_r($data);
		echo '</pre>';
	} else {
?>
<!DOCTYPE html>
<html lang="en">
<!--
	 ___ ___    _   ___ __  __ ___ _  _ _____  
	| __| _ \  /_\ / __|  \/  | __| \| |_   _|  
	| _||   / / _ \ (_ | |\/| | _|| .` | | |    
	|_| |_|_\/_/ \_\___|_|  |_|___|_|\_| |_|    
					   FRAGMENTLABS.COM
-->
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	
	<meta name="description" content="" />
	<meta name="keywords" content="" />
	<meta name="robots" content="index,follow,noodp,noydir" /> 
	<link rel="canonical" href="" />
	<meta name="author" content="">

	<meta property="og:title" content="" />
	<meta property="og:url" content=""  />
	<meta property="og:description" content="" />
	<meta property="og:image" content="" />
	<meta property="og:type" content="" />

	<link rel="SHORTCUT ICON" href="/img/favicon.ico" type="image/x-icon">
	<link rel="icon" href="/img/favicon.ico" type="image/x-icon">
	<meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.5, minimum-scale=0.7">

	<title>cakeJAX</title>
	<script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
	<script type="text/javascript">
		if(!window.jQuery){
			 ;(function(d, s){
				var jq=d.createElement('script'), js
				jq.src='./jquery-1.8.3.min.js'
				jq.async = false
				jq.type = 'text/javascript'
				js=d.getElementsByTagName(s)[0]
				js.parentNode.insertBefore(jq)
			})(document, 'script')
		}
	</script>
	<script type="text/javascript" charset="utf-8">
		var aj = new XMLHttpRequest()
		aj.open('GET', './cakejax.js')
		aj.send()
		eval(aj.responseText)
	</script>
	<link rel="stylesheet" href="cakejax.css" type="text/css" media="screen" charset="utf-8">
	<link rel="stylesheet" href="/css/bootstrap.css" type="text/css" media="screen" charset="utf-8">
	<script type="text/javascript" src="/js/bootstrap.js"></script>
</head>
<body>

	<script type="text/javascript">

	"use strict";

	/*\
	|*|
	|*|  :: XMLHttpRequest.prototype.sendAsBinary() Polifyll ::
	|*|
	|*|  https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#sendAsBinary()
	\*/

	if (!XMLHttpRequest.prototype.sendAsBinary) {
	  XMLHttpRequest.prototype.sendAsBinary = function (sData) {
	    var nBytes = sData.length, ui8Data = new Uint8Array(nBytes);
	    for (var nIdx = 0; nIdx < nBytes; nIdx++) {
	      ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
	    }
	    /* send as ArrayBufferView...: */
	    this.send(ui8Data);
	    /* ...or as ArrayBuffer (legacy)...: this.send(ui8Data.buffer); */
	  };
	}

	/*\
	|*|
	|*|  :: AJAX Form Submit Framework ::
	|*|
	|*|  https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Using_XMLHttpRequest
	|*|
	|*|  This framework is released under the GNU Public License, version 3 or later.
	|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
	|*|
	|*|  Syntax:
	|*|
	|*|   AJAXSubmit(HTMLFormElement);
	\*/

	var AJAXSubmit = (function () {

	  function ajaxSuccess () {
	    /* console.log("AJAXSubmit - Success!"); */
	    alert(this.responseText);
	    /* you can get the serialized data through the "submittedData" custom property: */
	    /* alert(JSON.stringify(this.submittedData)); */
	  }

	  function submitData (oData) {
	    /* the AJAX request... */
	    var oAjaxReq = new XMLHttpRequest();
	    oAjaxReq.submittedData = oData;
	    oAjaxReq.onload = ajaxSuccess;
	    if (oData.technique === 0) {
	      /* method is GET */
	      oAjaxReq.open("get", oData.receiver.replace(/(?:\?.*)?$/, oData.segments.length > 0 ? "?" + oData.segments.join("&") : ""), true);
	      oAjaxReq.send(null);
	    } else {
	      /* method is POST */
	      oAjaxReq.open("post", oData.receiver, true);
	      if (oData.technique === 3) {
	        /* enctype is multipart/form-data */
	        var sBoundary = "---------------------------" + Date.now().toString(16);
	        oAjaxReq.setRequestHeader("Content-Type", "multipart\/form-data; boundary=" + sBoundary);
	        oAjaxReq.sendAsBinary("--" + sBoundary + "\r\n" + oData.segments.join("--" + sBoundary + "\r\n") + "--" + sBoundary + "--\r\n");
	      } else {
	        /* enctype is application/x-www-form-urlencoded or text/plain */
	        oAjaxReq.setRequestHeader("Content-Type", oData.contentType);
	        oAjaxReq.send(oData.segments.join(oData.technique === 2 ? "\r\n" : "&"));
	      }
	    }
	  }

	  function processStatus (oData) {
	    if (oData.status > 0) { return; }
	    /* the form is now totally serialized! do something before sending it to the server... */
	    /* doSomething(oData); */
	    /* console.log("AJAXSubmit - The form is now serialized. Submitting..."); */
	    submitData (oData);
	  }

	  function pushSegment (oFREvt) {
	    this.owner.segments[this.segmentIdx] += oFREvt.target.result + "\r\n";
	    this.owner.status--;
	    processStatus(this.owner);
	  }

	  function plainEscape (sText) {
	    /* how should I treat a text/plain form encoding? what characters are not allowed? this is what I suppose...: */
	    /* "4\3\7 - Einstein said E=mc2" ----> "4\\3\\7\ -\ Einstein\ said\ E\=mc2" */
	    return sText.replace(/[\s\=\\]/g, "\\$&");
	  }

	  function SubmitRequest (oTarget) {
	    var nFile, sFieldType, oField, oSegmReq, oFile, bIsPost = oTarget.method.toLowerCase() === "post";
	    /* console.log("AJAXSubmit - Serializing form..."); */
	    this.contentType = bIsPost && oTarget.enctype ? oTarget.enctype : "application\/x-www-form-urlencoded";
	    this.technique = bIsPost ? this.contentType === "multipart\/form-data" ? 3 : this.contentType === "text\/plain" ? 2 : 1 : 0;
	    this.receiver = oTarget.action;
	    this.status = 0;
	    this.segments = [];
	    var fFilter = this.technique === 2 ? plainEscape : escape;
	    for (var nItem = 0; nItem < oTarget.elements.length; nItem++) {
	      oField = oTarget.elements[nItem];
	      if (!oField.hasAttribute("name")) { continue; }
	      sFieldType = oField.nodeName.toUpperCase() === "INPUT" ? oField.getAttribute("type").toUpperCase() : "TEXT";
	      if (sFieldType === "FILE" && oField.files.length > 0) {
	        if (this.technique === 3) {
	          /* enctype is multipart/form-data */
	          for (nFile = 0; nFile < oField.files.length; nFile++) {
	            oFile = oField.files[nFile];
	            oSegmReq = new FileReader();
	            /* (custom properties:) */
	            oSegmReq.segmentIdx = this.segments.length;
	            oSegmReq.owner = this;
	            /* (end of custom properties) */
	            oSegmReq.onload = pushSegment;
	            this.segments.push("Content-Disposition: form-data; name=\"" + oField.name + "\"; filename=\""+ oFile.name + "\"\r\nContent-Type: " + oFile.type + "\r\n\r\n");
	            this.status++;
	            oSegmReq.readAsBinaryString(oFile);
	          }
	        } else {
	          /* enctype is application/x-www-form-urlencoded or text/plain or method is GET: files will not be sent! */
	          for (nFile = 0; nFile < oField.files.length; this.segments.push(fFilter(oField.name) + "=" + fFilter(oField.files[nFile++].name)));
	        }
	      } else if ((sFieldType !== "RADIO" && sFieldType !== "CHECKBOX") || oField.checked) {
	        /* field type is not FILE or is FILE but is empty */
	        this.segments.push(
	          this.technique === 3 ? /* enctype is multipart/form-data */
	            "Content-Disposition: form-data; name=\"" + oField.name + "\"\r\n\r\n" + oField.value + "\r\n"
	          : /* enctype is application/x-www-form-urlencoded or text/plain or method is GET */
	            fFilter(oField.name) + "=" + fFilter(oField.value)
	        );
	      }
	    }
	    processStatus(this);
	  }

	  return function (oFormElement) {
	    if (!oFormElement.action) { return; }
	    new SubmitRequest(oFormElement);
	  };

	})();

	</script>
	</head>
	<body>

	<h1>Sending forms with pure AJAX</h1>

	<h2>Using the GET method</h2>

	<form action="" method="get" onsubmit="AJAXSubmit(this); return false;">
	  <fieldset>
	    <legend>Registration example</legend>
	    <p>
	      First name: <input type="text" name="firstname" /><br />
	      Last name: <input type="text" name="lastname" />
	    </p>
	    <p>
	      <input type="submit" value="Submit" />
	    </p>
	  </fieldset>
	</form>

	<h2>Using the POST method</h2>
	<h3>Enctype: application/x-www-form-urlencoded (default)</h3>

	<form action="" method="post" onsubmit="AJAXSubmit(this); return false;">
	  <fieldset>
	    <legend>Registration example</legend>
	    <p>
	      First name: <input type="text" name="firstname" /><br />
	      Last name: <input type="text" name="lastname" />
	    </p>
	    <p>
	      <input type="submit" value="Submit" />
	    </p>
	  </fieldset>
	</form>

	<h3>Enctype: text/plain</h3>

	<form action="" method="post" enctype="text/plain" onsubmit="AJAXSubmit(this); return false;">
	  <fieldset>
	    <legend>Registration example</legend>
	    <p>
	      Your name: <input type="text" name="user" />
	    </p>
	    <p>
	      Your message:<br />
	      <textarea name="message" cols="40" rows="8"></textarea>
	    </p>
	    <p>
	      <input type="submit" value="Submit" />
	    </p>
	  </fieldset>
	</form>

	<h3>Enctype: multipart/form-data</h3>

	<form action="" method="post" enctype="multipart/form-data" onsubmit="AJAXSubmit(this); return false;">
	  <fieldset>
	    <legend>Upload example</legend>
	    <p>
	      First name: <input type="text" name="firstname" /><br />
	      Last name: <input type="text" name="lastname" /><br />
	      Sex:
	      <input id="sex_male" type="radio" name="sex" value="male" /> <label for="sex_male">Male</label>
	      <input id="sex_female" type="radio" name="sex" value="female" /> <label for="sex_female">Female</label><br />
	      Password: <input type="password" name="secret" /><br />
	      What do you prefer:
	      <select name="image_type">
	        <option>Books</option>
	        <option>Cinema</option>
	        <option>TV</option>
	      </select>
	    </p>
	    <p>
	      Post your photos:
	      <input type="file" multiple name="photos[]">
	    </p>
	    <p>
	      <input id="vehicle_bike" type="checkbox" name="vehicle[]" value="Bike" /> <label for="vehicle_bike">I have a bike</label><br />
	      <input id="vehicle_car" type="checkbox" name="vehicle[]" value="Car" /> <label for="vehicle_car">I have a car</label>
	    </p>
	    <p>
	      Describe yourself:<br />
	      <textarea name="description" cols="50" rows="8"></textarea>
	    </p>
	    <p>
	      <input type="submit" value="Submit" />
	    </p>
	  </fieldset>
	</form>

</body>
</html>
<?
}
?>