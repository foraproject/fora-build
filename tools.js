thunkify = require('thunkify');

_spawn = require('child_process').spawn;
spawn = function(options) {
    return function(proc, args) {
        script = _spawn(proc, args);
        if (options.log) {
            script.stdout.on('data', function (data) {
              options.log(data.toString());
            });
        }
        return script;
    }
}

_exec = require('child_process').exec
exec = function(options) {
    return thunkify(function(cmd, cb) {
        if (options.log)
            options.log(cmd);
        _exec(cmd, function(err, stdout, stderr) {
            cb(err, stdout.substring(0, stdout.length - 1));
        });
    });
}

fs = require('fs');
ensureDirExists = function(options) {
    return function*(file) {
        var dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
            yield exec("mkdir -p " + dir);
        } 
    }
}

module.exports = {
    fs: {
       ensureDirExists: ensureDirExists 
    },
    process: {
        exec: exec,
        spawn: spawn
    }
}

