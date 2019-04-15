const db = require('postgres-mmethods');
const requestLib = require('request');
var _ = require('underscore');
const ArrayService = require('./array_util');

exports.token = null;

function getToken() {
  return new Promise(function(resolve, reject) {
    // noinspection JSUnresolvedVariable
    const apiKey = process.env.TVDB_API_KEY;
    if (_.isUndefined(apiKey)) {
      console.error("No TVDB_API_KEY variable found!");
      reject(new Error("No TVDB_API_KEY variable found!"));
    }

    const urlString = 'https://api.thetvdb.com/login';

    // noinspection SpellCheckingInspection
    var options = {
      url: urlString,
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        'apikey': apiKey
      },
      json: true
    };

    requestLib(options, function(error, response, body) {
      if (error) {
        response.send("Error getting TVDB token: " + error);
        reject(error);
      } else if (response.statusCode !== 200) {
        response.send("Unexpected status code from TVDB API: " + response.statusCode);
        reject("Bad status code: " + response.statusCode);
      } else {
        exports.token = body.token;
        resolve(exports.token);
      }
    });
  });
}
getToken();

function maybeRefreshToken() {
  if (exports.token === null) {
    return getToken();
  } else {
    return new Promise(function(resolve) {
      resolve(exports.token);
    });
  }
}

exports.getNumberOfShowsToRate = function(request, response) {
  var year = request.query.Year;

  console.log("NumberOfShowsToRate called with year " + year);

  var sql = 'select count(1) as num_shows ' +
  'from episode_group_rating ' +
  'where year = $1 ' +
  "and (next_air_date is null or next_air_date > now() + interval '3 months') " +
  'and (watched = aired or watched > $2) ' +
  'and rating is null ';

  return db.executeQueryWithResults(response, sql, [year, 4]);
};

exports.getNumberOfPendingMatches = function(request, response) {
  var sql = 'SELECT COUNT(1) AS num_matches ' +
    'FROM series ' +
    'WHERE retired = $1 ' +
    'AND tvdb_match_status IN ($2, $3) ';

  return db.executeQueryWithResults(response, sql, [0, 'Needs Confirmation', 'Duplicate']);
};

exports.getEpisodeGroupRating = function(request, response) {
  var seriesId = request.query.SeriesId;
  var year = request.query.Year;

  console.log("Received call for episode group rating for series " + seriesId + ", year " + year);

  var sql = 'SELECT * ' +
    'FROM episode_group_rating ' +
    'WHERE year = $1 ' +
    'AND retired = $2 ' +
    'AND series_id = $3 ';

  return db.executeQueryWithResults(response, sql, [year, 0, seriesId]);
};

exports.getEpisodeGroupRatings = function(request, response) {
  var year = request.query.Year;

  var sql = 'SELECT s.title, s.poster, s.cloud_poster, egr.* ' +
    'FROM episode_group_rating egr ' +
    'INNER JOIN series s ' +
    ' ON egr.series_id = s.id ' +
    'WHERE year = $1 ' +
    'AND s.retired = $2 ';

  return db.executeQueryWithResults(response, sql, [year, 0]);
};

exports.getAllRatingYears = function(request, response) {
  var sql = 'SELECT DISTINCT year ' +
    'FROM episode_group_rating ' +
    'WHERE retired = $1 ' +
    'ORDER BY year DESC ';

  return db.executeQueryWithResults(response, sql, [0]);
};

exports.getEpisodes = function(req, response) {
  console.log("Episode call received. Params: " + req.query.SeriesId);

  var sql = 'SELECT e.*, ' +
      'te.episode_number as tvdb_episode_number, ' +
      'te.name as tvdb_episode_name, ' +
      'te.filename as tvdb_filename, ' +
      'te.overview as tvdb_overview, ' +
      'te.production_code as tvdb_production_code, ' +
      'te.rating as tvdb_rating, ' +
      'te.director as tvdb_director, ' +
      'te.writer as tvdb_writer, ' +
      'ti.deleted_date as tivo_deleted_date, ' +
      'ti.suggestion as tivo_suggestion, ' +
      'ti.showing_start_time as showing_start_time, ' +
      'ti.episode_number as tivo_episode_number, ' +
      'ti.title as tivo_title, ' +
      'ti.description as tivo_description, ' +
      'ti.id as tivo_episode_id,' +
      'ti.station as tivo_station,' +
      'ti.channel as tivo_channel,' +
      'ti.rating as tivo_rating,' +
      'er.rating_funny, ' +
      'er.rating_character, ' +
      'er.rating_story, ' +
      'er.rating_value, ' +
      'er.review, ' +
      'er.id as rating_id ' +
      'FROM episode e ' +
      'LEFT OUTER JOIN tvdb_episode te ' +
      ' ON e.tvdb_episode_id = te.id ' +
      'LEFT OUTER JOIN edge_tivo_episode ete ' +
      ' ON e.id = ete.episode_id ' +
      'LEFT OUTER JOIN tivo_episode ti ' +
      ' ON ete.tivo_episode_id = ti.id ' +
      'LEFT OUTER JOIN episode_rating er ' +
      ' ON er.episode_id = e.id ' +
      'WHERE e.series_id = $1 ' +
      'AND e.retired = $2 ' +
      'AND te.retired = $3 ' +
      'ORDER BY e.season, e.episode_number, ti.id';

  return db.executeQueryWithResults(response, sql, [req.query.SeriesId, 0, 0]);
};

exports.getEpisodesForRating = function(req, response) {
  console.log("Episode call received. Params: " + JSON.stringify(req.query));
  const series_id = req.query.SeriesId;
  const person_id = req.query.PersonId;
  const year = req.query.Year;

  const sql = 'SELECT ' +
      'e.id, ' +
      'e.season, ' +
      'e.episode_number, ' +
      'e.streaming, ' +
      'e.on_tivo, ' +
      'e.air_time, ' +
      'e.title, ' +
      'er.rating_value,\n' +
      'er.rating_funny, ' +
      'er.rating_story, ' +
      'er.rating_character, ' +
      'er.review, ' +
      'er.watched_date, ' +
      'er.watched ' +
      'FROM episode e\n' +
      'INNER JOIN episode_rating er\n' +
      ' ON er.episode_id = e.id\n' +
      'INNER JOIN episode_group_rating egr\n' +
      ' ON egr.series_id = e.series_id\n' +
      'WHERE e.series_id = $1\n' +
      'AND er.person_id = $2\n' +
      'AND e.retired = $3\n' +
      'AND er.retired = $3\n' +
      'AND egr.retired = $3\n' +
      'AND air_date IS NOT NULL\n' +
      'AND air_date BETWEEN egr.start_date AND egr.end_date\n' +
      'AND egr.year = $4\n' +
      'ORDER BY e.absolute_number';


  const values = [
    series_id,
    person_id,
    0,
    year
  ];
  return db.executeQueryWithResults(response, sql, values);
};

exports.getPossibleMatches = function(req, response) {
  console.log("Possible matches call received. Params: " + req.query.SeriesId);

  var sql = 'SELECT psm.* ' +
      'FROM possible_series_match psm ' +
      'WHERE psm.series_id = $1 ' +
      'AND psm.retired = $2 ';

  return db.executeQueryWithResults(response, sql, [req.query.SeriesId, 0]);
};

exports.getViewingLocations = function(req, response) {
  console.log("Getting all possible viewing locations.");

  var sql = 'SELECT * FROM viewing_location';

  return db.executeQueryWithResults(response, sql, []);
};

exports.getAllPosters = function(req, response) {
  var tvdbSeriesId = req.query.tvdb_series_id;
  console.log("All Posters call received. Params: {SeriesId: " + tvdbSeriesId + "}");

  var sql = 'SELECT poster_path, cloud_poster ' +
    'FROM tvdb_poster ' +
    'WHERE tvdb_series_id = $1 ' +
    'AND retired = $2 ' +
    'ORDER BY id ';
  return db.executeQueryWithResults(response, sql, [tvdbSeriesId, 0]);
};

exports.getPrimeTV = function(req, response) {
  console.log("PrimeTV endpoint called.");

  var sql = 'SELECT s.id, ' +
    's.title, ' +
    'CASE WHEN ps.rating IS NULL THEN s.metacritic ELSE ps.rating END as my_rating, ' +
    's.metacritic, ' +
    's.poster, ' +
    's.cloud_poster, ' +
    'ps.unwatched_episodes as unwatched, ' +
    'ps.first_unwatched ' +
    'FROM series s ' +
    'INNER JOIN person_series ps ' +
    ' ON ps.series_id = s.id ' +
    'WHERE ps.tier = $1 ' +
    'AND ps.unwatched_episodes > $2 ' +
    'AND s.tvdb_match_status = $3 ' +
    'AND s.retired = $4 ' +
    'AND ps.person_id = $5 ' +
    'ORDER BY CASE WHEN ps.rating IS NULL THEN s.metacritic ELSE ps.rating END DESC NULLS LAST';

  return db.executeQueryWithResults(response, sql, [1, 0, 'Match Completed', 0, 1])
};

exports.getPrimeSeriesInfo = function(req, response) {
  console.log("Prime Series Info call received. Params: " + req.query.SeriesId);

  // Items commented out which aren't in iOS UI yet, but could be of use.
  var sql = 'SELECT ' +
    'e.id, ' +
    'e.title, ' +
    'e.season, ' +
    'e.episode_number, ' +
    'e.watched_date, ' +
    'e.air_time, ' +
    'e.on_tivo, ' +
    // 'e.streaming, ' +
    'te.filename as tvdb_filename, ' +
    'te.overview as tvdb_overview ' +
    // 'ti.deleted_date as tivo_deleted_date, ' +
    // 'er.rating_funny, ' +
    // 'er.rating_character, ' +
    // 'er.rating_story, ' +
    // 'er.rating_value, ' +
    // 'er.review, ' +
    // 'er.id as rating_id ' +
    'FROM episode e ' +
    'LEFT OUTER JOIN tvdb_episode te ' +
    ' ON e.tvdb_episode_id = te.id ' +
    'WHERE e.series_id = $1 ' +
    'AND e.retired = $2 ' +
    'AND te.retired = $3 ' +
    'AND e.season <> $4 ' +
    'AND e.id NOT IN (SELECT episode_id FROM episode_rating WHERE person_id = $5 AND watched = $6 AND retired = $7) ' +
    'ORDER BY e.season, e.episode_number ' +
    'LIMIT 1 ';

  return db.executeQueryWithResults(response, sql, [
    req.query.SeriesId,
    0,    // e.retired
    0,    // te.retired
    0,    // e.season
    1,    // er.person_id
    true, // er.watched
    0]);  // er.watched
};

exports.changeTier = function(req, response) {
  var tier = req.body.tier;
  var seriesId = req.body.SeriesId;

  console.log("Updating series " + seriesId + " to Tier " + tier);

  var sql = "UPDATE series SET tier = $1 WHERE id = $2";

  db.executeQueryNoResults(response, sql, [tier, seriesId]);
};

exports.getTVDBMatches = function(request, response) {
  const series_name = request.query.series_name;
  console.log("Finding TVDB matches for series: " + series_name);

  maybeRefreshToken().then(function (token) {

    const formatted_name = series_name
      .toLowerCase()
      .replace(/ /g, '_')
      .replace(/[^\w-]+/g, '');

    const seriesUrl = 'https://api.thetvdb.com/search/series';

    const options = {
      url: seriesUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Accept-Language': 'en'
      },
      qs: {
        'name': formatted_name
      },
      json: true
    };

    requestLib(options, function (error, tvdb_response, body) {
      if (error) {
        console.log("Error getting TVDB data: " + error);
        response.send("Error getting TVDB data: " + error);
      } else if (tvdb_response.statusCode !== 200) {
        console.log("Unexpected status code from TVDB API: " + tvdb_response.statusCode + ", " + tvdb_response.statusText);
        response.json([]);
      } else {
        const seriesData = body.data;
        const prunedData = _.map(seriesData, function(seriesObj) {
          // noinspection JSUnresolvedVariable
          return {
            title: seriesObj.seriesName,
            tvdb_series_ext_id: seriesObj.id,
            poster: null
          };
        });

        let posterUpdates = [];
        prunedData.forEach(function(prunedSeries) {
          posterUpdates.push(getTopPoster(prunedSeries));
        });

        Promise.all(posterUpdates).then(function() {
          response.json(prunedData);
        }).catch(function(error) {
          console.log("Error on poster retrieval: " + error);
        });
      }
    });
  });

};

function getTopPoster(seriesObj) {
  return new Promise(function(resolve) {
    const posterUrl = 'https://api.thetvdb.com/series/' + seriesObj.tvdb_series_ext_id + '/images/query';
    const options = {
      url: posterUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + exports.token,
        'Accept-Language': 'en'
      },
      qs: {
        'keyType': 'poster'
      },
      json: true
    };

    requestLib(options, function (error, tvdb_response, body) {
      if (error) {
        resolve();
      } else if (tvdb_response.statusCode !== 200) {
        resolve();
      } else {
        const posterData = body.data;
        if (posterData.length === 0) {
          resolve();
        } else {
          seriesObj.poster = posterData[0].fileName;
          resolve();
        }
      }
    });
  });
}

exports.getMatchedTVDBIDs = function(request, response) {

  const sql = 'SELECT s.id, ' +
    's.tvdb_series_ext_id ' +
    'FROM series s ' +
    'WHERE s.tvdb_match_status IN ($1, $2) ' +
    'AND s.retired = $3 ' +
    'ORDER BY s.tvdb_series_ext_id ';

  const values = [
    'Match Confirmed',
    'Match Completed',
    0
  ];

  db.executeQueryWithResults(response, sql, values);
};

exports.handleSeriesRequest = function(request, response) {
  const tvdb_series_ext_id = request.body.tvdb_series_ext_id;
  const handling = request.body.handling;

  doPreUpdateWork(handling, tvdb_series_ext_id).then(function() {
    updateSeriesRequest(handling, tvdb_series_ext_id, response);
  }).catch(function(error) {
    response.status(500).send(error);
  });
};

function doPreUpdateWork(handling, tvdb_series_ext_id) {
  return new Promise(function(resolve, reject) {
    if (handling === 'rejected') {
      resolve();
    } else if (handling === 'approved') {
      maybeAddSeries(tvdb_series_ext_id).then(function() {
        resolve();
      })
    } else {
      console.error('Unexpected value for "handling": ' + handling + '"');
      reject(new Error('Unexpected value for "handling": ' + handling + '"'));
    }
  });
}

function maybeAddSeries(tvdb_series_ext_id) {
  return new Promise(resolve => {

    const sql = 'SELECT sr.* ' +
      'FROM series_request sr ' +
      'WHERE sr.tvdb_series_ext_id = $1 ' +
      'AND sr.retired = $2 ';

    const values = [
      tvdb_series_ext_id,
      0
    ];

    db.selectWithJSON(sql, values).then(function (requestResults) {
      const person_ids = _.pluck(requestResults, 'person_id');
      const seriesRequest = requestResults[0];

      getOrInsertNewSeries(tvdb_series_ext_id, seriesRequest, person_ids[0]).then(function (series_id) {

        const sql = "INSERT INTO person_series " +
          "(person_id, series_id, tier) " +
          "SELECT p.id, $1, $2 " +
          "FROM person p " +
          "WHERE p.id IN (" + db.createInlineVariableList(person_ids.length, 3) + ")";
        const values = [
          series_id, 1
        ];

        ArrayService.addToArray(values, person_ids);

        db.updateNoJSON(sql, values).then(() => resolve());
      });
    });
  });

}

function getOrInsertNewSeries(tvdb_series_ext_id, seriesRequest, person_id) {
  return new Promise(resolve => {

    const sql = 'SELECT id ' +
      'FROM series ' +
      'WHERE tvdb_series_ext_id = $1 ' +
      'AND retired = $2 ';

    const values = [
      tvdb_series_ext_id,
      0
    ];

    db.selectWithJSON(sql, values).then(existingSeries => {
      if (existingSeries.length > 0) {
        const existing_id = existingSeries[0].id;
        resolve(existing_id);
      } else {

        const sql = 'INSERT INTO series (' +
          'title, tvdb_new, metacritic_new, tvdb_match_status, person_id, ' +
          'tvdb_series_ext_id, tvdb_confirm_date, poster) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ' +
          'RETURNING id ';

        const values = [
          seriesRequest.title,
          false,
          true,
          'Match Confirmed',
          person_id,
          tvdb_series_ext_id,
          new Date,
          seriesRequest.poster
        ];

        db.selectWithJSON(sql, values).then(seriesResults => {
          resolve(seriesResults[0].id);
        });
      }

    });
  });

}

function updateSeriesRequest(handling, tvdb_series_ext_id, response) {
  const sql = 'UPDATE series_request ' +
    'SET ' + handling + ' = $1 ' +
    'WHERE tvdb_series_ext_id = $2 ' +
    'AND approved IS NULL ' +
    'AND rejected IS NULL ';

  const values = [
    new Date,
    tvdb_series_ext_id
  ];

  db.executeQueryNoResults(response, sql, values);
}

exports.addSeries = function(req, res) {
  console.log("Entered addSeries server call: " + JSON.stringify(req.body.series));

  var seriesObj = req.body.series;

  return insertSeries(seriesObj, res);
};

var insertSeries = function(series, response) {
  console.log("Inserting series.");

  var sql = "INSERT INTO series (" +
      "title, date_added, tvdb_new, metacritic_new, tvdb_match_status, person_id, " +
      "tvdb_series_ext_id, tvdb_confirm_date, poster) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) " +
      "RETURNING id ";
  var values = [
    series.title,
    new Date,
    false,
    true,
    'Match Confirmed',
    series.person_id,
    series.tvdb_series_ext_id,
    new Date,
    series.poster
  ];

  db.selectWithJSON(sql, values).then(function (results) {
    var seriesId = results[0].id;
    response.json({seriesId: seriesId})
  }, function(err) {
    response.status(500).send(err);
  });

};

exports.getSeriesViewingLocations = function(req, response) {
  console.log("Series Viewing Locations call received. Params: " + req.query.SeriesId);

  var seriesId = req.query.SeriesId;

  var sql = 'SELECT vl.* ' +
      'FROM series_viewing_location svl ' +
      'INNER JOIN viewing_location vl ' +
      ' ON svl.viewing_location_id = vl.id ' +
      'WHERE svl.series_id = $1';

  return db.executeQueryWithResults(response, sql, [seriesId]);
};

exports.addViewingLocation = function(req, response) {
  return insertSeriesViewingLocation(req.body.SeriesId, req.body.ViewingLocationId, response);
};

exports.removeViewingLocation = function(req, response) {
  var seriesId = req.body.SeriesId;
  var viewingLocationId = req.body.ViewingLocationId;

  var sql = "DELETE FROM series_viewing_location " +
      "WHERE series_id = $1 AND viewing_location_id = $2";

  return db.executeQueryNoResults(response, sql, [seriesId, viewingLocationId]);
};

var insertSeriesViewingLocation = function(seriesId, viewingLocationId, response) {

  console.log("Adding viewing_location " + viewingLocationId + " to series " + seriesId);

  var sql = 'INSERT INTO series_viewing_location (series_id, viewing_location_id, date_added) ' +
      'VALUES ($1, $2, now())';

  return db.executeQueryNoResults(response, sql, [seriesId, viewingLocationId]);
};

exports.changeEpisodesStreaming = function(req, response) {
  var seriesId = req.body.SeriesId;
  var streaming = req.body.Streaming;

  console.log("Updating episodes of series " + seriesId + " to streaming: " + streaming);

  var sql = "UPDATE episode " +
      "SET streaming = $1 " +
      "WHERE series_id = $2 " +
      "AND season <> $3 " +
      "AND retired = $4 ";

  return db.executeQueryNoResults(response, sql, [streaming, seriesId, 0, 0]);
};

exports.updateSeries = function(req, response) {
  console.log("Update Series with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = db.buildUpdateQueryConfig(req.body.ChangedFields, "series", req.body.SeriesId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return db.executeQueryNoResults(response, queryConfig.text, queryConfig.values);
};

exports.updateEpisode = function(req, response) {
  console.log("Update Episode with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = db.buildUpdateQueryConfig(req.body.ChangedFields, "episode", req.body.EpisodeId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return db.executeQueryNoResults(response, queryConfig.text, queryConfig.values);
};

exports.updateEpisodeGroupRating = function(req, response) {
  console.log("Update EpisodeGroupRating with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = db.buildUpdateQueryConfig(req.body.ChangedFields, "episode_group_rating", req.body.EpisodeGroupRatingId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return db.executeQueryNoResults(response, queryConfig.text, queryConfig.values);
};

exports.addEpisodeGroupRating = function(request, response) {
  var episodeGroupRating = request.body.EpisodeGroupRating;
  console.log("Add new EpisodeGroupRating: " + JSON.stringify(episodeGroupRating));

  var sql = "INSERT INTO episode_group_rating (series_id, year, start_date, end_date, avg_rating, max_rating, last_rating, " +
    "suggested_rating, num_episodes, watched, rated, last_aired, avg_funny, avg_story, avg_character, aired, next_air_date, " +
    "post_update_episodes) " +
    "VALUES " +
    "($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) " +
    "RETURNING id ";

  // noinspection JSUnresolvedVariable
  var values = [
    episodeGroupRating.series_id,
    episodeGroupRating.year,
    episodeGroupRating.start_date,
    episodeGroupRating.end_date,
    episodeGroupRating.avg_rating,
    episodeGroupRating.max_rating,
    episodeGroupRating.last_rating,
    episodeGroupRating.suggested_rating,
    episodeGroupRating.num_episodes,
    episodeGroupRating.watched,
    episodeGroupRating.rated,
    episodeGroupRating.last_aired,
    episodeGroupRating.avg_funny,
    episodeGroupRating.avg_story,
    episodeGroupRating.avg_character,
    episodeGroupRating.aired,
    episodeGroupRating.nextAirDate,
    episodeGroupRating.post_update_episodes
  ];

  return db.executeQueryWithResults(response, sql, values);
};

exports.retireTiVoEpisode = function(req, response) {
  console.log("Retiring tivo_episode with id " + req.body.TiVoEpisodeId);

  var sql = 'UPDATE tivo_episode SET retired = id WHERE id = $1';

  return db.executeQueryNoResults(response, sql, [req.body.TiVoEpisodeId]);
};

exports.ignoreTiVoEpisode = function(req, response) {
  console.log("Ignoring tivo_episode with id " + req.body.TiVoEpisodeId);

  var sql = 'UPDATE tivo_episode SET ignore_matching = true WHERE id = $1';

  return db.executeQueryNoResults(response, sql, [req.body.TiVoEpisodeId]);
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

      return updateEpisodeMatchStatus(tivoEpisodeId, "Match Completed", response);
    });
  });

};


exports.unlinkEpisode = function(req, response) {
  var episodeId = req.body.EpisodeId;

  console.log("Unlinking episode: " + episodeId);

  setMatchStatusOnLinkedEpisodes(episodeId, "Match First Pass").then(function(result, err) {
    if (err) {
      console.error("Error setting tivo_episode match status: " + err);
      return response.send(err);
    }

    retireEdgeRows(episodeId).then(function(result, err) {
      if (err) {
        console.error("Error retiring edge rows: " + err);
        return response.send("Error " + err);
      }

      updateOnTivo([episodeId], false).then(function(results, err) {
        if (err) {
          console.error("Error updating OnTivo column: " + err);
          return response.send("Error " + err);
        }

        response.json({msg: "Success!"});
      });
    });
  });
};


exports.getUpcomingEpisodes = function(req, response) {
  var sql = "select e.series_id, e.title, e.season, e.episode_number, e.air_date, e.air_time " +
      "from episode e " +
      "inner join series s " +
      "on e.series_id = s.id " +
      "where s.tier = $1 " +
      "and e.air_time is not null " +
      "and e.air_time >= current_timestamp " +
      "and e.watched = $2 " +
      "and e.season <> $3 " +
      "and e.retired = $4 " +
      "order by e.air_time asc;";

  return db.executeQueryWithResults(response, sql, [1, false, 0, 0]);
};

// utility methods

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

  return db.updateNoJSON(sql, values);
}

function retireEdgeRows(episodeId) {
  console.log("Retiring edge rows to episode " + episodeId);

  var sql = 'DELETE FROM edge_tivo_episode ' +
    'WHERE episode_id = $1 ';

  var values = [episodeId];

  console.log("SQL:" + sql);
  console.log("Values:" + values);

  return db.updateNoJSON(sql, values);
}

function setMatchStatusOnLinkedEpisodes(episodeId, matchStatus) {
  console.log("Setting match status on episode " + episodeId + " to '" + matchStatus + "'");

  var sql = "UPDATE tivo_episode " +
    "SET tvdb_match_status = $1 " +
    "WHERE tivo_episode.id IN " +
    " (SELECT ete.tivo_episode_id " +
    "  FROM edge_tivo_episode ete " +
    "  WHERE ete.episode_id = $2) " +
    "AND retired = $3";

  var values = [
    matchStatus,
    episodeId,
    0
  ];

  return db.updateNoJSON(sql, values);
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

  return db.updateNoJSON(sql, values);
}

function updateEpisodeMatchStatus(tivoEpisodeId, matchStatus, response) {
  console.log("Update TiVoEpisode with ID " + tivoEpisodeId + " to new match status " + matchStatus);

  var changedFields = {
    tvdb_match_status: matchStatus
  };

  var queryConfig = db.buildUpdateQueryConfig(changedFields, "tivo_episode", tivoEpisodeId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return db.executeQueryNoResults(response, queryConfig.text, queryConfig.values);
}
