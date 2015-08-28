var xport = require('node-xport')(module),
    request = require('request');

xport((function() {
    function MAL() {}

    MAL.contentByName = function(name, callback, objectType) {
        objectType.lookup(name, function(err, mal_id) {
            if (err) {
                return callback(err);
            }

            objectType.byId(mal_id, callback);
        });
    };

    MAL.contentDownload = function(id, callback, urlType, parser) {
        request({
            url: 'http://myanimelist.net/' + urlType + '/' + id,
            headers: {
                'User-Agent': 'api-team-692e8861471e4de2fd84f6d91d1175c0'
            },
            timeout: 3000
        }, function(error, response, body) {
            if (error) {
                return callback(error);
            }

            var object = parser.parse(body);
            if (object !== null) {
                object['mal_id'] = id;
            }

            callback(object);
        });
    };

    // export our class
    return MAL;
})());
