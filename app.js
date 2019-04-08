var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var app = express();

app.use(favicon(__dirname + '/images/favicon.ico', {}));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser(process.env.MEDIAMOGULSECRET));
app.use('/', express.static(path.join(__dirname, '')));


require('./routes/routes.js')(app);

app.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

module.exports = app;
