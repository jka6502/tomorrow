(function() {
	"use strict";


	require('harmonize')();


	var Fiber	= require('fibers'),
		splice	= Array.prototype.splice;


	var tomorrows = new WeakMap();


	function Tomorrow(type) {

		var value		= undefined,
			error		= null,
			resolved	= false,
			queued		= [];

		var wait = this.wait = function() {
			while(!resolved) {
				queued.push(Fiber.current);
				Fiber.yield();
			}
			return value;
		};

		this.resolve = function(resolvedValue) {
			resolved	= true;
			value		= resolvedValue;

			queued.forEach(function(fiber) {
				fiber.run();
			});
			queued.length = 0;
		};

		var handler = {

			getOwnPropertyDescriptor: function(name) {
				var value = wait();
				return value ? Object.getOwnPropertyDescriptor(value, name) : undefined;
			},

			getPropertyDescriptor: function(name) {
				var value = wait();
				return value ? Object.getOwnPropertyDescriptor(value, name) : undefined;
			},

			getOwnPropertyNames: function() {
				return Object.getOwnPropertyNames(wait());
			},

			getPropertyNames: function() {
				var object		= wait(),
					properties	= [];
				while(object) {
					properties = properties.concat(Object.getOwnPropertyNames(object));
					object = object.prototype;
				}
				return properties;
			},

			defineProperty: function(name, definition) {
				return Object.defineProperty(wait(), name, definition);
			},

			delete: function(name) {
				return delete wait()[name];
			},

			fix: function(name) {
				return wait();
			}

		};

		var proxy = Proxy.createFunction(

			handler,

			function call() {
				return wait().apply(value, arguments);
			},

			function construct() {
				var instance = Object.create(wait().prototype);
				return value.apply(instance, arguments);
			}

		);

		var object = function() { return wait().apply(this, arguments); };
		object.valueOf = function() { return wait(); };
		object.toString = function() { return String(wait()); };

		tomorrows.set(object, this);

		if (Object.setPrototypeOf) {
			Object.setPrototypeOf(object, proxy);
		}else{
			object.__proto__ = proxy;
		}

		this.object = object;
	};


	function tomorrow(callback) {
		(new Fiber(callback)).run();
	};


	tomorrow.wait = function(value) {

		if (value instanceof Tomorrow) { return value.wait(); }

		var tomorrow = tomorrows.get(value);
		if (tomorrow === undefined) {
			if (!Array.isArray(value) && !(value instanceof Array)) {
				return value;
			}
			return value.map(function(item) {
				var tomorrow = item instanceof Tomorrow ? item : tomorrows.get(item);
				return tomorrow === undefined ? item : tomorrow.wait();
			});
		}else{
			return tomorrow.wait();
		}
	};


	tomorrow.wrap = function(call, index) {
		index = index === undefined ? -1 : 0;

		var wrapped = function() {
			var args = arguments;

			splice.call(args, index < 0 ? args.length + 1 + index : index, 0, resolve);
			var source = {};
			Error.captureStackTrace(source, wrapped);

			var fiber = Fiber.current;
			var tomorrow = new Tomorrow();

			call.apply(this, args);

			function resolve(error, result) {
				if (error) {
					source.message = error;
					fiber.throwInto(new TomorrowError(error, null, source.stack));
				}else{
					tomorrow.resolve(result);
				}
			}

			return tomorrow.object;
		};

		wrapped.name = call.name;
		return wrapped;
	};



	function TomorrowError(message, origin, stack) {
		this.origin = origin;
		this.stack = message + '\n' + stack.replace(/^.*?(\n\r|\r\n|\n|\r)+/, '');
	};
	TomorrowError.prototype = Error.prototype;


	tomorrow.Tomorrow = Tomorrow;


	module.exports = tomorrow;


})();