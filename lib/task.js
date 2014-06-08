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

	};


	function task(callback) {
		return new Task(false).enter(callback);
	}

	function series(callback) {
		return new Task(true).enter(callback);
	}

	function method(func, series) {

		return function() {
			var args	= arguments,
				owner	= this;

			return new Task(series).enter(function() {
				return func.apply(owner, arguments);
			});
		};

	}

	method.series = function(func) {
		return method(func, true);
	};

	var timeout = tomorrow.wrap(setTimeout, 0);
	task.sleep = function(time) { wait(timeout(time)); };


	method.task = method;
	task.method = method;
	task.series	= series;


	module.exports = task;


})();