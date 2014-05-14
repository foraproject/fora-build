(function () {
    "use strict";
    
    var Task = function(handler, name, deps, parent, options) {
        this.handler = handler;
        this.name = name || "undefined";
        this.deps = deps || [];
        this.parent = parent;
        this.options = options;
    }


    Task.prototype.getInvokables = function*() {
        var self = this;
        return [function*() { yield self.handler.call(self.parent); }];
    }
    
    module.exports = Task;
}());


