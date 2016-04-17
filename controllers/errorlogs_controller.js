var pg = require('pg');
var config = process.env.DATABASE_URL;

exports.getErrorLogs = function(req, response) {
  console.log("Errorlogs call received.");

  var sql = 'SELECT * ' +
    'FROM error_log ' +
    'WHERE resolved = $1 ' +
    'ORDER BY event_date DESC';

  return executeQueryWithResults(response, sql, [false]);
};
exports.setChosenName = function(req, res) {
  var id = req.body.errorLogID;
  var chosenName = req.body.chosenName;
/*
  ErrorLog.update({_id : id}, {ChosenName: chosenName})
    .exec(function(err) {
      if (err) {
        res.status(404).json({msg: 'Failed to update ChosenName on ErrorLog.'});
      } else {
        res.json({msg: "success"});
      }
    });
  */
};
exports.setIgnoreError = function(req, res) {
  var id = req.body.errorLogID;
  var ignoreError = req.body.ignoreError;
/*
  ErrorLog.update({_id : id}, {IgnoreError: ignoreError})
    .exec(function(err) {
      if (err) {
        res.status(404).json({msg: 'Failed to update IgnoreError on ErrorLog.'});
      } else {
        res.json({msg: "success"});
      }
    });
  */
};


// utility methods

function executeQueryWithResults(response, sql, values) {
  var results = [];

  var queryConfig = {
    text: sql,
    values: values
  };

  var client = new pg.Client(config);
  if (client == null) {
    return console.error('null client');
  }

  client.connect(function(err) {
    if (err) {
      return console.error('could not connect to postgres', err);
    }

    var query = client.query(queryConfig);

    query.on('row', function(row) {
      results.push(row);
    });

    query.on('end', function() {
      client.end();
      return response.json(results);
    });

    if (err) {
      console.error(err);
      response.send("Error " + err);
    }
  })
}

