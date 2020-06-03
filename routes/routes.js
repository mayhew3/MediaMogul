const express = require('express');
const jwt = require('express-jwt');
const admin = require('../controllers/admin_controller');
const games = require('../controllers/games_controller');
const series = require('../controllers/series_controller');
const persons = require('../controllers/person_controller');
const friends = require('../controllers/friends_controller');
const groups = require('../controllers/groups_controller');
const addShow = require('../controllers/add_show_controller');
const testing = require('../controllers/testing_controller');
require('../controllers/event_handlers');
const assert = require('assert');

module.exports = function(app) {

  const secret = process.env.AUTH0_CLIENT_SECRET;
  const clientID = process.env.AUTH0_CLIENT_ID;
  const database_url = process.env.DATABASE_URL;
  const envName = process.env.envName;

  assert(!!secret, "No environment variable: AUTH0_CLIENT_SECRET");
  assert(!!clientID, "No environment variable: AUTH0_CLIENT_ID");
  assert(!!database_url, "No environment variable: DATABASE_URL");
  assert(!!envName, "No environment variable: envName");

  const authCheck = jwt({
    secret: new Buffer(secret, 'base64'),
    audience: clientID
  });

  const router = express.Router();

  // SYSTEM VARS
  privateGet('/systemVars', persons.getSystemVars);

  // GAMES
  privateGet('/games', games.getGames);
  privateGet('/notMyGames', games.getNotMyGames);
  privateGet('/gamesMatchList', games.getGamesWithPossibleMatchInfo);
  privateGet('/possibleGameMatches', games.getPossibleGameMatches);

  privatePost('/updategame', games.updateGame);
  privatePost('/updatePersonGame', games.updatePersonGame);
  privatePost('/addgame', games.addGame);
  privatePost('/addToMyGames', games.addToMyGames);
  privatePost('/addgameplay', games.addGameplaySession);

  // TV
  privateGet('/episodeGroupRating', series.getEpisodeGroupRating);
  privateGet('/episodeGroupRatings', series.getEpisodeGroupRatings);
  privateGet('/numShowsToRate', series.getNumberOfShowsToRate);
  privateGet('/viewingLocations', series.getViewingLocations);
  privateGet('/allPosters', series.getAllPosters);
  privateGet('/seriesViewingLocations', series.getSeriesViewingLocations);
  privateGet('/upcomingEpisodes', series.getUpcomingEpisodes);
  privateGet('/ratingYears', series.getAllRatingYears);
  privateGet('/episodeListForRating', series.getEpisodesForRating);
  privateGet('/tvdbMatches', addShow.getTVDBMatches);
  privateGet('/tvdbIDs', series.getMatchedTVDBIDs);

  privatePost('/updateEpisode', series.updateEpisode);
  privatePost('/changeTier', series.changeTier);
  privatePost('/addSeries', addShow.beginEpisodeFetch);
  privatePost('/updateSeries', series.updateSeries);
  privatePost('/updateEpisodeGroupRating', series.updateEpisodeGroupRating);
  privatePost('/addEpisodeGroupRating', series.addEpisodeGroupRating);
  privatePost('/addViewingLocation', series.addViewingLocation);
  privatePost('/removeViewingLocation', series.removeViewingLocation);
  privatePost('/handleSeriesRequest', series.handleSeriesRequest);
  privatePost('/posterHide', series.hideTVDBPoster);

  // ADMIN
  privateGet('/tvdbErrors', admin.getTVDBErrors);
  privateGet('/services', admin.getExternalServices);
  privateGet('/tvdbApprovals', admin.getEpisodesNeedingApproval);
  privateGet('/updaterStatus', admin.getUpdaterStatus);

  // API for iOS app
  privateGet('/primeTV', series.getPrimeTV);
  privateGet('/primeSeriesInfo', series.getPrimeSeriesInfo);

  // PERSONS
  privateGet('/person', persons.getPersonInfo);
  privateGet('/persons', persons.getPersons);

  // FRIENDS
  privateGet('/friendships', friends.getFriendships);
  privateGet('/friendshipRequests', friends.getFriendRequests);
  privatePost('/friendshipRequests', friends.addFriendRequest);
  privatePatch('/approveRequest', friends.approveFriendRequest);
  privatePatch('/ignoreRequest', friends.ignoreFriendRequest);
  privateDelete('/friendships', friends.removeFriendship);
  privateDelete('/friendshipRequests', friends.removeFriendRequest);

  // MY SHOWS
  privateGet('/myShows', persons.getMyShows);
  privateGet('/myQueueShows', persons.getMyQueueShows);
  privateGet('/myPendingShows', persons.getMyPendingShows);
  privateGet('/notMyShows', persons.getNotMyShows);
  privateGet('/getMyEpisodes', persons.getMyEpisodes);
  privateGet('/seriesDetail', persons.getSeriesDetailInfo);
  privateGet('/seriesRequest', persons.getAllOpenSeriesRequests);
  privateGet('/mySeriesRequests', persons.getMySeriesRequests);
  privateGet('/nextAired', persons.getNextAiredInfo);

  privatePost('/addToMyShows', persons.addToMyShows);
  privatePost('/removeFromMyShows', persons.removeFromMyShows);
  privatePost('/updateMyShow', persons.updateMyShow);
  privatePost('/rateMyShow', persons.rateMyShow);
  privatePost('/updateEpisodeRatings', persons.updateEpisodeRatings);
  privatePost('/increaseYear', persons.increaseYear);
  privatePost('/revertYear', persons.revertYear);
  privatePost('/setRatingEndDate', persons.setRatingEndDate);
  privatePost('/seriesRequest', persons.seriesRequest);
  privatePost('/markEpisodesWatched', persons.markEpisodesWatched);
  privatePost('/pinToDashboard', persons.pinToDashboard);
  privatePost('/myPoster', persons.addMyPoster);

  privatePatch('/myPoster', persons.updateMyPoster);

  // GROUPS
  privateGet('/myGroups', groups.getMyGroups);
  privateGet('/groupPersons', groups.getGroupPersons);
  privateGet('/groupShows', groups.getGroupShows);

  privatePost('/createGroup', groups.createGroup);
  privatePost('/groupWatchEpisode', groups.markEpisodesWatchedByGroup);
  privatePost('/addGroupShow', groups.addToGroupShows);
  privatePost('/removeGroupShow', groups.removeFromGroupShows);
  privatePost('/votes', groups.submitVote);
  privatePost('/ballots', groups.addBallot);

  privatePatch('/ballots', groups.editBallot);

  // TESTING
  privateGet('/testData', testing.createTestData);

  // PUBLIC API for ENV MODE
  publicGet('/serverEnv', (request, response) => response.json({envName: envName}));

  // GENRES
  privateGet('/genres', series.getAllGenres);

  function privateGet(endpoint, callback) {
    if (envName === 'test') {
      router.get(endpoint, callback);
    } else {
      router.get(endpoint, authCheck, callback);
    }
  }

  function publicGet(endpoint, callback) {
    router.get(endpoint, callback);
  }

  function privatePost(endpoint, callback) {
    if (envName === 'test') {
      router.post(endpoint, callback);
    } else {
      router.post(endpoint, authCheck, callback);
    }
  }

  function privatePatch(endpoint, callback) {
    if (envName === 'test') {
      router.patch(endpoint, callback);
    } else {
      router.patch(endpoint, authCheck, callback);
    }
  }

  function privateDelete(endpoint, callback) {
    if (envName === 'test') {
      router.delete(endpoint, callback);
    } else {
      router.delete(endpoint, authCheck, callback);
    }
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
