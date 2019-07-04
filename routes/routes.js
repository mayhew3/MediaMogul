const express = require('express');
const jwt = require('express-jwt');
const admin = require('../controllers/admin_controller');
const games = require('../controllers/games_controller');
const series = require('../controllers/series_controller');
const persons = require('../controllers/person_controller');
const groups = require('../controllers/groups_controller');
const addShow = require('../controllers/add_show_controller');
require('../controllers/event_handlers');
const assert = require('assert');

module.exports = function(app) {

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

  const router = express.Router();

  // SYSTEM VARS
  getAPI('/systemVars', persons.getSystemVars);

  // GAMES
  getAPI('/games', games.getGames);
  getAPI('/notMyGames', games.getNotMyGames);
  getAPI('/gamesMatchList', games.getGamesWithPossibleMatchInfo);
  getAPI('/possibleGameMatches', games.getPossibleGameMatches);

  postAPI('/updategame', games.updateGame);
  postAPI('/updatePersonGame', games.updatePersonGame);
  postAPI('/addgame', games.addGame);
  postAPI('/addToMyGames', games.addToMyGames);
  postAPI('/addgameplay', games.addGameplaySession);

  // TV
  getAPI('/episodeGroupRating', series.getEpisodeGroupRating);
  getAPI('/episodeGroupRatings', series.getEpisodeGroupRatings);
  getAPI('/numShowsToRate', series.getNumberOfShowsToRate);
  getAPI('/viewingLocations', series.getViewingLocations);
  getAPI('/allPosters', series.getAllPosters);
  getAPI('/seriesViewingLocations', series.getSeriesViewingLocations);
  getAPI('/upcomingEpisodes', series.getUpcomingEpisodes);
  getAPI('/ratingYears', series.getAllRatingYears);
  getAPI('/episodeListForRating', series.getEpisodesForRating);
  getAPI('/tvdbMatches', addShow.getTVDBMatches);
  getAPI('/tvdbIDs', series.getMatchedTVDBIDs);

  // ADMIN
  getAPI('/tvdbErrors', admin.getTVDBErrors);
  getAPI('/services', admin.getExternalServices);
  
  // API for iOS app
  getAPI('/primeTV', series.getPrimeTV);
  getAPI('/primeSeriesInfo', series.getPrimeSeriesInfo);

  postAPI('/updateEpisode', series.updateEpisode);
  postAPI('/changeTier', series.changeTier);
  postAPI('/addSeries', addShow.beginEpisodeFetch);
  postAPI('/updateSeries', series.updateSeries);
  postAPI('/updateEpisodeGroupRating', series.updateEpisodeGroupRating);
  postAPI('/addEpisodeGroupRating', series.addEpisodeGroupRating);
  postAPI('/addViewingLocation', series.addViewingLocation);
  postAPI('/removeViewingLocation', series.removeViewingLocation);
  postAPI('/handleSeriesRequest', series.handleSeriesRequest);

  // PERSONS
  getAPI('/person', persons.getPersonInfo);
  getAPI('/persons', persons.getPersons);

  // MY SHOWS
  getAPI('/myShows', persons.getMyShows);
  getAPI('/myQueueShows', persons.getMyQueueShows);
  getAPI('/myPendingShows', persons.getMyPendingShows);
  getAPI('/notMyShows', persons.getNotMyShows);
  getAPI('/getMyEpisodes', persons.getMyEpisodes);
  getAPI('/seriesDetail', persons.getSeriesDetailInfo);
  getAPI('/seriesRequest', persons.getAllOpenSeriesRequests);
  getAPI('/mySeriesRequests', persons.getMySeriesRequests);
  getAPI('/nextAired', persons.getNextAiredInfo);

  postAPI('/addToMyShows', persons.addToMyShows);
  postAPI('/removeFromMyShows', persons.removeFromMyShows);
  postAPI('/updateMyShow', persons.updateMyShow);
  postAPI('/rateMyShow', persons.rateMyShow);
  postAPI('/updateEpisodeRatings', persons.updateEpisodeRatings);
  postAPI('/increaseYear', persons.increaseYear);
  postAPI('/revertYear', persons.revertYear);
  postAPI('/seriesRequest', persons.seriesRequest);
  postAPI('/markEpisodesWatched', persons.markEpisodesWatched);
  postAPI('/pinToDashboard', persons.pinToDashboard);
  postAPI('/myPoster', persons.addMyPoster);

  patchAPI('/myPoster', persons.updateMyPoster);

  // GROUPS
  getAPI('/myGroups', groups.getMyGroups);
  getAPI('/groupPersons', groups.getGroupPersons);
  getAPI('/groupShows', groups.getGroupShows);

  postAPI('/createGroup', groups.createGroup);
  postAPI('/groupWatchEpisode', groups.markEpisodesWatchedByGroup);
  postAPI('/addGroupShow', groups.addToGroupShows);
  postAPI('/removeGroupShow', groups.removeFromGroupShows);
  postAPI('/votes', groups.submitVote);
  postAPI('/ballots', groups.addBallot);

  patchAPI('/ballots', groups.editBallot);

  // GENRES
  getAPI('/genres', series.getAllGenres);

  function getAPI(endpoint, callback) {
    router.get(endpoint, authCheck, callback);
  }

  function postAPI(endpoint, callback) {
    router.post(endpoint, authCheck, callback);
  }

  function patchAPI(endpoint, callback) {
    router.patch(endpoint, authCheck, callback);
  }

  app.use('/api', router);

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
