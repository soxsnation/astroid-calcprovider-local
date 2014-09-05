/** 
 * Astroid SDK Utilities
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

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Errors

function SdkError(code, message) {
    this.code = code;
    this.message = message;
    this.name = "SdkError";
    Error.captureStackTrace(this, SdkError);
}
SdkError.prototype = Object.create(Error.prototype);
SdkError.prototype.constructor = SdkError;
exports.SdkError = SdkError;

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Utilities

exports.handler = function (req, res) {
    return function (e) {
        if (typeof e.code === 'number') {
            if (typeof e.message === 'string') {
                res.send(e.code, e.message);
            } else {
                res.send(e.code);
            }
        } else {
            console.log("Unhandled error");
            console.log(e.stack);
            res.send(500);
        }
    }
};

exports.parseBody = function (req, callback) {
    return new Promise(function (resolve, reject) {
        var buffers = [];
        var length = 0;
        req.on('data', function (data) {
            buffers.push(data);
            length += data.length;
        });
        req.on('error', function (e) {
            reject(e);
        });
        req.on('end', function (data) {
            var obj;
            try {
                obj = JSON.parse(Buffer.concat(buffers, length));
            } catch (e) {
                return reject(e);
            }
            resolve(obj);
        });
    }).nodeify(callback);
};