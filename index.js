(function () {
    co = require('co');
    var Task = require('./task'),
        Configuration = require('./configuration'),
        DependencyGraph = require('./dependencygraph');

    BuildInstance = function(options) {
        this.configs = [];
        this.startHandlers = [];
        this.completionHandlers = [];    
        this.dir = process.cwd();

        this.options = options || {};
        this.options.parallel = this.options.parallel || 1;
    }


    BuildInstance.prototype.configure = function(fn, root) {
        configuration = new Configuration(root, this);    
        this.configs.push(configuration);        
        fn(configuration);
    }


    BuildInstance.prototype.onStart = function(handler, name, deps) {        
        var task = new Task(handler, name, deps);
        this.startHandlers.push(task);
        return task;
    }


    BuildInstance.prototype.onComplete = function(handler, name, deps) {
        var task = new Task(handler, name, deps);
        this.completionHandlers.push(task);
        return task;
    }
    
    
    BuildInstance.prototype.run = function(watch, cb) {
        this.state = {};
        
        co(function*() {
        
            startTasks = new DependencyGraph(this.startHandlers, this);
            yield startTasks.run();

            for (i = 0; i < this.configs.length; i++) {
                yield this.configs[i].run(watch);
            } 
            
            completionTasks = new DependencyGraph(this.completionHandlers, this);
            yield completionTasks.run();
            
            if (cb) cb();
            
        }).call(this);
    }

    create = function(options) {
        return new BuildInstance(options);
    }

    module.exports = {
        create: create
    }
}());
