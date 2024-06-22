"use strict";
(function(ns){
	class Progress{
		constructor() {
			this._element = document.getElementById('progress');
			this._progress = 0;
			this._items = {}
			
			this.increase = () => this._element.innerText = ++this._progress + ' ⌛';
		}
		
		show(id) {
			this._items[id] = true;
			this._element.style.display = 'block';
		}
		
		stop(id) {
			this._items[id] = false;
			
			for(var prop in this._items) {
				if(this._items.hasOwnProperty(prop) && this._items[prop]) {
					return; //some other element has not finished yet.
				}
			}
			
			this._element.style.display = 'none';
			this._element.innerText = '⌛';
		}
		
		attachAudio(audio){
			this._element.innerText = '⌛';
			audio.on('playing', this.stop.bind(this, 'audio'));
			audio.on('loading', this.show.bind(this, 'audio'));
		}
	}
	
	ns.progress = new Progress();

	function preloadImages(files) {
		if(files) {
			return files.map(file =>
				new Promise((ok, err) => {
					var img = new Image();
					img.addEventListener('load', () => {
						ok(img);
						ns.progress.increase();
					});
					img.src = file;
				})
			);
		}
		
		return [];
	}
	
	function getFileList(url) {
		return new Promise((ok, err) => {
			ajax({
				url: url,
				error: err,
				success: (response) => ok(ajax.extractFiles(response, url)),
				complete: ns.progress.increase
			});
		});
	}
	
	function isWebpSupported() {
		return new Promise((ok) => {
			var img = new Image();
			img.onload = img.onerror = () => ok(img.height == 2);
			img.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
		});
	}
	
	function fixCanvasSize() {
		var canvas = fixCanvasSize.canvas || (fixCanvasSize.canvas = document.getElementById('visual'));
		
		canvas.style.height = (window.innerHeight) + "px";
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
	}
	
	function startGUI(assets) {
		ns.player = new ns.AudioPlayer(assets.music);
		ns.player.shuffle();
		ns.progress.attachAudio(ns.player);
		
		assets.bg.shuffle();
		
		ns.volume = new ns.VolumeControl(document.getElementById('volume'), ns.player);
		ns.visual = new ns.Visual(document.getElementById('visual'), assets.bg, assets.spritesImg, ns.player);
		ns.osd = new ns.OSD(document.getElementById('title'), ns.player);
		
		document.getElementById('prev').addEventListener('click', ns.player.prev.bind(ns.player));
		document.getElementById('next').addEventListener('click', ns.player.next.bind(ns.player));
		window.addEventListener('resize', fixCanvasSize);
		fixCanvasSize();
		ns.player.play();
	}
	
	function init() {
		isWebpSupported().then( (isWebpSupported) =>{
			Promise.all([
				getFileList('mucis/'),
				getFileList(`pics/sprite${isWebpSupported?'-webp':''}/`),
				getFileList(`pics/bg${isWebpSupported?'-webp':''}/`),
			])
			.then(values => {
				var assets = {
					music: values[0],
					sprites: values[1],
					bg: values[2],
				};

				if(!assets.music)
					throw "No music!";

				if(!assets.sprites)
					throw "No sprites!";

				if(!assets.bg)
					throw "No backgrounds!";

				Promise.all(preloadImages(assets.sprites)).then((spritesImg) => {
					assets.spritesImg = spritesImg;
					startGUI(assets);
				});
				
			})
			.catch((err) => console.error(err));
		});
	}

	init();

})(window.lewd = window.lewd || {});
