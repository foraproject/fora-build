(function () {
    "use strict";

    var fs = require('fs'),
        path = require('path'),
        thunkify = require('thunkify'),
        readdir = thunkify(fs.readdir),
        stat = thunkify(fs.stat);

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


    var Configuration = function(root, build) {
        this.root = root;
        this.build = build;
        this.startHandlers = [];
        this.completionHandlers = [];
        this.filePatterns = [];    
    }


    Configuration.prototype.onStart = function(handler) {
        this.startHandlers.push(handler);
        return handler;
    }

    Configuration.prototype.onComplete = function(handler) {
        this.completionHandlers.push(handler);
        return handler;
    }


    Configuration.prototype.files = function(patterns, handler) {
        patterns.forEach(function(pattern) {
            if (typeof pattern == "string") {
                var parts = pattern.split('/');
                pattern = {};
                pattern.file = parts.pop();
                pattern.dir = parts.length ? parts.join("/") : ".";       
            }

            if (!pattern.recurse)
                pattern.recurse = true;

            if (!pattern.regex)
                pattern.regex = new RegExp("^" + pattern.dir.replace(/\//g, "\\/") + "\\/(.*\\/)?" + (pattern.file.replace(".", "\\.").replace("*", ".*") + "$"));

            pattern.handler = handler;
            this.filePatterns.push(pattern);
        }, this);
    }


    Configuration.prototype.run = function*(watch) {
        this.GLOBAL = this.build.state;
        this.state = {};
        
        process.chdir(this.root);
        
        for (var i = 0; i < this.startHandlers.length; i++) {
            yield this.startHandlers[i](this);
        }    
        
        for (i = 0; i < this.filePatterns.length; i++) {
            var pattern = this.filePatterns[i];
            var files = yield walk(pattern.dir, pattern.recurse);        
            var yieldables = [];
            for(var j = 0; j < files.length; j++) {
                var last = j === (files.length - 1);
                if (files[j].type === 'file' && pattern.regex.test(files[j].path)) {
                    yieldables.push(pattern.handler.call(this, files[j].path));
                }
                if (last || (yieldables.length === this.build.options.parallel)) {
                    yield yieldables;
                    yieldables = [];
                }
            }        
        }

        for (i = 0; i < this.completionHandlers.length; i++) {
            yield this.completionHandlers[i](this);
        }  
            
        process.chdir(this.build.dir);
    };


    module.exports = Configuration;
}());
