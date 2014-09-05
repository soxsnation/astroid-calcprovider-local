/** 
 * Astroid SDK Client
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

var events = require('events');
var http = require('http');
var request = require('request');
var util = require('util');
var zlib = require('zlib');


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Promisified functions

var get = Promise.promisify(request.get);
var post = Promise.promisify(request.post);
var put = Promise.promisify(request.put);

var gunzip = Promise.promisify(zlib.gunzip);


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Private functions

function parseMeta(headers) {
    return {
        revision: headers['astroid-revision']
    };
}

function parseJsonResponse(res, obj) {
    if (res.statusCode !== 200) {
        throw new ClientError(res.statusCode, res.body.toString());
    }
    var meta = parseMeta(res.headers);
    return [obj, meta];
}

function parseRawResponse(res, body) {
    if (res.statusCode !== 200) {
        throw new ClientError(res.statusCode, res.body.toString());
    }
    var meta = parseMeta(res.headers);
    var encoding = res.headers['content-encoding'];
    if (encoding && encoding.indexOf('gzip') >= 0) {
        return gunzip(body).then(function (str) {
            var obj = JSON.parse(str);
            return [obj, meta];
        });
    } else {
        var obj = JSON.parse(body);
        return [obj, meta];
    }
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Client Error

function ClientError(code, message) {
    this.code = code;
    this.message = message;
    this.name = "ClientError";
    Error.captureStackTrace(this, ClientError);
}
ClientError.prototype = Object.create(Error.prototype);
ClientError.prototype.constructor = ClientError;


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Client

function Client(options) {
    events.EventEmitter.call(this);

    // Public properties
    this.hostname = options.hostname;
    this.port = options.port || 80;
    this.domain = 'http://' + this.hostname;
    if (this.port !== 80) {
        this.domain += ':' + this.port;
    }
    this.loc = null;

    // Cookies
    this.jar = request.jar();
    if (typeof options.uid === 'string' && typeof options.sid === 'string') {
        this.jar.setCookie('uid=' + options.uid, this.domain);
        this.jar.setCookie('sid=' + options.sid, this.domain);
    }
    if (typeof options.cookies === 'string') {
        var cookies = options.cookies.split(';');
        for (var i = 0; i < cookies.length; ++i) {
            this.jar.setCookie(cookies[i].trim(), this.domain);
        }
    }
}
util.inherits(Client, events.EventEmitter);

Client.prototype.get = function (route, params, query) {
    var url;
    try {
        url = this.url(route, params, query);
    } catch (e) {
        return Promise.reject(e);
    }
    return get({
        url: url,
        encoding: null,
        headers: {
            'Accept-Encoding': 'gzip'
        },
        jar: this.jar
    }).spread(parseRawResponse);
};

Client.prototype.locate = function (organization, realm, app, version) {
    if (arguments.length === 1 && typeof arguments[0] === 'object') {
        var params = arguments[0];
        organization = params.organization;
        realm = params.realm;
        app = params.app;
        version = params.version;
    } else if (arguments.length !== 4) {
        return Promise.reject(new ClientError(400, "Missing arguments to Client.locate"));
    }
    if (typeof organization !== 'string' || typeof realm !== 'string' ||
        typeof app !== 'string' || typeof version !== 'string') {
        return Promise.reject(new ClientError(400, "Invalid arguments to Client.locate"));
    }
    var root = 'http://' + this.hostname;
    if (this.port !== 80) {
        root += ':' + this.port;
    }
    return get({
        url: [root, 'loc', organization, realm, app, version].join('/'),
        jar: this.jar
    }).bind(this).spread(function (res, body) {
        return this.loc = JSON.parse(body);
    });
};

Client.prototype.login = function (username, password) {
    if (arguments.length === 1 && typeof arguments[0] === 'object') {
        var params = arguments[0];
        username = params.username;
        password = params.password;
    } else if (arguments.length !== 2) {
        return Promise.reject(new ClientError(400, "Missing arguments to Client.login"));
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
        return Promise.reject(new ClientError(400, "Invalid username or password"));
    }
    return get({
        url: this.loc.login,
        jar: this.jar,
        auth: {
            user: username,
            pass: password
        }
    }).bind(this).spread(function (res, body) {
        if (res.statusCode !== 200) {
            throw new ClientError(res.statusCode, body.toString());
        }
        this.cookies = this.jar.getCookieString(this.domain);
        return this.get('get_session');
    }).spread(function (session, meta) {
        this.session = session;
    });
};

Client.prototype.post = function (route, params, body) {
    if (arguments.length === 2) {
        body = params;
        params = null;
    } else if (arguments.length !== 3) {
        return Promise.reject(new ClientError(400, "Invalid parameters to Client.put"));
    }
    var url;
    try {
        url = this.url(route, params);
    } catch (e) {
        return Promise.reject(e);
    }
    var options = {
        url: url,
        jar: this.jar
    }
    if (typeof body === 'boolean') {
        options.json = true;
        options.body = JSON.stringify(body);
    } else {
        options.json = body;
    }
    return post(options).spread(parseJsonResponse);
};

Client.prototype.put = function (route, params, body) {
    if (arguments.length === 2) {
        body = params;
        params = null;
    } else if (arguments.length !== 3) {
        return Promise.reject(new ClientError(400, "Invalid parameters to Client.put"));
    }
    var url;
    try {
        url = this.url(route, params);
    } catch (e) {
        return Promise.reject(e);
    }
    var options = {
        url: url,
        jar: this.jar
    }
    if (typeof body === 'boolean') {
        options.json = true;
        options.body = JSON.stringify(body);
    } else {
        options.json = body;
    }
    return put(options).spread(parseJsonResponse);
};

Client.prototype.url = function (route, params, query) {
    if (!this.loc) {
        throw new ClientError(400, "Invalid or missing locator object");
    }
    var url = this.loc[route];
    for (var p in params) {
        if (params.hasOwnProperty(p)) {
            url = url.replace(':' + p, params[p]);
        }
    }
    var queries = [];
    for (var p in query) {
        if (query.hasOwnProperty(p)) {
            queries.push(p + '=' + query[p].toString());
        }
    }
    if (queries.length > 0) {
        url += "?" + queries.join('&');
    }
    return url;
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Exports

module.exports = Client;