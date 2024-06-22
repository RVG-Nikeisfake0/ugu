"use strict";
(function(ns) {
	const INTERVAL = 10000;

	ns.OSD = class {
		constructor(element, audio) {
			this._audio = audio;
			this._element = element;
			audio.on('change', this.show.bind(this));
		}

		show() {
			if(this._timeout)
				clearTimeout(this._timeout);

			this._element.innerText = this._audio.title;
			this._element.className = 'visible';

			this._timeout = setTimeout(this.hide.bind(this), INTERVAL);
		}

		hide() {
			this._element.className = '';;
			this._timeout = 0;
		}
	}
})(window.lewd = window.lewd || {});
