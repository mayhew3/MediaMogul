module.exports = function(app) {
  var jwt = require('express-jwt');
  var admin = require('../controllers/admin_controller');
  var games = require('../controllers/games_controller');
  var series = require('../controllers/series_controller');
  var persons = require('../controllers/person_controller');
  var groups = require('../controllers/groups_controller');
  require('../controllers/event_handlers');

  var authCheck = jwt({
    secret: new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
    audience: process.env.AUTH0_CLIENT_ID
  });

  // SYSTEM VARS
  app.get('/api/systemVars', authCheck, persons.getSystemVars);

  // GAMES
  app.get('/api/games', authCheck, games.getGames);
  app.get('/api/notMyGames', authCheck, games.getNotMyGames);
  app.get('/api/gamesMatchList', authCheck, games.getGamesWithPossibleMatchInfo);
  app.get('/api/possibleGameMatches', authCheck, games.getPossibleGameMatches);

  app.post('/api/updategame', authCheck, games.updateGame);
  app.post('/api/updatePersonGame', authCheck, games.updatePersonGame);
  app.post('/api/addgame', authCheck, games.addGame);
  app.post('/api/addToMyGames', authCheck, games.addToMyGames);
  app.post('/api/addgameplay', authCheck, games.addGameplaySession);

  // TV
  app.get('/api/episodeGroupRating', authCheck, series.getEpisodeGroupRating);
  app.get('/api/episodeGroupRatings', authCheck, series.getEpisodeGroupRatings);
  app.get('/api/numShowsToRate', authCheck, series.getNumberOfShowsToRate);
  app.get('/api/viewingLocations', authCheck, series.getViewingLocations);
  app.get('/api/allPosters', authCheck, series.getAllPosters);
  app.get('/api/seriesViewingLocations', authCheck, series.getSeriesViewingLocations);
  app.get('/api/upcomingEpisodes', authCheck, series.getUpcomingEpisodes);
  app.get('/api/ratingYears', authCheck, series.getAllRatingYears);
  app.get('/api/episodeListForRating', authCheck, series.getEpisodesForRating);
  app.get('/api/tvdbMatches', authCheck, series.getTVDBMatches);
  app.get('/api/tvdbIDs', authCheck, series.getMatchedTVDBIDs);

  // ADMIN
  app.get('/api/tvdbErrors', authCheck, admin.getTVDBErrors);
  app.get('/api/services', authCheck, admin.getExternalServices);
  
  // API for iOS app
  app.get('/primeTV', authCheck, series.getPrimeTV);
  app.get('/primeSeriesInfo', authCheck, series.getPrimeSeriesInfo);

  app.post('/api/updateEpisode', authCheck, series.updateEpisode);
  app.post('/api/changeTier', authCheck, series.changeTier);
  app.post('/api/addSeries', authCheck, series.addSeries);
  app.post('/api/updateSeries', authCheck, series.updateSeries);
  app.post('/api/updateEpisodeGroupRating', authCheck, series.updateEpisodeGroupRating);
  app.post('/api/addEpisodeGroupRating', authCheck, series.addEpisodeGroupRating);
  app.post('/api/addViewingLocation', authCheck, series.addViewingLocation);
  app.post('/api/removeViewingLocation', authCheck, series.removeViewingLocation);
  app.post('/api/handleSeriesRequest', authCheck, series.handleSeriesRequest);

  // PERSONS
  app.get('/api/person', authCheck, persons.getPersonInfo);
  app.get('/api/persons', authCheck, persons.getPersons);

  // MY SHOWS
  app.get('/api/myShows', authCheck, persons.getMyShows);
  app.get('/api/myQueueShows', authCheck, persons.getMyQueueShows);
  app.get('/api/myPendingShows', authCheck, persons.getMyPendingShows);
  app.get('/api/notMyShows', authCheck, persons.getNotMyShows);
  app.get('/api/getMyEpisodes', authCheck, persons.getMyEpisodes);
  app.get('/api/seriesRequest', authCheck, persons.getAllOpenSeriesRequests);
  app.get('/api/mySeriesRequests', authCheck, persons.getMySeriesRequests);
  app.get('/api/nextAired', authCheck, persons.getNextAiredInfo);

  app.post('/api/addToMyShows', authCheck, persons.addToMyShows);
  app.post('/api/removeFromMyShows', authCheck, persons.removeFromMyShows);
  app.post('/api/updateMyShow', authCheck, persons.updateMyShow);
  app.post('/api/rateMyShow', authCheck, persons.rateMyShow);
  app.post('/api/rateMyEpisode', authCheck, persons.rateMyEpisode);
  app.post('/api/markMyPastWatched', authCheck, persons.markAllPastEpisodesAsWatched);
  app.post('/api/increaseYear', authCheck, persons.increaseYear);
  app.post('/api/revertYear', authCheck, persons.revertYear);
  app.post('/api/seriesRequest', authCheck, persons.seriesRequest);
  app.post('/api/markEpisodesWatched', authCheck, persons.markEpisodesWatched);

  // GROUPS
  app.get('/api/myGroups', authCheck, groups.getMyGroups);
  app.get('/api/groupPersons', authCheck, groups.getGroupPersons);
  app.get('/api/groupShows', authCheck, groups.getGroupShows);
  app.get('/api/groupEpisodes', authCheck, groups.getGroupEpisodes);
  app.get('/api/notGroupShows', authCheck, groups.getNotGroupShows);

  app.post('/api/createGroup', authCheck, groups.createGroup);
  app.post('/api/groupWatchEpisode', authCheck, groups.markEpisodeWatchedByGroup);
  app.post('/api/watchPastGroupEpisodes', authCheck, groups.markAllPastEpisodesAsGroupWatched);
  app.post('/api/addGroupShow', authCheck, groups.addToGroupShows);
  app.post('/api/votes', authCheck, groups.submitVote);
  app.post('/api/ballots', authCheck, groups.addBallot);

  app.patch('/api/ballots', authCheck, groups.editBallot);

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
