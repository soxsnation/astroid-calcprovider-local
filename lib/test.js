/** 
 * Astroid SDK Test Runner
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
var colors = require('colors');
var equal = require('deep-equal');
var fs = require('fs');
var fpath = require('path');
var os = require('os');
var stringify = require('json-stable-stringify');
var vm = require('vm');

var Client = require('./client');
var Supervisor = require('./supervisor');

// var config = require('./config');
var solution = require('./solution');
var utils = require('./utils');


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Promisified functions

var readDir = Promise.promisify(fs.readdir);
var readFile = Promise.promisify(fs.readFile);
var stat = Promise.promisify(fs.stat);
var writeFile = Promise.promisify(fs.writeFile);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Application

function App() {
    this.name = null;
    this.tests = [];
    this.define = {
        calculation: {
            test: defineCalculationTest.bind(this)
        }
    }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Named function

function namedFunction(app) {
    return function () {
        var request = {
            type: 'function',
            function: {}
        };
        var fcn = request.function;
        switch (arguments.length) {
            case 2: {
                if (!app.name) {
                    throw new Error('Expected app name to be previously defined');
                } else if (!Array.isArray(arguments[1])) {
                    throw new Error('Expected arguments to be an array');
                }
                fcn.app = app.name;
                fcn.name = arguments[0];
                fcn.args = arguments[1];
                break;
            }
            case 3: {
                if (!Array.isArray(arguments[2])) {
                    throw new Error('Expected arguments to be an array');
                }
                fcn.app = arguments[0];
                fcn.name = arguments[1];
                fcn.args = arguments[2];
                break;
            }
            default: {
                throw new Error('Expected 2 or 3 arguments for named function, got ' + arguments.length);
            }
        }
        var args = fcn.args;
        for (var i = 0; i < args.length; ++i) {
            if (typeof args[i].type === 'undefined') {
                args[i] = {
                    type: 'value',
                    value: args[i]
                };
            }
        }
        return request;
    }
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Expected types

function error(code) {
    return {
        type: 'error',
        error: code || null
    };
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Context

function Context() {
    var app = new App();
    return {
        app: app,
        console: {
            log: console.log
        },
        fcn: namedFunction(app),
        error: error
    }
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Generate

function generate(input, output) {
    return readDir(input).bind({}).filter(function (item) {
        return fpath.extname(item) === '.js';
    }).reduce(function (context, filename) {
        return readFile(fpath.join(input, filename)).then(function (script) {
            vm.runInContext(script, context, filename);
            return context;
        });
    }, vm.createContext(new Context())).then(function (context) {
        this.context = context;
        return writeFile(output, JSON.stringify(context.app.tests, null, 2));
    }).then(function () {
        return this.context.app.tests;
    });
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Run

function wait(client, uid, retries) {
    if (!retries) {
        retries = 0;
    }
    return client.get('get_calculation_status', {
        uid: uid
    }, {
        status: 'completed',
        timeout: 180
    }).spread(function (status, meta) {
        if (status.type === 'completed' || status.type === 'failed') {
            return status;
        } else {
            return wait(client, uid, retries + 1);
        }
    });
};

function calculate(item, callback) {
    var request = item.calculation_test.request;
    this.proxy.requestCalculation(request).bind({
        client: this.client,
        self: this
    }).then(function (uid) {
        this.uid = uid;
        return wait(this.client, uid);
    }).then(function (status) {
        if (status.type === 'completed') {
            return this.client.get('get_calculation_result', {
                uid: this.uid
            }).spread(function (result, meta) {
                console.log(item.calculation_test.expects.result);
                if (item.calculation_test.expects.type === 'result') {
                    callback(null, {
                        passed: equal(result, item.calculation_test.expects.result),
                        result: result
                    });
                } else {
                    callback(null, {
                        passed: false,
                        result: result
                    });
                }
            });
        } else {
            if (item.calculation_test.expects.type === 'error') {
                callback(null, {
                    passed: status.error.code === item.calculation_test.expects.error,
                    error: status.error.code
                });
            } else {
                callback(null, {
                    passed: false,
                    error: status.error.code
                });
            }
        }
    });
};

function run(path) {
    var manifest_filename = fpath.join(path, 'manifest.json');
    var filename = fpath.join(path, 'tests.json');
    return solution.develop(path).then(function () {
        return readFile(filename)
    }).then(function (data) {
        return JSON.parse(data);
    }, function (err) {
        return generate(fpath.join(path, 'test'), filename);
    }).then(function (tests) {
        var self = this;
        this.tests = tests;
        var queue = async.queue(calculate.bind(this), 1);
        return new Promise(function (resolve, reject) {
            queue.drain = function () {
                resolve();
            };
            queue.push(tests, function (err, result) {
                console.log("done");
                console.log(err);
                console.log(result);
            });
        });
    }).then(function (results) {
        console.log("drained");
    }); 
}




// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Exports

exports.generate = generate;
exports.run = run;