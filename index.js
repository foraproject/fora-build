(function () {
    Build = require('./build');
    tools = require('./tools');
    
    module.exports = {
        create: function(options) {
            return new Build(options);
        },
        tools: tools
    }
}());
