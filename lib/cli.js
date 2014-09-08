#!/usr/bin/env node

/** 
 * Astroid SDK Command Line Interface
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
var nomnom = require("nomnom");
var read = require('read');

var Client = require('./client');

// var config = require('./config');
// var filesystem = require('./filesystem');
// var genman = require('./genman');
var solution = require('./solution');
var test = require('./test');


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Promisified functions

var readcli = Promise.promisify(read);


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Develop

nomnom.command('develop').options({
    path: {
        position: 1,
        default: './',
        help: 'Path containing manifest and application.'
    }
}).help('Starts a local app development server.').callback(function (args) {
    console.log();
    solution.develop(args.path).catch(function (e) {
        console.log('\n' + e.message.red);
    }).done();

});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Reset

nomnom.command('reset').options({
}).help('Reset all configuration options to their defaults.').callback(function (args) {
    return readcli({
        prompt: 'This will reset all settings to their defaults, are you sure?',
        default: 'no'
    }).spread(function (res, isDefault) {
        res = res.toLowerCase();
        if (res === 'yes' || res === 'y') {
            return config.reset();
        }
    }).then(function () {
        console.log('\n' + 'Reset Successful'.green);
    }).catch(function (e) {
        console.log('\n' + e.message.red);
    });
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Test

nomnom.command('test').options({
    path: {
        position: 1,
        default: './',
        help: 'Path containing manifest and application.'
    }
}).help('Runs the test scripts provided by a solution.').callback(function (args) {
    console.log();
    test.run(args.path).catch(function (e) {
        console.log('\n' + e.message.red);
    }).done();
});




// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Parse

var help = "astroid <command> -h     quick help on <command>\n";
nomnom.script("astroid").help(help).parse();