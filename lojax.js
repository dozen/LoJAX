/*******************************************************************************
 LJX1.0 :: LoJAX (Low-Technology AJAX)
 ------------------------------------------------------------------------------
 Copyright (c) 2006 James Edwards (brothercake)          <cake@brothercake.com>
 BSD License                          See license.txt for licensing information
 Info/Docs             http://www.brothercake.com/site/resources/scripts/lojax/
 ------------------------------------------------------------------------------
*******************************************************************************/
if(typeof lojax == 'undefined'){var lojax = {'action' : './lojax.php','implementation' : 'auto','timeout' : 180,'expose' : false,'negate' : true,'fn' : 'XMLHttpRequest'};}lojax.timer = null;lojax.buffer = [];lojax.requests = 0;lojax.ajax = function(){var request = null;if(typeof window.XMLHttpRequest != 'undefined'){try { request = new XMLHttpRequest(); }catch(err) { request = null; }}else if(typeof window.ActiveXObject != 'undefined'){try { request = new ActiveXObject('Microsoft.XMLHTTP'); }catch(err) { request = null; }}if(request){this.implementation = 'ajax';return true;}return false;};lojax.statechange = function(obj, state){obj.readyState = state;if(typeof obj.onreadystatechange == 'function'){obj.onreadystatechange();}};lojax.reset = function(obj){obj.responseText = '';obj.responseXML = null;obj.readyState = 0;obj.status = null;obj.statusText = null;clearInterval(this.timer);this.timer = null;if(obj.form){obj.form['lojax_uri'].value = '';obj.form['lojax_auth'].value = '';obj.form['lojax_data'].value = '';obj.form['lojax_status'].value = '';obj.form['lojax_data'].disabled = true;}};lojax.dispatch = function(){var len = this.buffer.length;if(len > 0){var next = this.buffer[0];for(var i=1; i<len; i++){this.buffer[i - 1] = this.buffer[i];}this.buffer.length = len - 1;if(next.send){for(i in next){if(/^(method|uri|async|user|password)$/.test(i)){next.obj[i] = next[i];}}this.reset(next.obj);next.obj.form['lojax_headers'].value = '';this.statechange(next.obj, 1);next.obj.send(next.postdata);}}};lojax.watcher = function(){var status = this.obj.form['lojax_status'].value;if(status != '' && this.obj.readyState == 2){status = status.split(' ');this.obj.status = parseInt(status[1], 10);this.obj.statusText = status[2].replace(/\+/g, ' ');if(/^46[67]$/.test(this.obj.status.toString())){var err = this.obj.form['lojax_data'].value;}else{this.statechange(this.obj, 3);if(this.obj.method != 'HEAD' && this.obj.status != 401){this.obj.responseText = this.obj.form['lojax_data'].value;}this.statechange(this.obj, 4);}lojax.reset(this.obj);if(lojax.negate){if(!((/Escape /.test(navigator.userAgent) || (typeof document.uniqueID != 'undefined' && /^[a-z]+(\:\/\/)/.test(this.obj.uri)))||((/(omniweb\/v5)|(opera[ \/]9)/i.test(navigator.userAgent)|| (typeof document.uniqueID != 'undefined' && !/^[a-z]+(\:\/\/)/.test(this.obj.uri))|| navigator.product == 'Gecko')&& this.requests < 2))){history.go(-1);}}lojax.dispatch();if(typeof err != 'undefined') { throw(err); }return;}if(++this.count >= ((this.timeout * 1000) / 250)){lojax.reset(this.obj);lojax.dispatch();}};if(navigator.vendor == 'Apple Computer, Inc.' && !/OmniWeb/.test(navigator.userAgent) && typeof window.XMLHttpRequest == 'undefined'){lojax.implementation = 'none';}if(lojax.implementation == 'lojax' || (lojax.implementation == 'auto' && !lojax.ajax())){lojax.implementation = 'lojax';lojax.offleft = lojax.expose ? '' : 'position:absolute;left:-10000px;';lojax.display = lojax.expose ? '' : (typeof window.opera == 'undefined' && !/PlayStation Portable/.test(navigator.userAgent) && !/(Apple Computer\, Inc\.|KDE)/.test(navigator.vendor)) ? 'display:none;' : lojax.offleft;lojax.formattrs = lojax.expose ? '' : 'style="display:inline;width:0;height:0;overflow:hidden;' + lojax.offleft + '"';lojax.textattrs = lojax.expose ? 'rows="5" cols="20"' : 'disabled="disabled" rows="1" cols="1" style="' + lojax.display + '"';lojax.fieldtype = lojax.expose ? 'type="text"' : 'type="hidden"';lojax.iframeattrs = lojax.expose ? 'width="400" height="400"' : 'width="0" height="0" style="' + lojax.display + '"';lojax.code = ''+ '<form id="lojax_form" target="lojax_courier" action="' + lojax.action + '" ' + lojax.formattrs + '>'+ '  <fieldset style="' + lojax.display + '">'+ '    <input ' + lojax.fieldtype + ' name="lojax_uri" />'+ '    <input ' + lojax.fieldtype + ' name="lojax_auth" />'+ '    <textarea name="lojax_data" ' + lojax.textattrs + '></textarea>'+ '    <textarea id="lojax_headers" ' + lojax.textattrs + '></textarea>'+ '    <input ' + lojax.fieldtype + ' id="lojax_status" />'+ '  </fieldset>'+ '</form>'+ '<iframe id="lojax_courier" name="lojax_courier" ' + lojax.iframeattrs + '></iframe>';try { document.write(lojax.code); }catch(err){try { document.getElementsByTagName('head')[0].innerHTML += lojax.code; }catch(err){lojax.implementation = 'none';throw('[LoJAX] Implementation cannot create courier elements');}}window[lojax.fn] = function(){if(lojax.implementation == 'none') { return; }this.onreadystatechange = null;this.form = document.getElementById('lojax_form');this.courier = window.frames['lojax_courier'];};window[lojax.fn].prototype.open = function(method, uri, async, user, password){if(lojax.implementation == 'none') { return; }if(lojax.timer){var data = { 'obj' : this, 'send' : false, 'postdata' : null };}else{lojax.reset(this);this.form['lojax_headers'].value = '';}this.method = typeof method != 'undefined' && /^(POST|GET|HEAD)$/i.test(method) ? method.toUpperCase() : 'GET';this.uri = typeof uri != 'undefined' ? uri : null;var docloc = document.location.href.replace('://', '/').split('/');if(this.uri.charAt(0) == '/'){this.uri = docloc[0] + '://' + docloc[1] + this.uri;}else if(!/^[a-z]+(\:\/\/)/.test(this.uri)){docloc.length = docloc.length - 1;docloc[0] += ':/';docloc = docloc.join('/');this.uri = docloc + '/' +  this.uri;}if(!/^(http)(\:\/\/)/.test(this.uri)){throw('[LoJAX] Unsupported protocol ' + this.uri.split('://')[0] + '://');this.uri = null;return;}this.async = true;this.user = typeof user != 'undefined' ? user : '';this.password = typeof password != 'undefined' ? password : '';if(typeof data != 'undefined'){data.method = this.method;data.uri = this.uri;data.async = this.async;data.user = this.user;data.password = this.password;lojax.buffer[lojax.buffer.length] = data;}else{lojax.statechange(this, 1);}};window[lojax.fn].prototype.send = function(postdata){if(lojax.implementation == 'none') { return; }var n = lojax.buffer.length;if(n > 0 && lojax.buffer[--n]['obj'] == this){if(!lojax.buffer[n]['send']){lojax.buffer[n]['send'] = true;if(typeof postdata != 'undefined'){lojax.buffer[n]['postdata'] = postdata;}return;}}if(this.readyState != 1 || !this.uri){throw('[LoJAX] Implementation cannot call send() at this time');return;}this.form.method = this.method;if(typeof postdata != 'undefined' && postdata !== null && this.method == 'POST'){this.form['lojax_data'].value = postdata;}this.form['lojax_uri'].value = this.uri;if(this.user != '' || this.password != ''){this.form['lojax_auth'].value = this.user + ':' + this.password;}lojax.statechange(this, 2);this.form['lojax_data'].disabled = false;lojax.requests++;this.form.submit();lojax.obj = this;lojax.count = 0;lojax.timer = setInterval('lojax.watcher()', lojax.count == 0 ? 20 : 250);};window[lojax.fn].prototype.abort = function(){if(lojax.implementation == 'none') { return; }lojax.reset(this);lojax.dispatch();};window[lojax.fn].prototype.setRequestHeader = function(){};window[lojax.fn].prototype.getAllResponseHeaders = function(){var data = this.form['lojax_headers'].value;return data == '' || lojax.implementation == 'none' ? null : data;};window[lojax.fn].prototype.getResponseHeader = function(name){if(lojax.implementation == 'none' || this.form['lojax_headers'].value == '') { return ''; }name = name.toLowerCase();var data = this.form['lojax_headers'].value.split('\n');if(data.length == 1) { data = data[0].split('\r'); }for(var i=0; i<data.length; i++){data[i] = data[i].split(': ');if(data[i][0].toLowerCase() == name) { return data[i][1]; }}return '';};}