var _ = require('underscore');
const db = require('./database_util');
const debug = require('debug');

exports.getPersonInfo = function(request, response) {
  var email = request.query.email;
  console.log("User call received: " + email);

  var sql = 'SELECT p.* ' +
          'FROM person p ' +
          'WHERE p.email = $1 ' +
          'AND p.retired = $2 ';

  return db.executeQueryWithResults(response, sql, [email, 0]);
};

exports.getPersons = function(request, response) {
  console.log("Persons call received:");

  const sql = 'SELECT p.* ' +
    'FROM person p ' +
    'WHERE p.retired = $1 ';

  return db.executeQueryWithResults(response, sql, [0]);
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

  // return data because it contains the new row id. (RETURNING id is in the sql)
  return db.executeQueryWithResults(response, sql, values);
};

exports.getMyShows = function(request, response) {
  var personId = request.query.PersonId;
  console.log("Server call: Person " + personId);

  let startTime = new Date;

  var sql = "SELECT s.id, " +
    "s.title, " +
    "ps.tier, " +
    "s.metacritic, " +
    "s.streaming_episodes, " +
    "s.matched_episodes, " +
    "s.unmatched_episodes, " +
    "(SELECT COUNT(1) " +
    "    from episode e " +
    "    where e.series_id = s.id " +
    "    and e.retired = $7" +
    "    and e.season <> $8 " +
    "    and e.air_date IS NOT NULL" +
    "    and e.air_date < NOW()) as aired_episodes, " +
    "(SELECT COUNT(1) " +
    "  FROM episode_rating er " +
    "  INNER JOIN episode e " +
    "    ON er.episode_id = e.id" +
    "  WHERE e.series_id = s.id " +
    "  AND e.retired = $7 " +
    "  AND er.retired = $7 " +
    "  AND er.rating_pending = $9" +
    "  AND er.person_id = $1) as rating_pending_episodes, " +
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
    "ps.first_unwatched, " +
    "ps.tier AS my_tier, " +
    "ps.date_added, " +
    "COALESCE(ps.rating, metacritic) AS dynamic_rating, " +
    "(SELECT MAX(er.watched_date) " +
    "  from episode_rating er " +
    "  inner join episode e " +
    "   on er.episode_id = e.id " +
    "  where e.series_id = s.id " +
    "  and er.retired = $5 " +
    "  and e.retired = $6) as last_watched " +
    "FROM series s " +
    "INNER JOIN person_series ps " +
    "  ON ps.series_id = s.id " +
    "WHERE ps.person_id = $1 " +
    "AND s.suggestion = $2 " +
    "AND s.tvdb_match_status = $3 " +
    "AND s.retired = $4 ";
  var values = [
    personId, false, 'Match Completed', 0, 0, 0, 0, 0, true
  ];

  db.selectWithJSON(sql, values).then(function (seriesResults) {
    var sql = "SELECT e.series_id, e.air_time, e.air_date, e.season, e.episode_number " +
      "FROM episode e " +
      "INNER JOIN person_series ps " +
      "  ON ps.series_id = e.series_id " +
      "WHERE e.retired = $1 " +
      "AND e.season <> $2 " +
      "AND e.id NOT IN (SELECT er.episode_id " +
      "                   FROM episode_rating er " +
      "                   WHERE er.person_id = $3 " +
      "                   AND er.watched = $4) " +
      "AND ps.person_id = $5 " +
      "ORDER BY e.series_id, e.air_time, e.season, e.episode_number ";

    var values = [
      0,
      0,
      personId,
      true,
      personId
    ];

    db.selectWithJSON(sql, values).then(function(episodeResults) {

      var groupedBySeries = _.groupBy(episodeResults, "series_id");
      for (var seriesId in groupedBySeries) {
        if (groupedBySeries.hasOwnProperty(seriesId)) {
          let unwatchedEpisodes = groupedBySeries[seriesId];

          let series = _.findWhere(seriesResults, {id: parseInt(seriesId)});
          debug("Series: " + series.title);

          exports.calculateUnwatchedDenorms(series, unwatchedEpisodes);
        }
      }

      var sql =
        "SELECT e.series_id, er.episode_id, er.rating_value " +
        "FROM episode_rating er " +
        "INNER JOIN episode e " +
        "  ON er.episode_id = e.id " +
        "INNER JOIN series s " +
        "  ON e.series_id = s.id " +
        "INNER JOIN person_series ps " +
        "  ON ps.series_id = s.id " +
        "WHERE er.watched = $1 " +
        "AND er.retired = $2 " +
        "AND er.person_id = $3 " +
        "AND er.rating_value IS NOT NULL " +
        "AND ps.person_id = $4 " +
        "ORDER BY e.series_id, er.watched_date DESC, e.season DESC, e.episode_number DESC ";

      var values = [
        true,
        0,
        personId,
        personId
      ];

      db.selectWithJSON(sql, values).then(function(ratingResults) {

        var groupedBySeries = _.groupBy(ratingResults, "series_id");
        for (var seriesId in groupedBySeries) {
          if (groupedBySeries.hasOwnProperty(seriesId)) {
            let seriesRatings = groupedBySeries[seriesId];

            let series = _.findWhere(seriesResults, {id: parseInt(seriesId)});
            debug("Series: " + series.title);

            calculateRating(series, seriesRatings);
          }
        }

        let timeElapsed = new Date - startTime;
        console.log("Time elapsed: " + timeElapsed);
        return response.json(seriesResults);
      });

    });
  });

};

exports.myShowsForAdd = function(request, response) {
  var personId = request.query.PersonId;
  console.log("Server call: Person " + personId);

  const sql = 'SELECT s.id, ' +
    's.tvdb_series_ext_id, ' +
    's.tvdb_match_status ' +
    'FROM series s ' +
    'INNER JOIN person_series ps ' +
    '  ON ps.series_id = s.id ' +
    'WHERE ps.person_id = $1 ' +
    'AND s.suggestion = $2 ' +
    'AND s.retired = $3 ' +
    'AND ps.retired = $3 ';

  const values = [
    personId,
    false,
    0
  ];

  db.executeQueryWithResults(response, sql, values);
};

exports.seriesRequest = function(request, response) {
  const series_request = request.body.seriesRequest;

  var sql = "INSERT INTO series_request (" +
    "title, person_id, tvdb_series_ext_id, poster) " +
    "VALUES ($1, $2, $3, $4) " +
    "RETURNING id ";
  var values = [
    series_request.title,
    series_request.person_id,
    series_request.tvdb_id,
    series_request.poster
  ];

  db.selectWithJSON(sql, values).then(function (results) {
    response.json({seriesRequestId: results[0].id})
  }, function(err) {
    response.status(500).send(err);
  });

};

// denorm helper

exports.calculateUnwatchedDenorms = function(series, unwatchedEpisodes) {
  let unairedEpisodes = _.filter(unwatchedEpisodes, isUnaired);
  let airedEpisodes = _.filter(unwatchedEpisodes, isAired);

  series.unwatched_all = airedEpisodes.length;

  let nextEpisodeToWatch = airedEpisodes.length === 0 ? null : _.first(airedEpisodes);
  let nextEpisodeToAir = unairedEpisodes.length === 0 ? null : _.first(unairedEpisodes);

  if (nextEpisodeToWatch !== null) {
    series.first_unwatched = nextEpisodeToWatch.air_time === null ? nextEpisodeToWatch.air_date : nextEpisodeToWatch.air_time;
  }

  if (nextEpisodeToAir !== null) {
    series.nextAirDate = nextEpisodeToAir.air_time === null ? nextEpisodeToAir.air_date : nextEpisodeToAir.air_time;
  }

  series.midSeason = stoppedMidseason(nextEpisodeToWatch);

};

function calculateRating(series, ratings) {
  var ratingElements = [];

  var previousEpisodeWeights = [10, 10, 10, 9, 8, 6, 4, 2, 1, 1];

  addElement(ratingElements, 10, series.my_rating);

  let lastEpisodes = _.first(ratings, previousEpisodeWeights.length);

  for (var i = 0; i < previousEpisodeWeights.length; i++) {
    var episodeWeight = previousEpisodeWeights[i];

    if (!_.isUndefined(lastEpisodes[i])) {
      var previousEpisode = lastEpisodes[i];
      var ratingValue = parseInt(previousEpisode.rating_value);
      addElement(ratingElements, episodeWeight, ratingValue);
    }
  }

  if (_.isEmpty(ratingElements)) {
    addElement(ratingElements, 10, series.metacritic);
  }

  series.dynamic_rating = combineRatingElements(ratingElements);
}

function addElement(ratingElements, weight, value) {
  if (!_.isNaN(value) && _.isNumber(value)) {
    ratingElements.push({
      weight: weight,
      value: value
    });
  }
}

function combineRatingElements(ratingElements) {
  if (ratingElements.length === 0) {
    return 0;
  }

  var runningWeight = 0;
  var runningValue = 0;
  _.each(ratingElements, function(element) {
    runningWeight += element.weight;
    runningValue += (element.value * element.weight);
  });

  return runningValue / runningWeight;
}

// aired helpers

function isUnaired(episode) {
  // unaired if the air time after now.
  return episode.air_time === null || ((episode.air_time - new Date) > 0);
}

function isAired(episode) {
  return !isUnaired(episode);
}

function stoppedMidseason(nextEpisode) {
  return nextEpisode !== null &&
    _.isNumber(nextEpisode.episode_number) &&
    nextEpisode.episode_number > 1;
}


exports.getShowBasicInfo = function(request, response) {
  var sql =
    "SELECT id, title, poster " +
    "FROM series " +
    "WHERE retired = $1";

  return db.executeQueryWithResults(response, sql, [0]);
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

  return db.executeQueryWithResults(response, sql, [personId, 0, 0, 1]);
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

  return db.executeQueryNoResults(response, sql, values);
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

  return db.executeQueryNoResults(response, sql, values);
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

  return db.executeQueryWithResults(response, sql, values);
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

  db.updateNoJSON(sql, values).then(function() {
    updateSeriesRating(seriesId, personId).then(function(result) {
      if (_.isUndefined(result.my_rating)) {
        return response.json({
          dynamic_rating: rating
        });
      } else {
        return response.json({
          dynamic_rating: result.dynamic_rating
        });
      }
    });
  });
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

  return db.selectWithJSON(sql, [seriesId, 0, 0]).then(function (episodeResult) {

    var sql =
      'SELECT er.episode_id, ' +
      'er.watched_date,' +
      'er.watched,' +
      'er.rating_funny,' +
      'er.rating_character,' +
      'er.rating_story,' +
      'er.rating_value,' +
      'er.rating_pending, ' +
      'er.review,' +
      'er.id as rating_id ' +
      'FROM episode_rating er ' +
      'INNER JOIN episode e ' +
      ' ON er.episode_id = e.id ' +
      'WHERE e.series_id = $1 ' +
      'AND e.retired = $2 ' +
      'AND er.person_id = $3 ';

    return db.selectWithJSON(sql, [seriesId, 0, personId]).then(function (ratingResult) {

      ratingResult.forEach(function (episodeRating) {
        var episodeMatch = _.find(episodeResult, function (episode) {
          return episode.id === episodeRating.episode_id;
        });

        if (exists(episodeMatch)) {
          episodeMatch.watched_date = episodeRating.watched_date;
          episodeMatch.watched = episodeRating.watched;
          episodeMatch.rating_funny = episodeRating.rating_funny;
          episodeMatch.rating_character = episodeRating.rating_character;
          episodeMatch.rating_story = episodeRating.rating_story;
          episodeMatch.rating_value = episodeRating.rating_value;
          episodeMatch.rating_pending = episodeRating.rating_pending;
          episodeMatch.review = episodeRating.review;
          episodeMatch.rating_id = episodeRating.rating_id;
        }
      });

      return response.send(episodeResult);
    });

  });
};

exports.rateMyEpisode = function(request, response) {
  addOrEditRating(request).then(function(result) {
    let rating_id = result.rating_id;
    updateSeriesRating(result.series_id, result.person_id).then(function(result) {
      var data = {
        rating_id: rating_id,
        dynamic_rating: result.dynamic_rating
      };
      return response.json(data);
    });
  })
};

function addOrEditRating(request) {
  return new Promise(function(resolve) {
    if (request.body.IsNew) {
      addRating(request.body.EpisodeRating).then(function(results) {
        resolve({
          rating_id: results[0].id,
          series_id: request.body.SeriesId,
          person_id: request.body.EpisodeRating.person_id
        });
      });
    } else {
      editRating(request.body.ChangedFields, request.body.RatingId).then(function() {
        resolve({
          rating_id: request.body.RatingId,
          series_id: request.body.SeriesId,
          person_id: request.body.PersonId
        });
      });
    }
  });
}

function updateSeriesRating(series_id, person_id) {
  return new Promise(function(resolve) {

    var sql =
      "SELECT er.episode_id, er.rating_value, s.metacritic, ps.rating as my_rating " +
      "FROM episode_rating er " +
      "INNER JOIN episode e " +
      "  ON er.episode_id = e.id " +
      "INNER JOIN series s " +
      "  ON e.series_id = s.id " +
      "INNER JOIN person_series ps " +
      "  ON ps.series_id = s.id " +
      "WHERE er.watched = $1 " +
      "AND er.retired = $2 " +
      "AND er.person_id = $3 " +
      "AND er.rating_value IS NOT NULL " +
      "AND e.series_id = $4 " +
      "ORDER BY er.watched_date DESC, e.season DESC, e.episode_number DESC ";

    var values = [
      true,
      0,
      person_id,
      series_id
    ];

    db.selectWithJSON(sql, values).then(function (results) {
      if (!_.isEmpty(results)) {
        var series = {
          id: series_id,
          my_rating: results[0].my_rating,
          metacritic: results[0].metacritic
        };

        calculateRating(series, results);

        resolve(series);
      } else {
        resolve({
          id: series_id
        });
      }
    });
  });
}

exports.updateMyShow = function(request, response) {
  console.log("Update Person-Series with " + JSON.stringify(request.body.ChangedFields));

  var queryConfig = db.buildUpdateQueryConfigNoID(
    request.body.ChangedFields,
    "person_series",
    {
      "series_id": request.body.SeriesId,
      "person_id": request.body.PersonId
    });

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return db.executeQueryNoResults(response, queryConfig.text, queryConfig.values);
};

function addRating(episodeRating) {
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

  // return data because it contains the new row id. (RETURNING id is in the sql)
  return db.selectWithJSON(sql, values);
}

function editRating(changedFields, rating_id) {
  return db.updateObjectWithChangedFieldsNoJSON(changedFields, "episode_rating", rating_id);
}


// Mark All Watched


exports.markAllPastEpisodesAsWatched = function(request, response) {
  var payload = {
    series_id: request.body.SeriesId,
    last_watched: request.body.LastWatched,
    person_ids: [request.body.PersonId]
  };

  exports.updateEpisodeRatingsAllPastWatched(payload, false).then(function() {
    response.json({msg: "Success!"});
  });
};

exports.getSystemVars = function(request, response) {
  console.log("Getting system vars.");

  var sql = "SELECT * FROM system_vars";
  return db.executeQueryWithResults(response, sql, []);
};

exports.increaseYear = function(request, response) {
  console.log("Incrementing rating year.");

  var sql = "SELECT rating_year FROM system_vars";
  return db.selectWithJSON(sql, []).then(function (result) {
    var system_vars = result[0];
    var ratingYear = system_vars.rating_year;
    console.log("Current year: " + ratingYear);

    if (_.isNaN(ratingYear)) {
      return response.send("Error rating year found that is not numeric: " + ratingYear);
    } else {
      var nextYear = ratingYear + 1;
      var sql = "UPDATE system_vars " +
        "SET rating_year = $1, " +
        "    rating_end_date = NULL ";
      return db.executeQueryNoResults(response, sql, [nextYear]);
    }

  });
};

exports.revertYear = function(request, response) {
  var endDate = request.body.EndDate;
  console.log("Reverting rating year increase with end date: " + endDate);

  var sql = "SELECT rating_year FROM system_vars";
  return db.selectWithJSON(sql, []).then(function (result) {
    var system_vars = result[0];
    var ratingYear = system_vars.rating_year;
    console.log("Current year: " + ratingYear);

    if (_.isNaN(ratingYear)) {
      return response.send("Error rating year found that is not numeric: " + ratingYear);
    } else {
      var nextYear = ratingYear - 1;
      var sql = "UPDATE system_vars " +
        "SET rating_year = $1, " +
        "    rating_end_date = $2 ";
      return db.executeQueryNoResults(response, sql, [nextYear, endDate]);
    }

  });
};

exports.setRatingEndDate = function(request, response) {
  var ratingEndDate = request.body.RatingEndDate;
  console.log("Changing rating end date to " + ratingEndDate);

  var sql = "UPDATE system_vars SET rating_end_date = $1 ";
  return db.executeQueryNoResults(response, sql, [ratingEndDate]);
};


exports.updateEpisodeRatingsAllPastWatched = function(payload, rating_notifications) {
  return new Promise(function(resolve) {
    var series_id = payload.series_id;
    var last_watched = payload.last_watched;
    var person_ids = payload.person_ids;

    if (person_ids.length < 1 || payload.skipped) {
      return resolve();
    }

    const ratingClause = rating_notifications ?
      ', rating_pending = (SELECT rating_notifications ' +
      '                    FROM person ' +
      '                    WHERE id = episode_rating.person_id) ' :
      '';

    console.log("Updating episodes as Watched, before episode " + last_watched);

    var sql = 'UPDATE episode_rating ' +
      'SET watched = $1 ' +
      ratingClause +
      'WHERE watched <> $2 ' +
      'AND episode_id IN (SELECT e.id ' +
      'FROM episode e ' +
      'WHERE e.series_id = $3 ' +
      'AND e.absolute_number IS NOT NULL ' +
      'AND e.absolute_number < $4 ' +
      'AND e.season <> $5 ' +
      'AND retired = $6) ' +
      'AND person_id IN (' + db.createInlineVariableList(person_ids.length, 7) + ") ";

    var values = [true, // watched
      true,             // !watched
      series_id,         // series_id
      last_watched,      // absolute_number <
      0,                // season
      0                 // retired
    ];

    addToArray(values, person_ids);

    db.updateNoJSON(sql, values).then(function() {
      const ratingClause = rating_notifications ?
        'p.rating_notifications ' :
        '$7 ';

      var values = [
        true,        // watched
        series_id,    // series
        0,           // retired
        last_watched, // < absolute number
        0,           // !season
        0            // retired
      ];

      if (!rating_notifications) {
        values.push(false);
      }

      var sql = "INSERT INTO episode_rating (episode_id, person_id, watched, date_added, rating_pending) " +
        "SELECT e.id, p.id, $1, now(), " + ratingClause +
        "FROM episode e, person p " +
        "WHERE e.series_id = $2 " +
        "AND e.retired = $3 " +
        'AND e.absolute_number IS NOT NULL ' +
        'AND e.absolute_number < $4 ' +
        'AND e.season <> $5 ' +
        "AND e.id NOT IN (SELECT er.episode_id " +
        "FROM episode_rating er " +
        "WHERE er.retired = $6 " +
        "AND er.person_id = p.id) " +
        "AND p.id IN (" + db.createInlineVariableList(person_ids.length, values.length + 1) + ") ";

      addToArray(values, person_ids);

      db.updateNoJSON(sql, values).then(function() {
        return resolve();
      });
    });
  });
};



// UTILITY METHODS

function exists(object) {
  return object !== null && object !== undefined;
}

function addToArray(originalArray, newArray) {
  originalArray.push.apply(originalArray, newArray);
}
