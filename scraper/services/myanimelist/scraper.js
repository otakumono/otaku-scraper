var xport = require('node-xport')(module),
    anime = require('./anime.scraper'),
    manga = require('./manga.scraper');

xport((function () {
    function Scraper() {

    }

    function createRun(scraper, type, i) {
        return function () { runScrape(scraper, type, i); };
    }

    function runScrape(scraper, type, i) {
        scraper.scrape(type, i);
        setTimeout(createRun(scraper, type, i + 1), 5486);
    }

    Scraper.run = function () {
        console.log('Scraping MyAnimeList...');

        runScrape(this, "anime", 50);
    };

    Scraper.scrape = function (type, id) {
        if (type == "anime") {
            anime.scrape(id);
        } else if (type == "manga") {
            manga.scrape(id);
        }
    };

    return Scraper;
}()));
