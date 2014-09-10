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


var calcWritter2 = require('../modules/calcWritter');

function compareObject(expectedValue, actualValue) {
	console.log('compareObject');
	for (var prop in expectedValue) {
		console.log('Comparing: ' + prop);
		if (actualValue.hasOwnProperty(prop)) {
			if (typeof(expectedValue[prop]) == 'object') {
				if (!compareObject(expectedValue[prop], actualValue[prop])) {
					return false;
				}
			} else {
				if (expectedValue[prop] != actualValue[prop]) {
					console.log('Compare FAILED: ' + expectedValue[prop] + ' :: ' + actualValue[prop]);
					console.log('Values do not match'.red);
					return false;
				}
			}

		} else {
			console.log('Expected results does not have property'.red);
			return false;
		}
	}
	return true;
}

function compareValue(expectedValue, actualValue) {
	if (expectedValue === actualValue) {
		calcWritter2.writePassed("Value");
		return true;
	} else {
		calcWritter2.writeFailed(expectedValue, actualValue, "Value");
		return false;
	}
}

function compareProperty(propName, expectedValue, actualValue, tolerance) {
	console.log('compareProperty: ' + propName);
	var props = propName.split('.');

	for (var i = 0; i < props.length; ++i) {
		if (actualValue.hasOwnProperty(props[i])) {
			if (Object.prototype.toString.call(actualValue[props[i]]) === '[object Array]') {
				actualValue = actualValue[props[i]][props[++i]];
			} else {
				actualValue = actualValue[props[i]];
			}
		} else {
			console.log('Property not found in results'.red);
			calcWritter2.writeFailed(expectedValue, actualValue, "Property");
			return false;
		}
	}

	if (typeof(expectedValue) == 'object') {
		return compareObject(expectedValue, actualValue);
	} else {
		if (typeof(expectedValue) == 'number') {
			if (Math.abs(expectedValue - actualValue) <= tolerance) {
				calcWritter2.writePassed("Property");
				return true;
			} else {
				console.log('Property Compare FAILED: ' + expectedValue + ' :: ' + actualValue);
			calcWritter2.writeFailed(expectedValue, actualValue, "Property");
				return false;
			}
		} else {
			if (expectedValue == actualValue) {
				calcWritter2.writePassed("Property");
				return true;
			} else {
				calcWritter2.writeFailed(expectedValue, actualValue, "Property");
				console.log('Property Compare FAILED: ' + expectedValue + ' :: ' + actualValue);
				return false;
			}
		}
	}
}

function testCompare() {
	var ss = {
		structures: [{
			name: 'PTV',
			desc: 'the ptv'
		}, {
			name: 'CTV',
			desc: 'the ctv'
		}]
	};

	console.log('type: ' + Object.prototype.toString.call(ss.structures));

	var str = 'structures.0.name';
	var props = str.split('.');

	for (var i = 0; i < props.length; ++i) {
		if (ss.hasOwnProperty(props[i])) {
			if (Object.prototype.toString.call(ss[props[i]]) === '[object Array]') {
				ss = ss[props[i]][props[++i]];
			} else {
				ss = ss[props[i]];
			}
		} else {
			console.log('Property not found in results: '.red + props[i]);
			return false;
		}
	}
	return true;
}

function compare(compareType, expectedValue, actualValue, propName, tolerance) {

	if (compareType === 'object') {
		if (compareObject(expectedValue, actualValue)) {
			calcWritter2.writePassed("Object");
			return true;
		} else {
			calcWritter2.writeFailed(expectedValue, actualValue, "Object");
			return false;
		}
	} else if (compareType === 'value') {
		return compareValue(expectedValue, actualValue);
	} else if (compareType === 'property') {
		return compareProperty(propName, expectedValue, actualValue, tolerance);
	} else {
		console.log('Compare type for results not defined!!'.red);
		return false;
	}
}

 // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 // Exports

exports.compare = compare;