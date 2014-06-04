(function () {
    "use strict";
    
    var co = require('co'),
        thunkify = require('thunkify'),
        fs = require('fs'),
        path = require('path');

    var Job = require('./job'),
        Configuration = require('./configuration'),
        JobRunner = require('./jobrunner'),
        JobQueue = require('./jobqueue');

    var Build = function(options) {
        JobQueue.call(this, process.cwd(), this);        
        
        this.configs = [];
        this.state = {};

        this.options = options || {};
        this.options.threads = this.options.threads || 4;
    }

    Build.prototype = Object.create(JobQueue.prototype);
    Build.prototype.constructor = Build;


    Build.prototype.configure = function(fn, root) {
        var configuration = new Configuration(root, this);    
        this.configs.push(configuration);        
        fn.call(configuration);
        return configuration;
    }
    
    
    Build.prototype.start = function(monitor, cb) {
        var self = this;
        
        self.jobQueue = [];
        self.monitor = monitor;

        co(function*() {
            var options = { threads: self.options.threads };        
        
            self.activeJobs.push(
                new Job(function*() {
                    for (var i = 0; i < self.configs.length; i++) {
                        self.configs[i].state = {};
                        yield self.configs[i].runJobs();           
                    }    
                })
            );

            yield self.runJobs();
            
            if (cb) cb();

            if (monitor)
                yield self.startMonitoring();
                        
        })();
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
            var matches = fileChangeEvents.filter(function(c) { return c.filePath === filePath && c.config === config });
            if (!matches.length)
                fileChangeEvents.push({ ev: ev, filePath: filePath, watcher: watcher, job: job, config: config });
        };

        this.configs.forEach(function(config) {
            process.chdir(config.root);
            config.startMonitoring(onFileChange);
            process.chdir(self.root);
        });
       
        while(true) {
            while(fileChangeEvents.length) {
                var changeNotification = fileChangeEvents[0];

                process.chdir(changeNotification.config.root);

                //The exists check is to handle the temp files that many editors create.
                //They disappear instantaneously, and fs.watch will except.
                if (fs.existsSync(changeNotification.filePath)) {

                    //If file watcher, kill (and later recreate) watching that file.
                    //So that it won't get into a loop if fn changes the same file
                    changeNotification.watcher.close();

                    yield changeNotification.job.fn.call(changeNotification.config, changeNotification.filePath, "change");
                    
                    //Remove the event. We have processed it.
                    fileChangeEvents.shift();

                    //Put the watch back.
                    (function(changeNotification) {
                        var watcher = fs.watch(changeNotification.filePath, function(ev, filename) {
                            onFileChange(ev, changeNotification.filePath, watcher, changeNotification.job, changeNotification.config);
                        });
                    })(changeNotification);
                
                }
                process.chdir(this.root);
            }

            for (var i = 0; i < self.configs.length; i++) {
                if (self.configs[i].queuedJobs.length)
                    yield self.configs[i].runQueuedJobs();
            }            
            
            if (this.queuedJobs.length)
                yield this.runQueuedJobs();
                        
            yield sleep(1000);
        }          
    }
    
    module.exports = Build;
}());
