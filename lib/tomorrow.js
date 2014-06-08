(function() {
	"use strict";


	// Ensure harmony level is set to 11.
	require('harmonize')();


	var Fiber	= require('fibers'),
		splice	= Array.prototype.splice;


	// Map of value proxies, to Tomorrow instances.
	var tomorrows = new WeakMap();


	function Tomorrow() {

		var value		= undefined,
			primitive	= undefined,
			error		= null,
			resolved	= false,
			queued		= [];


		// Wait until this Tomorrow instance is resolved, and return its value.
		var wait = this.wait = function() {
			if (resolved) { return value; }
			queued.push(Fiber.current);
			return Fiber.yield();
		};


		// Resolve this Tomorrow instance, providing its finalised value.
		this.resolve = function(resolvedValue) {
			resolved	= true;
			value		= primitive = resolvedValue;

			// Auto box primitives, except functions, to prevent proxy hell.
			if (value !== undefined && value !== null && !value.getPropertyNames
					&& !value.prototype) {
				value = new (value.constructor)(value);
			}

			// Make our proxy *sort of* the value it now represents!
			if (Object.setPrototypeOf) {
				Object.setPrototypeOf(this.object, value);
			}else{
				this.object.__proto__ = value;
			}

			// Recreate valueOf and toString, since the natives are non-generic
			this.object.valueOf = function() { return primitive; };
			this.object.toString = function() { return '' + primitive; };

			// Inform any fibers `wait`ing on this value.
			queued.forEach(function(fiber) {
				fiber.run(value);
			});

			// Dispose of things we no longer need, befriend our GC.
			queued = null;
			delete this.resolve;
		};

		// Intercept every proxy trap to dereference the finalised value.
		var handler = {

			getOwnPropertyDescriptor: function(name) {
				return wait()	? Object.getOwnPropertyDescriptor(value, name)
								: undefined;
			},

			getPropertyDescriptor: function(name) {
				if (wait() === undefined || value === null) { return undefined; }
				// Method missing on primitives, fetch from autoboxing prototype
				return value.getPropertyDescriptor
					? value.getPropertyDescriptor(name)
					: Object.getOwnPropertyDescriptor(
							value.constructor.prototype, name);
			},

			getOwnPropertyNames: function() {
				return Object.getOwnPropertyNames(wait());
			},

			getPropertyNames: function() {
				if (wait() === undefined || value === null) { return undefined; }
				// Method missing on primitives, fetch from autoboxing prototype
				return value.getPropertyNames
					? value.getPropertyNames(name)
					: Object.getOwnPropertyNames(
							value.constructor.prototype, name);
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

		// Proxy as a function, in case it turns out to actually be a function.
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

		// Install a function on top of the harmony proxy, so we can override
		// `valueOf` and `toString` without hitting our own traps.
		var object = function() { return wait().apply(this, arguments); };
		object.valueOf = function() { return wait(); };
		object.toString = function() { return wait().toString(); };

		// Store a reference, for `wait` lookups.
		tomorrows.set(object, this);

		// Add our proxy under the function proxy object thing...
		if (Object.setPrototypeOf) {
			Object.setPrototypeOf(object, proxy);
		}else{
			object.__proto__ = proxy;
		}

		// Should have called this 'abomination'
		this.object = object;
	};


	// Enter the world of tomorrow.
	function tomorrow(callback) {
		(new Fiber(callback)).run();
	};


	// Wait for a value, or an array of values to become available.
	tomorrow.wait = function(value) {

		if (value instanceof Tomorrow) { return value.wait(); }

		// We only use functions as proxy objects, so no bind, no entry.
		var tomorrow = value && value.bind ? tomorrows.get(value) : undefined;
		if (tomorrow === undefined) {

			// No entry, not an array?  Direct value then.
			if (!Array.isArray(value) && !(value instanceof Array)) {
				return value;
			}

			// Return an array of resolved values.
			return value.map(function(item) {
				var tomorrow = item instanceof Tomorrow || !(item && item.bind)
						? item : tomorrows.get(item);
				return tomorrow === undefined ? item : tomorrow.wait();
			});
		}else{
			return tomorrow.wait();
		}
	};


	// Wrap an asynchronous function call to return a Tomorrow instead.
	tomorrow.wrap = function(call, index, exception) {
		index = index === undefined ? -1 : 0;

		var wrapped = function() {
			var args = arguments;

			// Negative indexes are statically positioned from the end.
			splice.call(args, index < 0
				? args.length + 1 + index : index, 0, resolve);

			// Have v8 work some lazy magic, in case we want a stack trace.
			var source = {};
			Error.captureStackTrace(source);

			var fiber		= Fiber.current,
				tomorrow	= new Tomorrow();

			try{
				call.apply(this, args);
			}catch(e) {
				if (e instanceof TomorrowError) {
					throw new (e.constructor)(e.message, e, source.stack);
				}else{
					throw new TomorrowError(e.message, e, source.stack);
				}
			}

			// Handle the actual resolution of the callback.
			function resolve(error, result) {
				if (error) {
					source.message = error;
					fiber.throwInto(new (exception || TomorrowError)(
						error.message, null, source.stack));
				}else{
					tomorrow.resolve(result);
				}
			}

			// Return our *frankenobject* to allow lazy evaluation.
			return tomorrow.object;
		};

		// Give the wrapper function the same name, because we're considerate.
		wrapped.name = call.name;
		return wrapped;
	};


	// Custom error type, to handle cross fiber stack multiplexing.
	function TomorrowError(message, origin, stack) {
		this.message	= message;

		this.name = (origin ? origin.name : 'Error') || 'Error';

		var base	= (origin && origin.actualStack) ? origin.actualStack : [],
			prefix	= (origin && !origin.actualStack) ? origin.stack : '';

		if (!stack) {
			Error.captureStackTrace(this, TomorrowError);
			stack = this.stack;
		}

		// Hide the entrails.  Relatively expensive, but only happens
		// under *exceptional* circumstances...
		this.actualStack = base.concat((prefix + stack).split(
			/[\n\r]+/).slice(1).filter(function(line) {
				return !line.match(/tomorrow[\\\/]lib[\\\/][^.\\\/]+\.js/);
			}));

		this.stack = this.name + ': ' + message + '\n' + this.actualStack.join('\n');
	};

	TomorrowError.prototype				= new Error();
	TomorrowError.prototype.constructor	= TomorrowError;


	tomorrow.Tomorrow		= Tomorrow;
	tomorrow.TomorrowError	= TomorrowError;


	module.exports = tomorrow;


})();