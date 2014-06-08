(function() {
	"use strict";


	// TEMPORARY TEST FILE

	var Tomorrow	= require('./lib/tomorrow');



	Tomorrow.start(function() {

		var readFile = Tomorrow.wrap(require('fs').readFile);

		var timeout = Tomorrow.wrap(setTimeout, 0);
		var madness = timeout(2000);

		function delayResponse(callback) {
			setTimeout(function() {
				callback(null, function() { console.log('Called...'); return 'hello'; });
			}, 1000);
		}

		var hello = Tomorrow.wrap(delayResponse)();

		var result = readFile('./package.json');

		console.warn("Awaiting file read...");
		console.warn("Read: " + result);

		console.log('Hello:', hello());

		console.log('Timeout resolved...', Tomorrow.wait(madness), 'of course');

		function getMeFiles() {
			return readFile('non-existant.wut?');
		}

		console.log(getMeFiles());

	});

	console.log("I can haz other paths?");



})();
