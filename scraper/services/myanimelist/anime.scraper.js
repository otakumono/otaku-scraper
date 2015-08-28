var xport = require('node-xport')(module),
    MALAPI = require('./mal.api'),
    cheerio = require('cheerio'),
    ModelAnime = require('./models/model.anime');

xport((function () {
    function Anime() {

    }

    Anime.scrape = function (id) {
        ModelAnime.findOne({
            mal_id: id
        }, function(error, results) {
            // If we couldn't find the thing we wanted, we'll simply go fetch it
            if (results == null) {
                console.log("Fetching anime from MAL DB with ID #" + id);

                // download and return
                MALAPI.contentDownload(id, function(object) {
                    console.log("Storing record with ID #" + id + ".");
                    // Persist to the DB if we need to
                    /* Insert the record iff it's not an invalid request */
                    if (object.title !== undefined && object.title !== null && object.title.toLowerCase() !== "404 not found") {
                        var model = new ModelAnime(object);
                        model.save();
                    }

                    console.log("scraped:");
                    console.log(object);
                }, 'anime', Anime);
            } else {
                console.log("results:");
                console.log(results);
            }
        });
    };

    function parseSynopsisBackground($, obj) {
        var text = "";

        var itr = obj['0'];
        while (itr.next != null) {
            itr = itr.next;

            if (itr.type === 'tag') {
                if (itr.name === 'a') {
                    text += String($(itr).text());
                } else if (itr.name !== 'br') {
                    break;
                }
            } else {
                text += String(itr.data);
            }
        }

        return text;
    }

    function parseNum(text) {
        var number = Number(text);

        if (isNaN(number)) {
            return -1;
        }

        return number;
    }

    function filterText() {
        return this.type !== 'tag';
    }

    function filterAnchor() {
        return this.type === 'tag' && this.name === 'a';
    }

    function parseUrlBatch($, batchName) {
        var urls = [];
        var batch = $(".borderClass:contains('" + batchName + ":')").next().contents().filter(function() { return this.type === 'tag' && this.name === 'a'; });
        for (var i = 0; i < batch.length; i++) {
            urls.push(parseNum(batch[i].attribs.href.replace(/\/(?:anime|manga)\/([0-9]+).*/g, "$1")));
        }
        return urls;
    }

    /*
      This method is really fragile; it's subject to page layout changes.
      We should do our best to keep up with breakages
    */
    Anime.parse = function(html) {
        var $ = cheerio.load(html);
        var anime = {};

        // Extract the name from our DOM
        anime.title = $('h1').first().contents().filter(function() { return this.name === 'span' || this.type !== 'tag'; }).text().trim();

        if (String(anime.title).toLowerCase() === '404 not found') {
            return anime;
        }

        anime.title_english = [];
        var englishTitles = $(".dark_text:contains('English:')").parent().text().substring(8 + 1).split(",");
        for (var title in englishTitles) anime.title_english.push(englishTitles[title].trim());

        anime.title_synonym = [];
        var synonymTitles = $(".dark_text:contains('Synonyms:')").parent().text().substring(9 + 1).split(",");
        for (var title in synonymTitles) anime.title_synonym.push(synonymTitles[title].trim());

        anime.title_japanese = [];
        var japaneseTitles = $(".dark_text:contains('Japanese:')").parent().text().substring(9 + 1).split(",");
        for (var title in japaneseTitles) anime.title_japanese.push(japaneseTitles[title].trim());

        anime.poster = $('.borderClass img').attr('src');
        anime.type = $(".dark_text:contains('Type:')").parent().text().substring(5 + 1);

        anime.episodes = parseNum($(".dark_text:contains('Episodes:')").parent().text().substring(9 + 1).replace(/(\r\n|\n|\r|\t)/gm, "").trim());

        anime.status = $(".dark_text:contains('Status:')").parent().text().substring(7 + 1);
        anime.aired = $(".dark_text:contains('Aired:')").parent().text().substring(6 + 1);

        anime.producers = [];
        var producers = $(".dark_text:contains('Producers:')").parent().text().substring(9 + 1).split(",");
        for (var producer in producers) anime.producers.push(producers[producer].trim());

        anime.genres = [];
        var englishGenres = $(".dark_text:contains('Genres:')").parent().text().substring(7 + 4).split(",");
        for (var genre in englishGenres) anime.genres.push(englishGenres[genre].trim());

        anime.duration = $(".dark_text:contains('Duration:')").parent().first().contents().filter(function() { return this.type !== 'tag'; }).text().trim();

        anime.synopsis = parseSynopsisBackground($, $("h2:contains('Synopsis')"));
        anime.background = parseSynopsisBackground($, $("h2:contains('Background')"));

        anime.mal_rating = $(".dark_text:contains('Rating:')").parent().first().contents().filter(function() { return this.type !== 'tag'; }).text().trim();

        var objRelated = $("h2:contains('Related Anime')");


        anime.mal_related_sequel = parseUrlBatch($, 'Sequel');
        anime.mal_related_prequel = parseUrlBatch($, 'Prequel');
        anime.mal_related_alternative_setting = parseUrlBatch($, 'Alternative setting');
        anime.mal_related_alternative_version = parseUrlBatch($, 'Alternative version');
        anime.mal_related_side_story = parseUrlBatch($, 'Side story');
        anime.mal_related_parent_story = parseUrlBatch($, 'Parent story');
        anime.mal_related_full_story = parseUrlBatch($, 'Full story');
        anime.mal_related_spin_off = parseUrlBatch($, 'Spin-off');
        anime.mal_related_other = parseUrlBatch($, 'Other');
        anime.mal_related_adaptation = parseUrlBatch($, 'Adaptation');
        anime.mal_related_side_story = parseUrlBatch($, 'Side story');
        anime.mal_related_character = parseUrlBatch($, 'Character');
        anime.mal_related_summary = parseUrlBatch($, 'Summary');

        var objScore = $(".dark_text:contains('Score:')");
        anime.mal_score = parseNum(objScore.next().text().trim());
        anime.mal_score_users = parseNum(objScore.parent().find('small').find('span').text());

        anime.mal_rank = parseNum($(".dark_text:contains('Ranked:')").parent().first().contents().filter(function() { return this.type !== 'tag'; }).text().trim().substring(1));
        anime.mal_popularity = parseNum($(".dark_text:contains('Popularity:')").parent().first().contents().filter(function() { return this.type !== 'tag'; }).text().trim().substring(1));
        anime.mal_members = parseNum($(".dark_text:contains('Members:')").parent().first().contents().filter(function() { return this.type !== 'tag'; }).text().trim().replace(/,/g, ""));
        anime.mal_favorites = parseNum($(".dark_text:contains('Favorites:')").parent().first().contents().filter(function() { return this.type !== 'tag'; }).text().trim().replace(/,/g, ""));

        /*// Grab Alternative Titles (English, Synonyms, Japanese)
        anime.titles = {};
        anime.titles.english = [];
        anime.titles.synonyms = [];
        anime.titles.japanese = [];

        var altEnglish = "English:";
        var englishTitles = $(".dark_text:contains('English:')").parent().text().substring(altEnglish.length + 1).split(",");
        for (var title in englishTitles) anime.titles.english.push(englishTitles[title].trim());

        var altSynonyms = "Synonyms:";
        var synonymTitles = $(".dark_text:contains('Synonyms:')").parent().text().substring(altSynonyms.length + 1).split(",");
        for (var title in synonymTitles) anime.titles.synonyms.push(synonymTitles[title].trim());

        var altJapanese = "Japanese:";
        var japaneseTitles = $(".dark_text:contains('Japanese:')").parent().text().substring(altJapanese.length + 1).split(",");
        for (var title in japaneseTitles) anime.titles.japanese.push(japaneseTitles[title].trim());

        // Get the poster
        anime.poster = $('.borderClass img').attr('src');

        // Get the summary of the show
        anime.synopsis = $("h2:contains('Synopsis')").parent().text().substring(8);

        // We can grab some stats here
        var type = "Type:";
        anime.type = $(".dark_text:contains('Type:')").parent().text().substring(type.length + 1);

        var status = "Status:";
        var textStatus = $(".dark_text:contains('Status:')").parent().text().substring(status.length + 1);

        anime.status = 0;
        if (textStatus.toLowerCase().indexOf("finished") > -1)
            anime.status = 2;
        else if (textStatus.toLowerCase().indexOf("current") > -1)
            anime.status = 1;

        var episodes = "Episodes:";
        anime.episodes = $(".dark_text:contains('Episodes:')").parent().text().substring(episodes.length + 1).replace(/(\r\n|\n|\r|\t)/gm, "").trim();

        if (isNaN(anime.episodes))
            anime.episodes = -1;

        var airDate = "Aired:";
        var airArr = $(".dark_text:contains('Aired:')").parent().text().substring(airDate.length + 1).split("to");

        var airJSDate = Date.parse(airArr[0]);
        if (isNaN(airJSDate))
            airJSDate = null;

        anime.airDate = airJSDate;


        anime.genres = []

        var genres = "Genres:";
        var englishGenres = $(".dark_text:contains('Genres:')").parent().text().substring(genres.length + 4).split(",");
        for (var genre in englishGenres)
            anime.genres.push(englishGenres[genre].trim());

        anime.malstats = {};

        var rating = "Rating:";
        anime.malstats.rating = $(".dark_text:contains('Rating:')").parent().text().substring(rating.length + 4);

        var rank = "Ranked:";
        anime.malstats.rank = $(".dark_text:contains('Ranked:')").parent().first().contents().filter(function() {
            return this.type !== 'tag';
        }).text().trim().substring(1);

        anime.malstats.score = $(".dark_text:contains('Score:')").parent().first().contents().filter(function() {
            return this.type !== 'tag';
        }).text().trim();*/

        return anime;
    };

    return Anime;
}()));
