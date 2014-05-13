(function () {
    "use strict";
    
    var fs = require('fs'),
        path = require('path'),
        thunkify = require('thunkify'),
        readdir = thunkify(fs.readdir),
        stat = thunkify(fs.stat);

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

    var Task = require('./task');

    var Watch = function(patterns, handler, name, deps) {
        Task.call(this, handler, name, deps);
        this.patterns = [];
        
        patterns.forEach(function(pattern) {           
            if (typeof pattern === "string") {
                pattern = {};
                pattern.file = path.basename(pattern);  
                pattern.dir = path.dirname(pattern);
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
        var self = this;
        
        var fileWalkers = []        
        this.patterns.forEach(function(pattern) {
            fileWalkers.push(walk(pattern.dir, pattern.recurse, pattern));
        });
        var filesList = yield fileWalkers;

        var yieldables = [];
        filesList.forEach(function(files) {
            files.forEach(function(file) {
                if (file.type === 'file' && file.pattern.regex.test(file.path)) {
                    yieldables.push(function*() {
                        yield self.handler.call(self, file.path);
                    });
                }        
            });
        });
        
        return yieldables;
    };        
    
    module.exports = Watch;
}());


