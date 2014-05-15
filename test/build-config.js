co = require('co');
thunkify = require('thunkify');
fs = require('fs');
path = require('path');

spawn = require('child_process').spawn;
_exec = require('child_process').exec;
exec = thunkify(function(cmd, cb) {
    _exec(cmd, function(err, stdout, stderr) {
        console.log(cmd);
        cb(err, stdout.substring(0, stdout.length - 1));
    });
});

module.exports = function(config) {
    config.job(function*() {
        console.log("Restarting the fake server .... done");
    }, "server_restart");


    ensureDirExists = function*(file) {
        var dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
            yield exec("mkdir " + dir + " -p");
        } 
    }

    /*
        Called when the build starts.
        Let's create an app directory
    */
    config.onBuildStart(function*() {
        console.log("Creating app directory");
        yield exec("rm app -rf");
        yield exec("mkdir app");
    }, "on_start");


    /*
        Copies the file to the app directory.
    */
    config.watch(["*.txt"], function*(filePath) {
        var dest = filePath.replace(/^src\//, 'app/');
        yield ensureDirExists(dest);
        yield exec("cp " + filePath + " " + dest);
    }, "copy_text_files");
    

    /*
        Copies the file to the app directory.
    */
    config.watch(["*.html"], function*(filePath) {
        console.log(filePath);
        this.queue("server_restart");
    }, "print_html_file", ["copy_text_files"]);    
}

