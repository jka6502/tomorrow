(function() {
	"use strict";


	var Fiber			= require('fibers'),
		tomorrow		= require('./tomorrow'),
		Tomorrow		= tomorrow.Tomorrow,
		TomorrowError	= tomorrow.TomorrowError,
		wait			= tomorrow.wait;


	// Root Task, parent to all.
	var ROOT = new Task();


	function Task(series) {
		this.children	= [];
		this.tomorrow	= new Tomorrow();
		this.series		= !!series;
	};

	Task.prototype = {

		// Enter the scope of a task, and run the callback associated.
		enter: function(callback) {
			var parent	= Fiber.current.currentTask || ROOT,
				task	= this,
				source	= {};

			// Store the current stack trace, to produce useful Error stacks.
			Error.captureStackTrace(source);

			// Wrap each task in a fibre, so we have fine grained control.
			var fiber = Fiber(function() {

				// Make sure the parent task can't complete before this Task.
				parent.children.push(task.tomorrow);
				fiber.currentTask = task;

				var result	= undefined,
					error	= undefined;
				try{
					var result = callback();
				}catch(e) {
					// Unwind through Fiber stacks, to produce a full stack.
					if (e instanceof TomorrowError) {
						throw new (e.constructor)(e.message, e, source.stack);
					}else{
						throw new TomorrowError(e.message, e, source.stack);
					}
				}finally{
					// Ensure we mark this task as complete, even in failure.
					wait(task.children);
					task.tomorrow.resolve(result);
				}
			});
			fiber.run();

			// Wait for series tasks, or return Tomorrow proxy for normal.
			return parent.series ? wait(task.tomorrow) : task.tomorrow.object;
		}

	};


	// Create a new task, and execute it as soon as possible.
	function task(callback) {
		return new Task(false).enter(callback);
	}

	// Create a new series task, and execute it as soon as possible.
	function series(callback) {
		return new Task(true).enter(callback);
	}

	// Wrap an existing method definition in a task.
	function method(func, series) {

		return function() {
			var args	= arguments,
				owner	= this;

			return new Task(series).enter(function() {
				return func.apply(owner, arguments);
			});
		};

	}

	// Shortcut to wrap a method in a series task.
	method.series = function(func) {
		return method(func, true);
	};


	method.task = method;
	task.method = method;
	task.series	= series;


	module.exports = task;


})();