build = require('..').create({ threads: 4 });            
build.configure(require('./config'), 'data'); //data is the directory where the files are
build.start(true);
