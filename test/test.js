foraBuild = require('..');
config = require('./build-config');
co = require("co");

describe('build.run()', function() {

    describe('when executed', function(){
        it('should run all configurations without throwing an exception', function(done){
            build = foraBuild.create({ threads: 4 });            
            build.configure(config, 'data');
            build.start(true, done);
        });
    });

});
