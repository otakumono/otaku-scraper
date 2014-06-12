var api = global.api,
    cheerio = require('cheerio'),
    request = require('request'),
    Anime = require('../mal/anime.js');

api.anichart = {
    current: function(req, res, next) {
        grabSeason(req, res, next);
    },
    spring: function(req, res, next) {
        grabSeason(req, res, next, 'spring');
    },
    summer: function(req, res, next) {
        grabSeason(req, res, next, 'summer');
    },
    fall: function(req, res, next) {
        grabSeason(req, res, next, 'fall');
    },
    winter: function(req, res, next) {
        grabSeason(req, res, next, 'winter');
    }
};

function grabSeason(req, res, next, season) {
    if (season === undefined || season == null)
        season = '';

    res.type('application/json');

    var db = req.db;

    AniChart.fetch(season, function(err, chart) {
        res.send(chart)
    }, db);
}

var AniChart = (function() {
    function AniChart() {}

    AniChart.fetch = function(season, callback, db) {

        var that = this;
        request({
            url: 'http://anichart.net/' + season,
            headers: {
                'User-Agent': 'api-team-692e8861471e4de2fd84f6d91d1175c0'
            },
            timeout: 5000
        }, function(err, response, body) {
            if (err) {
                return callback(err);
            }

            var chart = that.tryParse(body);
            var returns = 0;
            var callbacks = [];

            for (var i = 0; i < chart.info.length; i++) {
                callbacks[i] = (function(index) {
                    return function(err, lookup) {
                        returns++;
                        chart.info[index].mal_id = err ? -3 : lookup.mal_id;
                        chart.info[index].lookuperr = err;

                        if (returns == chart.info.length) {
                            callback(null, chart);
                        }
                    };
                })(i);

                Anime.lookup(chart.info[i].title, callbacks[i], db);
            }
        });
    };

    /*
      This method is really fragile; it's subject to page layout changes.
      We should do our best to keep up with breakages
    */
    AniChart.tryParse = function(html) {
        var $ = cheerio.load(html);
        var chart = {};

        // Extract the season from our DOM
        var season = $('title').first().contents().filter(function() {
            return this.type !== 'tag';
        }).text();

        var typeTitle = "TV -";
        chart.season = (season.indexOf("AniChart.net") == -1 ? season.substring(0, season.indexof(" - ")) : $(".type_title:contains('TV - ')").text().substring(typeTitle.length + 1)).toLowerCase();

        chart.info = [];
        var itrInfo = $(".anime_info");
        while (itrInfo.length > 0) {
            var contents = itrInfo.first().contents();
            var tabinfo = contents.filter(".tabs").contents().filter(".tab_info").contents();
            var info = {};

            info.title = contents.filter(".title").text();
            if (info.title.indexOf("Fuun") == 0) info.title = info.title.replace("Fuun", "Fuuun");

            var source = "Source";
            info.source = tabinfo.filter(".info_box:contains('" + source + "')").text().substring(source.length + 1).trim();

            var director = "Director";
            info.director = tabinfo.filter(".info_box:contains('" + director + "')").text().substring(director.length + 1).trim();

            var seriesComp = "Series Comp";
            info.seriesComp = tabinfo.filter(".info_box:contains('" + seriesComp + "')").text().substring(seriesComp.length + 1).trim();

            var charDesign = "Char Design";
            info.charDesign = tabinfo.filter(".info_box:contains('" + charDesign + "')").text().substring(charDesign.length + 1).trim();

            var music = "Music";
            info.music = tabinfo.filter(".info_box:contains('" + music + "')").text().substring(music.length + 1).trim();

            var episodes = "Episodes";
            var nEpisodes = new Number(tabinfo.filter(".info_box:contains('" + episodes + "')").text().substring(episodes.length + 1).trim());
            if (isNaN(nEpisodes))
                nEpisodes = -1;
            info.episodes = nEpisodes;

            info.poster = $(contents).find(".thumb").attr('src');

            var nobox = tabinfo.filter(".info_nobox:contains('" + twitter + "')").text().trim();
            var twitter = "Twitter:";
            var premiere = "Premiere Date:";

            info.twitter = nobox.substring(nobox.indexOf(twitter) + twitter.length, nobox.indexOf(premiere)).trim();
            info.premiere = nobox.substring(nobox.indexOf(premiere) + premiere.length).trim();

            chart.info.push(info);

            itrInfo = itrInfo.next();
        }

        return chart;
    };

    // export our class
    return AniChart;
})();

// Export the module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AniChart;
}