/*******************************************************************************
 LJX1.0 :: LoJAX (Low-Technology AJAX)
 ------------------------------------------------------------------------------
 Copyright (c) 2006 James Edwards (brothercake)          <cake@brothercake.com>
 BSD License                          See license.txt for licensing information
 Info/Docs             http://www.brothercake.com/site/resources/scripts/lojax/
 ------------------------------------------------------------------------------
*******************************************************************************/



//if the lojax object has not been defined,
//create it with default settings
if(typeof lojax == 'undefined')
{
	var lojax = {
		'action' : './lojax.php',
		'implementation' : 'auto',
		'timeout' : 180,
		'expose' : false,
		'negate' : true,
		'fn' : 'XMLHttpRequest'
		};
}

//setInterval timer reference for watcher function
lojax.timer = null;

//buffer array stores overlapping requests
//so that multiple asynchronous requests can be called
//and the program will handle their sequential dispatch and response iteration
lojax.buffer = [];

//count the number of requests we've made this page view
//which we need to manipulate the iframe history safely
lojax.requests = 0;


//test for existing AJAX support
lojax.ajax = function()
{
	//try to establish a request
	//we should test for the window object first
	//because mac/ie5 returns a [useless] object for activeXobject
	var request = null;
	if(typeof window.XMLHttpRequest != 'undefined')
	{
		try { request = new XMLHttpRequest(); }
		catch(err) { request = null; }
	}
	else if(typeof window.ActiveXObject != 'undefined')
	{
		try { request = new ActiveXObject('Microsoft.XMLHTTP'); }
		catch(err) { request = null; }
	}

	//if that was successful then AJAX is natively supported
	//so set the implementation flag and return true for support
	if(request)
	{
		this.implementation = 'ajax';
		return true;
	}

	//otherwise return false for no support
	return false;
};


//set the readyState property for a request object
//then fire its onreadystatechange handler, if defined
lojax.statechange = function(obj, state)
{
	obj.readyState = state;
	if(typeof obj.onreadystatechange == 'function')
	{
		obj.onreadystatechange();
	}
};


//reset a request object
lojax.reset = function(obj)
{
	//set the default responseText to an empty string
	obj.responseText = '';

	//we don't support responseXML
	obj.responseXML = null;

	//set the initial readyState and status
	obj.readyState = 0;
	obj.status = null;
	obj.statusText = null;

	//clear any running watcher interval
	clearInterval(this.timer);
	this.timer = null;

	//if we have a data form
	if(obj.form)
	{
		//clear the uri, auth, data and status fields, which primes the form for another request
		//(without this, multiple consecutive request on a single object would not be possible)
		//but *don't* clear the headers field until the send() function
		//so that we can read from it at any time after a request completes, until another one starts
		obj.form['lojax_uri'].value = '';
		obj.form['lojax_auth'].value = '';
		obj.form['lojax_data'].value = '';
		obj.form['lojax_status'].value = '';

		//disable form data area so it can't be tabbed to
		obj.form['lojax_data'].disabled = true;
	}
};


//dispatch the next request in the buffer, if any
lojax.dispatch = function()
{
	//store the buffer length since we'll need it more than once before it changes
	var len = this.buffer.length;

	//if we have any stored requests in the buffer
	if(len > 0)
	{
		//get the first one
		var next = this.buffer[0];

		//then delete it from the start of the array
		//using an oldskool iterative technique
		//because mac/ie5 doesn't support splice()
		for(var i=1; i<len; i++)
		{
			this.buffer[i - 1] = this.buffer[i];
		}
		this.buffer.length = len - 1;

		//if it's send flag is true
		if(next.send)
		{
			//iterate through the data object
			//and copy the wanted request properties
			//back to the original request object
			for(i in next)
			{
				if(/^(method|uri|async|user|password)$/.test(i))
				{
					next.obj[i] = next[i];
				}
			}

			//now reset the request object
			this.reset(next.obj);

			//clear the headers data area
			next.obj.form['lojax_headers'].value = '';

			//set the readystate to 1 and fire readystatechange, if defined
			this.statechange(next.obj, 1);

			//then call the object's send method
			//pasing any postdata (or null)
			next.obj.send(next.postdata);
		}
	}
};


//watch the data area for changes
lojax.watcher = function()
{
	//if the value of the status field is not empty
	//and the ready state is already 2
	var status = this.obj.form['lojax_status'].value;
	if(status != '' && this.obj.readyState == 2)
	{
		//get the status info from status field
		status = status.split(' ');
		this.obj.status = parseInt(status[1], 10);
		this.obj.statusText = status[2].replace(/\+/g, ' ');

		//if the status is 466 (Host Not Allowed) or 467 (Unsupported Protocol)
		//[both of which are custom for this program]
		if(/^46[67]$/.test(this.obj.status.toString()))
		{
			//store the error data stored in the data area
			var err = this.obj.form['lojax_data'].value;
		}

		//in any other case
		else
		{
			//set the readystate to 3 and fire readystatechange, if defined
			this.statechange(this.obj, 3);

			//if the method is not HEAD, and the status code is not 401
			//store the response text to responseText property
			if(this.obj.method != 'HEAD' && this.obj.status != 401)
			{
				this.obj.responseText = this.obj.form['lojax_data'].value;
			}

			//set the readystate to 4 and fire readystatechange, if defined
			this.statechange(this.obj, 4);
		}

		//reset this request object
		lojax.reset(this.obj);

		//if history negation is enabled
		if(lojax.negate)
		{
			//negate the effect of the iframe load on the window history
			//so that pressing back for the user goes back to a complete page view
			//instead of moving through the request history
			//but we can't do this safely in certain browsers at certain times
			//so, unless this is ...
			if(!(
				//espial escape at any time, or Windows IE when the URI is remote [as though history is never generated]
				(/Escape /.test(navigator.userAgent) || (typeof document.uniqueID != 'undefined' && /^[a-z]+(\:\/\/)/.test(this.obj.uri)))
				||
				//omniweb 5, opera 9, mozilla, or Windows IE when the URI is local; AND only one request has occured so far
				//[as though the first one doesn't generate history, but subsequent ones do]
				//** this might still go wrong in some browsers if you press forward in the history to get to the page
				//** have previously pressed back from the page having made 2 or more requests
				//** but all that happens is you have to press back twice to get back
				//** it doesn't fundamentally break the back button, like it did in Safari 1.0
				((/(omniweb\/v5)|(opera[ \/]9)/i.test(navigator.userAgent)
					|| (typeof document.uniqueID != 'undefined' && !/^[a-z]+(\:\/\/)/.test(this.obj.uri))
					|| navigator.product == 'Gecko')
						&& this.requests < 2)
				))
			{
				//go back one in the history
				history.go(-1);
			}
		}

		//dispatch the next request in the buffer, if any
		lojax.dispatch();

		//if we had an error defined, throw it now
		//we have to do this at the end because
		//processing won't continue past a throw
		//(it generates an exception, hence the processor stops)
		if(typeof err != 'undefined') { throw(err); }

		//and we're done
		return;
	}

	//increase the counter, and if the request times-out
	if(++this.count >= ((this.timeout * 1000) / 250))
	{
		//reset this request object
		lojax.reset(this.obj);

		//dispatch the next request in the buffer, if any
		lojax.dispatch();
	}
};






//if this is Safari 1.0 or 1.1 we have to exclude it specifically, because it breaks the back button
//we detect it with a combination of navigator.vendor for Safari (and OmniWeb),
//userAgent to ignore OmniWeb, and lack of native XHR support for the version)
if(navigator.vendor == 'Apple Computer, Inc.' && !/OmniWeb/.test(navigator.userAgent) && typeof window.XMLHttpRequest == 'undefined')
{
	lojax.implementation = 'none';
}

//now if the implementation is "lojax",
//or the implementation is "auto" and XHR is not natively supported
if(lojax.implementation == 'lojax' || (lojax.implementation == 'auto' && !lojax.ajax()))
{
	//set the implementation to "lojax"
	lojax.implementation = 'lojax';



	//compile the courier form and iframe code, including display:none, so that
	//none of the elements are manually accessible, to graphical browsers or screenreaders
	//textareas are disabled and inputs are hidden to shore this up in case a particular device can still see it
	//the display is on the fieldset instead of the form, because if it's on the form it hides *all* forms in IE6!!
	//so for the form itself we're just using properties to make sure it has no physical impact
	//display is also on the textareas, to avoid the tab getting stuck in it in Connect Outloud
	//however in Opera 5, Sony PSP, Konqueror and Safari, display prevents the form
	//from being able to find the target iframe, so use offleft positioning instead
	//for opera 7 we have to add this offleft positioning to the form as well as the elements, to avoid displacement
	//but it's more efficient to do that for everyone rather than single-out that build, and it doesn't do others any harm
	//rows and cols must be at least "1" or it doesn't work properly in Opera 6
	lojax.offleft = lojax.expose ? '' : 'position:absolute;left:-10000px;';
	lojax.display = lojax.expose ? '' : (typeof window.opera == 'undefined' && !/PlayStation Portable/.test(navigator.userAgent) && !/(Apple Computer\, Inc\.|KDE)/.test(navigator.vendor)) ? 'display:none;' : lojax.offleft;
	lojax.formattrs = lojax.expose ? '' : 'style="display:inline;width:0;height:0;overflow:hidden;' + lojax.offleft + '"';
	lojax.textattrs = lojax.expose ? 'rows="5" cols="20"' : 'disabled="disabled" rows="1" cols="1" style="' + lojax.display + '"';
	lojax.fieldtype = lojax.expose ? 'type="text"' : 'type="hidden"';
	lojax.iframeattrs = lojax.expose ? 'width="400" height="400"' : 'width="0" height="0" style="' + lojax.display + '"';
	lojax.code = ''
		+ '<form id="lojax_form" target="lojax_courier" action="' + lojax.action + '" ' + lojax.formattrs + '>'
		+ '  <fieldset style="' + lojax.display + '">'
		+ '    <input ' + lojax.fieldtype + ' name="lojax_uri" />'
		+ '    <input ' + lojax.fieldtype + ' name="lojax_auth" />'
		+ '    <textarea name="lojax_data" ' + lojax.textattrs + '></textarea>'
		//these two fields have no name so that their values are not sent with the request
		//they're used to receive data from the inner page to make it available to this one
		+ '    <textarea id="lojax_headers" ' + lojax.textattrs + '></textarea>'
		+ '    <input ' + lojax.fieldtype + ' id="lojax_status" />'
		+ '  </fieldset>'
		+ '</form>'
		+ '<iframe id="lojax_courier" name="lojax_courier" ' + lojax.iframeattrs + '></iframe>';

	//try to output the courier elements
	//the PSP only supports document.write, so we have to try that first
	//otherwise, if it fails (such as in XHTML mode) try to use innerHTML
	//and if that fails we can't continue, so clear the implementation and throw an exception
	try { document.write(lojax.code); }
	catch(err)
	{
		try { document.getElementsByTagName('head')[0].innerHTML += lojax.code; }
		catch(err)
		{
			lojax.implementation = 'none';
			throw('[LoJAX] Implementation cannot create courier elements');
		}
	}



	//create the constructor at the window level, same scope as XHR
	window[lojax.fn] = function()
	{
		//don't continue if the implementation is 'none'
		if(lojax.implementation == 'none') { return; }

		//define a null onreadystatechange property by default
		this.onreadystatechange = null;

		//get a reference to the data form
		this.form = document.getElementById('lojax_form');

		//get a reference to the courier iframe through the window.frames collection
		//otherwise the targetting might fail in Mac/IE5.0
		//(opening in a new window, instead of targetting the iframe)
		this.courier = window.frames['lojax_courier'];
	};


	//request open method
	window[lojax.fn].prototype.open = function(method, uri, async, user, password)
	{
		//don't continue if the implementation is 'none'
		if(lojax.implementation == 'none') { return; }

		//if a watch timer is already running
		//then we're waiting for an existing request to complete
		if(lojax.timer)
		{
			//create a data object with a reference to this request object,
			//and a false send flag, meaning send() has not been called yet
			//and null postdata, which will store the postdata if there is any
			var data = { 'obj' : this, 'send' : false, 'postdata' : null };
		}

		//if the timer is not already running
		//we can reset the courier ready to send this request
		else
		{
			//reset this request object
			lojax.reset(this);

			//clear the headers data area
			this.form['lojax_headers'].value = '';
		}


		//store the method if defined and valid, otherwise use default GET
		this.method = typeof method != 'undefined' && /^(POST|GET|HEAD)$/i.test(method) ? method.toUpperCase() : 'GET';

		//store the uri if defined, otherwise set it to null
		this.uri = typeof uri != 'undefined' ? uri : null;

		//split the current page location to get the protocol, host and path parts to here
		var docloc = document.location.href.replace('://', '/').split('/');

		//then if the uri path is a web-root
		if(this.uri.charAt(0) == '/')
		{
			//add the protocol and host
			this.uri = docloc[0] + '://' + docloc[1] + this.uri;
		}
		//or if it's not a resolved path
		//it must be a relative path from here
		else if(!/^[a-z]+(\:\/\/)/.test(this.uri))
		{
			//delete the last value from the end of the array (this page)
			docloc.length = docloc.length - 1;

			//add the first part of the protocol delimiter
			//then join the array with slashes to form a uri path to this folder
			docloc[0] += ':/';
			docloc = docloc.join('/');

			//now add that on to the uri
			this.uri = docloc + '/' +  this.uri;
		}
		//if it is a resolved path we're not gonna check its host here
		//because we don't have access to the lojax-hosts data
		//so that validation will be done server-side,
		//and will return the appropriate error message to throw()

		//if the protocol is unsupported, throw an error,
		//then nullify the uri (so send will subsequently fail) and stop
		if(!/^(http)(\:\/\/)/.test(this.uri))
		{
				throw('[LoJAX] Unsupported protocol ' + this.uri.split('://')[0] + '://');
				this.uri = null;
				return;
		}

		//we only support asynchronous requests
		this.async = true;

		//store the username and password, if present, otherwise empty strings
		//*** this sends unencrypted passwords in the initial request to the courier
		this.user = typeof user != 'undefined' ? user : '';
		this.password = typeof password != 'undefined' ? password : '';


		//if we defined a data object earlier, because we had a timer running
		//(but we can't just check the timer reference again, because it might have stopped in the meantime!)
		if(typeof data != 'undefined')
		{
			//add the rest of the request data
			//we don't really need to copy async
			//but may as well in case it's used in the future
			data.method = this.method;
			data.uri = this.uri;
			data.async = this.async;
			data.user = this.user;
			data.password = this.password;

			//now add this data object to the buffer
			lojax.buffer[lojax.buffer.length] = data;
		}

		//otherwise we're ready to dispatch this request
		else
		{
			//set the readystate to 1 and fire readystatechange, if defined
			lojax.statechange(this, 1);
		}
	};


	//request send method
	window[lojax.fn].prototype.send = function(postdata)
	{
		//don't continue if the implementation is none
		if(lojax.implementation == 'none') { return; }

		//if we have any requests in the buffer
		//and the last object was this object
		var n = lojax.buffer.length;
		if(n > 0 && lojax.buffer[--n]['obj'] == this)
		{
			//if the send flag is false, change it to true and return
			//so that when the buffer comes round to it, it's ready to be called
			//(which means that if open() is called twice, then send()
			//and both are buffered, the first open() will be lost)
			//also copy the postdata, if defined (even if it's null,
			//to save evaluating here something that will be evaluated later anyway)
			if(!lojax.buffer[n]['send'])
			{
				lojax.buffer[n]['send'] = true;
				if(typeof postdata != 'undefined')
				{
					lojax.buffer[n]['postdata'] = postdata;
				}
				return;
			}
			//but if the send flag is true, the buffer has already come round - and here it is!
			//so allow the function to continue normally
		}


		//if the readyState is not 1 or the uri is null, throw an exception and stop
		if(this.readyState != 1 || !this.uri)
		{
			throw('[LoJAX] Implementation cannot call send() at this time');
			return;
		}


		//set the form method
		this.form.method = this.method;

		//if the postdata is defined and not null, and the method is POST
		if(typeof postdata != 'undefined' && postdata !== null && this.method == 'POST')
		{
			//write the post data to the data form textarea
			this.form['lojax_data'].value = postdata;
		}

		//write the contents of the uri into the data form input
		this.form['lojax_uri'].value = this.uri;

		//if either of the user/pass fields are non-empty,
		//format them into an authorisation string, then write the data into the auth field
		if(this.user != '' || this.password != '')
		{
			this.form['lojax_auth'].value = this.user + ':' + this.password;
		}

		//set the readystate to 2 and fire readystatechange, if defined
		//we have to do this before the actual send so that
		//there's no way any status or response/header data could be available yet
		//(it would otherwise be possible for states 2 and 3 to occur in the wrong order)
		lojax.statechange(this, 2);

		//enable form data area so that it's value is sent
		this.form['lojax_data'].disabled = false;

		//increase the requests count
		lojax.requests++;

		//submit the data form to the courier iframe
		this.form.submit();


		//now start a timer to watch for changes in the data area
		//we have to do this on a timer instead of binding onchange to the form
		//because not all browsers fire onchange from programmatic data input
		//we're using a string reference to a global function, instead of using a closure
		//so that it works in mac/ie5 (which doesn't support that kind of reference in a timeout)
		lojax.obj = this;
		lojax.count = 0;
		//do the first iteration very quickly, so that in local dev or intranet use,
		//if the document is able to load almost instantaneously
		//we can kick off straight away instead of waiting 1/4 of a second
		lojax.timer = setInterval('lojax.watcher()', lojax.count == 0 ? 20 : 250);
	};


	//request abort method
	window[lojax.fn].prototype.abort = function()
	{
		//don't continue if the implementation is 'none'
		if(lojax.implementation == 'none') { return; }

		//reset this request object
		lojax.reset(this);

		//dispatch the next request in the buffer, if any
		lojax.dispatch();
	};


	//set request header is just a dummy function to prevent errors, it doesn't actually do anything
	//it has no return value, for consistency with other implementations
	window[lojax.fn].prototype.setRequestHeader = function(){};


	//get all response headers, which are pre-stored in a textarea
	window[lojax.fn].prototype.getAllResponseHeaders = function()
	{
		//if the data is empty or the implementation is 'none', return null
		//otherwise return the data
		var data = this.form['lojax_headers'].value;
		return data == '' || lojax.implementation == 'none' ? null : data;
	};


	//get a single response header, which are pre-stored in a textarea
	window[lojax.fn].prototype.getResponseHeader = function(name)
	{
		//if the implementation is 'none', or there's no data, return an empty string
		if(lojax.implementation == 'none' || this.form['lojax_headers'].value == '') { return ''; }

		//convert the name to lower case
		//to avoid JS/PHP value discrepancies
		name = name.toLowerCase();

		//otherwise split the data by line breaks
		//which might be windows or unix format
		var data = this.form['lojax_headers'].value.split('\n');
		if(data.length == 1) { data = data[0].split('\r'); }

		//then iterate by lines to look for the one we want
		for(var i=0; i<data.length; i++)
		{
			//split line by delimeter
			data[i] = data[i].split(': ');

			//if this is the value we're looking for
			//return it and we're done
			if(data[i][0].toLowerCase() == name) { return data[i][1]; }
		}

		//if we got this far we didn't find our value,
		//so return an empty string
		return '';
	};
}





