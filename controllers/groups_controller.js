const _ = require('underscore');
const db = require('./database_util');
const person_controller = require('./person_controller');
const debug = require('debug');


/* GROUPS */

exports.getMyGroups = function(request, response) {
  const person_id = request.query.person_id;

  const sql = "SELECT id, name " +
    "FROM tv_group " +
    "WHERE id IN (SELECT tv_group_id " +
    "             FROM tv_group_person " +
    "             WHERE person_id = $1 " +
    "             AND retired = $2) " +
    "AND retired = $3 ";
  db.selectWithJSON(sql, [person_id, 0, 0]).then(function(results) {
    let groups = results;
    let group_ids = _.pluck(groups, 'id');

    if (group_ids.length < 1) {
      return response.json([]);
    }

    const sql = "SELECT tgp.tv_group_id, tgp.person_id, p.first_name " +
      "FROM person p " +
      "INNER JOIN tv_group_person tgp " +
      "  ON tgp.person_id = p.id " +
      "WHERE tgp.retired = $1 " +
      "AND p.retired = $2 " +
      "AND tgp.tv_group_id IN (" + db.createInlineVariableList(group_ids.length, 3) + ") ";

    const values = [
      0,
      0
    ];

    addToArray(values, group_ids);

    db.selectWithJSON(sql, values).then(function(personResults) {
      let groupData = _.groupBy(personResults, "tv_group_id");


      groups.forEach(function(group) {
        let groupPersons = groupData[group.id];
        group.members = [];
        groupPersons.forEach(function(groupPerson) {
          group.members.push(_.omit(groupPerson, 'tv_group_id'));
        });
      });

      console.log(JSON.stringify(groups));
      response.json(groups);
    });

  });
};

exports.createGroup = function(request, response) {
  const group = request.body.group;

  const sql = 'INSERT INTO tv_group (name) ' +
    'VALUES ($1) ' +
    'RETURNING id ';

  const values = [group.name];

  db.selectWithJSON(sql, values).then(function(groupResult) {
    const tv_group_id = groupResult[0].id;
    const person_ids = group.person_ids;

    const sql = 'INSERT INTO tv_group_person (tv_group_id, person_id) ' +
      'SELECT $1, p.id ' +
      'FROM person p ' +
      'WHERE retired = $2 ' +
      'AND id IN (' + db.createInlineVariableList(person_ids.length, 3) + ') ';

    const values = [
      tv_group_id,
      0
    ];

    addToArray(values, person_ids);

    db.updateNoJSON(sql, values).then(function() {
      response.json({tv_group_id: tv_group_id});
    });
  });
};

exports.getGroupPersons = function(request, response) {
  const tv_group_id = request.query.tv_group_id;

  const sql = "SELECT id as person_id, first_name " +
    "FROM person " +
    "WHERE id IN (SELECT person_id " +
    "             FROM tv_group_person " +
    "             WHERE tv_group_id = $1" +
    "             AND retired = $2) " +
    "AND retired = $3 ";

  const values = [
    tv_group_id,
    0,
    0
  ];

  db.executeQueryWithResults(response, sql, values);
};

exports.getGroupShows = function(request, response) {
  const tv_group_id = request.query.tv_group_id;

  const sql = "SELECT s.id, s.title, s.metacritic, s.poster, tgs.date_added, " +
    "(SELECT COUNT(1) " +
    "    from episode e " +
    "    where e.series_id = s.id " +
    "    and e.retired = $1" +
    "    and e.season <> $2 " +
    "    and e.air_date IS NOT NULL" +
    "    and e.air_date < NOW()) as aired_episodes, " +
    "(SELECT MAX(tge.watched_date) " +
    "  from tv_group_episode tge " +
    "  inner join episode e " +
    "   on tge.episode_id = e.id " +
    "  where e.series_id = s.id " +
    "  and tge.retired = $3 " +
    "  and e.retired = $4) as last_watched " +
    "FROM series s " +
    "INNER JOIN tv_group_series tgs " +
    "  ON tgs.series_id = s.id " +
    "WHERE tgs.tv_group_id = $5 " +
    "AND tgs.retired = $6 " +
    "AND s.retired = $7 " +
    "AND s.tvdb_match_status = $8 ";

  db.selectWithJSON(sql, [0, 0, 0, 0, tv_group_id, 0, 0, 'Match Completed']).then(function (seriesResults) {
    const sql = "SELECT e.series_id, e.air_time, e.air_date, e.season, e.episode_number " +
      "FROM episode e " +
      "INNER JOIN tv_group_series tgs " +
      "  ON tgs.series_id = e.series_id " +
      "WHERE e.retired = $1 " +
      "AND e.season <> $2 " +
      "AND e.id NOT IN (SELECT tge.episode_id " +
      "                   FROM tv_group_episode tge " +
      "                   WHERE tge.tv_group_id = $3 " +
      "                   AND (tge.watched = $4 OR tge.skipped = $5)) " +
      "AND tgs.tv_group_id = $6 " +
      "ORDER BY e.series_id, e.air_time, e.season, e.episode_number ";

    const values = [
      0,
      0,
      tv_group_id,
      true,
      true,
      tv_group_id
    ];

    db.selectWithJSON(sql, values).then(function(episodeResults) {

      let groupedBySeries = _.groupBy(episodeResults, "series_id");
      for (let seriesId in groupedBySeries) {
        if (groupedBySeries.hasOwnProperty(seriesId)) {
          let unwatchedEpisodes = groupedBySeries[seriesId];

          let series = _.findWhere(seriesResults, {id: parseInt(seriesId)});
          debug("Series: " + series.title);

          person_controller.calculateUnwatchedDenorms(series, unwatchedEpisodes);
        }
      }

      response.json(seriesResults);

    });

  });
};

exports.addToGroupShows = function(request, response) {
  const tv_group_id = request.body.tv_group_id;
  const series_id = request.body.series_id;

  const sql = "INSERT INTO tv_group_series " +
    "(tv_group_id, series_id) " +
    "VALUES ($1, $2) ";
  const values = [
    tv_group_id, series_id
  ];

  return db.executeQueryNoResults(response, sql, values);
};

exports.getNotGroupShows = function(request, response) {
  const tv_group_id = request.query.tv_group_id;
  console.log("Server call 'getNotGroupShows': Group " + tv_group_id);

  const sql = "SELECT s.id, s.metacritic, s.title, s.poster, s.tvdb_series_id, " +
    "(SELECT COUNT(1) " +
    "    from episode e " +
    "    where e.series_id = s.id " +
    "    and e.retired = $1" +
    "    and e.season <> $2 " +
    "    and e.air_date IS NOT NULL" +
    "    and e.air_date < NOW()) as aired_episodes " +
    "FROM series s " +
    "WHERE id NOT IN (SELECT tgs.series_id " +
    "                 FROM tv_group_series tgs " +
    "                 WHERE tv_group_id = $3) " +
    "AND s.retired = $4 " +
    "AND s.tvdb_match_status = $5 ";
  const values = [
    0, 0, tv_group_id, 0, 'Match Completed'
  ];

  return db.executeQueryWithResults(response, sql, values);
};

exports.getGroupEpisodes = function(request, response) {
  const tv_group_id = request.query.tv_group_id;
  const series_id = request.query.series_id;

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
    'te.writer as tvdb_writer,' +
    'false as watched, ' +
    'false as skipped ' +
    'FROM episode e ' +
    'LEFT OUTER JOIN tvdb_episode te ' +
    ' ON e.tvdb_episode_id = te.id ' +
    'WHERE e.series_id = $1 ' +
    'AND e.retired = $2 ' +
    'AND te.retired = $3 ' +
    'ORDER BY e.season, e.episode_number';

  db.selectWithJSON(sql, [series_id, 0, 0]).then(function (episodeResult) {
    const sql = "SELECT tge.id, tge.watched, tge.watched_date, tge.episode_id, tge.skipped, tge.skip_reason " +
      "FROM tv_group_episode tge " +
      "INNER JOIN episode e " +
      "  ON tge.episode_id = e.id " +
      "WHERE e.series_id = $1 " +
      "AND e.retired = $2 " +
      "AND tge.retired = $3 " +
      "AND tge.tv_group_id = $4 ";

    db.selectWithJSON(sql, [series_id, 0, 0, tv_group_id]).then(function(groupResult) {

      const sql = "SELECT er.episode_id, tgp.person_id " +
        "FROM episode_rating er " +
        "INNER JOIN episode e " +
        "  ON er.episode_id = e.id " +
        "INNER JOIN person p " +
        "  ON er.person_id = p.id " +
        "INNER JOIN tv_group_person tgp " +
        "  ON tgp.person_id = p.id " +
        "WHERE e.series_id = $1 " +
        "AND e.retired = $2 " +
        "AND er.retired = $3 " +
        "AND tgp.retired = $4 " +
        "AND tgp.tv_group_id = $5 " +
        "AND er.watched = $6 ";

      const values = [
        series_id,
        0,
        0,
        0,
        tv_group_id,
        true
      ];

      db.selectWithJSON(sql, values).then(function(personResult) {

        groupResult.forEach(function(groupEpisode) {
          const episodeMatch = _.find(episodeResult, function (episode) {
            return episode.id === groupEpisode.episode_id;
          });

          if (exists(episodeMatch)) {
            episodeMatch.watched_date = groupEpisode.watched_date;
            episodeMatch.watched = groupEpisode.watched;
            episodeMatch.skipped = groupEpisode.skipped;
            episodeMatch.skip_reason = groupEpisode.skip_reason;
            episodeMatch.tv_group_episode_id = groupEpisode.id;
          }
        });

        episodeResult.forEach(function(episode) {
          const personMatches = _.filter(personResult, function(episode_rating) {
            return episode_rating.episode_id === episode.id;
          });

          episode.person_ids = _.pluck(personMatches, 'person_id');
        });

        response.send(episodeResult);

      });
    });
  });
};

exports.markEpisodeWatchedByGroup = function(request, response) {
  addOrEditTVGroupEpisode(request).then(function (result) {
    markEpisodeWatchedForPersons(request).then(function() {
      response.json(result);
    });
  });
};

function markEpisodeWatchedForPersons(request) {
  const payload = request.body.payload;

  if (payload.changedFields.skipped) {
    console.log("Request to skip episode. Not propagating to persons.");
    return Promise.resolve();
  }

  const member_ids = payload.member_ids;
  const episode_id = payload.episode_id;

  const sql = "SELECT er.person_id " +
    "FROM episode_rating er " +
    "WHERE episode_id = $1 " +
    "AND retired = $2 " +
    "AND person_id IN (" + db.createInlineVariableList(member_ids.length, 3) + ") ";

  const values = [
    episode_id,
    0
  ];

  addToArray(values, member_ids);

  return db.selectWithJSON(sql, values).then(function(personResults) {
    let existingRatings = _.pluck(personResults, 'person_id');
    let newRatingPersons = _.difference(member_ids, existingRatings);

    let episodeRatingInfo = {
      episode_id: episode_id,
      watched: payload.changedFields.watched,
      watched_date: payload.changedFields.watched_date
    };

    return Promise.all(
      [addRatingsForPersons(newRatingPersons, episodeRatingInfo),
        editRatingsForPersons(existingRatings, episodeRatingInfo)]
    );
  });
}

function addRatingsForPersons(member_ids, episodeRatingInfo) {
  if (member_ids.length < 1) {
    return Promise.resolve();
  }

  const sql = "INSERT INTO episode_rating (person_id, episode_id, retired, watched, watched_date) " +
    "SELECT p.id, $1, $2, $3, $4 " +
    "FROM person p " +
    "WHERE retired = $5 " +
    "AND p.id IN (" + db.createInlineVariableList(member_ids.length, 6) + ") ";

  const values = [
    episodeRatingInfo.episode_id,
    0,
    episodeRatingInfo.watched,
    episodeRatingInfo.watched_date,
    0
  ];

  addToArray(values, member_ids);

  return db.updateNoJSON(sql, values);
}

function editRatingsForPersons(member_ids, episodeRatingInfo) {
  if (member_ids.length < 1) {
    return Promise.resolve();
  }

  const sql = "UPDATE episode_rating " +
    "SET watched = $1, watched_date = $2 " +
    "WHERE retired = $3 " +
    "AND episode_id = $4 " +
    "AND watched = $5 " +
    "AND person_id IN (" + db.createInlineVariableList(member_ids.length, 6) + ") ";

  const values = [
    episodeRatingInfo.watched,
    episodeRatingInfo.watched_date,
    0,
    episodeRatingInfo.episode_id,
    false
  ];

  addToArray(values, member_ids);

  return db.updateNoJSON(sql, values);
}



function addOrEditTVGroupEpisode(request) {
  const payload = request.body.payload;
  const tv_group_episode = payload.changedFields;
  const tv_group_episode_id = payload.tv_group_episode_id;

  return new Promise(function(resolve) {
    if (exists(tv_group_episode_id)) {
      editTVGroupEpisode(tv_group_episode, tv_group_episode_id).then(function () {
        resolve({
          tv_group_episode_id: tv_group_episode_id
        });
      });
    } else {
      addTVGroupEpisode(tv_group_episode).then(function (results) {
        resolve({
          tv_group_episode_id: results[0].id
        });
      });
    }
  });

}

function addTVGroupEpisode(tv_group_episode) {
  const sql = "INSERT INTO tv_group_episode (tv_group_id, episode_id, watched, watched_date, skipped, skip_reason, date_added) " +
    "VALUES ($1, $2, $3, $4, $5, $6, $7) " +
    "RETURNING id ";

  const values = [
    tv_group_episode.tv_group_id,
    tv_group_episode.episode_id,
    tv_group_episode.watched,
    tv_group_episode.watched_date,
    tv_group_episode.skipped,
    tv_group_episode.skip_reason,
    new Date
  ];

  return db.selectWithJSON(sql, values);
}

function editTVGroupEpisode(tv_group_episode, tv_group_episode_id) {
  return db.updateObjectWithChangedFieldsNoJSON(tv_group_episode, "tv_group_episode", tv_group_episode_id);
}


exports.markAllPastEpisodesAsGroupWatched = function(request, response) {
  Promise.all([
    updateTVGroupEpisodesAllPastWatched(request.body),
    person_controller.updateEpisodeRatingsAllPastWatched(request.body)
  ]).then(function() {
    response.json({msg: "Success!"});
  });
};

function updateTVGroupEpisodesAllPastWatched(payload) {
  return new Promise(function(resolve) {
    const series_id = payload.series_id;
    const lastWatched = payload.last_watched;
    const tv_group_id = payload.tv_group_id;
    const watched = payload.watched;
    const skip_reason = payload.skip_reason;

    const watched_or_skipped = watched ? "watched" : "skipped";

    console.log("Updating tv_group_episodes as " + watched_or_skipped + ", before episode " + lastWatched);

    const sql = 'UPDATE tv_group_episode ' +
      "SET watched = $1, watched_date = $2, skipped = $3, skip_reason = $4 " +
      'WHERE watched = $5 ' +
      'AND skipped = $6 ' +
      'AND tv_group_id = $7 ' +
      'AND episode_id IN (SELECT e.id ' +
      'FROM episode e ' +
      'WHERE e.series_id = $8 ' +
      'AND e.absolute_number IS NOT NULL ' +
      'AND e.absolute_number < $9 ' +
      'AND e.season <> $10 ' +
      'AND retired = $11) ';


    const values = [
      watched,             // watched or skipped
      null,             // !watched or skipped
      !watched,
      skip_reason,
      false,            // !watched
      false,            // !skipped
      tv_group_id,         // person_id
      series_id,         // series_id
      lastWatched,      // absolute_number <
      0,                // season
      0                 // retired
    ];

    return db.updateNoJSON(sql, values).then(function() {
      const sql = "INSERT INTO tv_group_episode (episode_id, tv_group_id, watched, skipped, skip_reason, date_added) " +
        "SELECT e.id, $1, $2, $3, $4, now() " +
        "FROM episode e " +
        "WHERE e.series_id = $5 " +
        "AND e.retired = $6 " +
        'AND e.absolute_number IS NOT NULL ' +
        'AND e.absolute_number < $7 ' +
        'AND e.season <> $8 ' +
        "AND e.id NOT IN (SELECT tge.episode_id " +
        "FROM tv_group_episode tge " +
        "WHERE tge.tv_group_id = $9" +
        "AND tge.retired = $10)";
      const values = [
        tv_group_id,                         // person
        watched,  // watched
        !watched,  // skipped
        skip_reason,                        // skip_reason
        series_id,                          // series
        0,                                  // retired
        lastWatched,                        // absolute number
        0,                                  // !season
        tv_group_id,                        // person
        0                                   // retired
      ];

      db.updateNoJSON(sql, values).then(function() {
        return resolve();
      });
    });
  });
}


// VOTING

exports.getBallots = function(request, response) {
  const tv_group_id = request.query.tv_group_id;

  const sql = 'SELECT tgb.voting_open, tgb.voting_closed, tgb.reason, tgb.last_episode, tgb.first_episode, ' +
    '  tgs.series_id  ' +
    'FROM tv_group_ballot tgb ' +
    'INNER JOIN tv_group_series tgs ' +
    '  ON tgb.tv_group_series_id = tgs.id ' +
    'INNER JOIN series s ' +
    '  ON tgs.series_id = s.id ' +
    'WHERE tgs.tv_group_id = $1 ' +
    'AND tgb.retired = $2 ' +
    'AND tgs.retired = $3 ';

  const values = [
    tv_group_id,
    0,
    0
  ];

  db.selectWithJSON(sql, values).then(function(ballotResults) {
    const sql = 'SELECT * ' +
      'FROM tv_group_vote ' +
      'WHERE tv_group_ballot_id = $1 ' +
      'AND retired = $2 ';

    const values = [
      tv_group_id,
      0
    ];

    db.selectWithJSON(sql, values).then(function(voteResults) {

      let groupedByBallot = _.groupBy(voteResults, 'tv_group_ballot_id');

      ballotResults.forEach(function(ballot) {
        let votesForBallot = groupedByBallot[ballot.id];
        ballot.votes = _.map(votesForBallot, function (vote) {
          return _.omit(vote, 'tv_group_ballot_id');
        });
      });

      response.json(ballotResults);
    });
  });
};

exports.submitVote = function(request, response) {
  const vote = request.body.vote;

  const sql = 'INSERT INTO tv_group_vote (tv_group_ballot_id, person_id, vote_value) ' +
    'VALUES ($1, $2, $3)';

  const values = [
    vote.tv_group_ballot_id,
    vote.person_id,
    vote.vote_value
  ];

  db.executeQueryNoResults(response, sql, values);
};

// UTILITY METHODS

function exists(object) {
  return object !== null && object !== undefined;
}

function addToArray(originalArray, newArray) {
  originalArray.push.apply(originalArray, newArray);
}
