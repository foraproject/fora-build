(function () {
    "use strict";
    
    var Task = function(handler, name, deps) {
        this.handler = handler;
        this.name = name;
        this.deps = deps || [];
    }

    
    Task.prototype.getTaskGroup = function*() {
        return {
            name: this.name,
            deps: this.deps,
            handlers: [this.handler]
        };
    }
    
    module.exports = Task;
}());


