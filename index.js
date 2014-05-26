(function () {
    Build = require('./build');
    
    module.exports = {
        create: function(options) {
            return new Build(options);
        }
    }
}());
