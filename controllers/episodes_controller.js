var mongoose = require('mongoose'),
    Show = mongoose.model('episodes');
exports.getShows = function(req, res) {
    Show.find({Suggestion:false, DeletedDate: {"$exists" : false}}).sort({ShowingStartTime:-1}).limit(100)
        .exec(function(err, shows) {
            if (!shows) {
                res.json(404, {msg: 'Shows Not Found.'});
            } else {
                res.json(shows);
            }
        });
};
exports.markShowAsWatched = function(req, res) {
  Show.update({_id: req.body.episodeId}, {$set:{Watched:req.body.watched}})
      .exec(function(err, savedEpisode) {
          if (err) {
              res.json(404, {msg: 'Failed to update Episode as watched.'});
          } else {
              res.json({msg: "success"});
          }
      });
};