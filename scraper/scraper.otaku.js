var xport = require('node-xport')(module);

function makeScraper(service) {
    return new require('./services/' + service + '/scraper');
}

/* Load up our database */
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/scraping');

var db = mongoose.connection;
db.on('error', function(err) {
   console.log(err + " while attempting to open the database. Exiting.");
   process.exit(1);
});

db.once('open', function callback() {
   console.log("Scraping...");
   makeScraper('myanimelist').run();
});
