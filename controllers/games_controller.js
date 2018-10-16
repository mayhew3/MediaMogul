const db = require('./database_util');

exports.getGames = function (request, response) {

  var sql = 'SELECT id, logo, title, steamid, playtime, metacritic, platform, owned, metacritic_hint, mayhew, ' +
                  'timeplayed, timetotal, finished, finalscore, replay, guess, date_added, ' +
                  'steam_cloud, last_played, natural_end, metacritic_matched, ' +
                  'giantbomb_small_url, giantbomb_thumb_url, giantbomb_medium_url, howlong_extras, ' +
                  'howlong_id, giantbomb_id, giantbomb_manual_guess,' +
                  'igdb_poster, igdb_success, igdb_failed ' +
    'FROM game ' +
    'WHERE owned IN ($1, $2) ' +
    'ORDER BY metacritic DESC, playtime DESC, date_added DESC';

  return db.executeQueryWithResults(response, sql, ['owned', 'borrowed']);
};

exports.getGamesWithPossibleMatchInfo = function(request, response) {
  var sql = 'SELECT g.*, pgm.igdb_game_title as first_match_title, pgm.poster as first_match_poster ' +
    'FROM game g ' +
    'LEFT OUTER JOIN possible_game_match pgm ' +
    '  ON (pgm.game_id = g.id AND pgm.igdb_game_ext_id = g.igdb_id) ' +
    'WHERE g.igdb_failed IS NOT NULL ' +
    'AND g.igdb_ignored IS NULL ' +
    'ORDER BY g.title';

  return db.executeQueryWithResults(response, sql);
};

exports.updateGame = function(request, response) {
  console.log("User: " + request.user);

  db.updateObjectWithChangedFields(response, request.body.ChangedFields, "game", request.body.GameId);
};

exports.addGame = function(request, response) {
  var game = request.body.game;
  console.log("Adding game with " + JSON.stringify(game));
  console.log("User: " + request.user);

  var sql = "INSERT INTO game (title, platform, mayhew, owned, date_added) VALUES ($1, $2, $3, $4, $5)";
  var values =
    [game.title,
    game.platform,
    game.mayhew,
    game.owned,
    game.date_added];

  console.log("SQL: " + sql);
  console.log("Values: " + values);

  db.executeQueryNoResults(response, sql, values);
};

exports.addGameplaySession = function(request, response) {
  var gameplaySession = request.body.gameplaySession;
  console.log("Adding gameplay_session with " + JSON.stringify(gameplaySession));

  var sql = "INSERT INTO gameplay_session (game_id, start_time, minutes, rating) VALUES ($1, $2, $3, $4)";
  var values =
    [gameplaySession.game_id,
    gameplaySession.start_time,
    gameplaySession.minutes,
    gameplaySession.rating];

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

