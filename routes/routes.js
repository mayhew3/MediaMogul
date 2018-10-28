module.exports = function(app) {
  var jwt = require('express-jwt');
  var path = require('path');
  var games = require('../controllers/games_controller');
  var series = require('../controllers/series_controller');
  var persons = require('../controllers/person_controller');

  var authCheck = jwt({
    secret: new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
    audience: process.env.AUTH0_CLIENT_ID
  });

  // SYSTEM VARS
  app.get('/systemVars', authCheck, persons.getSystemVars);

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
  app.get('/seriesMatchList', authCheck, series.getSeriesWithPossibleMatchInfo);
  app.get('/episodeGroupRating', authCheck, series.getEpisodeGroupRating);
  app.get('/episodeGroupRatings', authCheck, series.getEpisodeGroupRatings);
  app.get('/episodeList', authCheck, series.getEpisodes);
  app.get('/recordingNow', authCheck, series.getRecordingNow);
  app.get('/possibleMatches', authCheck, series.getPossibleMatches);
  app.get('/numShowsToRate', authCheck, series.getNumberOfShowsToRate);
  app.get('/numPendingMatches', authCheck, series.getNumberOfPendingMatches);
  app.get('/viewingLocations', authCheck, series.getViewingLocations);
  app.get('/allPosters', authCheck, series.getAllPosters);
  app.get('/seriesViewingLocations', authCheck, series.getSeriesViewingLocations);
  app.get('/unmatchedEpisodes', authCheck, series.getUnmatchedEpisodes);
  app.get('/upcomingEpisodes', authCheck, series.getUpcomingEpisodes);
  app.get('/tvdbErrors', authCheck, series.getTVDBErrors);
  app.get('/ratingYears', authCheck, series.getAllRatingYears);

  // API for iOS app
  app.get('/primeTV', authCheck, series.getPrimeTV);
  app.get('/primeSeriesInfo', authCheck, series.getPrimeSeriesInfo);

  app.post('/updateEpisode', authCheck, series.updateEpisode);
  app.post('/matchTiVoEpisodes', authCheck, series.matchTiVoEpisodes);
  app.post('/unlinkEpisode', authCheck, series.unlinkEpisode);
  app.post('/retireTiVoEpisode', authCheck, series.retireTiVoEpisode);
  app.post('/ignoreTiVoEpisode', authCheck, series.ignoreTiVoEpisode);
  app.post('/changeTier', authCheck, series.changeTier);
  app.post('/addSeries', authCheck, series.addSeries);
  app.post('/updateSeries', authCheck, series.updateSeries);
  app.post('/updateEpisodeGroupRating', authCheck, series.updateEpisodeGroupRating);
  app.post('/addEpisodeGroupRating', authCheck, series.addEpisodeGroupRating);
  app.post('/addViewingLocation', authCheck, series.addViewingLocation);
  app.post('/removeViewingLocation', authCheck, series.removeViewingLocation);
  app.post('/changeEpisodesStreaming', authCheck, series.changeEpisodesStreaming);

  // PERSONS
  app.get('/person', authCheck, persons.getPersonInfo);
  app.post('/addPerson', authCheck, persons.addPerson);

  // MY SHOWS
  app.get('/myShows', authCheck, persons.getMyShows);
  app.get('/notMyShows', authCheck, persons.getNotMyShows);
  app.get('/getMyEpisodes', authCheck, persons.getMyEpisodes);
  app.get('/myUpcomingEpisodes', authCheck, persons.getMyUpcomingEpisodes);
  app.get('/showBasicInfo', authCheck, persons.getShowBasicInfo);
  app.post('/addToMyShows', authCheck, persons.addToMyShows);
  app.post('/removeFromMyShows', authCheck, persons.removeFromMyShows);
  app.post('/updateMyShow', authCheck, persons.updateMyShow);
  app.post('/rateMyShow', authCheck, persons.rateMyShow);
  app.post('/rateMyEpisode', authCheck, persons.rateMyEpisode);
  app.post('/markMyPastWatched', authCheck, persons.markAllPastEpisodesAsWatched);
  app.post('/increaseYear', authCheck, persons.increaseYear);
  app.post('/revertYear', authCheck, persons.revertYear);
  app.post('/setRatingEndDate', authCheck, persons.setRatingEndDate);

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
