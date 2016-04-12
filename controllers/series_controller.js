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

  var sql = "UPDATE series SET tier = $1 WHERE id = $2";

  executeQueryNoResults(response, sql, [tier, seriesId]);
};

exports.addSeries = function(req, res, next) {
  console.log("Entered addSeries server call.");

  var seriesObj = req.body.series;

  var seriesName = seriesObj.title
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
          callback(err, seriesObj, tvdbId);
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

    var sql = "INSERT INTO tvdb_series (" +
      "tvdb_id, name, airs_day_of_week, airs_time, first_aired, network, overview, " +
      "rating, rating_count, runtime, status, poster) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)";

    console.log(sql);

    executeQueryNoResults(res, sql, [
      series.tvdb_id,
      series.tvdbName,
      series.tvdbAirsDayOfWeek,
      series.tvdbAirsTime,
      series.tvdbFirstAired,
      series.tvdbNetwork,
      series.tvdbOverview,
      series.tvdbRating,
      series.tvdbRatingCount,
      series.tvdbRuntime,
      series.tvdbStatus,
      series.tvdbPoster
    ]);

  });


};

exports.updateSeries = function(req, response) {
  console.log("Update Series with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = buildUpdateQueryConfig(req.body.ChangedFields, "series", req.body.SeriesId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return executeQueryNoResults(response, queryConfig.text, queryConfig.values);
};

exports.updateEpisode = function(req, response) {
  console.log("Update Episode with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = buildUpdateQueryConfig(req.body.ChangedFields, "episode", req.body.EpisodeId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return executeQueryNoResults(response, queryConfig.text, queryConfig.values);
};

exports.updateMultipleEpisodes = function(req, response) {
  console.log("Update Multiple Episodes with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = buildUpdateQueryConfigMultiple(req.body.ChangedFields, "episode", req.body.AllEpisodeIds);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return executeQueryNoResults(response, queryConfig.text, queryConfig.values);
};

exports.markAllEpisodesAsWatched = function(req, res) {
  var seriesId = req.body.SeriesId;
  var lastWatched = req.body.LastWatched;

  if (lastWatched == null) {
    return markAllWatched(res, seriesId);
  } else {
    return markPastWatched(res, seriesId, lastWatched);
  }
};

function markAllWatched(response, seriesId) {
  console.log("Updating all episodes as Watched");

  var sql = 'UPDATE episode ' +
    'SET watched = $1 ' +
    'WHERE seriesid = $2 ' +
    'AND on_tivo = $3 ' +
    'AND watched <> $4 ' +
    'AND season <> $5 ';

  var values = [true, // watched
    seriesId, // series_id
    true, // on_tivo
    true, // !watched
    0 // !season
  ];

  return executeQueryNoResults(response, sql, values)
  // todo: do both updates in a single server call (MM-134)
/*
  .then(function() {
    var sql = 'UPDATE series ' +
      'SET unwatched_episodes = $1, last_unwatched = $2 ' +
      'WHERE id = $3';

    executeQueryNoResults(res, sql, [0, null, seriesId]);
  })
*/

    ;
}

function markPastWatched(response, seriesId, lastWatched) {
  console.log("Updating episodes as Watched, before " + lastWatched);

  var sql = 'UPDATE episode ' +
    'SET watched = $1 ' +
    'WHERE seriesid = $2 ' +
    'AND tvdb_episode_id is not null ' +
    'AND air_date < $3 ' +
    'AND watched <> $4 ' +
    'AND season <> $5 ';

  var values = [true, // watched
    seriesId, // series_id
    lastWatched, // air_date <
    true, // !watched
    0 // !season
  ];

  return executeQueryNoResults(response, sql, values);
}

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

function buildUpdateQueryConfig(changedFields, tableName, rowID) {

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

// todo: doesn't quite work right
function buildUpdateQueryConfigMultiple(changedFields, tableName, rowIDs) {

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

  sql += " WHERE id IN (";

  var startIndex = i;
  for(var rowID in rowIDs) {
    if (i != startIndex) {
      sql += ", ";
    }

    sql += ("$" + i);
    values.push(rowID);

    i++;
  }

  sql += ")";

  console.log(sql);

  return {
    text: sql,
    values: values
  };
}


