(function () {
    co = require('co');
    thunkify = require('thunkify');

    var Task = require('./task'),
        Configuration = require('./configuration'),
        TaskRunner = require('./taskrunner');

    BuildInstance = function(options) {
        this.configs = [];
        this.buildStartTasks = [];
        this.buildCompleteTasks = [];    
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


    BuildInstance.prototype.onBuildStart = function(handler, name, deps) {        
        var task = new Task(handler, name, deps, this);
        this.buildStartTasks.push(task);
        return task;
    }


    BuildInstance.prototype.onBuildComplete = function(handler, name, deps) {
        var task = new Task(handler, name, deps, this);
        this.buildCompleteTasks.push(task);
        return task;
    }
    
    
    BuildInstance.prototype.start = function(monitor, cb) {
        this.state = {};
        this.taskQueue = [];
        this.monitor = monitor;
        
        co(function*() {
            var options = { threads: this.options.threads };        
        
            var startRunner = new TaskRunner(this.buildStartTasks, options);
            yield startRunner.run();

            for (i = 0; i < this.configs.length; i++) {
                yield this.configs[i].start();
            } 
            
            var completionRunner = new TaskRunner(this.buildCompleteTasks, options);
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
