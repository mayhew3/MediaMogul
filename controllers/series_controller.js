var xml2js = require('xml2js');
var async = require('async');
var request = require('request');
var mongoose = require('mongoose'),
  Series = mongoose.model('series'),
  Episodes = mongoose.model('episodes');
var pg = require('pg');
var config = process.env.DATABASE_URL;

exports.getSeries = function(request, response) {
  console.log("Series call received.");

  var sql = 'SELECT s.*, tvs.poster ' +
    'FROM series s ' +
    'LEFT OUTER JOIN tvdb_series tvs ' +
    ' ON s.tvdb_series_id = tvs.id ' +
    'ORDER BY s.title';

  return executeQueryWithResults(response, sql, []);
};

exports.getEpisodes = function(req, response) {
  console.log("Episode call received. Params: " + req.query.SeriesId);

  var sql = 'SELECT e.*, ' +
    'te.episode_number as tvdb_episode_number, ' +
    'te.name as tvdb_episode_name, ' +
    'ti.deleted_date as tivo_deleted_date, ' +
    'ti.suggestion as tivo_suggestion ' +
    'FROM episode e ' +
    'LEFT OUTER JOIN tvdb_episode te ' +
    ' ON e.tvdb_episode_id = te.id ' +
    'LEFT OUTER JOIN tivo_episode ti ' +
    ' ON e.tivo_episode_id = ti.id ' +
    'WHERE e.seriesid = $1 ' +
    'ORDER BY e.season, te.episode_number';

  return executeQueryWithResults(response, sql, [req.query.SeriesId]);
};

exports.changeTier = function(req, response) {
  var tier = req.body.tier;
  var seriesId = req.body.SeriesId;

  console.log("Updating series " + seriesId + " to Tier " + tier);

  if (client == null) {
    return console.error('null client');
  }

  client.connect(function(err) {
    if (err) {
      return console.error('could not connect to postgres', err);
    }

    var sql = "UPDATE series SET tier = $1 WHERE id = $2";
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
exports.updateSeries = function(req, response) {
  console.log("Update Series with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = buildQueryConfig(req.body.ChangedFields, "series", req.body.SeriesId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  executeQueryNoResults(response, queryConfig.text, queryConfig.values);
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
    on_tivo: true,
    watched: {$ne: true},
    season: {$ne: 0}
  };
  var updateFields = {watched: true, WatchedDate: new Date};

  if (lastWatched != null) {
    conditions = {
      SeriesId: seriesId,
      tvdbEpisodeId: {$exists: true},
      air_date: {$lt: lastWatched},
      season: {$ne: 0}
    };
    updateFields = {watched: true};
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

// utility methods


function executeQueryWithResults(response, sql, values) {
  var results = [];

  var queryConfig = {
    text: sql,
    values: values
  };

  var client = new pg.Client(config);
  if (client == null) {
    return console.error('null client');
  }

  client.connect(function(err) {
    if (err) {
      return console.error('could not connect to postgres', err);
    }

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
}


function executeQueryNoResults(response, sql, values) {

  var queryConfig = {
    text: sql,
    values: values
  };

  var client = new pg.Client(config);
  if (client == null) {
    return console.error('null client');
  }

  client.connect(function(err) {
    if (err) {
      return console.error('could not connect to postgres', err);
    }

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
}

function buildQueryConfig(changedFields, tableName, rowID) {

  var sql = "UPDATE " + tableName + " SET ";
  var values = [];
  var i = 1;
  for (var key in changedFields) {
    if (changedFields.hasOwnProperty(key)) {
      if (values.length != 0) {
        sql += ", ";
      }

      sql += (key + " = $" + i);

      var value = changedFields[key];
      values.push(value);

      i++;
    }
  }

  sql += (" WHERE id = $" + i);

  values.push(rowID);

  return {
    text: sql,
    values: values
  };
}


