/* 
    A very simple test script.
*/
describe('build.run()', function() {
    describe('when executed', function(){
        it('should run all configurations without throwing an exception', function(done){
            require('./build')(done);
        });
    });

});
