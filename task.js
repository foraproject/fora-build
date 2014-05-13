(function () {
    "use strict";
    
    var Task = function(handler, name, deps) {
        this.handler = handler;
        this.name = name || "undefined";
        this.deps = deps || [];
    }

    
    Task.prototype.getHandlers = function*() {
        return [this.handler];
    }
    
    module.exports = Task;
}());


