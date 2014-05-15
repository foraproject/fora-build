(function () {
    "use strict";
    
    var Job = require('./job'),
        Watch = require('./watch'),
        JobRunner = require('./jobrunner');

    var Configuration = function(root, build) {
        this.root = root;
        this.build = build;

        this.jobs = [];
        this.buildStartJobs = [];
        this.buildCompleteJobs = [];
        this.watchJobs = [];
        this.queuedJobs = [];
    }

    Configuration.prototype.job = function(fn, name, deps) {        
        var job = new Job(fn, name, deps, this, {});
        this.jobs.push(job);
        return job;
    }


    Configuration.prototype.onBuildStart = function(fn, name, deps) {        
        var job = new Job(fn, name, deps, this, {});
        this.buildStartJobs.push(job);
        return job;
    }


    Configuration.prototype.onBuildComplete = function(fn, name, deps) {
        var job = new Job(fn, name, deps, this, {});
        this.buildCompleteJobs.push(job);
        return job;
    }


    Configuration.prototype.watch = function(patterns, fn, name, deps) {
        var job = new Watch(patterns, fn, name, deps, this, {});
        this.watchJobs.push(job);
        return job;
    }
    
    
    Configuration.prototype.queue = function(fn) {
        var matches = this.queuedJobs.filter(function(f) {
            return f.fn === fn;
        });
        if (!matches.length)
            this.queuedJobs.push({ fn: fn });
    }

    
    Configuration.prototype.run = function*(fn, name, deps, parent, options) {
        var runner = new JobRunner(this.jobs, { threads: this.build.options.threads });        
        yield runner.run(fn, name, deps, parent, options);
    }
    
    
    Configuration.prototype.runQueuedJobs = function*() {
        while (this.queuedJobs.length) {
            var job  = this.queuedJobs.shift();
            var runner = new JobRunner(this.jobs, { threads: this.build.options.threads });
            yield runner.run(job.fn);
        }
    }
    

    Configuration.prototype.startBuild = function*() {
        this.GLOBAL = this.build.state;
        this.state = {};
        this.queuedJobs = [];
        
        process.chdir(this.root);
        
        var options = { threads: this.build.options.threads };
        
        var startRunner = new JobRunner(this.buildStartJobs, options);
        yield startRunner.run();
        
        var watchRunner = new JobRunner(this.watchJobs, options);
        yield watchRunner.run();
        
        var completionRunner = new JobRunner(this.buildCompleteJobs, options);
        yield completionRunner.run();

        yield this.runQueuedJobs();

        process.chdir(this.build.dir);
    };

    module.exports = Configuration;
}());
