"use strict";
(function(ns){

	CanvasRenderingContext2D.prototype.clear = function() {
		this.setTransform(1,0,0,1,0,0);
		this.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	ns.Visual = class Visual {

		constructor(canvas, backgrounds, sprites, audio) {
			this.ctx = Visualization.ctx = canvas.getContext('2d');
			//this.ctx.font = '100px serif';

			this.bg = new ns.Visual.BackgroundManager(canvas, backgrounds);
			this.sprites = Visualization.sprites = new ns.Visual.SpriteManager(sprites);
			this.visualizations = [
				new WalkingGrillVisualization(),
				new RainingMiss(),
				new RollingGirl(),
				new DVD(),
				new CenterOfAttention(),
				new CenterOfRandom(),
				new CenterOfEpilepsy(),
			];

			this.visualizations.shuffle();
			audio.on('next', this.bg.next.bind(this.bg));
			audio.on('prev', this.bg.prev.bind(this.bg));
			audio.on('change', this.prepare.bind(this));
			audio.on('playing', this.begin.bind(this));
			audio.on('beats', this.loadBeats.bind(this));
		}

		prepare() {
			this.currentVisualization && this.currentVisualization.stop();
			this.ctx.clear();
			this.currentVisualization = this.visualizations.next();
			this.currentVisualization.init();
		}

		begin() {
			this.currentVisualization && this.currentVisualization.play();
		}

		loadBeats(beats) {
			this.currentVisualization && this.currentVisualization.loadBeats(beats);
		}
	}

	ns.Visual.BackgroundManager = class BackgroundManager {
		constructor(element, backgrounds) {
			this.element = element;
			this.backgrounds = backgrounds;
		}

		showLoadProgress(bg) {
			var tmp = new Image(); //Check is loaded

			tmp.addEventListener('load', ns.progress.stop.bind(ns.progress, 'bg'));
			tmp.src = bg;
			if(!tmp.complete)
				ns.progress.show('bg');

		}

		next() {
			var bg = this.backgrounds.next();
			this.showLoadProgress(bg);
			this.element.style.backgroundImage =  'ur' + `l('${bg}')`; //strange url, to defeat proxy interfiering
		}

		prev() {
			this.element.style.backgroundImage =  'ur' + `l('${this.backgrounds.prev()}')`; //strange url, to defeat proxy interfiering
		}
	}

	class Coordinate {
		constructor(current, min, max, step, randomDirectionProbability) {
			this.current = current || 0;
			this.min = min || 0;
			this.max = max || 0;
			this.step = step || 0;
			this.randomDirectionProbability = randomDirectionProbability || 0;
		}

		randomMove(base) {

			if(base)
				this.current += base;

			if(this.min >= this.max || this.step == 0)
				return this.current;

			if(this.current <= this.min)
				this.step = Math.abs(this.step);
			else if( this.current >= this.max)
				this.step = -Math.abs(this.step);
			else if (this.randomDirectionProbability > 0 && Math.random() < this.randomDirectionProbability)
				this.step = -this.step;

			this.current += Math.random() * this.step;

			if(this.current > this.max)
				this.current = this.max;

			if(this.current < this.min)
				this.current = this.min;

			return this.current;
		}

		valueOf() {
			return this.current;
		}
	}

	class Sprite {
		constructor(img) {
			this.img = img;
			this._x = new Coordinate();
			this._y = new Coordinate();
			this._ratio = 0;
		}

		get w(){
			return this.img.width;
		}

		set w(value){
			this.img.width = value;
		}

		get h(){
			return this.img.height;
		}

		set h(value){
			this.img.height = value;
		}

		get x() {
			return this._x;
		}

		get y() {
			return this._y;
		}

		set x(value) {
			this._x.current = value;
		}

		set y(value) {
			this._y.current = value;
		}

		//center x
		get cx() {
			return this.x + this.w / 2;
		}

		//center y
		get cy() {
			return this.y + this.h / 2;
		}

		set cx(value) {
			this.x = value - this.w / 2;
		}

		set cy(value) {
			this.y = value - this.h / 2;
		}

		//h:w ratio
		get ratio() {
			if(!this._ratio)
				this._ratio = this.h / this.w;
			return this._ratio;
		}

		resizeRelativeByWidth(w) {
			this.h = this.ratio * w;
			this.w = w;
		}

		resizeRelativeByHeight(h) {
			this.w = 1 / this.ratio * h;
			this.h = h;
		}

		resizeRelativeByWidthCenter(w) {
			var oldH = this.h;
			var oldW = this.w;

			this.resizeRelativeByWidth(w);

			this.x += (oldW - this.w) / 2;
			this.y += (oldH - this.h) / 2;
		}

		randomMove(x, y) {
			this.x.randomMove(x);
			this.y.randomMove(y);
		}

		draw(ctx) {
			ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
		}
	}

	ns.Visual.SpriteManager = class SpriteManager {
		constructor(sprites) {
			this.sprites = sprites;
		}

		next() {
			return new Sprite(this.sprites.next());
		}
	}

	class Visualization {
		constructor() {
			this.spriteManager = Visualization.sprites;
			this.ctx = Visualization.ctx;
		}

		get fps() {
			return 5;
		}

		get isBeat() {
			return this.beats && this.beats.isBeat();
		}

		init() {
			//this.beats = null;
		}

		play() {
			if(!this._intervalID)
				this._intervalID = window.setInterval(() => requestAnimationFrame(() => this._intervalID && this.drawFrame()), 1000 / this.fps);
		}

		stop() {
			if(this._intervalID) {
				clearInterval(this._intervalID);
				delete this._intervalID;
			}
		}

		loadBeats(beats) {
			this.beats = beats;
			//console.log(beats.beats);
		}
	}

	class WalkingGrillVisualization extends Visualization {

		init() {
			Visualization.prototype.init.apply(this, arguments);
			this.isClear = Math.random() > 0.5;
			this.sprite = this.spriteManager.next();

			var originalH = this.sprite.h;
			var originalW = this.sprite.w;

			this.sprite.resizeRelativeByWidth(100);
			this.sprite.y = window.innerHeight - this.sprite.h;
			this.sprite.y.min = -500;
			this.sprite.y.max = window.innerHeight;

			this.sprite.x.step = 6;
			this.sprite.y.step = 6;

			this.sprite.randomW = new Coordinate(this.sprite.w, 10, 3 * originalW, 10);
			this.sprite.randomH = new Coordinate(this.sprite.h, 10, 3 * originalH, 10);
		}

		drawFrame() {
			if(this.isClear)
				this.ctx.clear();

			this.sprite.draw(this.ctx);

			this.sprite.x.max = window.innerWidth - this.sprite.w;
			this.sprite.randomMove(-2, -4.3);

			this.sprite.w = this.sprite.randomW.randomMove(-4);
			this.sprite.h = this.sprite.randomH.randomMove(-2.5);
		}
	}

	class RainingMiss extends Visualization {

		get fps() {
			return 25;
		}

		init() {
			Visualization.prototype.init.apply(this, arguments);
			this.sprites = [];
			this.isClear = Math.random() > 0.5;

			var isReverse = Math.random() > 0.7;
			var spriteCount = 3 + Math.floor(Math.random() * 6);
			var widthPerItemPercents = window.innerWidth / spriteCount;
			var marginWidth = widthPerItemPercents * 0.1;
			var imageWidth = widthPerItemPercents - marginWidth * 2;

			for(var i = 0; i < spriteCount; i++) {
				var sprite = this.spriteManager.next();

				sprite.resizeRelativeByWidth(imageWidth);
				sprite.x = widthPerItemPercents * i + marginWidth;
				sprite.y = (isReverse ? window.innerHeight: -sprite.h)
				sprite.speed = (1 - isReverse * 2) * (Math.random() || 0.01) * 4

				this.sprites.push(sprite);
			}
		}

		drawFrame() {
			if(this.isClear)
				this.ctx.clear();

			var count = this.sprites.length;
			for(var i = 0; i < count; i++) {
				let sprite = this.sprites[i];
				sprite.draw(this.ctx);

				sprite.y += sprite.speed;
				if(sprite.speed > 0) {
					if(sprite.y > window.innerHeight)
						sprite.y = -sprite.h - 5;
				} else if(sprite.y + sprite.h < 0) {
					sprite.y = window.innerHeight;
				}
			}
		}
	}

	class RollingGirl extends Visualization {
		get fps() {
			return 60;
		}

		init() {
			Visualization.prototype.init.apply(this, arguments);
			this.isClear = Math.random() > 0.5;
			this.sprite = this.spriteManager.next();
			this.sprite.rotationSpeed = 0.2;
			this.sprite.resizeRelativeByWidth(window.innerWidth / (Math.random() * 15 + 5));

			this.sprite.x = (window.innerWidth - this.sprite.w) / 3;
			this.sprite.x.min = this.sprite.w / 2;
			this.sprite.x.max = window.innerWidth - this.sprite.w / 2;
			this.sprite.x.step = 1;
			this.sprite.x.randomDirectionProbability = 0.005;

			this.sprite.y = (window.innerHeight - this.sprite.h) / 2;
			this.sprite.y.min = this.sprite.h / 2;
			this.sprite.y.max = window.innerHeight - this.sprite.h / 2;
			this.sprite.y.step = 1;

			this.sprite.originY = new Coordinate(0, 0, this.sprite.h, 2);
			this.sprite.screw = new Coordinate(0, -0.6, 1, 0.01, 0.01);
			this.sprite.rotation = 0;
		}

		drawFrame() {

			if(this.isBeat)
				this.sprite.rotationSpeed = -this.sprite.rotationSpeed;

			if(this.isClear)
				this.ctx.clear();

			this.ctx.setTransform(1, 0, this.sprite.screw, 1, this.sprite.x, this.sprite.y);
			this.ctx.rotate(this.sprite.rotation);
			this.ctx.drawImage(this.sprite.img, -this.sprite.w / 2, -this.sprite.h + this.sprite.originY, this.sprite.w, this.sprite.h);

			this.sprite.rotation += (Math.random() * 0.03 + this.sprite.rotationSpeed) * 0.1;
			this.sprite.randomMove();
			this.sprite.screw.randomMove();
			this.sprite.originY.randomMove();
		}
	}


	class DVD extends Visualization {
		get fps() {
			return 60;
		}

		init() {
			Visualization.prototype.init.apply(this, arguments);

			this.isClear = Math.random() > 0.6;
			this.isBeatDetection = Math.random() > 0.4;

			this.sprite = this.spriteManager.next();
			this.sprite.resizeRelativeByWidth(window.innerWidth / (Math.random() * 20 + 5));

			this.sprite.kY = 1;
			this.sprite.kX = 1;

			this.bottom = window.innerHeight - this.sprite.h;
			this.left = window.innerWidth - this.sprite.w;
		}

		drawFrame() {

			if(this.isClear)
				this.ctx.clear();

			if(this.sprite.y > this.bottom || this.sprite.y < 0)
				this.sprite.kY = -this.sprite.kY;

			if(this.sprite.x > this.left || this.sprite.x < 0)
				this.sprite.kX = -this.sprite.kX;

			if(this.isBeatDetection && this.isBeat)
				this.sprite.kY = -this.sprite.kY;

			this.sprite.x += this.sprite.kX;
			this.sprite.y += this.sprite.kY;

			this.sprite.draw(this.ctx);
		}
	}

	class CenterOfAttention extends Visualization {
		get fps() {
			return 30;
		}

		setVector(sprite) {
			var centerX = window.innerWidth / 2;
			var centerY = window.innerHeight / 2;

			var deltaX = window.innerWidth / 5;
			var deltaY = window.innerHeight / 5;

			//position random at center:
			sprite.resizeRelativeByWidth(10);
			sprite.x = centerX + (Math.random() - 0.5) * deltaX - sprite.w / 2;
			sprite.y = centerY + (Math.random() - 0.5) * deltaY - sprite.h / 2;

			//but not at the exact center! Or else visualisation will be too slow
			while(Math.abs(sprite.x - centerX) < 20) {
				if(sprite.x - centerX < 0)
					sprite.x -= 1;
				else
					sprite.x += 1;
			}

			sprite.x.step = -Math.cos((sprite.cx + deltaX / 2 - centerX) / deltaX * Math.PI);
			sprite.y.step = -Math.cos((sprite.cy + deltaY / 2 - centerY) / deltaY * Math.PI);

			//cache window dimmentions:
			sprite.x.max = window.innerWidth;
			sprite.y.max = window.innerHeight;
		}

		init() {
			Visualization.prototype.init.apply(this, arguments);
			this.sprites = [];
			this.isClear = Math.random() > 0.5;
			var spriteCount = 5 + Math.floor(Math.random() * 6);

			for(var i = 0; i < spriteCount; i++) {
				var sprite = this.spriteManager.next();
				this.setVector(sprite);
				this.sprites.push(sprite);
			}
		}

		effect(sprite) {
			var width = Math.pow( sprite.x.max / 4 - (sprite.cx / 2 ), 2) * 0.005;
			if(width > sprite.y.max)
				width = sprite.y.max;

			sprite.resizeRelativeByWidthCenter(width);
		}

		drawFrame() {
			if(this.isClear)
				this.ctx.clear();

			var count = this.sprites.length;

			for(var i = 0; i < count; i++) {
				let sprite = this.sprites[i];

				//reset sprite if it gets out of the window
				if(sprite.cx + sprite.w <= 0 || sprite.x > sprite.x.max)
					this.setVector(sprite);

				if(sprite.cy + sprite.h < 0 || sprite.y > sprite.y.max)
					this.setVector(sprite);

				//different ways of scaling gives interesting results...
				this.effect(sprite);

				//move the sprite away from the center:
				sprite.cx += sprite.x.step;
				sprite.cy += sprite.y.step;

				sprite.draw(this.ctx);
			}
		}
	}

	class CenterOfEpilepsy extends CenterOfAttention {

		effect(sprite) {
			if(sprite.cx <= 0)
				this.setVector(sprite);

			sprite.resizeRelativeByWidth(Math.pow( sprite.x.max / 4 - (sprite.cx / 2 ), 2) * 0.005);
		}
	}

	class CenterOfRandom extends CenterOfAttention {

		effect(sprite) {
			var oldH = sprite.h;
			var oldW = sprite.w;

			sprite.resizeRelativeByWidth(Math.pow( sprite.x.max / 4 - (sprite.cx / 2 ), 2) * 0.005);

			sprite.x += (sprite.w - oldW) / 2;
			sprite.y += (sprite.h - oldH) / 2;
		}
	}

})(window.lewd = window.lewd || {});
