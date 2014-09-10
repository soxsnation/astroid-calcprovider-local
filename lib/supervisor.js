 /** 
  * Astroid SDK Calculation Supervisor
  *
  * Copyright (c) 2014 .decimal, Inc.
  *
  * Permission is hereby granted, free of charge, to any person obtaining a copy
  * of this software and associated documentation files (the "Software"), to deal
  * in the Software without restriction, including without limitation the rights
  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  * copies of the Software, and to permit persons to whom the Software is
  * furnished to do so, subject to the following conditions:
  *
  * The above copyright notice and this permission notice shall be included in all
  * copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  * SOFTWARE.
  */

 var Promise = require('bluebird');

 var async = require('async');
 var events = require('events');
 var fs = require('fs');
 var jsonet = require('jsonet');
 var moment = require('moment');
 var util = require('util');
 var calcWritter = require('../modules/calcWritter');

 var async = require('async');

 // var config = require('./config');
 var utils = require('./utils');
 var compareResults = require('./compareResults');



 // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 // Logging

 function error(code, message /*, [inputs]*/ ) {
 	for (var i = 2; i < arguments.length; ++i) {
 		message = message.replace(/\?/, "'" + arguments[i] + "'");
 	}
 	return Promise.reject(new utils.SdkError(code, message));
 }
 // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 // Supervisor

 function Supervisor(options) {
 	events.EventEmitter.call(this);

 	// Options
 	this._cfg = options.cfg;
 	// this._client = options.client;
 	this._manifest = options.manifest;
 	this._tests = options.tests;
 	this._testsResults = [];

 	// Jsonet
 	this._server = jsonet.createServer(this.onConnection.bind(this));
 	this._socket = null;

 	// Current job
 	this._job = null;

 	// Backlog and queue
 	this._backlog = [];
 	this._queue = async.queue(this._calculate.bind(this), 1);
 };
 // util.inherits(Supervisor, events.EventEmitter);

 Supervisor.prototype._calculate = function(item, callback) {
 	// console.log('_calculate: ' + this._queue.length());
 	this._job = {
 		// uid: 'sGNlMGYxNzg0MzdiMGI2', //item.calculation_test.uid,
 		process: null,
 		result: null
 	};
 	// console.log("Info: Resolving calculation".cyan);
 	this._job.process = {
 		request: item.calculation_test.request,
 		expects: item.calculation_test.expects,
    description: item.calculation_test.description,
 		callback: callback
 	};

 	// this._job.process.request.function.uid = 'sGNlMGYxNzg0MzdiMGI2';
 	// delete this._job.process.request.function.app;
 	// delete this._job.process.request.function.name;

 	this.writeRequest();
 };

 Supervisor.prototype.listen = function(port) {
 	var self = this;
 	return new Promise(function(resolve, reject) {
 		self._server.listen(port, function(err) {
 			if (err) {
 				reject(err);
 			} else {
 				resolve(port);
 			}
 		});
 	});
 };

 Supervisor.prototype.onConnection = function(socket) {
 	var self = this;
 	if (this._socket) {
 		console.log("Warning: Calculation provider already connected".yellow);
 		socket.write({
 			type: 'terminate',
 			terminate: null
 		});
 		socket.end();
 		return;
 	}
 	console.log("Info: Calculation provider connected".cyan);
 	this._socket = socket;
 	socket.on('error', function(err) {
 		// TODO: Should handle socket errors more gracefully
 		console.log(err);
 		throw err;
 	});
 	socket.on('message', function(msg) {
 		self.onMessage(socket, msg).catch(function(e) {
 			var message = "Error: ";
 			if (e.code) {
 				message += "(" + e.code + ") ";
 			}
 			if (e.message) {
 				message += e.message;
 			}
 			console.log(message.red);
 		});
 	});
 };

 Supervisor.prototype.onMessage = function(socket, msg) {
 	// console.log('onMessage: ' + JSON.stringify(msg));
 	if (typeof msg.type === 'undefined' || typeof msg[msg.type] === 'undefined') {
 		return error('CSINVMTP', "Undefined or invalid IPC message received by supervisor");
 	}
 	switch (msg.type) {
 		case 'failure':
 			{
 				return this.processFailure(socket, msg);
 			}
 		case 'pong':
 			{
 				return this.processPong(socket, msg);
 			}
 		case 'progress':
 			{
 				return this.processProgress(socket, msg);
 			}
 		case 'registration':
 			{
 				return this.runTests(socket, msg);
 			}
 		case 'result':
 			{
 				return this.processResult(socket, msg);
 			}
 		case 'runtests':
 			{
 				return this.runTests(socket, msg);
 			}
 		default:
 			{
 				return error('CSINVMSG', "Invalid IPC message type ? received by supervisor", msg.type);
 			}
 	}
 };

 Supervisor.prototype.processFailure = function(socket, msg) {
 	if (typeof msg.failure.code !== 'string') {
 		return error("CSINVFCD", "Invalid failure code type ?; expected ?", typeof msg.failure.code, 'string');
 	} else if (msg.failure.message && typeof msg.failure.message !== 'string') {
 		return error("CSINVFMG", "Invalid failure message type ?; expected ?", typeof msg.failure.message, 'string');
 	}
 	return Promise.reject(msg.failure);
 };

 Supervisor.prototype.processResult = function(socket, msg) {
 	// console.log('processResult: ' + JSON.stringify(msg));
 	// console.log('expectedResult: ' + JSON.stringify(this._job.process.expects));

  if (this._testsResults.length === 0) {
    calcWritter.writeHeader(this._job.process.request.app);
  }

  calcWritter.writeFunctionDetail(this._job.process.request.name, this._job.process.description);

 	if (compareResults.compare(this._job.process.expects.type, this._job.process.expects.result, msg.result, this._job.process.expects.prop_name, this._job.process.expects.tolerance)) {
 		this._testsResults.push({
 			result: 'PASS',
 			expected: this._job.process.expects.result,
 			actual: msg.result,
 		});
 	} else {
 		this._testsResults.push({
 			result: 'FAIL',
 			expected: this._job.process.expects.result,
 			actual: msg.result,
 		});
 	}

  // No more calculations left to perform
 	if (this._queue.length() === 0) {
 		console.log('Test Results:');

    // Record total number of test results and write header
    var passedTests = 0;
    var failedTests = 0;
    for (var i = 0; i < this._testsResults.length; ++i) {
      if (this._testsResults[i].result === 'PASS') {
        passedTests ++;
      } 
      else {
        failedTests ++;
      }
    };

    // Write result out for each test
 		for (var i = 0; i < this._testsResults.length; ++i) {
 			if (this._testsResults[i].result === 'PASS') {
 				console.log('Test Passed'.green);
 			}
 			else {
 				console.log('Test FAILED!!'.red);
 			}
 		}
    this.writeTerminate();
    calcWritter.writeFooter(this._job.process.request.app, passedTests, failedTests);
    calcWritter.close();
 	}
 	
 	if (typeof msg.result === 'undefined') {
 		return error("CSINVRVA", "Receieved invalid or undefined result value");
 	}
  
 	this._job.process.callback(null);

 	return Promise.resolve();
 };

 Supervisor.prototype.processRegistration = function(socket, msg) {
 	// if (typeof msg.registration !== 'string') {
 	//     return error("CSINVRTP", "Invalid registration type, expected ? got ? instead", 'string', typeof msg.registration);
 	// } else if (this._cfg.ipc_pid !== msg.registration) {
 	//     return error("CSINVREG", "Invalid process id ?; expected ?", msg.registration, this._cfg.ipc_pid);
 	// }
 	console.log("Info: Registration successful".cyan);
 	this.writeRequest();
 	return Promise.resolve();
 };



 Supervisor.prototype.runTests = function(socket, msg) {

 	console.log("Info: Running Tests".cyan);
 	console.log('Test Count: ' + this._tests.length);

 	this._queue.push(this._tests);
 	return Promise.resolve();
 }

 Supervisor.prototype.writeRequest = function() {
 	// console.log('writeRequest'.yellow);
 	
 	if (this._job && this._job.process) {
 		if (this._socket) {
 			// console.log("Status: All ready, sending request to provider".green);
 			this._socket.write(this._job.process.request);
 		} else {
 			console.log("Status: Calculation ready, awaiting provider".grey);
 		}
 	} else if (this._socket) {
 		console.log("Status: Provider ready, awaiting calculation".grey);
 	}
 };

 Supervisor.prototype.writeTerminate = function() {
 	var req = {
    "terminate": ""
 		// "type": "terminate"
 	};
 	if (this._job && this._job.process) {
 		if (this._socket) {
 			console.log("Status: All ready, sending terminate to provider".green);
 			this._socket.write(req);
 		} else {
 			console.log("Status: Calculation ready, awaiting provider".grey);
 		}
 	} else if (this._socket) {
 		console.log("Status: Provider ready, awaiting calculation".grey);
 	}
 };

 // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 // Exports

 module.exports = Supervisor;