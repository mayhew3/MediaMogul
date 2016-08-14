module.exports = function(app) {
    var series = require('../controllers/series_controller');
    var errorLogs = require('../controllers/errorlogs_controller');


    app.get('/seriesList', series.getSeries);
    app.get('/episodeList', series.getEpisodes);
    app.get('/recordingNow', series.getRecordingNow);
    app.get('/possibleMatches', series.getPossibleMatches);
    app.get('/viewingLocations', series.getViewingLocations);
    app.get('/seriesViewingLocations', series.getSeriesViewingLocations);
    app.get('/unmatchedEpisodes', series.getUnmatchedEpisodes);
    app.get('/upcomingEpisodes', series.getUpcomingEpisodes);
    app.get('/errorlog/list', errorLogs.getErrorLogs);

    app.post('/updateEpisode', series.updateEpisode);
    app.post('/updateMultiEpisodes', series.updateMultipleEpisodes);
    app.post('/markAllWatched', series.markAllEpisodesAsWatched);
    app.post('/matchTiVoEpisodes', series.matchTiVoEpisodes);
    app.post('/unlinkEpisode', series.unlinkEpisode);
    app.post('/retireTiVoEpisode', series.retireTiVoEpisode);
    app.post('/changeTier', series.changeTier);
    app.post('/addSeries', series.addSeries);
    app.post('/updateSeries', series.updateSeries);
    app.post('/addViewingLocation', series.addViewingLocation);
    app.post('/removeViewingLocation', series.removeViewingLocation);
    app.post('/changeEpisodesStreaming', series.changeEpisodesStreaming);
    app.post('/addRating', series.addRating);
    app.post('/updateRating', series.updateRating);
    app.post('/errorlog/updateErrorLog', errorLogs.updateErrorLog);

    // error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err
            });
        });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
};
