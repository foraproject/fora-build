(function () {
    "use strict";
    
    var fs = require('fs'),
        path = require('path'),
        thunkify = require('thunkify'),
        readdir = thunkify(fs.readdir),
        stat = thunkify(fs.stat);


    var Job = require('./job');

    var Watch = function(patterns, fn, name, deps, parent, options) {
        Job.call(this, fn, name, deps, parent, options);
        this.patterns = [];
        
        this.watchedFiles = [];                
        this.watchedDirs = [];
        
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
    
    Watch.prototype = Object.create(Job.prototype);

    Watch.prototype.constructor = Watch;
    
    Watch.prototype.getTasks = function*() {

        var walk = function*(dir, recurse) {
            var results = [];
            
            var files = yield readdir(dir);
            for (var i = 0; i < files.length; i++) {
                var fullPath = path.join(dir, files[i]);
                var info = yield stat(fullPath);
                if (info.isDirectory()) {
                    results.push({ path: fullPath, type: 'dir' });
                    if (recurse) {
                        results = results.concat(yield walk(fullPath, recurse));
                    }
                } else {
                    results.push({ path: fullPath, type: 'file' });
                }
            }
            return results;
        }

        
        var dirWalkers = []        
        
        for (var i = 0; i < this.patterns.length; i++) {
            dirWalkers.push(walk(this.patterns[i].dir, this.patterns[i].recurse));
        }
        var pathList = yield dirWalkers;

        var self = this;
        var yieldables = [];
        pathList.forEach(function(paths) {
            paths.forEach(function(entry) {
                if (entry.type === "dir") {
                    self.watchedDirs.push(entry.path);
                } else if (entry.type === 'file') {         
                    if (self.patterns.filter(function(p) { return p.regex.test(entry.path) }).length) {
                        yieldables.push(function*() {
                            yield self.fn.call(self.parent, entry.path, "change");
                        });
                        self.watchedFiles.push(entry.path);
                    }
                }
            });
        });
        
        return yieldables;
    };        
    
    module.exports = Watch;
}());


