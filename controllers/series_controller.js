var xml2js = require('xml2js');
var async = require('async');
var request = require('request');
var lodash = require('lodash');
var mongoose = require('mongoose'),
  Series = mongoose.model('series'),
  Episodes = mongoose.model('episodes');
var pg = require('pg');

exports.getSeries = function(request, response) {
  var results = [];

  var config = process.env.DATABASE_URL;
  console.log("Database URL: " + config);

  var client = new pg.Client(config);
  if (client == null) {
    return console.error('null client');
  }

  client.connect(function(err) {
    if (err) {
      return console.error('could not connect to postgres', err);
    }

    var query = client.query(
      'SELECT * ' +
      'FROM series ' +
      'ORDER BY title');

    query.on('row', function(row) {
      results.push(row);
    });

    query.on('end', function() {
      client.end();
      return response.json(results);
    });

    if (err) {
      console.error(err);
      response.send("Error " + err);
    }
  })
};

exports.getEpisodes = function(req, res) {
  console.log("Episode call received. Params: " + req.query.SeriesId);

  var results = [];

  pg.connect(process.env.DATABASE_URL, function(err, client) {
    var sql = 'SELECT * ' +
      'FROM episode ' +
      'WHERE seriesid = $1' +
      'ORDER BY season, episode_number';

    var queryConfig = {
      text: sql,
      values: [req.query.SeriesId]
    };

    var query = client.query(queryConfig);

    query.on('row', function(row) {
      results.push(row);
    });

    query.on('end', function() {
      client.end();
      return response.json(results);
    });

    if (err) {
      console.error(err);
      response.send("Error " + err);
    }
  })
};
exports.changeTier = function(req, response) {
  var tier = req.body.tier;
  var seriesId = req.body.SeriesId;

  console.log("Updating series " + seriesId + " to Tier " + tier);

  var sql = "UPDATE series SET tier = $1 WHERE id = $2";

  pg.connect(process.env.DATABASE_URL, function(err, client) {

    var queryConfig = {
      text: sql,
      values: [tier, seriesId]
    };

    var query = client.query(queryConfig);

    query.on('end', function() {
      client.end();
      return response.json({msg: "Success"});
    });

    if (err) {
      console.error(err);
      response.send("Error " + err);
    }
  });
};
exports.addSeries = function(req, res, next) {
  var seriesObj = req.body.series;
  var series = new Series(seriesObj);

  var seriesName = series.title
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

          existingSeries.tvdb_id = series.id;
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

          callback(err, existingSeries);
        });
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
  var lastWatched = req.body.LastWatched;
  console.log("Updating episodes as Watched, before " + lastWatched);

  var conditions = {
    SeriesId: seriesId,
    OnTiVo: true,
    Watched: {$ne: true},
    tvdbSeason: {$ne: 0}
  };
  var updateFields = {Watched: true, WatchedDate: new Date};

  if (lastWatched != null) {
    conditions = {
      SeriesId: seriesId,
      tvdbEpisodeId: {$exists: true},
      tvdbFirstAired: {$lt: lastWatched},
      tvdbSeason: {$ne: 0}
    };
    updateFields = {Watched: true};
  }

  Episodes.update(conditions, updateFields, {multi:true})
    .exec(function(err) {
      if (err) {
        res.json(404, {msg: 'Failed to update Episode with new fields.'});
      } else {
        console.log("Updating series.");
        if (lastWatched == null) {
          Series.update({_id: seriesId}, {UnwatchedEpisodes: 0, LastUnwatched: null})
            .exec(function (err) {
              if (err) {
                res.json(404, {msg: 'Failed to update Series with new fields.'});
              } else {
                res.json({msg: "Success."});
              }
            })
        } else {
          res.json({msg: "Success."});
        }
      }
    });
};
exports.matchTiVoEpisodes = function(req, res) {
  var tivoEpisode = req.body.Episode;
  var tvdbEpisodeIds = req.body.TVDBEpisodeIds;

  console.log("Trying to match TVDB IDs " + tvdbEpisodeIds + " to episode " + JSON.stringify(tivoEpisode));

  Episodes.update({TiVoProgramId: tivoEpisode.TiVoProgramId},
                  {MatchingStump:true})
    .exec(function(err) {
      if (err) {
        res.json(404, {msg: 'Failed to update Episode with MatchingStump.'});
      } else {
        Episodes.update({tvdbEpisodeId: {$in: tvdbEpisodeIds}},
                        tivoEpisode,
                        {multi:true})
          .exec(function(err) {
            if (err) {
              res.json(404, {msg: 'Failed to update Episode with new fields.'});
            } else {
              // todo: update denorms.

              res.json({msg: "Success"});
            }
          });
      }
    });

};
