(function () {
    "use strict";
    
    var fs = require('fs'),
        path = require('path'),
        thunkify = require('thunkify'),
        readdir = thunkify(fs.readdir),
        stat = thunkify(fs.stat);


    var Task = require('./task');

    var Watch = function(patterns, handler, name, deps, parent) {
        Task.call(this, handler, name, deps, parent);
        this.patterns = [];
        
        patterns.forEach(function(pattern) {           
            if (typeof pattern === "string") {
                var result = {};
                result.file = path.basename(pattern);  
                result.dir = path.dirname(pattern);
                pattern = result;
            }
            
            if (!pattern.recurse)
                pattern.recurse = true;

            if (!pattern.regex) {                
                var baseDir = pattern.dir !== "." ? pattern.dir.replace(new RegExp("\/", "g"), "\\/") + "\\/" : "";
                pattern.regex = new RegExp(baseDir + "(.*\\/)?" + (pattern.file.replace(".", "\\.").replace("*", ".*") + "$"));
            }
                
            this.patterns.push(pattern);
            
        }, this);             
    };
    
    Watch.prototype = Object.create(Task.prototype);

    Watch.prototype.constructor = Watch;
    
    Watch.prototype.getHandlers = function*() {

        var walk = function*(dir, recurse, pattern) {
            var results = [];
            
            var files = yield readdir(dir);
            for (var i = 0; i < files.length; i++) {
                var fullPath = path.join(dir, files[i]);
                var info = yield stat(fullPath);
                if (info.isDirectory()) {
                    results.push({ path: fullPath, type: 'dir', pattern: pattern });
                    if (recurse) {
                        results = results.concat(yield walk(fullPath, recurse, pattern));
                    }
                } else {
                    results.push({ path: fullPath, type: 'file', pattern: pattern });
                }
            }
            return results;
        }

        var self = this;
        
        var fileWalkers = []        
        
        for (var i = 0; i < this.patterns.length; i++) {
            fileWalkers.push(walk(this.patterns[i].dir, this.patterns[i].recurse, this.patterns[i]));
        }
        var filesList = yield fileWalkers;

        var yieldables = [];
        filesList.forEach(function(files) {
            files.forEach(function(file) {
                if (file.type === 'file' && file.pattern.regex.test(file.path)) {                    
                    yieldables.push(function*() {
                        yield self.handler.call(self.parent, file.path);
                    });
                }        
            });
        });
        
        return yieldables;
    };        
    
    module.exports = Watch;
}());


