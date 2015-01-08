var mongoose = require('mongoose'),
  Series = mongoose.model('series');
exports.getSeries = function(req, res) {
    Series.find({IsEpisodic:true}).sort({SeriesTitle:1})
      .exec(function(err, series) {
          if (!series) {
              res.json(404, {msg: 'Series Not Found.'});
          } else {
              res.json(series);
          }
      });
};
exports.changeTier = function(req, res) {
    Series.update({_id: req.body.SeriesId}, {$set:{Tier:req.body.Tier}})
      .exec(function(err, savedSeries) {
          if (err) {
              res.json(404, {msg: 'Failed to update Series with new Tier.'});
          } else {
              res.json({msg: "success"});
          }
      });
};
exports.updateSeries = function(req, res) {
  Series.update({_id: req.body.SeriesId}, req.body.ChangedFields)
    .exec(function(err, savedSeries) {
      if (err) {
        res.json(404, {msg: 'Failed to update Series with new fields.'});
      } else {
        res.json({msg: "success"});
      }
    });
};