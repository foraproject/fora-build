(function () {
    "use strict";
    
    var Task = function(fn, name, deps, parent, options) {
        this.fn = fn;
        this.name = name || "undefined";
        this.deps = deps || [];
        this.parent = parent;
        this.options = options;
    }


    Task.prototype.getTasks = function*() {
        var self = this;
        return [function*() { yield self.fn.call(self.parent); }];
    }
    
    module.exports = Task;
}());


