(function () {
    co = require('co');
    var Task = require('./task'),
        Configuration = require('./configuration'),
        TaskRunner = require('./taskrunner');

    BuildInstance = function(options) {
        this.configs = [];
        this.startTasks = [];
        this.completionTasks = [];    
        this.dir = process.cwd();

        this.options = options || {};
        this.options.threads = this.options.threads || 4;
    }


    BuildInstance.prototype.configure = function(fn, root) {
        configuration = new Configuration(root, this);    
        this.configs.push(configuration);        
        fn(configuration);
    }


    BuildInstance.prototype.onStart = function(handler, name, deps) {        
        var task = new Task(handler, name, deps, this);
        this.startTasks.push(task);
        return task;
    }


    BuildInstance.prototype.onComplete = function(handler, name, deps) {
        var task = new Task(handler, name, deps, this);
        this.completionTasks.push(task);
        return task;
    }
    
    
    BuildInstance.prototype.run = function(monitor, cb) {
        this.state = {};
        this.monitor = monitor;
        
        co(function*() {
        
            var startRunner = new TaskRunner(this.startTasks, this);
            yield startRunner.run();

            for (i = 0; i < this.configs.length; i++) {
                yield this.configs[i].run();
            } 
            
            var completionRunner = new TaskRunner(this.completionTasks, this);
            yield completionRunner.run();
            
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
