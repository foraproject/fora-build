(function () {
    "use strict";

    var DependencyGraph = function(handlers, build) {
        this.handlers = handlers;
        this.build = build;
        this.runnables = [];
        this.completedTaskGroups = {};
        this.nowRunning = 0;
    };

    
    DependencyGraph.prototype.scheduler = function() {
        var self = this;

        var next = function*() {
        
            if (self.runnables.length) {
                task = self.runnables.shift();
                self.nowRunning++;
                yield task.handler;
                self.nowRunning--;
                self.pending
                
                threads = self.build.options.threads - self.nowRunning;
                gens = [];
                while(threads--) gens.push(next);
                yield gens; 
            }
        }
        
        return next;
    }


    DependencyGraph.prototype.run = function*() {
        
        var taskGroups = [];
        
        for(var i = 0; i < this.handlers.length; i++) {
            taskGroups.push(yield this.handlers[i].getTaskGroup());
                        
        }
        
        while(true) {
            var done = true;
            for(var i = 0; i < taskGroups.length; i++) {            
                var item = taskGroups[i];
                                
                var runnable = true;
                for(var j = 0; j < item.deps.length; j++) {
                    grpStats = this.runningTaskGroups[item.deps[j]];
                    if (!grpStats || (grpStats > 0)) {
                    }
                    
                    if (completedTaskGroups.indexOf(item.deps[j]) === -1) {
                        runnable = false;
                        break;
                    } 
                }
                
                if (runnable) {
                    this.runnables.concat(item.handlers);
                    this.runningTaskGroups[item.name] = this.handlers.length;
                }
                else {
                    continue;
                }
            }
            
            if (done)
                break;            
        }
    }
    
    module.exports = DependencyGraph;
}());
