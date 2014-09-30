/* CalcWritter Module
 *
 * Author(s):  Daniel Bottomley <dbottomley@dotdecimal.com>
 * Date:       09/09/2014
 *
 * Copyright:  (c) 2014 .decimal, Inc. All rights reserved.
 */

 var fs = require('fs');
 var moment = require('moment');

 var curDate = new moment();
 curDateFile = curDate.format("YYYY-MM-DD HH_mm_ss");
 curDate = curDate.format("YYYY-MM-DD HH:mm:ss");
 var wstream = fs.createWriteStream('results_' + curDateFile + '.txt');

  module.exports.writeHeader = function(app){
  	wstream.write("#########################################################\n");
  	wstream.write("App Name: " + app + "\n");
  	wstream.write("Run Date: " + curDate + "\n");
  	wstream.write("#########################################################\n");
  };

  module.exports.writeFooter = function(app, passed, failed){
  	wstream.write("\nApp Name: " + app + "\t\t");
  	wstream.write("Total Tests: " + (passed + failed) + "\t\t");
  	wstream.write("Passed: " + passed + "\t\t");
  	wstream.write("Failed: " + failed + "\n");
  };

  module.exports.writeFunctionDetail = function(functionName, description){
  	wstream.write("\n---------------------------------------------------------\n");
  	wstream.write("Function Name: " + functionName + "\n");
  	wstream.write("Description: " + description + "\n");
  };

  module.exports.writeFailed = function(expectedValue, actualValue, type){
  	wstream.write("\tTest Result:  " + "Fail" + "\n");
  	wstream.write("\tObject Type:  " + type + "\n");
  	wstream.write("\tExpected: " + JSON.stringify(expectedValue) + "\n");
  	wstream.write("\tActual: " + JSON.stringify(actualValue) + "\n");
  };

  module.exports.writeFailedTolerance = function(expectedValue, actualValue, type, tolerance){
  	wstream.write("\tTest Result:  " + "Fail" + "\n");
  	wstream.write("\tObject Type:  " + type + "\n");
  	wstream.write("\tExpected: " + JSON.stringify(expectedValue) + "\n");
  	wstream.write("\tActual: " + JSON.stringify(actualValue) + "\n");
  	wstream.write("\tTolerance: " + JSON.stringify(tolerance) + "\n");
  };

  module.exports.writePassed = function(type){
  	wstream.write("\tTest Result:  " + "Pass" + "\n");
  	wstream.write("\tObject Type:  " + type + "\n");
  };

  module.exports.close = function() {
  	wstream.end();
  };

 // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 // Exports
 // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  module.exports.calcWritterStream = wstream;