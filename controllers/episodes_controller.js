var mongoose = require('mongoose'),
  Episode = mongoose.model('episodes');
exports.getEpisodes = function(req, res) {
    Episode.find({Suggestion:false, DeletedDate: {"$exists" : false}}).sort({ShowingStartTime:-1})
      .exec(function(err, episodes) {
          if (!episodes) {
              res.status(404).json({msg: 'Episodes Not Found.'});
          } else {
              res.json(episodes);
          }
      });
};
exports.markEpisodeAsWatched = function(req, res) {
    Episode.update({_id: req.body.episodeId}, {Watched:req.body.watched})
      .exec(function(err, savedEpisode) {
          if (err) {
              res.status(404).json({msg: 'Failed to update Episode as watched.'});
          } else {
              res.json({msg: "success"});
          }
      });
};
exports.markAllEpisodesAsWatched = function(req, res) {
  console.log('Received update for series ' + req.body.SeriesId);
  Episode.where()
    .setOptions({multi: true})
    .update({SeriesId: req.body.SeriesId}, {$set: {Watched:true}})
    .exec(function(err, series) {
      if (err) {
        res.status(404).json({msg: 'Failed to update Series as watched.'});
      } else {
        console.log("updated " + series);
        res.json({msg: "success"});
      }
    });
};