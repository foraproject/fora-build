co = require('co');
thunkify = require('thunkify');
fs = require('fs');

spawn = require('child_process').spawn;
_exec = require('child_process').exec
exec = thunkify(function(cmd, cb) {
    _exec(cmd, function(err, stdout, stderr) {
        console.log(cmd);
        cb(err, stdout.substring(0, stdout.length - 1));
    });
});

react = require('react-tools');

module.exports = function(config) {
    /*
        Called when the build starts.
        Let's create an app directory
    */
    config.onStart(function*() {
        console.log("Creating app directory...");
        yield exec("rm app -rf");
        yield exec("mkdir app");
        console.log("done");
    });


    /*
        Print the file name in the console.
    */
    config.files(["*.txt"], function*(filePath) {
        console.log(filePath);
    });
}

