const _ = require('underscore');
const db = require('postgres-mmethods');
const debug = require('debug');
const ArrayService = require('./array_util');
const groups_controller = require('./groups_controller');
const errs = require('./error_handler');
const moment = require('moment');

exports.getPersonInfo = function(request, response) {
  const email = request.query.email;
  console.log("User call received: " + email);

  const sql = 'SELECT p.* ' +
          'FROM person p ' +
          'WHERE p.email = $1 ' +
          'AND p.retired = $2 ';

  return db.selectSendResponse(response, sql, [email, 0]);
};

exports.getPersons = function(request, response) {
  console.log("Persons call received:");

  const sql = 'SELECT p.* ' +
    'FROM person p ' +
    'WHERE p.retired = $1 ';

  return db.selectSendResponse(response, sql, [0]);
};

exports.getMyPendingShows = function(request, response) {
  const personId = request.query.PersonId;
  console.log("Server call: Person " + personId);

  const sql = "SELECT s.id, " +
      "s.title, " +
      "s.metacritic, " +
      "s.tvdb_series_id, " +
      "s.tvdb_manual_queue, " +
      "s.last_tvdb_update, " +
      "s.last_tvdb_error, " +
      "tp.poster_path as poster, " +
      "tp.cloud_poster, " +
      "s.person_id " +
      "FROM series s " +
      "LEFT OUTER JOIN tvdb_poster tp " +
      "  ON s.tvdb_poster_id = tp.id " +
      "WHERE s.tvdb_match_status = $1 " +
      "AND s.retired = $2 ";
  const values = [
    'Match Confirmed', 0
  ];

  db.selectSendResponse(response, sql, values);
};

exports.getMyShows = function(request, response) {
  const personId = request.query.PersonId;
  const tier = request.query.Tier;
  console.log("Server call: Person " + personId);

  const startTime = new Date;

  const commonShowsQuery = getCommonShowsQuery(personId);

  const sql = commonShowsQuery.sql +
    "AND ps.tier = $5 ";

  const values = commonShowsQuery.values;
  values.push(tier);

  db.selectNoResponse(sql, values).then(function (seriesResults) {

    exports.attachPosterInfoToSeriesObjects(seriesResults);

    const sql = "SELECT e.series_id, e.air_time, e.air_date, e.season, e.episode_number " +
      "FROM regular_episode e " +
      "INNER JOIN person_series ps " +
      "  ON ps.series_id = e.series_id " +
      "WHERE e.id NOT IN (SELECT er.episode_id " +
      "                   FROM episode_rating er " +
      "                   WHERE er.person_id = $1 " +
      "                   AND er.watched = $2) " +
      "AND ps.person_id = $3 " +
      "AND ps.tier = $4" +
      "ORDER BY e.series_id, e.season, e.episode_number, e.air_time ";

    const values = [
      personId,
      true,
      personId,
      tier
    ];

    db.selectNoResponse(sql, values).then(function(episodeResults) {

      updateUnwatchedDenorms(seriesResults, episodeResults);

      const sql =
          "SELECT e.series_id, er.episode_id, er.rating_value " +
          "FROM episode_rating er " +
          "INNER JOIN valid_episode e " +
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
          "AND ps.tier = $5 " +
          "ORDER BY e.series_id, er.watched_date DESC, e.season DESC, e.episode_number DESC ";

      const values = [
        true,
        0,
        personId,
        personId,
        tier
      ];

      db.selectNoResponse(sql, values).then(function(ratingResults) {

        updateRatings(seriesResults, ratingResults);

        const timeElapsed = new Date - startTime;
        console.log("Time elapsed: " + timeElapsed);
        return response.json(seriesResults);
      }).catch(err => {
        throwError('Error fetching queue ratings: ' + err.message,
            'getMyShows ratings query',
            response)
      });

    })
        .catch(err => {
          throwError('Error fetching queue episodes: ' + err.message,
              'getMyShows episode query',
              response)
        });
  })
      .catch(err => {
        throwError('Error fetching queue series: ' + err.message,
            'getMyShows series query',
            response)
      });

};

exports.getMyQueueShows = function(request, response) {
  const personId = request.query.PersonId;
  const tier = request.query.Tier;
  console.log("Server call: Person " + personId);

  const startTime = new Date;

  const commonShowsQuery = getCommonShowsQuery(personId);
  const sql = commonShowsQuery.sql +
    "AND ps.tier = $5 " +
    "AND ( " +
    "       ps.pinned = $6 " +
    "       OR " +
      "     (SELECT MAX(er.watched_date) " +
      "     FROM episode_rating er  " +
      "     INNER JOIN regular_episode e  " +
      "       ON er.episode_id = e.id " +
      "     WHERE e.series_id = s.id " +
      "     AND er.person_id = $1 " +
      "     AND er.watched = $2 " +
      "     AND er.retired = $4) > (now() - INTERVAL '14 days') " +
      "    OR " +
      "    (ps.date_added > (now() - INTERVAL '8 days') ) " +
      "    OR " +
      "    (SELECT MIN(e.air_time) " +
      "     FROM regular_episode e " +
      "     WHERE e.series_id = s.id " +
      "     AND e.id NOT IN (SELECT episode_id  " +
      "                        FROM episode_rating " +
      "                        WHERE watched = $2 " +
      "                        AND person_id = $1 " +
      "                        AND retired = $4)) BETWEEN (now() - INTERVAL '8 days') AND (now() + INTERVAL '8 days') " +
      "     ) ";
  const values = commonShowsQuery.values;
  values.push(tier);
  values.push(true);

  db.selectNoResponse(sql, values).then(function (seriesResults) {

    if (seriesResults.length === 0) {
      response.json([]);
    } else {
      const series_ids = _.pluck(seriesResults, 'id');

      exports.attachPosterInfoToSeriesObjects(seriesResults);

      const values = [
        personId,
        true
      ];

      const sql = "SELECT e.series_id, e.air_time, e.air_date, e.season, e.episode_number " +
          "FROM regular_episode e " +
          "WHERE e.id NOT IN (SELECT er.episode_id " +
          "                   FROM episode_rating er " +
          "                   WHERE er.person_id = $1 " +
          "                   AND er.watched = $2) " +
          "AND e.series_id IN (" + db.createInlineVariableList(series_ids.length, values.length + 1) + ') ' +
          "ORDER BY e.series_id, e.season, e.episode_number, e.air_time ";

      ArrayService.addToArray(values, series_ids);

      db.selectNoResponse(sql, values).then(function(episodeResults) {

        updateUnwatchedDenorms(seriesResults, episodeResults);

        const values = [
          true,
          0,
          personId
        ];

        const sql =
            "SELECT e.series_id, er.episode_id, er.rating_value " +
            "FROM episode_rating er " +
            "INNER JOIN valid_episode e " +
            "  ON er.episode_id = e.id " +
            "WHERE er.watched = $1 " +
            "AND er.retired = $2 " +
            "AND er.person_id = $3 " +
            "AND er.rating_value IS NOT NULL " +
            "AND e.series_id IN (" + db.createInlineVariableList(series_ids.length, values.length + 1) + ') ' +
            "ORDER BY e.series_id, er.watched_date DESC, e.season DESC, e.episode_number DESC ";

        ArrayService.addToArray(values, series_ids);

        db.selectNoResponse(sql, values).then(function(ratingResults) {

          updateRatings(seriesResults, ratingResults);

          const timeElapsed = new Date - startTime;
          console.log("Time elapsed: " + timeElapsed);
          return response.json(seriesResults);
        }).catch(err => {
          throwError('Error fetching myQueue episodes: ' + err.message,
              'getMyQueueShows episode query',
              response)
        });

      })
      .catch(err => {
        throwError('Error fetching myQueue episodes: ' + err.message,
            'getMyQueueShows episode query',
            response)
      });
    }

  }).catch(err => {
    throwError('Error fetching myQueue ratings: ' + err.message,
        'getMyQueueShows ratings query',
        response)
  });

};

function throwError(consoleMsg, clientError, response) {
  response.status(500);
  response.json({ error: clientError });
  throw new Error(consoleMsg);
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

function getCommonShowsQuery(personId) {
  return {
    sql: "SELECT s.id, " +
        "s.title, " +
      "s.metacritic, " +
      "s.unmatched_episodes, " +
      "(SELECT COUNT(1) " +
      "    from regular_episode e " +
      "    where e.series_id = s.id " +
      "    and e.air_date IS NOT NULL" +
      "    and e.air_date < NOW() ) as aired_episodes, " +
      "(SELECT COUNT(1) " +
      "  FROM episode_rating er " +
      "  INNER JOIN regular_episode e " +
      "    ON er.episode_id = e.id" +
      "  WHERE e.series_id = s.id " +
      "  AND er.retired = $4 " +
      "  AND er.rating_pending = $3 " +
      "  AND er.person_id = $1) as rating_pending_episodes, " +
      "s.tvdb_series_id, " +
      "s.tvdb_series_ext_id, " +
      "s.tvdb_manual_queue, " +
      "s.last_tvdb_update, " +
      "s.last_tvdb_error, " +
      "tp.poster_path as poster, " +
      "(select string_agg(g.name, '|') " +
      "             from genre g " +
      "             inner join series_genre sg " +
      "               on sg.genre_id = g.id " +
      "              where sg.series_id = s.id " +
      "              and sg.retired = $4) as genres, " +
      "tp.cloud_poster, " +
      "s.air_time, " +
      "s.trailer_link, " +
      "ps.rating as my_rating, " +
      "ps.first_unwatched, " +
      "ps.tier AS my_tier, " +
      "ps.date_added, " +
      "ps.pinned, " +
      "ts.network, " +
      "(SELECT id " +
      "  FROM person_poster " +
      "  WHERE series_id = s.id " +
      "  AND person_id = $1 " +
      "  AND retired = $4) as poster_id, " +
      "COALESCE(ps.rating, metacritic) AS dynamic_rating, " +
      "(SELECT MAX(er.watched_date) " +
      "  from episode_rating er " +
      "  inner join regular_episode e " +
      "   on er.episode_id = e.id " +
      "  where e.series_id = s.id " +
      "  and er.retired = $4 " +
      "  and er.person_id = $1 " +
      "  and er.watched = $2) as last_watched " +
      "FROM matched_series s " +
      "INNER JOIN person_series ps " +
      "  ON ps.series_id = s.id " +
      "INNER JOIN tvdb_series ts " +
      "  ON s.tvdb_series_id = ts.id " +
      "LEFT OUTER JOIN tvdb_poster tp " +
      "  ON s.tvdb_poster_id = tp.id " +
      "WHERE ps.person_id = $1 " +
      "AND ps.retired = $4 ",
    values: [personId, true, true, 0]
  };
}

function extractSinglePersonSeries(series) {
  const columnsToMove = [
    'rating_pending_episodes',
    'my_rating',
    'first_unwatched',
    'my_tier',
    'date_added',
    'dynamic_rating',
    'last_watched',
    'pinned'
  ];
  series.personSeries = {};
  _.forEach(columnsToMove, column => {
    series.personSeries[column] = series[column];
    delete series[column];
  });
}

function extractPersonSeries(seriesResults) {
  _.each(seriesResults, extractSinglePersonSeries);
}


function updateUnwatchedDenorms(seriesResults, episodeResults) {

  extractPersonSeries(seriesResults);

  const groupedBySeries = _.groupBy(episodeResults, "series_id");
  for (const seriesId in groupedBySeries) {
    if (groupedBySeries.hasOwnProperty(seriesId)) {
      const unwatchedEpisodes = groupedBySeries[seriesId];

      const series = _.findWhere(seriesResults, {id: parseInt(seriesId)});
      if (series) {
        debug("Series: " + series.title);

        exports.updateSeriesDenorms(series, series.personSeries, unwatchedEpisodes);
      }
    }
  }

}

function updateRatings(seriesResults, ratingResults) {

  const groupedBySeries = _.groupBy(ratingResults, "series_id");
  for (const seriesId in groupedBySeries) {
    if (groupedBySeries.hasOwnProperty(seriesId)) {
      const seriesRatings = groupedBySeries[seriesId];

      const series = _.findWhere(seriesResults, {id: parseInt(seriesId)});
      if (series) {
        debug("Series: " + series.title);

        calculateRating(series, seriesRatings);
      }
    }
  }
}

exports.getUpdatedSingleSeries = function(series_id, person_id) {
  return new Promise((resolve, reject) => {

    const commonShowsQuery = getCommonShowsQuery(person_id);
    const sql = commonShowsQuery.sql +
    "AND s.id = $5 ";
    const values = commonShowsQuery.values;
    values.push(series_id);

    db.selectNoResponse(sql, values).then(function (seriesResults) {

      if (seriesResults.length === 0) {
        reject("No person_series found with series_id: " + series_id + " and person_id: " + person_id);
        return;
      }

      exports.attachPosterInfoToSeriesObjects(seriesResults);

      const series = seriesResults[0];

      extractSinglePersonSeries(series);

      const sql = "SELECT e.air_time, e.air_date, e.season, e.episode_number " +
        "FROM regular_episode e " +
        "WHERE e.id NOT IN (SELECT er.episode_id " +
        "                   FROM episode_rating er " +
        "                   WHERE er.person_id = $3 " +
        "                   AND er.watched = $4" +
        "                   AND er.retired = $1) " +
        "AND e.series_id = $2 " +
        "ORDER BY e.season, e.episode_number, e.air_time ";

      const values = [
        0,
        series_id,
        person_id,
        true
      ];

      db.selectNoResponse(sql, values).then(function(episodeResults) {

        exports.updateSeriesDenorms(series, series.personSeries, episodeResults);

        const sql =
          "SELECT er.episode_id, er.rating_value " +
          "FROM episode_rating er " +
          "INNER JOIN valid_episode e " +
          "  ON er.episode_id = e.id " +
          "WHERE er.watched = $1 " +
          "AND er.retired = $2 " +
          "AND er.person_id = $3 " +
          "AND er.rating_value IS NOT NULL " +
          "AND e.series_id = $4 " +
          "ORDER BY er.watched_date DESC, e.season DESC, e.episode_number DESC ";

        const values = [
          true,
          0,
          person_id,
          series_id
        ];

        db.selectNoResponse(sql, values).then(function(ratingResults) {

          calculateRating(series, ratingResults);

          resolve(series);
        });

      });
    });

  });

};

exports.getSeriesDetailInfo = function(request, response) {
  const series_id = request.query.SeriesId;
  const person_id = request.query.PersonId;

  const sql = "SELECT s.id, " +
    "s.title, " +
    "s.metacritic, " +
    "s.unmatched_episodes, " +
    "(SELECT COUNT(1) " +
    "    from regular_episode e " +
    "    where e.series_id = s.id " +
    "    and e.air_date IS NOT NULL" +
    "    and e.air_date < NOW()) as aired_episodes, " +
    "s.tvdb_series_id, " +
    "s.tvdb_series_ext_id, " +
    "s.tvdb_manual_queue, " +
    "s.last_tvdb_update, " +
    "s.last_tvdb_error, " +
    "tp.poster_path as poster, " +
    "(select string_agg(g.name, '|') " +
    "             from genre g " +
    "             inner join series_genre sg " +
    "               on sg.genre_id = g.id " +
    "              where sg.series_id = s.id " +
    "              and sg.retired = $1) as genres, " +
    "tp.cloud_poster, " +
    "s.air_time, " +
    "s.trailer_link " +
    "FROM matched_series s " +
    "LEFT OUTER JOIN tvdb_poster tp " +
    "  ON s.tvdb_poster_id = tp.id " +
    "WHERE s.id = $2 ";

  const values = [0, series_id];

  db.selectNoResponse(sql, values).then(function (seriesResults) {

    if (seriesResults.length === 0) {
      reject("No series found with series_id: " + series_id);
      return;
    }

    const series = seriesResults[0];

    exports.attachPossiblePosterToSeries(series, person_id);

    const sql = "SELECT " +
      "ps.rating as my_rating, " +
      "ps.first_unwatched, " +
      "ps.tier AS my_tier, " +
      "ps.date_added, " +
      "ps.pinned, " +
      "(SELECT COUNT(1) " +
      "  FROM episode_rating er " +
      "  INNER JOIN valid_episode e " +
      "    ON er.episode_id = e.id" +
      "  WHERE e.series_id = ps.series_id " +
      "  AND er.retired = $1 " +
      "  AND er.rating_pending = $2" +
      "  AND er.person_id = $3) as rating_pending_episodes, " +
      "ps.rating AS dynamic_rating, " +
      "(SELECT MAX(er.watched_date) " +
      "  from episode_rating er " +
      "  inner join valid_episode e " +
      "   on er.episode_id = e.id " +
      "  where e.series_id = ps.series_id " +
      "  and er.retired = $1 " +
      "  and er.person_id = $3 " +
      "  and er.watched = $4) as last_watched " +
      "FROM person_series ps " +
      "WHERE ps.person_id = $3 " +
      "AND ps.series_id = $5 " +
      "AND ps.retired = $1 ";
    const values = [0, true, person_id, true, series_id];

    db.selectNoResponse(sql, values).then(personResults => {

      if (personResults.length > 0) {
        series.personSeries = personResults[0];
      }

      const sql = "SELECT e.id, " +
        "e.air_time, " +
        "e.air_date, " +
        "e.title, " +
        "e.season, " +
        "e.episode_number, " +
        "e.absolute_number," +
        "te.filename as tvdb_filename, " +
        "te.overview as tvdb_overview " +
        "FROM valid_episode e " +
        "INNER JOIN tvdb_episode te " +
        " ON e.tvdb_episode_id = te.id " +
        "WHERE e.series_id = $1 " +
        "ORDER BY e.season, e.episode_number, e.air_time ";

      const values = [
        series_id
      ];

      db.selectNoResponse(sql, values).then(function(episodeResults) {

        series.episodes = episodeResults;

        const sql =
          "SELECT er.episode_id, " +
          "er.watched_date, " +
          "er.watched, " +
          "er.rating_value, " +
          "er.rating_pending, " +
          "er.review, " +
          "er.id as rating_id " +
          "FROM episode_rating er " +
          "INNER JOIN valid_episode e " +
          "  ON er.episode_id = e.id " +
          "WHERE er.retired = $1 " +
          "AND er.person_id = $2 " +
          "AND e.series_id = $3 " +
          "ORDER BY er.watched_date DESC NULLS LAST, e.absolute_number DESC ";

        const values = [
          0,
          person_id,
          series_id
        ];

        db.selectNoResponse(sql, values).then(function(ratingResults) {
          console.info(`Retrieved ${ratingResults.length} ratings.`);

          if (ArrayService.exists(series.personSeries)) {
            console.info(`Calculating ratings...`);
            calculateRating(series, ratingResults);
            console.info(`Finished calculating ratings.`);
          }

          ratingResults.forEach(function (episodeRating) {
            const episodeMatch = _.find(episodeResults, function (episode) {
              return episode.id === episodeRating.episode_id;
            });

            if (ArrayService.exists(episodeMatch)) {
              delete episodeRating.episode_id;

              episodeMatch.personEpisode = episodeRating;
            }
          });

          exports.updateSeriesDenorms(series, series.personSeries, series.episodes);

          const sql = 'SELECT tgs.tv_group_id, ' +
            ' tg.min_weight, ' +
            ' tgs.date_added, ' +
            ' tgs.id AS tv_group_series_id, ' +
            "(SELECT MAX(tge.watched_date) " +
            "  from tv_group_episode tge " +
            "  inner join valid_episode e " +
            "   on tge.episode_id = e.id " +
            "  where e.series_id = $1 " +
            "  and tge.retired = $3 " +
            "  and tge.tv_group_id = tgs.tv_group_id) as last_watched " +
            'FROM tv_group_series tgs ' +
            'INNER JOIN tv_group tg ' +
            ' ON tgs.tv_group_id = tg.id ' +
            'INNER JOIN tv_group_person tgp ' +
            ' ON tgp.tv_group_id = tg.id ' +
            'WHERE tgs.series_id = $1 ' +
            'AND tgp.person_id = $2 ' +
            'AND tgs.retired = $3 ' +
            'AND tg.retired = $3 ' +
            'AND tgp.retired = $3 ';

          const values = [series_id, person_id, 0];

          db.selectNoResponse(sql, values).then(groupResults => {
            series.groups = groupResults;
            console.info(`Retrieved ${series.groups.length} groups.`);

            const sql = "SELECT tge.id, tge.watched, tge.watched_date, tge.episode_id, tge.skipped, tge.tv_group_id  " +
              "FROM tv_group_episode tge " +
              "INNER JOIN valid_episode e " +
              " ON tge.episode_id = e.id " +
              "INNER JOIN tv_group tg " +
              " ON tge.tv_group_id = tg.id " +
              "INNER JOIN tv_group_person tgp " +
              " ON tgp.tv_group_id = tg.id " +
              "WHERE tgp.person_id = $3 " +
              "AND e.series_id = $1 " +
              "AND tge.retired = $2 " +
              "ORDER BY tge.tv_group_id, e.absolute_number";

            const values = [series_id, 0, person_id];

            db.selectNoResponse(sql, values).then(groupEpisodeResults => {
              console.info(`Retrieved ${groupEpisodeResults.length} groupEpisodes.`);

              const sql = 'SELECT tgp.person_id, er.episode_id ' +
                'FROM episode_rating er ' +
                'INNER JOIN person p ' +
                '  ON er.person_id = p.id ' +
                'INNER JOIN tv_group_person tgp ' +
                '  ON p.id = tgp.person_id ' +
                'INNER JOIN tv_group_person my_tgp ' +
                '  ON tgp.tv_group_id = my_tgp.tv_group_id ' +
                'INNER JOIN valid_episode e ' +
                '  ON er.episode_id = e.id ' +
                'WHERE my_tgp.person_id = $1 ' +
                'AND tgp.person_id <> $1 ' +
                'AND e.series_id = $2 ' +
                'AND er.retired = $3 ' +
                'AND tgp.retired = $3 ' +
                'AND p.retired = $3 ' +
                'AND my_tgp.retired = $3 ' +
                'AND er.watched = $4 ' +
                'GROUP BY tgp.person_id, er.episode_id ' +
                'ORDER BY tgp.person_id, er.episode_id ';

              const values = [
                person_id,
                series_id,
                0,
                true
              ];

              db.selectNoResponse(sql, values).then(otherViewerResults => {
                console.info(`Retrieved ${otherViewerResults.length} other viewer results.`);

                _.each(groupEpisodeResults, groupEpisode => {
                  const episodeMatch = _.find(series.episodes, function (episode) {
                    return episode.id === groupEpisode.episode_id;
                  });

                  if (ArrayService.exists(episodeMatch)) {
                    if (!ArrayService.exists(episodeMatch.groups)) {
                      episodeMatch.groups = [];
                    }

                    const groupEpisodeObj = {
                      tv_group_id: groupEpisode.tv_group_id,
                      tv_group_episode_id: groupEpisode.id,
                      watched: groupEpisode.watched,
                      watched_date: groupEpisode.watched_date,
                      skipped: groupEpisode.skipped
                    };

                    episodeMatch.groups.push(groupEpisodeObj);

                  }
                });

                _.each(episodeResults, episode => {
                  const otherViewers = _.where(otherViewerResults, {episode_id: episode.id});
                  episode.otherViewers = _.map(otherViewers, otherViewer => _.omit(otherViewer, 'episode_id'));
                });

                const updates = [];

                _.each(series.groups, groupSeries => {
                  updates.push(attachBallotsToGroupSeries(series, groupSeries));
                  exports.updateSeriesDenorms(series, groupSeries, series.episodes);
                });

                console.info('About to attach ballots.');
                Promise.all(updates).then(() => {
                  console.info('Finished processing series. Returning.');
                  response.json(series);
                });

              });

            });

          });

        })
          .catch(err => {
            throwError('Error fetching showDetail ratings: ' + err.message,
              'getSeriesDetailInfo ratings query',
              response)
          });

      })
        .catch(err => {
          throwError('Error fetching showDetail episodes: ' + err.message,
            'getSeriesDetailInfo episodes query',
            response)
        });
    });
  })
    .catch(err => {
      throwError('Error fetching showDetail series: ' + err.message,
        'getSeriesDetailInfo series query',
        response)
    });


};

exports.attachPossiblePosterToSeries = function(series, personId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT pp.id, tp.id as tvdb_poster_id, tp.poster_path as poster, tp.cloud_poster, tp.hidden ' +
      'FROM tvdb_poster tp ' +
      'INNER JOIN person_poster pp ' +
      '  ON pp.tvdb_poster_id = tp.id ' +
      'WHERE pp.series_id = $1 ' +
      'AND pp.person_id = $2 ';
    const values = [series.id, personId];
    db.selectNoResponse(sql, values).then(results => {
      if (results.length > 0) {
        series.my_poster = results[0];
      }
      resolve();
    }).catch(err => reject(err));
  });
};

exports.attachPosterInfoToSeriesObjects = function(seriesObjs) {
  return new Promise(resolve => {
    const seriesWithCustom = _.filter(seriesObjs, series => !!series.poster_id);
    if (seriesWithCustom.length > 0) {
      const sql = 'SELECT pp.id, tp.id as tvdb_poster_id, tp.poster_path as poster, tp.cloud_poster, tp.hidden ' +
        'FROM tvdb_poster tp ' +
        'INNER JOIN person_poster pp ' +
        '  ON pp.tvdb_poster_id = tp.id ' +
        'WHERE pp.id IN (' + db.createInlineVariableList(seriesWithCustom.length, 1) + ') ';
      const values = _.pluck(seriesWithCustom, 'poster_id');

      db.selectNoResponse(sql, values).then(results => {
        _.each(results, poster => {
          const series = _.findWhere(seriesWithCustom, {poster_id: poster.id});
          series.my_poster = poster;
          delete series.poster_id;
        });
        resolve(seriesObjs);
      });
    } else {
      resolve();
    }
  });

};

function attachBallotsToGroupSeries(series, groupSeries) {
  return new Promise(resolve => {
    const tv_group_series_id = groupSeries.tv_group_series_id;

    const sql = 'SELECT tgb.id, tgb.voting_open, tgb.voting_closed, tgb.reason, tgb.last_episode, tgb.first_episode, tgb.skip, tgb.person_id ' +
      'FROM tv_group_ballot tgb ' +
      'WHERE tgb.tv_group_series_id = $1 ' +
      'AND tgb.retired = $2 ' +
      'ORDER BY tgb.voting_open DESC ';

    const values = [
      tv_group_series_id,
      0
    ];

    db.selectNoResponse(sql, values).then(function (ballotResults) {
      const sql = 'SELECT tgv.tv_group_ballot_id, tgv.person_id, tgv.vote_value ' +
        'FROM tv_group_vote tgv ' +
        'INNER JOIN tv_group_ballot tgb ' +
        '  ON tgv.tv_group_ballot_id = tgb.id ' +
        'WHERE tgb.tv_group_series_id = $1 ' +
        'AND tgv.retired = $2 ' +
        'AND tgb.retired = $3 ';

      const values = [
        tv_group_series_id,
        0, 0
      ];

      db.selectNoResponse(sql, values).then(function (voteResults) {

        let groupedByBallot = _.groupBy(voteResults, 'tv_group_ballot_id');

        ballotResults.forEach(function (ballot) {
          let votesForBallot = groupedByBallot[ballot.id];
          ballot.votes = _.map(votesForBallot, function (vote) {
            return _.omit(vote, 'tv_group_ballot_id');
          });
        });

        groupSeries.ballots = ballotResults;
        groupSeries.group_score = groups_controller.calculateGroupRatingForGroupSeries(groupSeries, groupSeries.min_weight);

        resolve();
      });
    });
  });
}

function getUnwatchedEpisodesBeforeDate(latestTime, series_id, person_id) {
  return new Promise(resolve => {
    const incremented = moment(latestTime).add(1, 'minutes').toDate();

    const sql = 'SELECT e.air_time ' +
      'FROM valid_episode e ' +
      'WHERE series_id = $1 ' +
      'AND air_time IS NOT NULL ' +
      'AND air_time < $3 ' +
      'AND id NOT IN (SELECT episode_id ' +
      '               FROM episode_rating ' +
      '               WHERE watched = $4' +
      '               AND retired = $2' +
      '               AND person_id = $5) ' +
      'ORDER BY air_time ';

    const values = [series_id, 0, incremented, true, person_id];

    db.selectNoResponse(sql, values).then(results => resolve(results));
  });
}

function getResultObjectForUnwatched(latestTime, series_id, person_id, fullEpisodeCount, nextEpisode) {
  return new Promise(resolve => {
    getUnwatchedEpisodesBeforeDate(latestTime, series_id, person_id).then(unwatchedEpisodes => {
      const first_unwatched = !unwatchedEpisodes[0] ? null : unwatchedEpisodes[0].air_time;
      const unwatched_all = unwatchedEpisodes.length;

      const infoObj = {
        series_id: series_id,
        episode_count: fullEpisodeCount,
        next_air_time: nextEpisode ? nextEpisode.air_time : null,
        first_unwatched: first_unwatched,
        unwatched_all: unwatched_all
      };
      resolve(infoObj);
    });
  });
}

exports.getNextAiredInfo = function(request, response) {
  const sql = 'SELECT e.series_id, e.air_time ' +
    'FROM valid_episode e ' +
    'INNER JOIN series s ' +
    '  ON e.series_id = s.id ' +
    'INNER JOIN person_series ps ' +
    '  ON ps.series_id = s.id ' +
    'WHERE ps.person_id = $1 ' +
    'AND e.air_time IS NOT NULL ' +
    'AND e.air_time > now() ' +
    'ORDER BY e.air_time ASC';

  const person_id = request.query.person_id;
  db.selectNoResponse(sql, [person_id]).then(function (results) {
    if (results.length > 0) {
      const earliestTime = results[0].air_time;
      const earliestEpisodes = _.filter(results, episode => episode.air_time.getTime() === earliestTime.getTime());
      const groupedBySeries = _.groupBy(earliestEpisodes, 'series_id');

      const resultObjects = [];
      const unwatchedQueries = [];

      for (const series_id in groupedBySeries) {
        if (groupedBySeries.hasOwnProperty(series_id)) {
          const episodes = groupedBySeries[series_id];
          const series_id_int = parseInt(series_id);
          const otherEpisodes = _.where(results, {series_id: series_id_int});
          const nextEpisode = _.find(otherEpisodes, episode => {
            return ArrayService.exists(episode.air_time) &&
              episode.air_time > earliestTime;
          });

          unwatchedQueries.push(getResultObjectForUnwatched(earliestTime, series_id, person_id, episodes.length, nextEpisode));
        }
      }

      Promise.all(unwatchedQueries).then(results => {
        _.each(results, result => resultObjects.push(result));

        const objectWithTime = {
          air_time: earliestTime,
          shows: resultObjects
        };

        response.json(objectWithTime);
      });

    } else {
      response.json({
        air_time: null,
        shows: []
      })
    }
  });
};

exports.pinToDashboard = function(request, response) {
  const series_id = request.body.series_id;
  const person_id = request.body.person_id;
  const pinned = request.body.pinned;

  const sql = "UPDATE person_series " +
    "SET pinned = $1 " +
    "WHERE person_id = $2 " +
    "AND series_id = $3 " +
    "AND retired = $4 ";

  const values = [
    pinned, person_id, series_id, 0
  ];

  db.updateSendResponse(response, sql, values);
};

exports.seriesRequest = function(request, response) {
  const series_request = request.body.seriesRequest;

  const sql = "INSERT INTO series_request (" +
    "title, person_id, tvdb_series_ext_id, poster) " +
    "VALUES ($1, $2, $3, $4) " +
    "RETURNING id ";
  const values = [
    series_request.title,
    series_request.person_id,
    series_request.tvdb_series_ext_id,
    series_request.poster
  ];

  db.selectNoResponse(sql, values).then(function (results) {
    response.json({seriesRequestId: results[0].id})
  }, function(err) {
    response.status(500).send(err);
  });

};

exports.getAllOpenSeriesRequests = function(request, response) {
  const sql = 'SELECT sr.id, sr.person_id, sr.tvdb_series_ext_id, sr.title, sr.poster, p.first_name, p.last_name ' +
    'FROM series_request sr ' +
    'INNER JOIN person p ' +
    '  ON sr.person_id = p.id ' +
    'WHERE sr.approved IS NULL ' +
    'AND sr.rejected IS NULL ';

  db.selectSendResponse(response, sql, []);
};

exports.getMySeriesRequests = function(request, response) {
  const sql = 'SELECT id, tvdb_series_ext_id, title, poster ' +
    'FROM series_request ' +
    'WHERE approved IS NULL ' +
    'AND rejected IS NULL ' +
    'AND person_id = $1 ' +
    'AND retired = $2 ';

  const values = [request.query.person_id, 0];

  db.selectNoResponse(sql, values).then(function(myRequests) {
    const sql = 'SELECT sr.id, sr2.approved, sr2.rejected ' +
      'FROM series_request sr ' +
      'INNER JOIN series_request sr2 ' +
      '  ON sr.tvdb_series_ext_id = sr2.tvdb_series_ext_id ' +
      'WHERE sr.person_id = $1 ' +
      'AND sr2.person_id <> $1 ' +
      'AND sr.retired = $2 ' +
      'AND sr2.retired = $2 ' +
      'AND sr.approved IS NULL ' +
      'AND sr.rejected IS NULL ' +
      'AND (sr2.approved IS NOT NULL OR sr2.rejected IS NOT NULL) ';

    db.selectNoResponse(sql, [request.query.person_id, 0]).then(function(dupeRequests) {
      _.forEach(dupeRequests, dupeRequest => removeDuplicateRequest(myRequests, dupeRequest));

      const sql = 'SELECT sr.id ' +
        'FROM series_request sr ' +
        'INNER JOIN series s ' +
        '  ON sr.tvdb_series_ext_id = s.tvdb_series_ext_id ' +
        'WHERE sr.person_id = $1 ' +
        'AND sr.approved IS NULL ' +
        'AND sr.rejected IS NULL ' +
        'AND s.tvdb_match_status = $3 ' +
        'AND sr.retired = $2 ' +
        'AND s.retired = $2 ';

      const values = [request.query.person_id, 0, 'Match Completed'];

      db.selectNoResponse(sql, values).then(function(completedRequests) {
        _.forEach(completedRequests, completedRequest => completeCompletedRequests(myRequests, completedRequest));

        response.json(myRequests);
      });
    });
  });
};

function removeDuplicateRequest(myRequests, dupeRequest) {
  const matching = _.findWhere(myRequests, {id: dupeRequest.id});
  markRequestResolved(matching, dupeRequest);
  ArrayService.removeFromArray(myRequests, matching);
}

function completeCompletedRequests(myRequests, completedRequest) {
  completedRequest.approved = new Date();
  const matching = _.findWhere(myRequests, {id: completedRequest.id});
  markRequestResolved(matching, completedRequest);
  ArrayService.removeFromArray(myRequests, matching);
}

function markRequestResolved(myRequest, dupeRequest) {
  const resolution = dupeRequest.approved ?
    {
      type: 'approved',
      resolution_date: dupeRequest.approved
    } :
    {
      type: 'rejected',
      resolution_date: dupeRequest.rejected
    };
  const sql = 'UPDATE series_request ' +
    'SET ' + resolution.type + ' = $1 ' +
    'WHERE id = $2 ';
  db.updateNoResponse(sql, [resolution.resolution_date, myRequest.id]);
}

// denorm helper

function getGroupEpisode(episode, tv_group_id) {
  return _.findWhere(episode.groups, {tv_group_id: tv_group_id});
}

exports.updateSeriesDenorms = function(series, viewer, allEpisodes) {
  const eligibleEpisodes = _.filter(allEpisodes, isEligible);
  let unairedEpisodes = _.filter(eligibleEpisodes, isUnaired);

  let nextEpisodeToAir = unairedEpisodes.length === 0 ? null : _.first(unairedEpisodes);
  if (nextEpisodeToAir !== null) {
    series.nextAirDate = nextEpisodeToAir.air_time === null ? nextEpisodeToAir.air_date : nextEpisodeToAir.air_time;
  }

  if (!!viewer) {
    const isGroup = ArrayService.exists(viewer.tv_group_id);

    const getEpisodeViewer = isGroup ?
      (episode) => getGroupEpisode(episode, viewer.tv_group_id) :
      (episode) => episode.personEpisode;

    const unwatchedEpisodes = _.filter(eligibleEpisodes, episode => isUnwatchedAndUnskipped(getEpisodeViewer(episode)));
    const unwatchedAiredEpisodes = _.filter(unwatchedEpisodes, isAired);

    viewer.unwatched_all = unwatchedAiredEpisodes.length;

    let nextEpisodeToWatch = unwatchedAiredEpisodes.length === 0 ? null : _.first(unwatchedAiredEpisodes);
    if (nextEpisodeToWatch !== null) {
      viewer.first_unwatched = nextEpisodeToWatch.air_time === null ? nextEpisodeToWatch.air_date : nextEpisodeToWatch.air_time;
    }

    let nextEpisode = unwatchedEpisodes.length === 0 ? null : _.first(unwatchedEpisodes);
    if (!!nextEpisode) {
      viewer.nextEpisodeNumber = nextEpisode.episode_number;
      viewer.nextEpisodeSeason = nextEpisode.season;
    }

    viewer.midSeason = stoppedMidseason(nextEpisodeToWatch);
  }
};

function calculateRating(series, ratings) {
  const ratingElements = [];

  const previousEpisodeWeights = [10, 10, 10, 9, 8, 6, 4, 2, 1, 1];

  addElement(ratingElements, 10, series.personSeries.my_rating);

  let lastEpisodes = _.first(ratings, previousEpisodeWeights.length);

  for (let i = 0; i < previousEpisodeWeights.length; i++) {
    const episodeWeight = previousEpisodeWeights[i];

    if (!_.isUndefined(lastEpisodes[i])) {
      const previousEpisode = lastEpisodes[i];
      const ratingValue = parseInt(previousEpisode.rating_value);
      addElement(ratingElements, episodeWeight, ratingValue);
    }
  }

  if (_.isEmpty(ratingElements)) {
    addElement(ratingElements, 10, series.metacritic);
  }

  series.personSeries.dynamic_rating = combineRatingElements(ratingElements);
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
    return null;
  }

  let runningWeight = 0;
  let runningValue = 0;
  _.each(ratingElements, function(element) {
    runningWeight += element.weight;
    runningValue += (element.value * element.weight);
  });

  return runningValue / runningWeight;
}

// aired helpers

function isEligible(episode) {
  // unaired if the air time after now.
  return episode.season !== 0;
}

function isUnaired(episode) {
  // unaired if the air time after now.
  return episode.air_time === null || ((episode.air_time - new Date) > 0);
}

function isAired(episode) {
  return !isUnaired(episode);
}

function isUnwatchedAndUnskipped(viewerEpisode) {
  return !isWatched(viewerEpisode) && !isSkipped(viewerEpisode);
}

function isWatched(viewerEpisode) {
  return !!viewerEpisode && !!viewerEpisode.watched;
}

function isSkipped(viewerEpisode) {
  return !!viewerEpisode && !!viewerEpisode.skipped;
}

function stoppedMidseason(nextEpisode) {
  return nextEpisode !== null &&
    _.isNumber(nextEpisode.episode_number) &&
    nextEpisode.episode_number > 1;
}


exports.addToMyShows = function(request, response) {
  const personId = request.body.PersonId;
  const seriesId = request.body.SeriesId;
  const lastWatched = request.body.LastWatched;

  const sql = "INSERT INTO person_series " +
    "(person_id, series_id, tier, unwatched_episodes) " +
    "VALUES ($1, $2, $3, (SELECT COUNT(1) " +
    "                     FROM regular_episode e " +
    "                     WHERE e.series_id = $4 " +
    "                     AND e.air_time < now() " +
    "                     AND e.id NOT IN (SELECT er.episode_id " +
    "                                       FROM episode_rating er " +
    "                                       WHERE er.person_id = $5" +
    "                                       AND er.watched = $6))) ";
  const values = [
    personId, seriesId, 1, seriesId, personId, true
  ];

  db.updateNoResponse(sql, values).then(() => {
    const payload = {
      series_id: seriesId,
      last_watched: lastWatched,
      person_ids: [personId]
    };
    exports.updateEpisodeRatingsAllPastWatched(payload, false, [personId], null, response).then(() => {
      exports.getUpdatedSingleSeries(seriesId, personId)
        .then(series => {
          response.json(series);
        })
        .catch(err => {
          errs.throwError(err, 'Error updating past episode ratings.', response);
        });
    });
  });
};

exports.removeFromMyShows = function(request, response) {
  const personId = request.body.PersonId;
  const seriesId = request.body.SeriesId;
  console.log("Server call 'removeFromMyShows': Person " + personId + ", Series " + seriesId);

  const sql = "DELETE FROM person_series " +
    "WHERE person_id = $1 " +
    "AND series_id = $2 ";
  const values = [
    personId, seriesId
  ];

  return db.updateSendResponse(response, sql, values);
};


exports.getNotMyShows = function(request, response) {
  const personId = request.query.PersonId;
  console.log("Server call 'getNotMyShows': Person " + personId);

  const sql = "SELECT s.id," +
    "s.title, " +
    "tp.poster_path as poster, " +
    "(SELECT id " +
    "  FROM person_poster " +
    "  WHERE series_id = s.id " +
    "  AND person_id = $1 " +
    "  AND retired = $2) as poster_id, " +
    "tp.cloud_poster, " +
    "ts.network, " +
    "(select string_agg(g.name, '|') " +
    "             from genre g " +
    "             inner join series_genre sg " +
    "               on sg.genre_id = g.id " +
    "              where sg.series_id = s.id " +
    "              and sg.retired = $2) as genres, " +
    "s.tvdb_series_ext_id " +
    "FROM series s " +
    "INNER JOIN tvdb_series ts " +
    "  ON s.tvdb_series_id = ts.id " +
    "LEFT OUTER JOIN tvdb_poster tp " +
    "  ON s.tvdb_poster_id = tp.id " +
    "WHERE s.id NOT IN (SELECT ps.series_id " +
    "                 FROM person_series ps " +
    "                 WHERE person_id = $1) " +
    "AND s.retired = $2 " +
    "AND s.tvdb_match_status = $3 ";
  const values = [
    personId, 0, 'Match Completed'
  ];

  db.selectNoResponse(sql, values).then(results => {
    exports.attachPosterInfoToSeriesObjects(results);
    response.json(results);
  });
};

exports.rateMyShow = function(request, response) {
  const personId = request.body.PersonId;
  const seriesId = request.body.SeriesId;
  const rating = request.body.Rating;

  const sql = "UPDATE person_series " +
    "SET rating = $1, rating_date = NOW() " +
    "WHERE person_id = $2 " +
    "AND series_id = $3 ";

  const values = [
    rating, personId, seriesId
  ];

  db.updateNoResponse(sql, values).then(function() {
    exports.calculateSeriesRating(seriesId, personId).then(function(result) {
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
  const seriesId = request.query.SeriesId;
  const personId = request.query.PersonId;
  console.log("Episode call received. Params: " + seriesId + ", Person: " + personId);

  const sql = 'SELECT e.id, ' +
    'e.air_date, ' +
    'e.air_time, ' +
    'e.title, ' +
    'e.season, ' +
    'e.episode_number, ' +
    'e.absolute_number, ' +
    'te.filename as tvdb_filename, ' +
    'te.overview as tvdb_overview, ' +
    'te.production_code as tvdb_production_code, ' +
    'te.rating as tvdb_rating, ' +
    'te.director as tvdb_director, ' +
    'te.writer as tvdb_writer ' +
    'FROM valid_episode e ' +
    'LEFT OUTER JOIN tvdb_episode te ' +
    ' ON e.tvdb_episode_id = te.id ' +
    'WHERE e.series_id = $1 ' +
    'AND te.retired = $2 ' +
    'ORDER BY e.season, e.episode_number';

  return db.selectNoResponse(sql, [seriesId, 0]).then(function (episodeResult) {

    const sql =
      'SELECT er.episode_id, ' +
      'er.watched_date,' +
      'er.watched,' +
      'er.rating_value,' +
      'er.rating_pending, ' +
      'er.review,' +
      'er.id as rating_id ' +
      'FROM episode_rating er ' +
      'INNER JOIN valid_episode e ' +
      ' ON er.episode_id = e.id ' +
      'WHERE e.series_id = $1 ' +
      'AND er.person_id = $2 ';

    return db.selectNoResponse(sql, [seriesId, personId]).then(function (ratingResult) {

      ratingResult.forEach(function (episodeRating) {
        const episodeMatch = _.find(episodeResult, function (episode) {
          return episode.id === episodeRating.episode_id;
        });

        if (ArrayService.exists(episodeMatch)) {
          delete episodeRating.episode_id;

          episodeMatch.personEpisode = episodeRating;
        }
      });

      return response.send(episodeResult);
    });

  });
};

exports.updateEpisodeRatings = function(request, response) {
  const payload = request.body;
  addOrEditRating(request).then(function(result) {
    const personEpisode = result;
    const person_id = payload.person_id;
    exports.updateEpisodeRatingsAllPastWatched(payload, false, [person_id], null, response)
      .then(pastEpResults => {
      exports.calculateSeriesRating(payload.series_id, person_id).then(function(result) {
        const data = {
          personEpisodes: [personEpisode],
          dynamic_rating: result.personSeries ? result.personSeries.dynamic_rating : undefined
        };
        ArrayService.addToArray(data.personEpisodes, pastEpResults);
        return response.json(data);
      }).catch(err => errs.throwError(err, 'calculateSeriesRating', response));
    }).catch(err => errs.throwError(err, 'updateEpisodeRatingsAllPastWatched', response));
  }).catch(err => errs.throwError(err, 'addOrEditRating', response));
};

function addOrEditRating(request) {
  return new Promise(resolve => {
    const personEpisode = {};
    ArrayService.shallowCopy(request.body.EpisodeRating, personEpisode);
    if (request.body.IsNew) {
      addRating(request.body.EpisodeRating).then(function(results) {
        personEpisode.rating_id = results[0].id;
        resolve(personEpisode);
      })
        .catch(err => errs.throwError(err, 'addRating', response));
    } else {
      editRating(request.body.ChangedFields, request.body.RatingId).then(function() {
        ArrayService.shallowCopy(request.body.ChangedFields, personEpisode);
        resolve(personEpisode);
      })
        .catch(err => errs.throwError(err, 'editRating', response));
    }
  });
}

exports.calculateSeriesRating = function(series_id, person_id) {
  return new Promise(function(resolve) {

    const sql =
      "SELECT er.episode_id, er.rating_value, s.metacritic, ps.rating as my_rating " +
      "FROM episode_rating er " +
      "INNER JOIN valid_episode e " +
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

    const values = [
      true,
      0,
      person_id,
      series_id
    ];

    db.selectNoResponse(sql, values).then(function (results) {
      if (!_.isEmpty(results)) {
        const series = {
          id: series_id,
          personSeries: {
            my_rating: results[0].my_rating
          },
          metacritic: results[0].metacritic
        };

        calculateRating(series, results);

        resolve(series);
      } else {
        resolve({
          id: series_id
        });
      }
    }).catch(err => errs.throwError(err, 'episodes fetch for series rating', response));
  });
};

exports.updateMyShow = function(request, response) {
  console.log("Update Person-Series with " + JSON.stringify(request.body.ChangedFields));

  const queryConfig = db.buildUpdateQueryConfigNoID(
    request.body.ChangedFields,
    "person_series",
    {
      "series_id": request.body.SeriesId,
      "person_id": request.body.PersonId
    });

  console.log("SQL: " + queryConfig.text);
  console.log("Values: " + queryConfig.values);

  return db.updateSendResponse(response, queryConfig.text, queryConfig.values);
};

function addRating(episodeRating) {
  console.log("Adding rating: " + JSON.stringify(episodeRating));

  const sql = "INSERT INTO episode_rating (episode_id, person_id, watched, watched_date, " +
      "rating_date, rating_value, " +
      "review, date_added) " +
    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) " +
    "RETURNING id";

  const values = [
    episodeRating.episode_id,
    episodeRating.person_id,
    episodeRating.watched,
    episodeRating.watched_date,
    new Date,
    episodeRating.rating_value,
    episodeRating.review,
    new Date
  ];

  // return data because it contains the new row id. (RETURNING id is in the sql)
  return db.selectNoResponse(sql, values);
}

function editRating(changedFields, rating_id) {
  return db.updateObjectWithChangedFieldsNoResponse(changedFields, "episode_rating", rating_id);
}

exports.addMyPoster = function(request, response) {
  const series_id = request.body.series_id;
  const person_id = request.body.person_id;
  const tvdb_poster_id = request.body.tvdb_poster_id;

  const sql = 'INSERT INTO person_poster (series_id, person_id, tvdb_poster_id) ' +
    'VALUES ($1, $2, $3) ' +
    'RETURNING id ';
  const values = [series_id, person_id, tvdb_poster_id];
  db.selectSendResponse(response, sql, values);
};

exports.updateMyPoster = function(request, response) {
  const person_poster_id = request.body.person_poster_id;
  const tvdb_poster_id = request.body.tvdb_poster_id;

  const changedFields = {
    tvdb_poster_id: tvdb_poster_id
  };
  db.updateObjectWithChangedFieldsSendResponse(response, changedFields, 'person_poster', person_poster_id);
};

// Mark All Watched

exports.markEpisodesWatched = function(request, response) {
  const person_id = request.body.PersonId;
  const watched_episode_ids = request.body.watched_ids;
  const unwatched_episode_ids = request.body.unwatched_ids;

  const all_episode_ids = [];
  ArrayService.addToArray(all_episode_ids, watched_episode_ids);
  ArrayService.addToArray(all_episode_ids, unwatched_episode_ids);

  const existing_sql = 'SELECT episode_id ' +
      'FROM episode_rating ' +
      'WHERE person_id = $1 ' +
      'AND episode_id IN (' + db.createInlineVariableList(all_episode_ids.length, 2) + ')';
  const existing_values = [person_id];
  ArrayService.addToArray(existing_values, all_episode_ids);
  db.selectNoResponse(existing_sql, existing_values).then(results => {
    const existing_ids = _.pluck(results, 'episode_id');
    const existing_watched_ids = _.intersection(watched_episode_ids, existing_ids);
    const existing_unwatched_ids = _.intersection(unwatched_episode_ids, existing_ids);

    const new_watched_ids = _.without(watched_episode_ids, existing_ids);

    const updates = [];

    if (existing_watched_ids.length > 0) {
      const watched_sql = 'UPDATE episode_rating ' +
          'SET watched = $1 ' +
          'WHERE person_id = $2 ' +
          'AND episode_id IN (' + db.createInlineVariableList(existing_watched_ids.length, 3) + ')';
      const watched_values = [true, person_id];
      ArrayService.addToArray(watched_values, existing_watched_ids);
      updates.push(db.updateNoResponse(watched_sql, watched_values));
    }

    if (existing_unwatched_ids.length > 0) {
      const unwatched_sql = 'UPDATE episode_rating ' +
          'SET watched = $1, watched_date = NULL ' +
          'WHERE person_id = $2 ' +
          'AND episode_id IN (' + db.createInlineVariableList(existing_unwatched_ids.length, 3) + ')';
      const unwatched_values = [false, person_id];
      ArrayService.addToArray(unwatched_values, existing_unwatched_ids);
      updates.push(db.updateNoResponse(unwatched_sql, unwatched_values));
    }

    if (new_watched_ids.length > 0) {
      const new_watched_sql = 'INSERT INTO episode_rating (person_id, episode_id, watched) ' +
          'SELECT $1, id, $2 ' +
          'FROM episode ' +
          'WHERE id IN (' + db.createInlineVariableList(new_watched_ids.length, 3) + ')';
      const new_watched_values = [person_id, true];
      ArrayService.addToArray(new_watched_values, new_watched_ids);
      updates.push(db.updateNoResponse(new_watched_sql, new_watched_values));
    }

    Promise.all(updates).then(function() {
      response.json({msg: 'Success'});
    });
  });
};

exports.getSystemVars = function(request, response) {
  console.log("Getting system vars.");

  const sql = "SELECT * FROM system_vars";
  db.selectNoResponse(sql, []).then(results => {
    if (results.length !== 1) {
      errs.throwError({message: 'Unexpected number of system_vars.'}, 'No rows in system_vars', response);
    }

    const systemVars = results[0];
    systemVars.envName = process.env.envName;

    response.json(systemVars);
  });
};

exports.increaseYear = function(request, response) {
  console.log("Incrementing rating year.");

  const sql = "SELECT rating_year FROM system_vars";
  return db.selectNoResponse(sql, []).then(function (result) {
    const system_vars = result[0];
    const ratingYear = system_vars.rating_year;
    console.log("Current year: " + ratingYear);

    if (_.isNaN(ratingYear)) {
      return response.send("Error rating year found that is not numeric: " + ratingYear);
    } else {
      const nextYear = ratingYear + 1;
      const sql = "UPDATE system_vars " +
        "SET rating_year = $1, " +
        "    rating_end_date = NULL ";
      return db.updateSendResponse(response, sql, [nextYear]);
    }

  });
};

exports.revertYear = function(request, response) {
  const endDate = request.body.EndDate;
  console.log("Reverting rating year increase with end date: " + endDate);

  const sql = "SELECT rating_year FROM system_vars";
  return db.selectNoResponse(sql, []).then(function (result) {
    const system_vars = result[0];
    const ratingYear = system_vars.rating_year;
    console.log("Current year: " + ratingYear);

    if (_.isNaN(ratingYear)) {
      return response.send("Error rating year found that is not numeric: " + ratingYear);
    } else {
      const nextYear = ratingYear - 1;
      const sql = "UPDATE system_vars " +
        "SET rating_year = $1, " +
        "    rating_end_date = $2 ";
      return db.updateSendResponse(response, sql, [nextYear, endDate]);
    }

  });
};

exports.setRatingEndDate = function(request, response) {
  const ratingEndDate = request.body.RatingEndDate;
  console.log("Changing rating end date to " + ratingEndDate);

  const sql = "UPDATE system_vars SET rating_end_date = $1 ";
  return db.updateSendResponse(response, sql, [ratingEndDate]);
};

exports.updateEpisodeRatingsAllPastWatched = function(payload, rating_notifications, person_ids, tv_group_id, response) {
  return new Promise(function(resolve) {
    const series_id = payload.series_id;
    const last_watched = payload.last_watched;

    if (person_ids.length < 1 || payload.skipped || !last_watched) {
      resolve([]);
    } else {

      const ratingClause = rating_notifications ?
        ', rating_pending = (SELECT rating_notifications ' +
        '                    FROM person ' +
        '                    WHERE id = episode_rating.person_id) ' :
        '';

      const updateGroupClause = !!tv_group_id ?
        'AND episode_id IN ' + '(SELECT tge.episode_id ' +
        'FROM tv_group_episode tge ' +
        'WHERE tge.watched = $4 ' +
        'AND tge.tv_group_id = $5 ' +
        'AND tge.retired = $6) ' :
        '';

      console.log("Updating episodes as Watched, before episode " + last_watched);

      const values = [
        true,             // watched
        series_id,        // series_id
        last_watched      // absolute_number
      ];

      if (!!tv_group_id) {
        values.push(true);        // group episode watched
        values.push(tv_group_id);
        values.push(0);
      }

      const sql = 'UPDATE episode_rating ' +
        'SET watched = $1 ' +
        ratingClause +
        'WHERE watched <> $1 ' +
        'AND episode_id IN (SELECT e.id ' +
                            'FROM regular_episode e ' +
                            'WHERE e.series_id = $2 ' +
                            'AND e.absolute_number IS NOT NULL ' +
                            'AND e.absolute_number < $3 ) ' +
        updateGroupClause +
        'AND person_id IN (' + db.createInlineVariableList(person_ids.length, values.length + 1) + ') ' +
        'RETURNING episode_id, id as rating_id, person_id, watched, rating_pending ';

      ArrayService.addToArray(values, person_ids);

      db.selectNoResponse(sql, values).then(updateResults => {

        const values = [
          true,        // watched
          series_id,    // series
          last_watched, // < absolute number
          0            // retired
        ];

        if (!rating_notifications) {
          values.push(false);
        }

        const ratingClause = rating_notifications ?
          'p.rating_notifications ' :
          '$' + values.length + ' ';

        if (!!tv_group_id) {
          values.push(true);        // group episode watched
          values.push(tv_group_id);
        }

        const insertGroupClause = !!tv_group_id ?
          'AND e.id IN (SELECT tge.episode_id ' +
          'FROM tv_group_episode tge ' +
          'WHERE tge.watched = $' + String(values.length - 1) + ' ' +
          'AND tge.tv_group_id = $' + String(values.length) + ' ' +
          'AND tge.retired = $4) ' :
          '';

        const sql = "INSERT INTO episode_rating (episode_id, person_id, watched, date_added, rating_pending) " +
          "SELECT e.id, p.id, $1, now(), " + ratingClause +
          "FROM regular_episode e, person p " +
          "WHERE e.series_id = $2 " +
          'AND e.absolute_number IS NOT NULL ' +
          'AND e.absolute_number < $3 ' +
          "AND e.id NOT IN (SELECT er.episode_id " +
                          "FROM episode_rating er " +
                          "WHERE er.retired = $4 " +
                          "AND er.person_id = p.id) " +
          insertGroupClause +
          "AND p.id IN (" + db.createInlineVariableList(person_ids.length, values.length + 1) + ") " +
          "RETURNING episode_id, id as rating_id, person_id, watched, rating_pending ";

        ArrayService.addToArray(values, person_ids);

        db.selectNoResponse(sql, values).then(episodeRatings => {
          ArrayService.addToArray(updateResults, episodeRatings);
          resolve(updateResults);
        }).catch(err => errs.throwError(err, 'INSERT new past episode ratings', response));
      }).catch(err => errs.throwError(err, 'UPDATE existing past episode ratings', response));
    }

  });
};


