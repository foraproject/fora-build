(function () {
    co = require('co');
    thunkify = require('thunkify');
    path = require('path');

    var Job = require('./job'),
        Configuration = require('./configuration'),
        JobRunner = require('./jobrunner');

    Build = function(options) {
        this.configs = [];
        this.buildStartJobs = [];
        this.buildCompleteJobs = [];    
        this.dir = process.cwd();

        this.options = options || {};
        this.options.threads = this.options.threads || 4;
    }


    Build.prototype.configure = function(fn, root) {
        var configuration = new Configuration(root, this);    
        this.configs.push(configuration);        
        fn.call(configuration);
        return configuration;
    }


    Build.prototype.onBuildStart = function(fn, name, deps) {
        var job = new Job(fn, name, deps, this);
        this.buildStartJobs.push(job);
        return job;
    }


    Build.prototype.onBuildComplete = function(fn, name, deps) {
        var job = new Job(fn, name, deps, this);
        this.buildCompleteJobs.push(job);
        return job;
    }
    
    
    Build.prototype.start = function(monitor, cb) {
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
    
    Build.prototype.startMonitoring = function*() {
        var self = this;
        var fileChangeEvents = [];
        this.monitoring = true;
        
        var onFileChange = function(ev, filePath, watcher, job, config) {
            var matches = fileChangeEvents.filter(function(c) { return c.filePath === filePath });
            if (!matches.length)
                fileChangeEvents.push({ ev: ev, filePath: filePath, watcher: watcher, job: job, config: config });
        };
        
        this.configs.forEach(function(config) {
            process.chdir(config.root);

            config.watchJobs.forEach(function(job) {
                job.watchers = {};
            
                job.watchedFiles.forEach(function(filePath) {
                    var watcher = fs.watch(filePath, function(ev, filename) {
                        onFileChange(ev, filePath, watcher, job, config);
                    });
                    job.watchers[filePath] = watcher;
                });
                
                job.watchedDirs.forEach(function(dirPath) {
                    fs.watch(dirPath, function(ev, filename) {
                        filePath = path.join(dirPath, filename);
                        if (job.watchers[filePath]) {
                            onFileChange(ev, filePath, job.watchers[filePath], job, config);
                        } else {
                            //Check if we match any patterns. If yes, then add a new file watcher
                            if (job.patterns.filter(function(p) { return p.regex.test(filePath) }).length) {
                                var watcher = fs.watch(filePath, function(ev, filename) {
                                    onFileChange(ev, filePath, watcher, job, config);
                                });
                                job.watchers[filePath] = watcher;
                            }
                        }
                    });
                });
            });

            process.chdir(self.dir);
        });
        
            
        while(true) {
            while(fileChangeEvents.length) {
                var changeNotification = fileChangeEvents.shift();

                process.chdir(changeNotification.config.root);

                //The exists check is to handle the temp files that many editors create.
                //They disappear instantaneously, and fs.watch will except.
                if (fs.existsSync(changeNotification.filePath)) {

                    //If file watcher, kill (and later recreate) watching that file.
                    //So that it won't get into a loop if fn changes the same file
                    changeNotification.watcher.close();

                    yield changeNotification.job.fn.call(changeNotification.config, changeNotification.filePath, "change");
                    yield changeNotification.config.runQueuedJobs();
                        
                    //Put the watch back.
                    (function(changeNotification) {
                        var watcher = fs.watch(changeNotification.filePath, function(ev, filename) {
                            onFileChange(ev, changeNotification.filePath, watcher, changeNotification.job, changeNotification.config);
                        });
                    })(changeNotification);
                
                }
                process.chdir(this.dir);
            }                          
            yield sleep(1000);
        }          
    }
    
    module.exports = Build;
}());
