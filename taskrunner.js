(function () {
    "use strict";

    var TaskRunner = function(tasks, build) {
        this.tasks = tasks;
        this.build = build;
    };

    
    TaskRunner.prototype.run = function*() {
        if (this.hasRun)
            throw new Error("This runner instance has already been used. Create a new TaskRunner.");           
        this.hasRun = true;
        
        var self = this;
        var runnables = [];
        var activeThreads = 0;
        
        // Checks if all dependent tasks have completed.
        var dependenciesMet = function(task) {
            for (var i = 0; i < task.deps.length; i++) {
                matches = runnables.filter(function(r) {
                    return r.name === task.deps[i];
                });
                if (!matches.length)
                    throw new Error("Cannot find dependent task " + task.deps[i] + " for task " + task.name);
                else 
                    if (matches[0].length !== matches[0].completed) return false; 
            }
            return true;
        }
        
        // Tasks which have pending, incomplete handlers
        var isIncomplete = function(task) {
            return task.started === task.handlers.length;
        }

        //Do the do.
        var next = function*() {            
            var runnable = runnables.filter(isIncomplete).filter(dependenciesMet);
            if (runnable.length) {
                var handler = runnables[i].handlers.shift();

                runnable.started++;
                activeThreads++;
                yield handler;
                activeThreads--;
                runnable.completed++;

                //Now that this work item has completed, it is time to queue more.
                yield scheduler();
            }
        }
        
        // Create a number of parallel tasks, equal to unused threads.
        var scheduler = function() {
            var gens = [];
            var threads = self.build.options.threads - activeThreads;
            while (threads--) gens.push(next);
            return gens;
        }

        //Ask all tasks to return work items (handlers) that need to be run
        for (var i = 0; i < this.tasks.length; i++) {
            runnables.push({
                name: this.tasks[i].name,
                deps: this.tasks[i].deps,
                handlers: yield this.tasks[i].getHandlers(),
                completed: 0,
                started: 0
            });
        }
        
        //Queue initial work items
        yield scheduler();   
    }
    
    module.exports = TaskRunner;
        
}());
