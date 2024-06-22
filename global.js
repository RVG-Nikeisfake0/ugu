"use strict";

if(!NodeList.prototype.forEach)
	NodeList.prototype.forEach = Array.prototype.forEach;

Array.prototype.getRandom = function(){
	if(this._length != this.length) {
		this._randoms = Array.from(Array(this.length).keys());
		this._randoms.shuffle();
		this._randomIndex = 0;
		this._length = this.length;
	}
	
	return this[this._randoms[this._randomIndex++ % this._randoms.length]];
};

Array.prototype.shuffle = function() {
	var counter = this.length;

	while (counter > 1) {
		var index = Math.floor(Math.random() * counter--);
		var temp = this[counter];
		this[counter] = this[index];
		this[index] = temp;
	}
};

Array.prototype.next = function() {
	if(this.length > 0) {
		this._currentIndex = ((this._currentIndex || 0) + 1) % this.length;
		return this[this._currentIndex];
	}
	
	return void(0);
}

Array.prototype.prev = function() {
	if(this.length > 0) {
		this._currentIndex = (this._currentIndex || 0) - 1;
		if(this._currentIndex < 0)
			this._currentIndex = this.length - 1;
		return this[this._currentIndex];
	}
	
	return void(0);
}

Object.defineProperty(Array.prototype, 'current', { get: function() { return this[this._currentIndex || 0] }});

Object.prototype.emit = function(event, data) {
	event = new CustomEvent('lewd:' + event, { detail: data });
	event.sender = this;
	return window.dispatchEvent(event);
};

Object.prototype.on = function(event, callback) {
	callback.function = function(ev) {
		ev && ev.sender === this && callback.call(this, ev.detail, ev);
	}
	
	window.addEventListener('lewd:' + event, callback.function.bind(this));
};

Object.prototype.off = function(event, callback){
	window.removeEventListener('lewd:' + event, callback.function);
}

window.ajax = function(options) {
	var request = new XMLHttpRequest();

	request.onreadystatechange = function(){
		if(request.readyState === XMLHttpRequest.DONE) {
			if(request.status === 200)
				options.success && options.success(request.response, request);
			else
				options.error && options.error(request.response, request);
			options.complete && options.complete(request.response, request);
		}
	}

	request.open(options.method || 'GET', options.url);
	request.send();
}

window.ajax.extractFiles = function(html, url) {
	var result = [];
	if(html) {
		url = url ? url + '/' : '';
		var scope = 'body';

		if(html.indexOf('<table') != -1)
			scope = 'tbody tr:not(.d) .n a'; //lighttpd
		else if(html.indexOf('<pre>') != -1)
			scope = 'pre a'; //nginx

		var element = document.createElement('div');
		element.innerHTML = html;
		element.querySelectorAll(scope).forEach(function(a){
			var href;
			if(!a || (href = a.getAttribute('href')) == '../' || href.endsWith('/'))
				return;

			if (href.indexOf('//') == 0 || href.indexOf(':') > 0)
				result.push(href); //page was proxied and proxy rewrote paths
			else
				result.push(url + href); //normal operation
		});
	}
	return result;
};
