var mongoose = require('mongoose'),
  Episode = mongoose.model('episodes');
exports.getEpisodes = function(req, res) {
    Episode.find({Suggestion:false, DeletedDate: {"$exists" : false}}).sort({ShowingStartTime:-1})
      .exec(function(err, episodes) {
          if (!episodes) {
              res.json(404, {msg: 'Episodes Not Found.'});
          } else {
              res.json(episodes);
          }
      });
};
exports.markEpisodeAsWatched = function(req, res) {
    Episode.update({_id: req.body.episodeId}, {$set:{Watched:req.body.watched}})
      .exec(function(err, savedEpisode) {
          if (err) {
              res.json(404, {msg: 'Failed to update Episode as watched.'});
          } else {
              res.json({msg: "success"});
          }
      });
};