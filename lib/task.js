(function() {
	"use strict";


	var Fiber		= require('fibers'),
		tomorrow	= require('./tomorrow'),
		Tomorrow	= tomorrow.Tomorrow,
		wait		= tomorrow.wait;


	var ROOT = new Task();


	function Task(series) {
		this.children	= [];
		this.tomorrow	= new Tomorrow();
		this.series		= !!series;
	};

	Task.prototype = {

		enter: function(callback) {
			var parent	= Fiber.current.currentTask || ROOT,
				task	= this;

			var fiber = Fiber(function() {
				parent.children.push(task.tomorrow);
				fiber.currentTask = task;
				var result	= undefined,
					error	= undefined;
				try{
					var result = callback();
				}catch(e) {
					error = e;
				}
				wait(task.children);
				task.tomorrow.resolve(result);
				if (error) { throw error; }
			});
			fiber.run();

			return parent.series
					? wait(task.tomorrow) : task.tomorrow.object;
		}

	}


	/**
	 * Begin a potentially asynchronous task, and return the results of that
	 * task as a Tomorrow promise.
	 */
	function task(callback) {
		return new Task(false).enter(callback);
	}

	function series(callback) {
		return new Task(true).enter(callback);
	}

	function method(method) {

		return function() {
			var args	= arguments,
				owner	= this;

			return task(function() {
				return method.apply(owner, arguments);
			});
		};

	}


	task.method = method;
	task.series	= series;


	module.exports = task;


})();