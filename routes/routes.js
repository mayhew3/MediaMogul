module.exports = function(app) {
    var series = require('../controllers/series_controller');
    var errorLogs = require('../controllers/errorlogs_controller');


    app.get('/seriesList', series.getSeries);
    app.get('/episodeList', series.getEpisodes);
    app.get('/errorlog/list', errorLogs.getErrorLogs);

    app.post('/updateEpisode', series.updateEpisode);
    app.post('/markAllWatched', series.markAllEpisodesAsWatched);
    app.post('/changeTier', series.changeTier);
    app.post('/addSeries', series.addSeries);
    app.post('/updateSeries', series.updateSeries);
    app.post('/errorlog/setChosenName', errorLogs.setChosenName);
    app.post('/errorlog/ignoreError', errorLogs.setIgnoreError);

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
