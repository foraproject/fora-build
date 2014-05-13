(function () {
    "use strict";
    
    var Task = require('./task'),
        Watch = require('./watch'),
        TaskRunner = require('./taskrunner');

    var Configuration = function(root, build) {
        this.root = root;
        this.build = build;
        this.startTasks = [];
        this.completionTasks = [];
        this.watchTasks = [];    
    }


    Configuration.prototype.onStart = function(handler, name, deps) {        
        var task = new Task(handler, name, deps);
        this.startTasks.push(task);
        return task;
    }


    Configuration.prototype.onComplete = function(handler, name, deps) {
        var task = new Task(handler, name, deps);
        this.completionTasks.push(task);
        return task;
    }


    Configuration.prototype.watch = function(patterns, handler, name, deps) {
        var task = new Watch(patterns, handler, name, deps);
        this.watchTasks.push(task);
        return task;
    }


    Configuration.prototype.run = function*(watch) {
        this.GLOBAL = this.build.state;
        this.state = {};
        
        process.chdir(this.root);
        
        var startRunner = new TaskRunner(this.startTasks, this.build);
        yield startRunner.run();
        
        var completionRunner = new TaskRunner(this.watchTasks, this.build);
        yield completionRunner.run();

        var completionRunner = new TaskRunner(this.completionTasks, this.build);
        yield completionRunner.run();
        
        process.chdir(this.build.dir);
    };

    module.exports = Configuration;
}());
