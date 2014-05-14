(function () {
    "use strict";
    
    var Task = function(handler, name, deps, parent) {
        this.handler = handler;
        this.name = name || "undefined";
        this.deps = deps || [];
        this.parent = parent;
    }


    Task.prototype.getHandlers = function*() {
        var self = this;
        return [function*() { yield self.handler.call(self.parent); }];
    }
    
    module.exports = Task;
}());


