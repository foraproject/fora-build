co = require('co');
Configuration = require('./configuration');

BuildInstance = function(options) {
    this.configs = [];
    this.startHandlers = [];
    this.completionHandlers = [];    
    this.dir = process.cwd();

    this.options = options || {};
    this.options.parallel = this.options.parallel || 1;
}

BuildInstance.prototype.onStart = function(handler) {
    this.startHandlers.push(handler);
    return handler;
}

BuildInstance.prototype.onComplete = function(handler) {
    this.completionHandlers.push(handler);
    return handler;
}

BuildInstance.prototype.configure = function(fn, root) {
    configuration = new Configuration(root, this);    
    this.configs.push(configuration);        
    fn(configuration);
}

BuildInstance.prototype.run = function(watch) {
    this.state = {};
    
    co(function*() {
        for (var i = 0; i < this.startHandlers.length; i++) {
            yield this.startHandlers[i](this);
        }        
    
        for (i = 0; i < this.configs.length; i++) {
            yield this.configs[i].run(watch);
        }


        for (var i = 0; i < this.completionHandlers.length; i++) {
            yield this.completionHandlers[i](this);
        }        
        
    }).call(this);
}

create = function(options) {
    return new BuildInstance(options);
}

module.exports = {
    create: create
}
