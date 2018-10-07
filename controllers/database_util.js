var pg = require('pg');
var config = process.env.DATABASE_URL;

module.exports = {

  executeQueryWithResults: function(response, sql, values) {

    var pool = new pg.Pool({
      connectionString: config
    });

    pool.connect(function(err, client, done) {
      client.query(sql, values, function(err, res) {
        done();

        if (err) {
          console.error(err);
          response.send("Error " + err);
        } else {
          return response.json(res.rows);
        }
      });

      if (err) {
        console.error(err); response.send("Error " + err);
      }

    });

    pool.end();
  }

};
