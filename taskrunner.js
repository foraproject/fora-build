(function () {
    "use strict";

    var TaskRunner = function(tasks, build) {
        this.tasks = tasks;
        this.build = build;
    };

    
    TaskRunner.prototype.run = function*() {
        if (this.hasRun)
            throw new Error("This runner instance has already been run");           
        this.hasRun = true;
        
        var self = this;
        var runnables = [];
        var activeThreads = 0;
        
        // Checks if all dependent tasks have completed.
        var isSignaled = function(runnable) {
            //Already done?
            if (runnable.handlers && runnable.handlers.length === 0)
                return false;
            
            //Not done yet.
            for (var i = 0; i < runnable.ref.deps.length; i++) {
                var matches = runnables.filter(function(r) {
                    return r.ref.name === runnable.ref.deps[i];
                });
                if (!matches.length)
                    throw new Error("Cannot find dependent task " + runnable.ref.deps[i] + " for task " + runnable.ref.name);
                else 
                    if ((typeof matches[0].handlers === "undefined") || (matches[0].total > matches[0].completed)) {
                        return false; 
                    }
            }
            
            return true;
        }
        
        //Do the do.
        var next = function*() {
            // Signal all runnables that can run
            var handler;
            var signaled = runnables.filter(isSignaled);                
            for(var i = 0; i < signaled.length; i++) {
                if (typeof(signaled[i].handlers) === "undefined" && !signaled[i].isStarting) {
                    signaled[i].isStarting = true;
                    signaled[i].handlers = yield signaled[i].ref.getHandlers();;
                    signaled[i].total = signaled[i].handlers.length;
                    signaled[i].isStarting = false;
                }                    
            }

            for(var i = 0; i < signaled.length; i++) {
                if (signaled[i].handlers && signaled[i].handlers.length) {
                    handler = signaled[i].handlers.shift();
                    var runnable = signaled[i];
                    break;
                }
            }
            
            if (handler) {
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
            if (threads > 0)
                while (threads--) gens.push(next);
            return gens;
        }

        //Ask all tasks to return work items (handlers) that need to be run
        for (var i = 0; i < this.tasks.length; i++) {
            runnables.push({
                ref: this.tasks[i],    
                completed: 0,
                total: 0,
            });
        }
        
        //Queue initial work items
        yield scheduler();   
    }
    
    module.exports = TaskRunner;
        
}());
