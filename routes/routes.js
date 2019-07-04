module.exports = function(app) {
  const jwt = require('express-jwt');
  const admin = require('../controllers/admin_controller');
  const games = require('../controllers/games_controller');
  const series = require('../controllers/series_controller');
  const persons = require('../controllers/person_controller');
  const groups = require('../controllers/groups_controller');
  const addShow = require('../controllers/add_show_controller');
  require('../controllers/event_handlers');
  const assert = require('assert');


  const secret = process.env.AUTH0_CLIENT_SECRET;
  const clientID = process.env.AUTH0_CLIENT_ID;
  const database_url = process.env.DATABASE_URL;

  assert(!!secret, "No environment variable: AUTH0_CLIENT_SECRET");
  assert(!!clientID, "No environment variable: AUTH0_CLIENT_ID");
  assert(!!database_url, "No environment variable: DATABASE_URL");

  const authCheck = jwt({
    secret: new Buffer(secret, 'base64'),
    audience: clientID
  });

  // SYSTEM VARS
  getAPI('/api/systemVars', persons.getSystemVars);

  // GAMES
  getAPI('/api/games', games.getGames);
  getAPI('/api/notMyGames', games.getNotMyGames);
  getAPI('/api/gamesMatchList', games.getGamesWithPossibleMatchInfo);
  getAPI('/api/possibleGameMatches', games.getPossibleGameMatches);

  postAPI('/api/updategame', games.updateGame);
  postAPI('/api/updatePersonGame', games.updatePersonGame);
  postAPI('/api/addgame', games.addGame);
  postAPI('/api/addToMyGames', games.addToMyGames);
  postAPI('/api/addgameplay', games.addGameplaySession);

  // TV
  getAPI('/api/episodeGroupRating', series.getEpisodeGroupRating);
  getAPI('/api/episodeGroupRatings', series.getEpisodeGroupRatings);
  getAPI('/api/numShowsToRate', series.getNumberOfShowsToRate);
  getAPI('/api/viewingLocations', series.getViewingLocations);
  getAPI('/api/allPosters', series.getAllPosters);
  getAPI('/api/seriesViewingLocations', series.getSeriesViewingLocations);
  getAPI('/api/upcomingEpisodes', series.getUpcomingEpisodes);
  getAPI('/api/ratingYears', series.getAllRatingYears);
  getAPI('/api/episodeListForRating', series.getEpisodesForRating);
  getAPI('/api/tvdbMatches', addShow.getTVDBMatches);
  getAPI('/api/tvdbIDs', series.getMatchedTVDBIDs);

  // ADMIN
  getAPI('/api/tvdbErrors', admin.getTVDBErrors);
  getAPI('/api/services', admin.getExternalServices);
  
  // API for iOS app
  getAPI('/primeTV', series.getPrimeTV);
  getAPI('/primeSeriesInfo', series.getPrimeSeriesInfo);

  postAPI('/api/updateEpisode', series.updateEpisode);
  postAPI('/api/changeTier', series.changeTier);
  postAPI('/api/addSeries', addShow.beginEpisodeFetch);
  postAPI('/api/updateSeries', series.updateSeries);
  postAPI('/api/updateEpisodeGroupRating', series.updateEpisodeGroupRating);
  postAPI('/api/addEpisodeGroupRating', series.addEpisodeGroupRating);
  postAPI('/api/addViewingLocation', series.addViewingLocation);
  postAPI('/api/removeViewingLocation', series.removeViewingLocation);
  postAPI('/api/handleSeriesRequest', series.handleSeriesRequest);

  // PERSONS
  getAPI('/api/person', persons.getPersonInfo);
  getAPI('/api/persons', persons.getPersons);

  // MY SHOWS
  getAPI('/api/myShows', persons.getMyShows);
  getAPI('/api/myQueueShows', persons.getMyQueueShows);
  getAPI('/api/myPendingShows', persons.getMyPendingShows);
  getAPI('/api/notMyShows', persons.getNotMyShows);
  getAPI('/api/getMyEpisodes', persons.getMyEpisodes);
  getAPI('/api/seriesDetail', persons.getSeriesDetailInfo);
  getAPI('/api/seriesRequest', persons.getAllOpenSeriesRequests);
  getAPI('/api/mySeriesRequests', persons.getMySeriesRequests);
  getAPI('/api/nextAired', persons.getNextAiredInfo);

  postAPI('/api/addToMyShows', persons.addToMyShows);
  postAPI('/api/removeFromMyShows', persons.removeFromMyShows);
  postAPI('/api/updateMyShow', persons.updateMyShow);
  postAPI('/api/rateMyShow', persons.rateMyShow);
  postAPI('/api/updateEpisodeRatings', persons.updateEpisodeRatings);
  postAPI('/api/increaseYear', persons.increaseYear);
  postAPI('/api/revertYear', persons.revertYear);
  postAPI('/api/seriesRequest', persons.seriesRequest);
  postAPI('/api/markEpisodesWatched', persons.markEpisodesWatched);
  postAPI('/api/pinToDashboard', persons.pinToDashboard);
  postAPI('/api/myPoster', persons.addMyPoster);

  patchAPI('/api/myPoster', persons.updateMyPoster);

  // GROUPS
  getAPI('/api/myGroups', groups.getMyGroups);
  getAPI('/api/groupPersons', groups.getGroupPersons);
  getAPI('/api/groupShows', groups.getGroupShows);

  postAPI('/api/createGroup', groups.createGroup);
  postAPI('/api/groupWatchEpisode', groups.markEpisodesWatchedByGroup);
  postAPI('/api/addGroupShow', groups.addToGroupShows);
  postAPI('/api/removeGroupShow', groups.removeFromGroupShows);
  postAPI('/api/votes', groups.submitVote);
  postAPI('/api/ballots', groups.addBallot);

  patchAPI('/api/ballots', groups.editBallot);

  // GENRES
  getAPI('/api/genres', series.getAllGenres);

  function getAPI(endpoint, callback) {
    app.get(endpoint, authCheck, callback);
  }

  function postAPI(endpoint, callback) {
    app.post(endpoint, authCheck, callback);
  }

  function patchAPI(endpoint, callback) {
    app.patch(endpoint, authCheck, callback);
  }

  // error handlers

  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
      console.log(err.message);
      console.log(err.stack);
      console.log("Status: " + err.status);
      res.status(err.status || 500).json({
        message: err.message,
        error: err
      });
    });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    console.log(err.message);
    console.log(err.stack);
    console.log("Status: " + err.status);
    res.status(err.status || 500).json({
      message: err.message,
      error: err
    });
  });

};
