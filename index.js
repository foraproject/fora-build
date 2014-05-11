co = require('co');
Configuration = require('./configuration');

configs = [];
    
configure = function(fn, root) {
    configuration = new Configuration(root);    
    configs.push(configuration);        
    fn(configuration);
}    

run = function() {
    co(function*() {
        for (i = 0; i < configs.length; i++) {
            yield configs[i].run();
        }
    })();
}

module.exports = {
    configure: configure,
    run: run
}
