(function () {
    "use strict";
    
    var DependencyGraph = function(handlers, build) {
        this.handlers = handlers;
        this.build = build;
    }


    DependencyGraph.prototype.run = function*() {
        var taskGroups = [];
        
        for(var i = 0; i < this.handlers.length; i++) {
            taskGroups.push(yield this.handlers[i].getTaskGroup());
        }
        
        var completedTaskGroups = [];
        while(true) {
            var done = true;
            for(var i = 0; i < taskGroups.length; i++) {            
                var item = taskGroups[i];
                
                if (item.handlers.length)
                    done = false;
                
                var runnable = true;
                for(var j = 0; j < item.deps.length; j++) {            
                    if (completedTaskGroups.indexOf(item.deps[j]) === -1) {
                        runnable = false;
                        break;
                    } 
                }
                
                if (runnable) {
                    console.log("Can run " + item.name);
                    item.handlers = [];
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
