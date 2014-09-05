/** 
 * Astroid SDK Configuration
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

var fs = require('fs');
var fpath = require('path');
var sqlite3 = require('sqlite3');
var uuid = require('node-uuid');

var utils = require('./utils');


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Private variables

var dir = fpath.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.astroid');
var filename = fpath.join(dir, 'astroid.db');


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Database

var db = new sqlite3.Database(filename);
var dball = Promise.promisify(db.all, db);
var dbget = Promise.promisify(db.get, db);
var dbrun = Promise.promisify(db.run, db);


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Defaults

var defaults = {
    framework_version: 'dev',
    hostname: 'astroid.dotdecimal.com',
    port: 3333,
    proxy_host: 'localhost',
    proxy_port: 3333,
    ipc_port: 17230,
    ipc_pid: '058b97440a',
    stage: {}
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Validators

function isInteger(n) {
    return n === +n && n === (n | 0);
}

// function validateHostname(name) {
//     return function (value) {
//         if (!/^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]))*$/.test(value)) {
//             throw new utils.SdkError(400, 'Invalid ' + name + ', value must conform to RFC 1123 specifications');
//         }
//         return value;
//     }
// }

function validateInt(name) {
    return function (value) {
        switch (typeof value) {
            case 'string': {
                value = parseInt(value);
            }
            case 'number': {
                if (!Number.isNaN(value) && isInteger(value)) {
                    break;
                }                
            }
            default: {
                throw new utils.SdkError(400, 'Invalid ' + name + ', value must be an integer');
            }
        }
        return value;
    }
}

var validators = {
    // hostname: validateHostname('hostname'),
    // port: validateInt('port'),
    // proxy_hostname: validateHostname('hostname'),
    // proxy_port: validateInt('proxy port'),
    // ipc_port: validateInt('ipc port')
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Initialization

// var impl = Promise.bind({
//     dball: dball,
//     dbget: dbget,
//     dbrun: dbrun,
//     defaults: defaults
// }).then(function () {
//     var q = "SELECT name FROM sqlite_master WHERE type='table' AND name='settings';";
//     return dbget(q).then(function (row) {
//         if (typeof row === 'undefined') {
//             var q = 'CREATE TABLE settings (';
//             q += ' key TEXT NOT NULL PRIMARY KEY,';
//             q += ' value TEXT NOT NULL);';
//             return dbrun(q);
//         }
//     });
// }).then(function () {
//     var q = "SELECT name FROM sqlite_master WHERE type='table' AND name='functions';";
//     return dbget(q).then(function (row) {
//         if (typeof row === 'undefined') {
//             var q = 'CREATE TABLE functions (';
//             q += ' app TEXT NOT NULL,';
//             q += ' uid TEXT NOT NULL,'
//             q += ' dev TEXT NOT NULL,'
//             q += ' PRIMARY KEY (app, uid));';
//             return dbrun(q);
//         }
//     });
// });


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Public functions

function get(key) {
    if (typeof key === 'string') {
        return impl.then(function () {
            var q = "SELECT value FROM settings WHERE key = ?";
            return this.dbget(q, key);
        }).then(function (row) {
            if (typeof row === 'undefined') {
                if (this.defaults.hasOwnProperty(key)) {
                    return set(key, this.defaults[key]);
                } else {
                    return undefined;
                }
            } else {
                return JSON.parse(row.value);
            }
        });        
    } else {
        return impl.then(function () {
            var q = "SELECT key, value FROM settings";
            return this.dball(q, key);
        }).then(function (rows) {
            var cfg = JSON.parse(JSON.stringify(this.defaults));
            for (var i = 0; i < rows.length; ++i) {
                cfg[rows[i].key] = JSON.parse(rows[i].value);
            }
            return cfg;
        });
    }
};

function inspect(app, uid) {
    return impl.then(function () {
        var q = "SELECT dev FROM functions WHERE app = ? AND uid = ?;";
        return this.dbget(q, [app, uid]);
    }).then(function (row) {
        if (typeof row === 'undefined') {
            var dev = uuid.v4();
            var q = "INSERT OR REPLACE INTO functions VALUES (?, ?, ?)";
            return this.dbrun(q, [app, uid, dev]).then(function () {
                return dev;
            });
        } else {
            return row.dev;
        }
    });
}

function reset() {
    var promises = [];
    for (var key in defaults) {
        promises.push(set(key, defaults[key]));
    }
    return Promise.all(promises);
};

function set(key, value) {
    return impl.then(function () {
        if (validators.hasOwnProperty(key)) {
            value = validators[key](value);
        }
        var q = "INSERT OR REPLACE INTO settings VALUES (?, ?)";
        return this.dbrun(q, [key, JSON.stringify(value)]);
    }).then(function () {
        return value;
    });
};

function touch(app, uid) {
    return impl.then(function () {
        var dev = uuid.v4();
        var q = "INSERT OR REPLACE INTO functions VALUES (?, ?, ?)";
        return this.dbrun(q, [app, uid, dev]).then(function () {
            return dev;
        });
    });
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Exports

exports.get = get;
exports.inspect = inspect;
exports.reset = reset;
exports.set = set;
exports.touch = touch;
