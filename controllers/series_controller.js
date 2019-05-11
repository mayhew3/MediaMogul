const db = require('postgres-mmethods');
const _ = require('underscore');
const ArrayService = require('./array_util');

exports.getNumberOfShowsToRate = function(request, response) {
  var year = request.query.Year;

  console.log("NumberOfShowsToRate called with year " + year);

  var sql = 'select count(1) as num_shows ' +
  'from episode_group_rating ' +
  'where year = $1 ' +
  "and (next_air_date is null or next_air_date > now() + interval '3 months') " +
  'and (watched = aired or watched > $2) ' +
  'and rating is null ';

  return db.selectSendResponse(response, sql, [year, 4]);
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

  return db.selectSendResponse(response, sql, [year, 0, seriesId]);
};

exports.getEpisodeGroupRatings = function(request, response) {
  var year = request.query.Year;

  var sql = 'SELECT s.title, s.poster, s.cloud_poster, egr.* ' +
    'FROM episode_group_rating egr ' +
    'INNER JOIN series s ' +
    ' ON egr.series_id = s.id ' +
    'WHERE year = $1 ' +
    'AND s.retired = $2 ';

  return db.selectSendResponse(response, sql, [year, 0]);
};

exports.getAllRatingYears = function(request, response) {
  var sql = 'SELECT DISTINCT year ' +
    'FROM episode_group_rating ' +
    'WHERE retired = $1 ' +
    'ORDER BY year DESC ';

  return db.selectSendResponse(response, sql, [0]);
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
      'e.air_time, ' +
      'e.title, ' +
      'er.rating_value,\n' +
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

  db.selectNoResponse(sql, values).then(results => {
    _.forEach(results, episode => {
      extractSinglePersonEpisode(episode);
    });

    response.json(results);
  });
};

function extractSinglePersonEpisode(episode) {
  const columnsToMove = [
    'rating_value',
    'review',
    'watched_date',
    'watched'
  ];
  episode.personEpisode = {};
  _.forEach(columnsToMove, column => {
    episode.personEpisode[column] = episode[column];
    delete episode[column];
  });
}

exports.getViewingLocations = function(req, response) {
  console.log("Getting all possible viewing locations.");

  var sql = 'SELECT * FROM viewing_location';

  return db.selectSendResponse(response, sql, []);
};

exports.getAllPosters = function(req, response) {
  var tvdbSeriesId = req.query.tvdb_series_id;
  console.log("All Posters call received. Params: {SeriesId: " + tvdbSeriesId + "}");

  var sql = 'SELECT id, poster_path, cloud_poster ' +
    'FROM tvdb_poster ' +
    'WHERE tvdb_series_id = $1 ' +
    'AND retired = $2 ' +
    'ORDER BY id ';
  return db.selectSendResponse(response, sql, [tvdbSeriesId, 0]);
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

  return db.selectSendResponse(response, sql, [1, 0, 'Match Completed', 0, 1])
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

      // todo: remove when iOS can handle it
    'e.on_tivo, ' +
    'te.filename as tvdb_filename, ' +
    'te.overview as tvdb_overview ' +
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

  return db.selectSendResponse(response, sql, [
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

  db.updateSendResponse(response, sql, [tier, seriesId]);
};


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

  db.selectSendResponse(response, sql, values);
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

    db.selectNoResponse(sql, values).then(function (requestResults) {
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

        db.updateNoResponse(sql, values).then(() => resolve());
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

    db.selectNoResponse(sql, values).then(existingSeries => {
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

        db.selectNoResponse(sql, values).then(seriesResults => {
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

  db.updateSendResponse(response, sql, values);
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

  db.selectNoResponse(sql, values).then(function (results) {
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

  return db.selectSendResponse(response, sql, [seriesId]);
};

exports.addViewingLocation = function(req, response) {
  return insertSeriesViewingLocation(req.body.SeriesId, req.body.ViewingLocationId, response);
};

exports.removeViewingLocation = function(req, response) {
  var seriesId = req.body.SeriesId;
  var viewingLocationId = req.body.ViewingLocationId;

  var sql = "DELETE FROM series_viewing_location " +
      "WHERE series_id = $1 AND viewing_location_id = $2";

  return db.updateSendResponse(response, sql, [seriesId, viewingLocationId]);
};

var insertSeriesViewingLocation = function(seriesId, viewingLocationId, response) {

  console.log("Adding viewing_location " + viewingLocationId + " to series " + seriesId);

  var sql = 'INSERT INTO series_viewing_location (series_id, viewing_location_id, date_added) ' +
      'VALUES ($1, $2, now())';

  return db.updateSendResponse(response, sql, [seriesId, viewingLocationId]);
};

exports.updateSeries = function(req, response) {
  console.log("Update Series with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = db.buildUpdateQueryConfig(req.body.ChangedFields, "series", req.body.SeriesId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return db.updateSendResponse(response, queryConfig.text, queryConfig.values);
};

exports.updateEpisode = function(req, response) {
  console.log("Update Episode with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = db.buildUpdateQueryConfig(req.body.ChangedFields, "episode", req.body.EpisodeId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return db.updateSendResponse(response, queryConfig.text, queryConfig.values);
};

exports.updateEpisodeGroupRating = function(req, response) {
  console.log("Update EpisodeGroupRating with " + JSON.stringify(req.body.ChangedFields));

  var queryConfig = db.buildUpdateQueryConfig(req.body.ChangedFields, "episode_group_rating", req.body.EpisodeGroupRatingId);

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return db.updateSendResponse(response, queryConfig.text, queryConfig.values);
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

  return db.selectSendResponse(response, sql, values);
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

  return db.selectSendResponse(response, sql, [1, false, 0, 0]);
};
