Configuration = function(root) {
    this.root = root;
    this.files = [];
}


Configuration.prototype.files = function(pattern, handler) {
    this.files.push({ pattern: pattern, handler: handler });
}

Configuration.prototype.run = function*() {
    for (i = 0; i < this.files.length; i++) {
        
    }
}

Configuration.prototype.getFilesForPattern(pattern) {
    
}

module.exports = Configuration;
