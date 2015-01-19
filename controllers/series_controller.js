var xml2js = require('xml2js');
var async = require('async');
var request = require('request');
var lodash = require('lodash');
var mongoose = require('mongoose'),
  Series = mongoose.model('series'),
  Episodes = mongoose.model('episodes');
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
exports.getEpisodes = function(req, res) {
  console.log("Episode call received. Params: " + req.query.SeriesId);

  Episodes.find({SeriesId:req.query.SeriesId}).sort({tvdbSeason:1, tvdbEpisodeNumber:1})
    .exec(function(err, episodes) {
      if (!episodes) {
        res.json(404, {msg: 'Episodes not found.'});
      } else {
        res.json(episodes);
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
exports.addSeries = function(req, res, next) {
  var seriesObj = req.body.series;
  var series = new Series(seriesObj);

  var seriesName = series.SeriesTitle
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/[^\w-]+/g, '');
  var apiKey = '04DBA547465DC136';

  console.log("Entering start of method for series " + seriesName);

  var parser = xml2js.Parser({
    explicitArray: false,
    normalizeTags: true
  });

  async.waterfall([
    function(callback) {
      request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + seriesName, function (error, response, body) {
        if (error) return next(error);
        parser.parseString(body, function(err, result) {
          if (!result.data.series) {
            return res.send(400, { message: seriesName + ' was not found.' });
          }
          var tvdbId = result.data.series.seriesid || result.data.series[0].seriesid;
          console.log("Found ID on TVDB! Id is " + tvdbId);
          callback(err, series, tvdbId);
        });
      });
    },
    function (existingSeries, tvdbId, callback) {
      request.get('http://thetvdb.com/api/' + apiKey + '/series/' + tvdbId + '/all/en.xml', function (error, response, body) {
        if (error) return next(error);

        parser.parseString(body, function (err, result) {
          var series = result.data.series;
          var episodes = result.data.episode;

          existingSeries.tvdbId = series.id;
          existingSeries.tvdbName = series.seriesname;
          existingSeries.tvdbAirsDayOfWeek = series.airs_dayofweek;
          existingSeries.tvdbAirsTime = series.airs_time;
          existingSeries.tvdbFirstAired = series.firstaired;
          existingSeries.tvdbGenre = series.genre.split('|').filter(Boolean);
          existingSeries.tvdbNetwork = series.network;
          existingSeries.tvdbOverview = series.overview;
          existingSeries.tvdbRating = series.rating;
          existingSeries.tvdbRatingCount = series.ratingcount;
          existingSeries.tvdbRuntime = series.runtime;
          existingSeries.tvdbStatus = series.status;
          existingSeries.tvdbPoster = series.poster;
          lodash.each(episodes, function (episode) {
            existingSeries.tvdbEpisodes.push({
              tvdbSeason: episode.seasonnumber,
              tvdbEpisodeNumber: episode.episodenumber,
              tvdbEpisodeName: episode.episodename,
              tvdbFirstAired: episode.firstaired,
              tvdbOverview: episode.overview
            });
          });

          callback(err, existingSeries);
        });
      });
    },
    function (series, callback) {
      var url = 'http://thetvdb.com/banners/' + series.tvdbPoster;
      request({ url: url, encoding: null }, function (error, response, body) {
        series.tvdbPoster = 'data:' + response.headers['content-type'] + ';base64,' + body.toString('base64');
        callback(error, series);
      });
    }
  ], function (err, series) {
    if (err) return next(err);

    series.save(function(err) {
      if (err) {
        res.json(404, {msg: 'Failed to insert Series.'});
      } else {
        res.json({msg: "success"});
      }
    });

  });


};
exports.updateSeries = function(req, res) {
  console.log("Update Series with " + JSON.stringify(req.body.ChangedFields));
  Series.update({_id: req.body.SeriesId}, req.body.ChangedFields)
    .exec(function(err, savedSeries) {
      if (err) {
        res.json(404, {msg: 'Failed to update Series with new fields.'});
      } else {
        res.json({msg: "success"});
      }
    });
};
exports.updateEpisode = function(req, res) {
  console.log("Update Episode with " + JSON.stringify(req.body.ChangedFields));
  Episodes.update({_id: req.body.EpisodeId}, req.body.ChangedFields)
    .exec(function(err) {
      if (err) {
        res.json(404, {msg: 'Failed to update Episode with new fields.'});
      } else {
        res.json({msg: "success"});
      }
    });
};
exports.updateMultipleEpisodes = function(req, res) {
  Episodes.update({_id: {$in: req.body.AllEpisodeIds}}, req.body.ChangedFields, {multi:true})
    .exec(function(err) {
      if (err) {
        res.json(404, {msg: 'Failed to update Episode with new fields.'});
      } else {
        res.json({msg: "success"});
      }
    });
};
exports.markAllEpisodesAsWatched = function(req, res) {
  var seriesId = req.body.SeriesId;
  console.log("Updating episodes as Watched.");

  Episodes.update({SeriesId:seriesId, OnTiVo:true, Watched:{$ne:true}},
                  {Watched:true, WatchedDate:new Date},
                  {multi:true})
    .exec(function(err) {
      if (err) {
        res.json(404, {msg: 'Failed to update Episode with new fields.'});
      } else {
        console.log("Updating series.");
        Series.update({_id:seriesId}, {UnwatchedEpisodes:0})
          .exec(function(err) {
            if (err) {
              res.json(404, {msg: 'Failed to update Series with new fields.'});
            } else {
              res.json({msg: "Success."});
            }
          })
      }
    });
};
