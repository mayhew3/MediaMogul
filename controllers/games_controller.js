const db = require('./database_util');

exports.getGames = function (request, response) {
  var person_id = request.query.PersonId;
  console.log("Fetching game collection for person ID " + person_id);

  var sql = 'SELECT g.id, g.logo, g.title, g.steamid, pg.minutes_played, g.metacritic, g.platform, g.metacritic_hint, ' +
                  'pg.rating, pg.id as person_game_id, ' +
                  'timetotal, pg.finished_date, pg.final_score, pg.replay_score, pg.date_added, ' +
                  'g.steam_cloud, pg.last_played, g.natural_end, g.metacritic_matched, ' +
                  'g.giantbomb_small_url, g.giantbomb_thumb_url, g.giantbomb_medium_url, g.howlong_extras, ' +
                  'g.howlong_id, g.giantbomb_id, g.giantbomb_manual_guess, ' +
                  'g.igdb_poster, g.igdb_success, g.igdb_failed ' +
    'FROM game g ' +
    'INNER JOIN person_game pg ' +
    '  ON pg.game_id = g.id ' +
    'WHERE pg.person_id = $1 ' +
    'ORDER BY g.metacritic DESC, pg.minutes_played DESC, g.date_added DESC';

  return db.executeQueryWithResults(response, sql, [person_id]);
};

exports.getGamesWithPossibleMatchInfo = function(request, response) {
  var sql = 'SELECT g.id, g.title, g.platform, ' +
    'g.howlong_title, g.giantbomb_name, g.steam_title, ' +
    'g.igdb_title, g.igdb_success, g.igdb_failed, g.igdb_ignored, g.igdb_hint, g.igdb_id, ' +
    'pgm.poster as first_match_poster ' +
    'FROM game g ' +
    'LEFT OUTER JOIN possible_game_match pgm ' +
    '  ON (pgm.game_id = g.id AND pgm.igdb_game_ext_id = g.igdb_id) ' +
    'WHERE g.igdb_success IS NULL ' +
    'AND g.igdb_ignored IS NULL ' +
    'ORDER BY g.title';

  return db.executeQueryWithResults(response, sql, []);
};

exports.getNotMyGames = function(request, response) {
  var personId = request.query.PersonId;
  console.log("Server call 'getNotMyGames': Person " + personId);

  var sql = "SELECT g.id, g.logo, g.title, g.platform, g.metacritic, g.timetotal, g.date_added, " +
                  "g.giantbomb_medium_url, g.howlong_extras, g.igdb_poster " +
    "FROM game g " +
    "WHERE id NOT IN (SELECT pg.game_id " +
    "                 FROM person_game pg " +
    "                 WHERE person_id = $1" +
    "                 AND retired = $2) ";
  var values = [
    personId, 0
  ];

  return db.executeQueryWithResults(response, sql, values);
};

exports.updateGame = function(request, response) {
  db.updateObjectWithChangedFields(response, request.body.ChangedFields, "game", request.body.GameId);
};

exports.updatePersonGame = function(request, response) {
  db.updateObjectWithChangedFields(response, request.body.ChangedFields, "person_game", request.body.PersonGameId);
};

exports.addGame = function(request, response) {
  var game = request.body.game;
  var person_id = request.body.PersonId;
  console.log("Adding game with " + JSON.stringify(game));
  console.log("User: " + request.user);

  var sql = "INSERT INTO game (title, platform, date_added) " +
    "VALUES ($1, $2, $3, $4, $5) " +
    "RETURNING id ";
  var values =
    [game.title,
    game.platform,
    game.date_added];

  console.log("SQL: " + sql);
  console.log("Values: " + values);

  db.selectWithJSON(response, sql, values).then(function(results) {
    var game_id = results[0].id;

    var sql = "INSERT INTO person_game (game_id, person_id, rating, tier, minutes_played)" +
      "VALUES ($1, $2, $3, 2, 0)";
    var values = [
      game_id, person_id, game.rating
    ];
    db.executeQueryNoResults(response, sql, values);
  });


};

exports.addToMyGames = function(request, response) {
  var personId = request.body.PersonId;
  var gameId = request.body.GameId;

  var sql = "INSERT INTO person_game " +
    "(person_id, game_id, tier, minutes_played) " +
    "VALUES ($1, $2, $3, $4) ";
  var values = [
    personId, gameId, 1, 0
  ];

  return db.executeQueryNoResults(response, sql, values);
};

exports.addGameplaySession = function(request, response) {
  var gameplaySession = request.body.gameplaySession;
  console.log("Adding gameplay_session with " + JSON.stringify(gameplaySession));

  var sql = "INSERT INTO gameplay_session (game_id, start_time, minutes, rating, person_id) VALUES ($1, $2, $3, $4, $5)";
  var values =
    [gameplaySession.game_id,
    gameplaySession.start_time,
    gameplaySession.minutes,
    gameplaySession.rating,
    gameplaySession.person_id];

  console.log("SQL: " + sql);
  console.log("Values: " + values);

  db.executeQueryNoResults(response, sql, values);
};

exports.getPossibleGameMatches = function(req, response) {
  console.log("Possible matches call received. Params: " + req.query.GameId);

  var sql = 'SELECT pgm.* ' +
    'FROM possible_game_match pgm ' +
    'WHERE pgm.game_id = $1 ' +
    'AND pgm.retired = $2 ';

  return db.executeQueryWithResults(response, sql, [req.query.GameId, 0]);
};

