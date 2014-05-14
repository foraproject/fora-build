(function () {
    "use strict";

    var TaskRunner = function(tasks, options) {
        this.tasks = tasks;
        this.options = options;
    };

    
    TaskRunner.prototype.run = function*(handler, name, deps) {
        if (this.hasRun)
            throw new Error("This runner instance has already been run");           
        this.hasRun = true;
        
        var self = this;
        var taskList = [];
        var activeThreads = 0;
        
        // Checks if all dependent tasks have completed.
        var isSignaled = function(runnable) {
            //Already done?
            if (runnable.invokables && runnable.invokables.length === 0)
                return false;
            
            //Not done yet.
            for (var i = 0; i < runnable.ref.deps.length; i++) {
                var matches = taskList.filter(function(r) {
                    return r.ref.name === runnable.ref.deps[i];
                });
                if (!matches.length)
                    throw new Error("Cannot find dependent task " + runnable.ref.deps[i] + " for task " + runnable.ref.name);
                else 
                    if ((typeof matches[0].invokables === "undefined") || (matches[0].total > matches[0].completed)) {
                        return false; 
                    }
            }
            
            return true;
        }
        
        //Do the do.
        var next = function*() {
            // Signal all taskList that can run
            var handler;
            var signaled = taskList.filter(isSignaled);                
            for(var i = 0; i < signaled.length; i++) {
                if (typeof(signaled[i].invokables) === "undefined" && !signaled[i].isStarting) {
                    signaled[i].isStarting = true;
                    signaled[i].invokables = yield signaled[i].ref.getInvokables();;
                    signaled[i].total = signaled[i].invokables.length;
                    signaled[i].isStarting = false;
                }                    
            }

            for(var i = 0; i < signaled.length; i++) {
                if (signaled[i].invokables && signaled[i].invokables.length) {
                    handler = signaled[i].invokables.shift();
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
            var threads = self.options.threads - activeThreads;
            if (threads > 0)
                while (threads--) gens.push(next);
            return gens;
        }

        //Ask all tasks to return work items (handlers) that need to be run
        for (var i = 0; i < this.tasks.length; i++) {
            taskList.push({
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
