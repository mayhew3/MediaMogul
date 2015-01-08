module.exports = function(app) {
    var episodes = require('../controllers/episodes_controller');
    var series = require('../controllers/series_controller');
    app.get('/', function (req, res) {
        res.render('shows');
    });
    app.get('/shows', function(req, res) {
        res.render('shows');
    });
    app.get('/episodes', function(req, res) {
        res.render('episodes');
    });
    app.get('/movies', function(req, res) {
        res.render('movies');
    });
    app.get('/episodeList', episodes.getEpisodes);
    app.get('/seriesList', series.getSeries);
    app.post('/markWatched', episodes.markEpisodeAsWatched);
    app.post('/markAllWatched', episodes.markAllEpisodesAsWatched);
    app.post('/changeTier', series.changeTier);
    app.post('/updateSeries', series.updateSeries);

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
