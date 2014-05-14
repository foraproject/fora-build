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
        fn(configuration);
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
                        
        }).call(this);
    }
    
    
    module.exports = {
        create: function(options) {
            return new BuildInstance(options);
        }
    }
}());
