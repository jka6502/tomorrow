(function() {

	var tomorrow	= require('./tomorrow'),
		wait		= tomorrow.wait,
		wrap		= tomorrow.wrap;


	var timeout = tomorrow.wrap(setTimeout, 0);


	// Expose an asynchronous, but Fiber blocking sleep.
	module.exports = function sleep(time) { wait(timeout(time)); };


})();