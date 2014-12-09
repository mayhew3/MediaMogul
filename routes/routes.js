module.exports = function(app) {
    var episodes = require('../controllers/episodes_controller');
    app.get('/', function (req, res) {
        res.render('episodes');
    });
    app.get('/episodes', episodes.getEpisodes);
    app.post('/markWatched', episodes.markEpisodeAsWatched);

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
