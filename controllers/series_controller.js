var xml2js = require('xml2js');
var async = require('async');
var request = require('request');
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
    'ti.suggestion as tivo_suggestion, ' +
    'ti.showing_start_time as showing_start_time, ' +
    'ti.episode_number as tivo_episode_number, ' +
    'ti.title as tivo_title, ' +
    'ti.description as tivo_description, ' +
    'ti.id as tivo_episode_id ' +
    'FROM episode e ' +
    'LEFT OUTER JOIN tvdb_episode te ' +
    ' ON e.tvdb_episode_id = te.id ' +
    'LEFT OUTER JOIN edge_tivo_episode ete ' +
    ' ON e.id = ete.episode_id ' +
    'LEFT OUTER JOIN tivo_episode ti ' +
    ' ON ete.tivo_episode_id = ti.id ' +
    'WHERE e.seriesid = $1 ' +
    'AND e.retired = $2 ' +
    'ORDER BY e.season, te.episode_number';

  return executeQueryWithResults(response, sql, [req.query.SeriesId, 0]);
};

exports.getPossibleMatches = function(req, response) {
  console.log("Episode call received. Params: " + req.query.SeriesId);

  var sql = 'SELECT psm.* ' +
    'FROM possible_series_match psm ' +
    'WHERE psm.series_id = $1';

  return executeQueryWithResults(response, sql, [req.query.SeriesId]);
};

exports.getViewingLocations = function(req, response) {
  console.log("Getting all possible viewing locations.");

  var sql = 'SELECT * FROM viewing_location';

  return executeQueryWithResults(response, sql, []);
};

exports.getUnmatchedEpisodes = function(req, response) {
  console.log("Unmatched Episode call received. Params: " + req.query.TiVoSeriesId);

  var sql = 'SELECT te.* ' +
  'FROM tivo_episode te ' +
  'WHERE te.tivo_series_id = $1 ' +
    'AND te.retired = $2 ' +
    'AND id not in (select ete.tivo_episode_id from edge_tivo_episode ete)';

  return executeQueryWithResults(response, sql, [req.query.TiVoSeriesId, 0]);
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
            seriesObj.tvdb_series_id = null;
            return insertSeries(seriesObj, res);
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

    var tvdb_id = series.tvdb_id;

    if (tvdb_id == null) {
      console.log("tvdb_id is null, so not inserting into tvdb_series.");
      return insertSeries(series, res);
    }

    var sql = "INSERT INTO tvdb_series (" +
      "tvdb_id, name, airs_day_of_week, airs_time, first_aired, network, overview, " +
      "rating, rating_count, runtime, status, poster, date_added) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) " +
      "RETURNING id";

    console.log(sql);

    var values = [
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
      series.tvdbPoster,
      new Date
    ];

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

      client.query(queryConfig, function(err, result) {
        if (err) {
          console.error(err);
          response.send("Error " + err);
        }
        console.log("tvdb_series insert successful.");

        // NOTE: This only works because the query has "RETURNING id" at the end.
        series.tvdb_series_id = result.rows[0].id;

        console.log("tvdb_series_id found: " + series.tvdb_series_id);
        return insertSeries(series, res);
      });

    });


  });


};

var insertSeries = function(series, response) {
  console.log("Inserting series.");

  var sql = "INSERT INTO series (" +
    "title, tier, metacritic, tvdb_series_id, tvdb_id, my_rating, date_added) " +
    "VALUES ($1, $2, $3, $4, $5, $6, $7) " +
    "RETURNING id ";
  var values = [
    series.title,
    series.tier,
    series.metacritic,
    series.tvdb_series_id,
    series.tvdb_id,
    series.my_rating,
    new Date
  ];

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

    client.query(queryConfig, function(err, result) {
      if (err) {
        console.error(err);
        response.send("Error " + err);
      }
      console.log("series insert successful.");

      // NOTE: This only works because the query has "RETURNING id" at the end.
      series.id = result.rows[0].id;

      console.log("series id found: " + series.id);
      return insertSeriesViewingLocation(series.id, series.ViewingLocations[0].id, response);
    });

  });

};

exports.getSeriesViewingLocations = function(req, response) {
  console.log("Episode call received. Params: " + req.query.SeriesId);

  var seriesId = req.query.SeriesId;

  var sql = 'SELECT vl.* ' +
    'FROM series_viewing_location svl ' +
    'INNER JOIN viewing_location vl ' +
    ' ON svl.viewing_location_id = vl.id ' +
    'WHERE svl.series_id = $1';

  return executeQueryWithResults(response, sql, [seriesId]);
};

exports.addViewingLocation = function(req, response) {
  return insertSeriesViewingLocation(req.body.SeriesId, req.body.ViewingLocationId, response);
};

exports.removeViewingLocation = function(req, response) {
  var seriesId = req.body.SeriesId;
  var viewingLocationId = req.body.ViewingLocationId;

  var sql = "DELETE FROM series_viewing_location " +
    "WHERE series_id = $1 AND viewing_location_id = $2";

  return executeQueryNoResults(response, sql, [seriesId, viewingLocationId]);
};

var insertSeriesViewingLocation = function(seriesId, viewingLocationId, response) {

  console.log("Adding viewing_location " + viewingLocationId + " to series " + seriesId);

  var sql = 'INSERT INTO series_viewing_location (series_id, viewing_location_id, date_added) ' +
    'VALUES ($1, $2, now())';

  return executeQueryNoResults(response, sql, [seriesId, viewingLocationId]);
};

exports.changeEpisodesStreaming = function(req, response) {
  var seriesId = req.body.SeriesId;
  var streaming = req.body.Streaming;

  console.log("Updating episodes of series " + seriesId + " to streaming: " + streaming);

  var sql = "UPDATE episode " +
    "SET streaming = $1 " +
    "WHERE seriesid = $2 " +
    "AND season <> $3";

  return executeQueryNoResults(response, sql, [streaming, seriesId, 0]);
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

exports.retireTiVoEpisode = function(req, response) {
  console.log("Retiring tivo_episode with id " + req.body.TiVoEpisodeId);

  var sql = 'UPDATE tivo_episode SET retired = id WHERE id = $1';

  return executeQueryNoResults(response, sql, [req.body.TiVoEpisodeId]);
};

exports.matchTiVoEpisodes = function(req, response) {
  var tivoEpisodeId = req.body.TiVoID;
  var tvdbEpisodeIds = req.body.TVDBEpisodeIds;

  insertEdgeRow(tivoEpisodeId, tvdbEpisodeIds).then(function(result, err) {
    if (err) {
      console.error(err);
      return response.send("Error " + err);
    }

    updateOnTivo(tvdbEpisodeIds, true).then(function(result, err) {
      if (err) {
        console.error(err);
        return response.send("Error " + err);
      }

      response.json({msg: "Success!"});
    });
  });

};


exports.unlinkEpisode = function(req, response) {
  var episodeId = req.body.EpisodeId;

  console.log("Retiring all edge rows pointing at " + episodeId);

  retireEdgeRows(episodeId).then(function(result, err) {
    if (err) {
      console.error(err);
      return response.send("Error " + err);
    }

    updateOnTivo([episodeId], false).then(function(results, err) {
      if (err) {
        console.error(err);
        return response.send("Error " + err);
      }

      response.json({msg: "Success!"});
    })
  })

};

function insertEdgeRow(tivoEpisodeId, tvdbEpisodeIds) {
  var wildcards = [];
  var index = 1;
  tvdbEpisodeIds.forEach(function() {
    wildcards.push("$" + index);
    index++;
  });

  var wildCardString = wildcards.join(', ');

  console.log("Trying to match TVDB IDs " + tvdbEpisodeIds + " to episode " + tivoEpisodeId);

  var sql = 'INSERT INTO edge_tivo_episode (tivo_episode_id, episode_id) ' +
    'SELECT $' + index + ', id ' +
    'FROM episode ' +
    'WHERE id IN (' + wildCardString + ")";

  var values = tvdbEpisodeIds.slice();
  values.push(tivoEpisodeId);

  console.log("SQL:" + sql);
  console.log("Values:" + values);

  return updateNoJSON(sql, values);
}

function retireEdgeRows(episodeId) {
  console.log("Retiring edge rows to episode " + episodeId);

  var sql = 'DELETE FROM edge_tivo_episode ' +
    'WHERE episode_id = $1 ';

  var values = [episodeId];

  console.log("SQL:" + sql);
  console.log("Values:" + values);

  return updateNoJSON(sql, values);
}

function updateOnTivo(tvdbEpisodeIds, onTiVoValue) {
  var wildcards = [];
  var index = 1;
  tvdbEpisodeIds.forEach(function() {
    wildcards.push("$" + index);
    index++;
  });

  var wildCardString = wildcards.join(', ');

  console.log("Trying to update episode.OnTivo column for " + tvdbEpisodeIds + ".");

  var sql = 'UPDATE episode ' +
    'SET on_tivo = $' + index + ' ' +
    'WHERE id IN (' + wildCardString + ")";

  var values = tvdbEpisodeIds.slice();
  values.push(onTiVoValue);

  console.log("SQL:" + sql);
  console.log("Values:" + values);

  return updateNoJSON(sql, values);
}

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

function updateNoJSON(sql, values) {
  return new Promise(function(resolve, reject) {

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
        console.error(err);
        reject(Error(err));
      }

      var query = client.query(queryConfig);

      query.on('end', function() {
        client.end();
        resolve("Success!");
      });

    });

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


