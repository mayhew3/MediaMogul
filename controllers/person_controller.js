var pg = require('pg');
var _ = require('underscore');
var config = process.env.DATABASE_URL;

exports.getPersonInfo = function(request, response) {
  var email = request.query.email;
  console.log("User call received: " + email);

  var sql = 'SELECT p.* ' +
          'FROM person p ' +
          'WHERE p.email = $1 ' +
          'AND p.retired = $2 ';

  return executeQueryWithResults(response, sql, [email, 0]);
};

exports.addPerson = function(request, response) {
  var person = request.body.Person;

  var sql = "INSERT INTO person " +
          "(email, first_name, last_name) " +
          "VALUES ($1, $2, $3) " +
          "RETURNING id ";
  var values = [
    person.email,
    person.first_name,
    person.last_name
  ];

  var queryConfig = {
    text: sql,
    values: values
  };

  var client = new pg.Client(config);
  if (client === null) {
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
      console.log("person insert successful.");

      // NOTE: This only works because the query has "RETURNING id" at the end.
      var person_id = result.rows[0].id;

      console.log("person id found: " + person_id);
      return response.json({PersonId: person_id});
    });

  });
};

exports.getMyShows = function(request, response) {
  var personId = request.query.PersonId;
  console.log("Server call: Person " + personId);

  var sql = "SELECT s.id, " +
    "s.title, " +
    "ps.tier, " +
    "s.metacritic, " +
    "s.streaming_episodes, " +
    "s.matched_episodes, " +
    "s.unmatched_episodes, " +
    "s.tvdb_series_id, " +
    "s.tvdb_manual_queue, " +
    "s.last_tvdb_update, " +
    "s.last_tvdb_error, " +
    "s.poster, " +
    "s.air_time, " +
    "s.tivo_series_v2_ext_id, " +
    "ps.rating as my_rating, " +
    "ps.unwatched_episodes, " +
    "ps.unwatched_streaming, " +
    "ps.last_unwatched, " +
    "ps.first_unwatched " +
    "FROM series s " +
    "INNER JOIN person_series ps " +
    "  ON ps.series_id = s.id " +
    "WHERE ps.person_id = $1 " +
    "AND s.suggestion = $2 " +
    "AND s.tvdb_match_status = $3 " +
    "AND s.retired = $4 ";
  var values = [
    personId, false, 'Match Completed', 0
  ];

  return executeQueryWithResults(response, sql, values);
};

exports.getShowBasicInfo = function(request, response) {
  var sql =
    "SELECT id, title, poster " +
    "FROM series " +
    "WHERE retired = $1";

  return executeQueryWithResults(response, sql, [0]);
};

exports.getMyUpcomingEpisodes = function(request, response) {
  var personId = request.query.PersonId;

  var sql = "SELECT e.series_id, e.title, e.season, e.episode_number, e.air_date, e.air_time " +
    "FROM episode e " +
    "INNER JOIN series s " +
    "  ON e.series_id = s.id " +
    "INNER JOIN person_series ps " +
    "  ON ps.series_id = s.id " +
    "WHERE ps.person_id = $1 " +
    "AND e.air_time is not null " +
    "AND e.air_time >= current_timestamp " +
    "AND e.season <> $2 " +
    "AND e.retired = $3 " +
    "AND ps.tier = $4 " +
    "ORDER BY e.air_time ASC;";

  return executeQueryWithResults(response, sql, [personId, 0, 0, 1]);
};

exports.addToMyShows = function(request, response) {
  var personId = request.body.PersonId;
  var seriesId = request.body.SeriesId;

  var sql = "INSERT INTO person_series " +
    "(person_id, series_id, tier, unwatched_episodes) " +
    "VALUES ($1, $2, $3, (SELECT COUNT(1) " +
    "                     FROM episode e " +
    "                     WHERE e.retired = $4 " +
    "                     AND e.series_id = $5 " +
    "                     AND e.air_time < now() " +
    "                     AND e.season <> $6 " +
    "                     AND e.id NOT IN (SELECT er.episode_id " +
    "                                       FROM episode_rating er " +
    "                                       WHERE er.person_id = $7" +
    "                                       AND er.watched = $8))) ";
  var values = [
    personId, seriesId, 1, 0, seriesId, 0, personId, true
  ];

  return executeQueryNoResults(response, sql, values);
};

exports.removeFromMyShows = function(request, response) {
  var personId = request.body.PersonId;
  var seriesId = request.body.SeriesId;
  console.log("Server call 'removeFromMyShows': Person " + personId + ", Series " + seriesId);

  var sql = "DELETE FROM person_series " +
    "WHERE person_id = $1 " +
    "AND series_id = $2 ";
  var values = [
    personId, seriesId
  ];

  return executeQueryNoResults(response, sql, values);
};


exports.getNotMyShows = function(request, response) {
  var personId = request.query.PersonId;
  console.log("Server call 'getNotMyShows': Person " + personId);

  var sql = "SELECT s.* " +
    "FROM series s " +
    "WHERE id NOT IN (SELECT ps.series_id " +
    "                 FROM person_series ps " +
    "                 WHERE person_id = $1) " +
    "AND s.retired = $2 " +
    "AND s.suggestion = $3 " +
    "AND s.tvdb_match_status = $4 ";
  var values = [
    personId, 0, false, 'Match Completed'
  ];

  return executeQueryWithResults(response, sql, values);
};

exports.rateMyShow = function(request, response) {
  var personId = request.body.PersonId;
  var seriesId = request.body.SeriesId;
  var rating = request.body.Rating;

  var sql = "UPDATE person_series " +
    "SET rating = $1, rating_date = NOW() " +
    "WHERE person_id = $2 " +
    "AND series_id = $3 ";

  var values = [
    rating, personId, seriesId
  ];

  return executeQueryNoResults(response, sql, values);
};

exports.getMyEpisodes = function(request, response) {
  var seriesId = request.query.SeriesId;
  var personId = request.query.PersonId;
  console.log("Episode call received. Params: " + seriesId + ", Person: " + personId);

  var sql = 'SELECT e.id, ' +
    'e.air_date, ' +
    'e.air_time, ' +
    'e.series_title, ' +
    'e.title, ' +
    'e.season, ' +
    'e.episode_number, ' +
    'e.absolute_number, ' +
    'e.streaming, ' +
    'e.on_tivo, ' +
    'te.episode_number as tvdb_episode_number, ' +
    'te.name as tvdb_episode_name, ' +
    'te.filename as tvdb_filename, ' +
    'te.overview as tvdb_overview, ' +
    'te.production_code as tvdb_production_code, ' +
    'te.rating as tvdb_rating, ' +
    'te.director as tvdb_director, ' +
    'te.writer as tvdb_writer ' +
    'FROM episode e ' +
    'LEFT OUTER JOIN tvdb_episode te ' +
    ' ON e.tvdb_episode_id = te.id ' +
    'WHERE e.series_id = $1 ' +
    'AND e.retired = $2 ' +
    'AND te.retired = $3 ' +
    'ORDER BY e.season, e.episode_number';

  return updateWithJSON(sql, [seriesId, 0, 0]).then(function (episodeResult) {

    var sql =
      'SELECT er.episode_id, ' +
      'er.watched_date,' +
      'er.watched,' +
      'er.rating_funny,' +
      'er.rating_character,' +
      'er.rating_story,' +
      'er.rating_value,' +
      'er.review,' +
      'er.id as rating_id ' +
      'FROM episode_rating er ' +
      'INNER JOIN episode e ' +
      ' ON er.episode_id = e.id ' +
      'WHERE e.series_id = $1 ' +
      'AND e.retired = $2 ' +
      'AND er.person_id = $3 ';

    return updateWithJSON(sql, [seriesId, 0, personId]).then(function (ratingResult) {

      ratingResult.forEach(function (episodeRating) {
        var episodeMatch = _.find(episodeResult, function (episode) {
          return episode.id === episodeRating.episode_id;
        });

        if (episodeMatch !== null && episodeMatch !== undefined) {
          episodeMatch.watched_date = episodeRating.watched_date;
          episodeMatch.watched = episodeRating.watched;
          episodeMatch.rating_funny = episodeRating.rating_funny;
          episodeMatch.rating_character = episodeRating.rating_character;
          episodeMatch.rating_story = episodeRating.rating_story;
          episodeMatch.rating_value = episodeRating.rating_value;
          episodeMatch.review = episodeRating.review;
          episodeMatch.rating_id = episodeRating.rating_id;
        }
      });

      return response.send(episodeResult);
    });

  });
};

exports.rateMyEpisode = function(request, response) {
  if (request.body.IsNew) {
    return addRating(request.body.EpisodeRating, response);
  } else {
    return editRating(request.body.ChangedFields, request.body.RatingId, response);
  }
};

exports.updateMyShow = function(request, response) {
  console.log("Update Person-Series with " + JSON.stringify(request.body.ChangedFields));

  var queryConfig = buildUpdateQueryConfigNoID(
    request.body.ChangedFields,
    "person_series",
    {
      "series_id": request.body.SeriesId,
      "person_id": request.body.PersonId
    });

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return executeQueryNoResults(response, queryConfig.text, queryConfig.values);
};

function addRating(episodeRating, response) {
  console.log("Adding rating: " + JSON.stringify(episodeRating));

  var sql = "INSERT INTO episode_rating (episode_id, person_id, watched, watched_date, " +
      "rating_date, rating_funny, rating_character, rating_story, rating_value, " +
      "review, date_added) " +
    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) " +
    "RETURNING id";

  var values = [
    episodeRating.episode_id,
    episodeRating.person_id,
    episodeRating.watched,
    episodeRating.watched_date,
    new Date,
    episodeRating.rating_funny,
    episodeRating.rating_character,
    episodeRating.rating_story,
    episodeRating.rating_value,
    episodeRating.review,
    new Date
  ];


  var queryConfig = {
    text: sql,
    values: values
  };

  var client = new pg.Client(config);
  if (client === null) {
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
      console.log("rating insert successful.");

      // NOTE: This only works because the query has "RETURNING id" at the end.
      var rating_id = result.rows[0].id;

      console.log("rating id found: " + rating_id);
      return response.json({RatingId: rating_id});
    });

  });
}

function editRating(changedFields, rating_id, response) {
  console.log("Changing rating: " + JSON.stringify(changedFields));

  var queryConfig = buildUpdateQueryConfig(changedFields, "episode_rating", rating_id);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return executeQueryNoResults(response, queryConfig.text, queryConfig.values);
}


// Mark All Watched


exports.markAllPastEpisodesAsWatched = function(request, response) {
  var seriesId = request.body.SeriesId;
  var lastWatched = request.body.LastWatched;
  var personId = request.body.PersonId;

  console.log("Updating episodes as Watched, before episode " + lastWatched);

  var sql = 'UPDATE episode_rating ' +
    'SET watched = $1 ' +
    'WHERE watched <> $2 ' +
    'AND person_id = $3 ' +
    'AND episode_id IN (SELECT e.id ' +
                        'FROM episode e ' +
                        'WHERE e.series_id = $4 ' +
                        'AND e.absolute_number IS NOT NULL ' +
                        'AND e.absolute_number < $5 ' +
                        'AND e.season <> $6 ' +
                        'AND retired = $7) ';

  var values = [true, // watched
    true,             // !watched
    personId,         // person_id
    seriesId,         // series_id
    lastWatched,      // absolute_number <
    0,                // season
    0                 // retired
  ];

  return updateNoJSON(sql, values).then(function() {
    var sql = "INSERT INTO episode_rating (episode_id, person_id, watched, date_added) " +
      "SELECT e.id, $1, $2, now() " +
      "FROM episode e " +
      "WHERE e.series_id = $3 " +
      "AND e.retired = $4 " +
      'AND e.absolute_number IS NOT NULL ' +
      'AND e.absolute_number < $5 ' +
      'AND e.season <> $6 ' +
      "AND e.id NOT IN (SELECT er.episode_id " +
                         "FROM episode_rating er " +
                          "WHERE er.person_id = $7" +
                          "AND er.retired = $8)";
    var values = [
      personId,    // person
      true,        // watched
      seriesId,    // series
      0,           // retired
      lastWatched, // absolute number
      0,           // !season
      personId,    // person
      0            // retired
    ];

    return executeQueryNoResults(response, sql, values);
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
  if (client === null) {
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

function updateWithJSON(sql, values) {
  return new Promise(function(resolve, reject) {

    var results = [];

    var queryConfig = {
      text: sql,
      values: values
    };

    var client = new pg.Client(config);
    if (client === null) {
      return console.error('null client');
    }

    client.connect(function(err) {
      if (err) {
        console.error(err);
        reject("Error " + err);
      }

      var query = client.query(queryConfig);

      query.on('row', function(row) {
        results.push(row);
      });

      query.on('end', function() {
        client.end();
        resolve(results);
      });
    })

  });
}

function executeQueryNoResults(response, sql, values) {

  var queryConfig = {
    text: sql,
    values: values
  };

  var client = new pg.Client(config);
  if (client === null) {
    return console.error('null client');
  }

  client.connect(function(err) {
    if (err) {
      return console.error('could not connect to postgres', err);
    }

    var query = client.query(queryConfig);

    query.on('error', function(err) {
      if (err) {
        console.error(err.stack);
        return response.send("Error " + err);
      }
    });

    query.on('end', function() {
      client.end();
      return response.json({msg: "Success"});
    });

  });
}

function buildUpdateQueryConfig(changedFields, tableName, rowID) {

  var sql = "UPDATE " + tableName + " SET ";
  var values = [];
  var i = 1;
  for (var key in changedFields) {
    if (changedFields.hasOwnProperty(key)) {
      if (values.length !== 0) {
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

function updateNoJSON(sql, values) {
  return new Promise(function(resolve, reject) {

    var queryConfig = {
      text: sql,
      values: values
    };

    var client = new pg.Client(config);
    if (client === null) {
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

function buildUpdateQueryConfigNoID(changedFields, tableName, identifyingColumns) {

  var sql = "UPDATE " + tableName + " SET ";
  var values = [];
  var i = 1;
  for (var key in changedFields) {
    if (changedFields.hasOwnProperty(key)) {
      if (values.length !== 0) {
        sql += ", ";
      }

      sql += (key + " = $" + i);

      var value = changedFields[key];
      values.push(value);

      i++;
    }
  }

  var lengthBeforeWheres = values.length;

  sql += " WHERE ";

  for (key in identifyingColumns) {
    if (identifyingColumns.hasOwnProperty(key)) {
      if (values.length !== lengthBeforeWheres) {
        sql += " AND ";
      }

      sql += (key + " = $" + i);

      value = identifyingColumns[key];
      values.push(value);

      i++;
    }
  }

  return {
    text: sql,
    values: values
  };
}

