(function () {
    "use strict";
    
    var Task = require('./task'),
        Watch = require('./watch'),
        TaskRunner = require('./taskrunner');

    var Configuration = function(root, build) {
        this.root = root;
        this.build = build;

        this.tasks = [];
        this.buildStartTasks = [];
        this.buildCompleteTasks = [];
        this.watchTasks = [];
        this.queuedTasks = [];
    }

    Configuration.prototype.task = function(handler, name, deps) {        
        var task = new Task(handler, name, deps, this, {});
        this.tasks.push(task);
        return task;
    }


    Configuration.prototype.onBuildStart = function(handler, name, deps) {        
        var task = new Task(handler, name, deps, this, {});
        this.buildStartTasks.push(task);
        return task;
    }


    Configuration.prototype.onBuildComplete = function(handler, name, deps) {
        var task = new Task(handler, name, deps, this, {});
        this.buildCompleteTasks.push(task);
        return task;
    }


    Configuration.prototype.watch = function(patterns, handler, name, deps) {
        var task = new Watch(patterns, handler, name, deps, this, {});
        this.watchTasks.push(task);
        return task;
    }
    
    
    Configuration.prototype.queue = function(handler) {
        this.queuedTasks.push(handler);
    }
    
    
    Configuration.prototype.run = function(handler, name, deps) {
        var runner = new TaskRunner(this.tasks, { threads: this.build.options.threads });        
        yield runner.run(handler, name, deps);
    }
    

    Configuration.prototype.start = function*() {
        this.GLOBAL = this.build.state;
        this.state = {};
        
        process.chdir(this.root);
        
        var options = { threads: this.build.options.threads };
        
        var startRunner = new TaskRunner(this.buildStartTasks, options);
        yield startRunner.run();
        
        var watchRunner = new TaskRunner(this.watchTasks, options);
        yield watchRunner.run();

        var completionRunner = new TaskRunner(this.buildCompleteTasks, options);
        yield completionRunner.run();

        process.chdir(this.build.dir);
    };

    
    Configuration.prototype.monitor = function*() {
        
    }

    module.exports = Configuration;
}());
