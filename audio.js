"use strict";
(function(ns) {

	var infiniteLoopPrevention = 0;
	
	ns.AudioPlayer = class AudioPlayer {
		constructor(files) {
			this._audio = new Audio();
			this._beats = new ns.BeatDetector(this._audio);
			this._currentIndex =-1;
			this._fileList = Array.isArray(files) && files || [];

			this._audio.addEventListener('ended', this.next.bind(this));
			this._audio.addEventListener('canplaythrough', () => this.emit('playing'));
			
			this.on('playing', () => this._beats.analyze().then((beats) => this.emit('beats', beats)).catch(()=>{/*ignore*/}));

			Object.defineProperty(this, 'volume', {
				get: () => this._audio.volume,
				set: (value) => this._audio.volume = value,
			});
			
			Object.defineProperty(this, 'files', {
				get: () => this._fileList || [],
				set: (value) => Array.isArray(value) && (this._fileList = value),
			});
		}

		get title() {
			if(!this._audio.src)
				return null;

			var title = decodeURI(this._audio.src);
			var index = title.lastIndexOf('/');
			if(index >= 0)
				title = title.substring(index + 1);

			index = title.lastIndexOf('.')
			if(index >= 0)
				title = title.substring(0, index);

			return title;
		}

		isPlaying() {
			return this._audio.readyState == HTMLMediaElement.HAVE_ENOUGH_DATA;
		}

		play() {
			if(!this._audio.src)
				return this.next();

			var promise = this._audio.play();
			if(promise) {
				promise
					.then(() => {
						this.splash && (this.splash.remove(), delete this.splash);
						this.emit('change', this);
						this.emit(this.isPlaying() ? 'playing' : 'loading', this);
					})
					.catch(this.showSplashBecauseChrome.bind(this));
			} else {
				this.emit('change', this);
			}

			return this;
		}

		next() {
			if(this.files.length) {
				this.files.next();
				this._audio.src = this.files.current;
				this._audio.src && this.play();
				this.emit('next');
			}
			
			return this;
		}

		prev() {
			if(this.files.length) {
				this.files.prev();
				this._audio.src = this.files.current;
				this._audio.src && this.play();
				this.emit('prev');
			}
			
			return this;
		}

		shuffle() {
			this.files.shuffle();
			return this;
		}

		showSplashBecauseChrome(err) {
			if(err) {
				if(err.code == DOMException.NOT_SUPPORTED_ERR && Date.now() - infiniteLoopPrevention > 1000) { //in case of 404 or not supported format.
					infiniteLoopPrevention = Date.now();
					this.next();
					return;
				}
				
				if(err.code == DOMException.ABORT_ERR) {
					return;
				}
			}
			
			this.splash = document.createElement('div');
			this.splash.className = 'splash';
			this.splash.addEventListener('click', this.play.bind(this));
			document.body.append(this.splash);
			
			if(navigator.userAgent && navigator.userAgent.toLowerCase().includes('mobile'))
				this.splash.addEventListener('click', () => document.documentElement.requestFullscreen());
		}
	}


	const DEFAULT_VOLUME = 0.35;
	ns.VolumeControl = class VolumeControl {
		constructor(btn, audio) {
			if(!btn) throw "Volume button not found!";
			if(!audio) throw "AudioPlayer button not found!";
			
			var _volume = 0;
			this.step = 0.05;
			this.btn = btn;
			this.circle = btn.querySelector('circle');

			Object.defineProperty(this, 'volume', {
				get: () => _volume,
				set: (value) => {
					value = parseFloat(value);
					if(!isNaN(value)){
						audio.volume = _volume = Math.max(0, Math.min(1, value));
						this.updateGUI();
					}
				}
			});

			btn.addEventListener('click', this.toggleMute.bind(this));
			btn.addEventListener('wheel', (ev) => ev.deltaY < 0 ? this.up() : this.down());
			
			btn.addEventListener('touchstart', (ev) => {
				if(ev.touches.length) {
					btn.startPoint = {x: ev.touches[0].clientX, y: ev.touches[0].clientY };
				}
			});
			
			btn.addEventListener('touchmove', (ev) => {
				if(ev.touches.length && btn.startPoint){
					let current = {x: ev.touches[0].clientX, y: ev.touches[0].clientY };
					let delta = Math.hypot(current.x - btn.startPoint.x, current.y - btn.startPoint.y);
					let screen = Math.max(window.screen.width, window.screen.height);
					
					let nonLinearity = 1.5;
					let volume = Math.pow(delta, nonLinearity) / Math.pow(screen, nonLinearity);
					this.volume =  Math.min(1, volume);
					
					console.log( this.volume );
				}
			});
			this.volume = DEFAULT_VOLUME;
		}

		updateGUI() {
			var px = parseInt(this.circle.getAttribute('r'), 10) * Math.PI * 2 * (1 - this.volume);
			this.circle.style.strokeDashoffset = px + "px";

			if(this.volume > 0.6)
				this.btn.className = "high";
			else if(this.volume > 0.17)
				this.btn.className = "medium";
			else if(this.volume > 0)
				this.btn.className = "low";
			else
				this.btn.className = "mute";
		}
		
		up() {
			this.volume += this.step;
		}

		down() {
			this.volume -= this.step;
		}

		toggleMute() {
			if(this.volume) {
				this._oldVolume = this.volume;
				this.volume = 0;
			} else {
				this.volume = this._oldVolume || DEFAULT_VOLUME;
			}
		}
	}
})(window.lewd = window.lewd || {});
