# fora-build

fora-build is a very simple build module for node.js (using ES6 generators). It encourages you to use stuff you already
know like bash commands and built-in node functions to get stuff done. There will be no configuration based stuff going
on like gruntjs.

Why the weird name? Because it is being developed as part of the Fora Project (http://github.com/jeswin/fora).

## HOWTO

There are essentially three steps

1. npm install 'fora-build'
2. Write a build.js file
3. node --harmony build.js
    
### The build.js file

This example should help you get started. This is the same code that runs in the test/ directory.

```javascript
    /*
        Some external libs and functions we'll use in our build script
    */
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

    /*
        Configuration Section.
    */
    buildConfig = function(config) {
        /*
            The first task to run when the build starts.
            Let's call it "start_build". It just prints a message.
            
            Note: name (ie "start_build") isn't stricly required, 
            but it allows us to declare it as a dependency in another job.
        */
        config.onBuildStart(function*() {
            console.log("Let's start copying files...");
        }, "start_build");


        /*
            Let's create an app directory.
            We add "start_build" as a dependency, so that it runs after the message.
        */
        config.onBuildStart(function*() {
            console.log("Creating app directory");
            yield exec("rm app -rf");
            yield exec("mkdir app");
        }, "create_dirs", ["start_build"]);


        /*
            A helper function to create directories which may not exist.
            We are going to use this in tasks below.
        */
        ensureDirExists = function*(file) {
            var dir = path.dirname(file);
            if (!fs.existsSync(dir)) {
                yield exec("mkdir " + dir + " -p");
            } 
        }


        /*
            Copies all text and html files into the app directory.
            You can write as many config.watch() methods as you want.            
        */
        config.watch(["*.txt", "*.html"], function*(filePath) {
            var dest = filePath.replace(/^src\//, 'app/');
            yield ensureDirExists(dest);
            yield exec("cp " + filePath + " " + dest);
            this.queue("merge_txt_files");
            this.queue("fake_server_restart");
        }, "copy_files");
        

        /*
            A job to merge txt files and create wisdom.data
        */    
        config.job(function*() {
            yield exec("cat app/somefile.txt app/anotherfile.txt > app/wisdom.data");
        }, "merge_txt_files");
        

        /*
            A fake server restart. Just says it did it.        
        */    
        config.job(function*() {
            console.log("Restarting the fake server .... done");
        }, "fake_server_restart");

    }

    build = require('fora-build').create({ threads: 4 }); //That's right. Things get done in parallel.    
    build.configure(buildConfig, 'data'); //data is the directory where your files are.
    build.start(true, function() { console.log("Build is done. But we're still monintoring."); }); //build.start(true, cb) to keep monitoring

```


