(function() {


	var tomorrow	= require('./lib/tomorrow'),
		wait		= tomorrow.wait,

		task		= require('./lib/task'),
		method		= task.method,
		series		= task.series;


	var timeout = tomorrow.wrap(setTimeout, 0);
	var sleep = function(time) { wait(timeout(time)); };


	function subtask() {
		console.log('Subtask started');
		sleep(500);
		console.log('Subtask finished');
	}

	tomorrow(function() {

		task(function() {
			console.log("First task starting");
			sleep(3000);
			console.log("First task complete");
		});

		wait(task(function() {
			console.log("Second task starting");
			sleep(2000);
			console.log("Second task finished");
			task(subtask);
		}));

		console.log("Second task complete");


		series(function() {

			task(function() {
				console.log('Series 1 start');
				sleep(500);
			});
			console.log('Series 1 end');

			task(function() {
				console.log('Series 2 start');
				sleep(500);
			});
			console.log('Series 2 end');

			task(function() {
				console.log('Series 3 start');
				sleep(500);
				task(function() {
					subtask();
				});
			});

			console.log('Series 3 end');

		});

	});


	console.log("Am I blocked?");


})();