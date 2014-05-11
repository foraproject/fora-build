require();

configuration = {
    _files: [],
    files: function(paths, handler) {
        this._files.push({ paths: paths, handler: handler });
    }
}
    
configure = function(fn) {
    fn(configuration);
}    

run = function() {
    configure.files.forEach(function(files) {
        
    });
}

module.exports = {
    configure: configure,
    run: run
}
