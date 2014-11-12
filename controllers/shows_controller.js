var mongoose = require('mongoose'),
    Show = mongoose.model('episodes');
exports.getShows = function(req, res) {
    Show.find({Title:"Talking Dead"}).sort({ShowingStartTime:-1})
        .exec(function(err, shows) {
            if (!shows) {
                res.json(404, {msg: 'Shows Not Found.'});
            } else {
                res.json(shows);
            }
        });
};