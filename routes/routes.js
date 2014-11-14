module.exports = function(app) {
    var shows = require('../controllers/shows_controller');
    app.get('/', function (req, res) {
        res.render('index', {title: "ShowList"});
    });
    app.get('/notes', function (req, res) {
        res.render('angTest');
    });
    app.get('/shows', shows.getShows);
    app.post('/markWatched', shows.markShowAsWatched);

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
