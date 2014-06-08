(function() {


	var tomorrow	= require('./lib/tomorrow'),
		wait		= tomorrow.wait,

		task		= require('./lib/task'),
		method		= task.method,
		series		= task.series,
		sleep		= task.sleep;


	function TestClass() {}

	TestClass.prototype = {

		doTheThing: method.series(function() {
			this.scorePoints();
			this.grobbleFillanges();
			console.log("We earned: " + this.calculateProfit());
		}),

		scorePoints: method.task(function() {
			console.log("Attempting to score points");
			sleep(2000);
			console.log("Points scored!");
		}),

		grobbleFillanges: method.task(function() {
			console.log("Fillanges discovered, grobbling commencing");
			for(var count = 5; count >= 0; count--) {
				this.faffIncessantly();
			}
			console.log("All fillanges currently being grobbled");
		}),

		faffIncessantly: method.task(function() {
			console.log("Initiating faffing protocol...");
			sleep(70);
			console.log("Good faff, good faff.");
		}),

		calculateProfit: method.task(function() {
			console.log("Carry the one, multiply by 'corrective' constant");
			sleep(1000);
			console.log("Tear up original P&L sheet, invent new form of arithmetic")
			sleep(2000);
			console.log("Pluck numbers from thin air");
			sleep(1000);
			console.log("PROFIT!");
			return 10;
		})

	}


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

			var thing = new TestClass();
			thing.doTheThing();
		});

	});


	console.log("Am I blocked?");


})();