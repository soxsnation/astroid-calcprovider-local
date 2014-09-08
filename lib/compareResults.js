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





function compareObject(value1, value2) {
console.log('compareObject');
	for (var prop in value1) {
		if (value2.hasOwnProperty(prop)) {
			if (typeof(value1[prop]) == 'object') {
				compareObject(value1[prop], value2[prop]);
			} else {
				console.log('Comparing: ' + value1[prop] + ' :: ' + value2[prop]);
				if (value1[prop] != value2[prop]) {
					return false;
				}
			}

		} else {
			return false;
		}
	}
	return true;
}



function compare(compareType, value1, value2) {

	if (compareType === 'object') {
		return compareObject(value1, value2);
	}
	else if (compareType === 'value') {
		return (value1 === value2);
	}
	else {
		console.log('Compare type for results not defined!!'.red);
		return false;
	}
}


exports.compare = compare;