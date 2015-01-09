var xml2js = require('xml2js');
var async = require('async');
var request = require('request');
var mongoose = require('mongoose'),
  Series = mongoose.model('series');
exports.getSeries = function(req, res) {
    Series.find({IsEpisodic:true}).sort({SeriesTitle:1})
      .exec(function(err, series) {
          if (!series) {
              res.json(404, {msg: 'Series Not Found.'});
          } else {
              res.json(series);
          }
      });
};
exports.changeTier = function(req, res) {
    Series.update({_id: req.body.SeriesId}, {$set:{Tier:req.body.Tier}})
      .exec(function(err, savedSeries) {
          if (err) {
              res.json(404, {msg: 'Failed to update Series with new Tier.'});
          } else {
              res.json({msg: "success"});
          }
      });
};
exports.addSeries = function(req, res, next) {
  var seriesObj = req.body.series;
  console.log("Series info: " + JSON.stringify(seriesObj));
  var series = new Series(seriesObj);
  console.log("Full Series: " + JSON.stringify(series));

  var seriesName = series.SeriesTitle
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/[^\w-]+/g, '');
  var apiKey = '04DBA547465DC136';

  console.log("Entering start of method for series " + seriesName);

  var parser = xml2js.Parser({
    explicitArray: false,
    normalizeTags: true
  });

  async.waterfall([
    function(callback) {
      console.log("In first callback.");
      request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + seriesName, function (error, response, body) {
        if (error) return next(error);
        console.log("Made successful first API call.");
        parser.parseString(body, function(err, result) {
          if (!result.data.series) {
            return res.send(400, { message: seriesName + ' was not found.' });
          }
          var tvdbId = result.data.series.seriesid || result.data.series[0].seriesid;
          console.log("Found ID on TVDB! Id is " + tvdbId);
          callback(err, series, tvdbId);
        });
      });
    },
    function (existingSeries, tvdbId, callback) {
      console.log("In second callback.");
      request.get('http://thetvdb.com/api/' + apiKey + '/series/' + tvdbId + '/all/en.xml', function (error, response, body) {
        if (error) return next(error);
        console.log("Made successful second API call.");
        parser.parseString(body, function (err, result) {
          var series = result.data.series;
          var episodes = result.data.episode;

          existingSeries.tvdbId = series.id;
          existingSeries.tvdbName = series.seriesname;
          existingSeries.airsDayOfWeek = series.airs_dayofweek;
          existingSeries.airsTime = series.airs_time;
          existingSeries.firstAired = series.firstaired;
          existingSeries.genre = series.genre.split('|').filter(Boolean);
          existingSeries.network = series.network;
          existingSeries.overview = series.overview;
          existingSeries.rating = series.rating;
          existingSeries.ratingCount = series.ratingcount;
          existingSeries.runtime = series.runtime;
          existingSeries.status = series.status;
          existingSeries.poster = series.poster;

          console.log("Show data: " + JSON.stringify(existingSeries));
          console.log("Episode data: " + episodes);
          callback(err, existingSeries);
        });
      });
    },
    function (series, callback) {
      console.log("In third callback.");
      var url = 'http://thetvdb.com/banners/' + series.poster;
      request({ url: url, encoding: null }, function (error, response, body) {
        console.log("Made successful third API call.");
        series.poster = 'data:' + response.headers['content-type'] + ';base64,' + body.toString('base64');
        callback(error, series);
      });
    }
  ], function (err, series) {
    console.log("In final callback.");
    if (err) return next(err);

    console.log("Data found for series: " + JSON.stringify(series));


    series.save(function(err) {
      if (err) {
        res.json(404, {msg: 'Failed to insert Series.'});
      } else {
        res.json({msg: "success"});
      }
    });


    /*
    res.json({msg: "success"});
    */

  });


};
exports.updateSeries = function(req, res) {
  Series.update({_id: req.body.SeriesId}, req.body.ChangedFields)
    .exec(function(err, savedSeries) {
      if (err) {
        res.json(404, {msg: 'Failed to update Series with new fields.'});
      } else {
        res.json({msg: "success"});
      }
    });
};

// not helpful right now, but maybe for Add Show.
exports.addTVDBinfo = function(req, res, next) {
  var seriesId = req.body.SeriesId;
  var seriesName = req.body.SeriesTitle
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/[^\w-]+/g, '');
  var apiKey = '04DBA547465DC136';

  console.log("Entering start of method for ID " + seriesId + " series " + seriesName);

  var parser = xml2js.Parser({
    explicitArray: false,
    normalizeTags: true
  });

  async.waterfall([
    function(callback) {
      console.log("In first callback.");
      request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + seriesName, function (error, response, body) {
        if (error) return next(error);
        console.log("Made successful first API call.");
        parser.parseString(body, function(err, result) {
          if (!result.data.series) {
            return res.send(400, { message: req.body.SeriesTitle + ' was not found.' });
          }
          var tvdbId = result.data.series.seriesid || result.data.series[0].seriesid;
          console.log("Found ID on TVDB! Id is " + tvdbId);
          callback(err, seriesId, tvdbId);
        });
      });
    },
    function (seriesId, tvdbId, callback) {
      console.log("In second callback.");
      request.get('http://thetvdb.com/api/' + apiKey + '/series/' + tvdbId + '/all/en.xml', function (error, response, body) {
        if (error) return next(error);
        console.log("Made successful second API call.");
        parser.parseString(body, function (err, result) {
          var series = result.data.series;
          var episodes = result.data.episode;
          var show = {
            tvdbId: series.id,
            tvdbName: series.seriesname,
            airsDayOfWeek: series.airs_dayofweek,
            airsTime: series.airs_time,
            firstAired: series.firstaired,
            genre: series.genre.split('|').filter(Boolean),
            network: series.network,
            overview: series.overview,
            rating: series.rating,
            ratingCount: series.ratingcount,
            runtime: series.runtime,
            status: series.status,
            poster: series.poster
          };
          console.log("Show data: " + JSON.stringify(show));
          console.log("Episode data: " + episodes);
          callback(err, seriesId, show);
        });
      });
    },
    function (seriesId, show, callback) {
      console.log("In third callback.");
      var url = 'http://thetvdb.com/banners/' + show.poster;
      request({ url: url, encoding: null }, function (error, response, body) {
        console.log("Made successful third API call.");
        show.poster = 'data:' + response.headers['content-type'] + ';base64,' + body.toString('base64');
        callback(error, seriesId, show);
      });
    }
  ], function (err, seriesId, show) {
    console.log("In final callback.");
    if (err) return next(err);

    console.log("Data found for series id " + seriesId + ": " + JSON.stringify(show));

    Series.update({_id: seriesId}, show)
      .exec(function(err, savedSeries) {
        if (err) {
          res.json(404, {msg: 'Failed to update Series with new fields.'});
        } else {
          res.json({msg: "success"});
        }
      });

  });
};