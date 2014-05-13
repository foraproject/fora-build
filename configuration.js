(function () {
    "use strict";
    
    var Task = require('./task'),
        WatchTask = require('./watchtask'),
        DependencyGraph = require('./dependencygraph');

    var Configuration = function(root, build) {
        this.root = root;
        this.build = build;
        this.startHandlers = [];
        this.completionHandlers = [];
        this.watchHandlers = [];    
    }


    Configuration.prototype.onStart = function(handler, name, deps) {        
        var task = new Task(handler, name, deps);
        this.startHandlers.push(task);
        return task;
    }


    Configuration.prototype.onComplete = function(handler, name, deps) {
        var task = new Task(handler, name, deps);
        this.completionHandlers.push(task);
        return task;
    }


    Configuration.prototype.watch = function(patterns, handler, name, deps) {
        var task = new WatchTask(patterns, handler, name, deps);
        this.watchHandlers.push(task);
        return task;
    }


    Configuration.prototype.run = function*(watch) {
        this.GLOBAL = this.build.state;
        this.state = {};
        
        process.chdir(this.root);
        
        var startTasks = new DependencyGraph(this.startHandlers, this.build);
        yield startTasks.run();
        
        var watchTasks = new DependencyGraph(this.watchHandlers, this.build);
        yield watchTasks.run();

        var completionTasks = new DependencyGraph(this.completionHandlers, this.build);
        yield completionTasks.run();
        
        process.chdir(this.build.dir);
    };

    module.exports = Configuration;
}());
