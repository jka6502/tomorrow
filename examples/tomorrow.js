(function() {
	"use strict";


	// TEMPORARY TEST FILE

	var tomorrow	= require('../lib/tomorrow');



	tomorrow(function() {

		var readFile = tomorrow.wrap(require('fs').readFile);

		var timeout = tomorrow.wrap(setTimeout, 0);
		var madness = timeout(2000);

		function delayResponse(callback) {
			setTimeout(function() {
				callback(null, function() { console.log('Called...'); return 'hello'; });
			}, 1000);
		}

		var hello = tomorrow.wrap(delayResponse)();

		var result = readFile('./package.json');

		console.warn("Awaiting file read...");
		console.warn("Read: " + result);

		console.log('Hello:', hello());

		console.log('Timeout resolved...', tomorrow.wait(madness), 'of course');

		function getMeFiles() {
			return readFile('non-existant.wut?');
		}

		console.log(getMeFiles());

	});

	console.log("I can haz other paths?");



})();
