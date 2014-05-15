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
    A very simple test script.
*/
describe('build.run()', function() {
    describe('when executed', function(){
        it('should run all configurations without throwing an exception', function(done){
            var buildConfig = function(config) {
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
                    Copies all text files into the app directory.
                */
                config.watch(["*.txt"], function*(filePath) {
                    var dest = filePath.replace(/^src\//, 'app/');
                    yield ensureDirExists(dest);
                    yield exec("cp " + filePath + " " + dest);
                }, "copy_text_files");
                

                /*
                    Once all text files are copied, we merge it into one big html file.
                    Once we finish merging, let's queue a job called "fake_server_restart" (defined further below).
                */
                config.watch(["*.html"], function*(filePath) {
                    console.log(filePath);
                    this.queue("fake_server_restart");
                }, "print_html_file", ["copy_text_files"]);    
                

                /*
                    A fake server restart. Just says it did it.        
                */    
                config.job(function*() {
                    console.log("Restarting the fake server .... done");
                }, "fake_server_restart");

            }
        
            build = require('..').create({ threads: 4 });            
            build.configure(buildConfig, 'data'); //data is the directory where the files are
            build.start(true, done); //true indicates that the build should keep monitoring files.
        });
    });

});
