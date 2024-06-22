'use strict';
/*
 * Source: https://github.com/JMPerez/beats-audio-api
 * In fact this thing does not work as good as I expected.
 */

(function(ns){
	
	function getPeaks(data, duration) {
		// What we're going to do here, is to divide up our audio into parts.

		// We will then identify, for each part, what the loudest sample is in that
		// part.

		// It's implied that that sample would represent the most likely 'beat'
		// within that part.

		// Each part is 0.5 seconds long - or 22,050 samples.

		// This will give us 60 'beats' - we will only take the loudest half of
		// those.

		// This will allow us to ignore breaks, and allow us to address tracks with
		// a BPM below 120.

		var partSize = 22050,
			parts = data[0].length / partSize,
			peaks = [];

		for (var i = 0; i < parts; i++) {
			var max = 0;
			for (var j = i * partSize; j < (i + 1) * partSize; j++) {
				var volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
				if (!max || (volume > max.volume)) {
					max = {
						position: j,
						time: duration * j,
						volume: volume
					};
				}
			}
			peaks.push(max);
		}

		// We then sort the peaks according to volume...
		peaks.sort((a,b) => b.volume - a.volume);

		// ...take the loundest half of those...
		peaks = peaks.splice(0, peaks.length * 0.5);

		// ...and re-sort it back based on position.
		peaks.sort((a,b) => a.position - b.position);

		return peaks;
	}
	
	
	function getIntervals(peaks) {
		// What we now do is get all of our peaks, and then measure the distance to
		// other peaks, to create intervals.  Then based on the distance between
		// those peaks (the distance of the intervals) we can calculate the BPM of
		// that particular interval.

		// The interval that is seen the most should have the BPM that corresponds
		// to the track itself.

		var groups = [];

		peaks.forEach(function(peak, index) {
			for (var i = 1; (index + i) < peaks.length && i < 10; i++) {
				var group = {
					tempo: (60 * 44100) / (peaks[index + i].position - peak.position),
					count: 1
				};

				while (group.tempo < 90) {
					group.tempo *= 2;
				}

				while (group.tempo > 180) {
					group.tempo /= 2;
				}

				group.tempo = Math.round(group.tempo);

				if (!(groups.some((interval) => (interval.tempo === group.tempo ? interval.count++ : 0))))
					groups.push(group);
			}
		});
		
		return groups;
	}
	
	const MAX_DELAY = 0.1;
	class Beat {
		constructor(beats, audio) {
			this.src = audio.src;
			this.audio = audio;
			this.beats = beats;
			this.pendingBeats = Array.from(this.beats);
		}
		
		isBeat() {
			var result = false;
			
			if(this.src == this.audio.src) {
				var time = this.audio.currentTime;
				
				for(var i = 0; i < this.pendingBeats.length; i++) {
					if(this.pendingBeats[i].time > time) {
						break;
					} else {
						result = true;
					}
				}
				
				if(i) {
					this.pendingBeats.splice(0, i) //Beat was used, it won't be needed anymore, let's delete it.
						.forEach((k) => console.log(k.time));
				}
			}
			
			return result;
		}
	}
	
	ns.BeatDetector = class BeatDetector{
		constructor(audioElement) {
			this.audioElement = audioElement;
		}
		
		analyze() {
			
			if(this.currentUrl == this.audioElement.src)
				return Promise.reject();
			
			var that = this;
			this.currentUrl = this.audioElement.src;
			
			return new Promise(function(resolve, reject) {
				var request = new XMLHttpRequest();
				request.open('GET', that.audioElement.src, true);
				request.responseType = 'arraybuffer';
				request.onload = function() {
					var offlineContext = new OfflineAudioContext(2, 30 * 44100, 44100);
					offlineContext.decodeAudioData(request.response, function(buffer) {
						// Create buffer source
						var source = offlineContext.createBufferSource();
						source.buffer = buffer;

						// Beats, or kicks, generally occur around the 100 to 150 hz range.
						// Below this is often the bassline.  So let's focus just on that.

						// First a lowpass to remove most of the song.
						var lowpass = offlineContext.createBiquadFilter();
						lowpass.type = "lowpass";
						lowpass.frequency.value = 150;
						lowpass.Q.value = 1;

						// Run the output of the source through the low pass.
						source.connect(lowpass);

						// Now a highpass to remove the bassline.
						var highpass = offlineContext.createBiquadFilter();
						highpass.type = "highpass";
						highpass.frequency.value = 100;
						highpass.Q.value = 1;

						// Run the output of the lowpass through the highpass.
						lowpass.connect(highpass);

						// Run the output of the highpass through our offline context.
						highpass.connect(offlineContext.destination);

						// Start the source, and render the output into the offline conext.
						source.start(0);
						offlineContext.startRendering();
					});

					offlineContext.oncomplete = function(e) {
						var buffer = e.renderedBuffer;
						var peaks = getPeaks([buffer.getChannelData(0), buffer.getChannelData(1)], that.audioElement.duration / buffer.length);
						//var groups = getIntervals(peaks);
						
						if(that.audioElement.src == request.responseURL) {
							resolve(new Beat(peaks, that.audioElement));
						}else{
							console.warn('Discarded bytes, because audio src changed.')
						}
						
						this.currentUrl = null;
					};
				}
				
				request.send();
			});
			
		}
	}
	
	
})(window.lewd = window.lewd || {});
