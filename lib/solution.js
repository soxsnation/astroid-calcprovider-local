/** 
 * Astroid SDK Solution
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

var colors = require('colors');
var equal = require('deep-equal');
var fignore = require('fstream-ignore');
var fpath = require('path');
var fs = require('fs');
var tar = require('tar');
var zlib = require('zlib');
var calcProvider = require('child_process');

var Client = require('./client');
// var Proxy = require('./proxy');
var Supervisor = require('./supervisor');

var config = require('./config');
var utils = require('./utils');


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Promisified functions

var readFile = Promise.promisify(fs.readFile);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Private functions

function fixupDirs(entry) {
	// Make sure readable directories have execute permission
	if (entry.props.type === "Directory") {
		entry.props.mode |= (entry.props.mode >>> 2) & 0111;
	}
	return true;
}

function init() {
	return Promise.resolve();
	// return config.get().bind({}).then(function(cfg) {
	// return function() {
	// 	// this.cfg = cfg;
	// 	this.client = new Client({
	// 		hostname: 'localhost',
	// 		port: 3333
	// 	});
	// };
};

function initManifest(filename) {
	return init().then(function() {
		return readFile(filename);
	}).then(function(data) {
		// console.log('manifest: ' + data);
		this.manifest = JSON.parse(data);
		this.name = this.manifest.name;
		this.version = this.manifest.version;
		this.framework_version = null;
		if (this.name === 'astroid') {
			this.framework_version = this.cfg.framework_version;
		} else {
			this.framework_version = this.manifest.dependencies.astroid;
		}
		if (!this.framework_version) {
			throw new Error("Missing framework dependency");
		}
	});
};

function initTests(filename) {
	return init().then(function() {
		return readFile(filename);
	}).then(function(data) {
		this.tests = [];
		var tests = JSON.parse(data);

		for (var i = 0; i < tests.length; ++i) {
			if (this.manifest.name === tests[i].calculation_test.request.function.app) {
				for (var j = 0; j < this.manifest.api.functions.length; ++j) {
					if (this.manifest.api.functions[j].name === tests[i].calculation_test.request.function.name) {
						// console.log('args: ' + JSON.stringify(tests[i].calculation_test.request.function.args));
						var args = [];
						for (var k = 0; k < tests[i].calculation_test.request.function.args.length; ++k) {
							args.push(tests[i].calculation_test.request.function.args[k]);
						}

						this.tests.push({
							type: tests[i].type,
							calculation_test: {
								description: tests[i].calculation_test.description,
								request: {
									type: tests[i].calculation_test.request.type,
									'function': {
										uid: this.manifest.api.functions[j].uid,
										args: args //tests[i].calculation_test.request.function.args
									}
								},
								expects: tests[i].calculation_test.expects
							}
						});



					}
				}
			}
		}
	});
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Public functions

function develop(path) {
	var filename = fpath.join(path, 'manifest.json');
	var testsFilename = fpath.join(path, 'test.json');
	console.log('develop');



	return initManifest(filename).then(function() {
		return initTests(testsFilename).then(function() {
			var cfg = {
				port: 3333
			};

			this.client = config.client;

			this.supervisor = new Supervisor({
				cfg: cfg,
				// client: this.client,
				manifest: this.manifest,
				tests: this.tests
			});

			return this.supervisor.listen(3333).bind(this).then(function(port) {
				console.log("Supervisor listening on port " + port + " for pid ");
			}).then(function() {
				runTests(path);
			})
		})
	})
};



function runTests(path) {
	console.log('runTests: ' + path);
	var filename = fpath.join(path, 'calc_provider.exe');
	fs.exists(filename, function(exists) {
		if (exists) {
			var args = [
				'localhost',
				'3333',
				'12345'
			];
			calcProvider.execFile(filename, args);
		} else {
			console.log('Calculation Provider file not present in : ' + path);
		}
	})


}



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Exports

exports.develop = develop;
exports.runTests = runTests;
// exports.publish = publish;
// exports.stage = stage;
// exports.submit = submit;