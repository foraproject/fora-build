(function () {
    co = require('co');
    thunkify = require('thunkify');

    var Job = require('./job'),
        Configuration = require('./configuration'),
        JobRunner = require('./jobrunner');

    BuildInstance = function(options) {
        this.configs = [];
        this.buildStartJobs = [];
        this.buildCompleteJobs = [];    
        this.dir = process.cwd();

        this.options = options || {};
        this.options.threads = this.options.threads || 4;
    }


    BuildInstance.prototype.configure = function(fn, root) {
        var configuration = new Configuration(root, this);    
        this.configs.push(configuration);        
        fn.call(configuration);
        return configuration;
    }


    BuildInstance.prototype.onBuildStart = function(fn, name, deps) {
        var job = new Job(fn, name, deps, this);
        this.buildStartJobs.push(job);
        return job;
    }


    BuildInstance.prototype.onBuildComplete = function(fn, name, deps) {
        var job = new Job(fn, name, deps, this);
        this.buildCompleteJobs.push(job);
        return job;
    }
    
    
    BuildInstance.prototype.start = function(monitor, cb) {
        this.state = {};
        this.jobQueue = [];
        this.monitor = monitor;
        
        co(function*() {
            var options = { threads: this.options.threads };        
        
            var startRunner = new JobRunner(this.buildStartJobs, options);
            yield startRunner.run();

            for (i = 0; i < this.configs.length; i++) {
                yield this.configs[i].startBuild();
            } 
            
            var completionRunner = new JobRunner(this.buildCompleteJobs, options);
            yield completionRunner.run();
            
            if (cb) cb();

            if (monitor)
                yield this.startMonitoring();
                        
        }).call(this);
    }


    var sleep = function(ms) {
        return function (cb) {
            setTimeout(cb, ms);
        };
    }
    
    BuildInstance.prototype.startMonitoring = function*() {
        var self = this;
        var fileChangeEvents = [];
        this.monitoring = true;
        
        var onFileChange = function(ev, job, filename, watcher, config) {
            var matches = fileChangeEvents.filter(function(c) { return c.filename === filename && c.ev === ev; });
            if (!matches.length)
                fileChangeEvents.push({ ev: ev, job: job, filename: filename, watcher: watcher, config: config });
        };               
        
        this.configs.forEach(function(config) {
            process.chdir(config.root);

            config.watchJobs.forEach(function(j) {
                j.watchedFiles.forEach(function(f) {
                    var watcher = fs.watch(f, function(ev, filename) {
                        onFileChange(ev, j, f, watcher, config);
                    });
                });
            });

            process.chdir(self.dir);
        });
        
            
        while(true) {
            while(fileChangeEvents.length) {
                var funcInfo = fileChangeEvents.shift();
                
                //Kill (and later recreate) watching that file.
                //So that it won't get into a loop if fn changes the same file
                funcInfo.watcher.close();
                    
                process.chdir(funcInfo.config.root);

                yield funcInfo.job.fn.call(funcInfo.config, funcInfo.filename, "change");
                yield funcInfo.config.runQueuedJobs();
                    
                //Put the watch back.
                (function(funcInfo) {
                    //The exists check is to handle the temp files that many editors create.
                    //They disappear instantaneously, and fs.watch will except.
                    if (fs.existsSync(funcInfo.filename)) {
                        var watcher = fs.watch(funcInfo.filename, function(ev, filename) {
                            onFileChange(ev, funcInfo.job, funcInfo.filename, watcher, funcInfo.config);
                        });
                    }
                })(funcInfo);

                process.chdir(this.dir);
            }                          
            yield sleep(1000);
        }          
    }
    
    
    
    module.exports = {
        create: function(options) {
            return new BuildInstance(options);
        }
    }
}());
