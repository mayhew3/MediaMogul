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
          response.send("Query error " + err);
        } else {
          return response.json(res.rows);
        }
      });

      if (err) {
        console.error(err);
        response.send("Connection error " + err);
      }

    });

    pool.end();
  },

  executeQueryNoResults: function(response, sql, values) {

    var pool = new pg.Pool({
      connectionString: config
    });

    pool.connect(function(err, client, done) {
      client.query(sql, values, function(err) {
        done();

        if (err) {
          console.error(err);
          response.send("Query error " + err);
        } else {
          return response.json({msg: "Success"});
        }
      });

      if (err) {
        console.error(err);
        response.send("Connection error " + err);
      }

    });

    pool.end();
  },

  updateNoJSON: function(sql, values) {
    return new Promise(function(resolve, reject) {
      var pool = new pg.Pool({
        connectionString: config
      });

      pool.connect(function(err, client, done) {
        client.query(sql, values, function(err) {
          done();

          if (err) {
            console.error(err);
            reject(Error("Query error " + err));
          } else {
            resolve("Success!");
          }
        });

        if (err) {
          console.error(err);
          reject(Error("Connection error " + err));
        }

      });

      pool.end();
    });

  },

  selectWithJSON: function(sql, values) {
    return new Promise(function (resolve, reject) {
      var pool = new pg.Pool({
        connectionString: config
      });

      pool.connect(function (err, client, done) {
        client.query(sql, values, function (err, res) {
          done();

          if (err) {
            console.error(err);
            pool.end();
            reject(Error("Query error " + err));
          } else {
            pool.end();
            resolve(res.rows);
          }
        });

        if (err) {
          console.error(err);
          pool.end();
          reject(Error("Connection error " + err));
        }

      });

    });
  },

  buildUpdateQueryConfig: function(changedFields, tableName, rowID) {

    var sql = "UPDATE " + tableName + " SET ";
    var values = [];
    var i = 1;
    for (var key in changedFields) {
      if (changedFields.hasOwnProperty(key)) {
        if (values.length !== 0) {
          sql += ", ";
        }

        sql += (key + " = $" + i);

        var value = changedFields[key];
        values.push(value);

        i++;
      }
    }

    sql += (" WHERE id = $" + i);

    values.push(rowID);

    return {
      text: sql,
      values: values
    };
  },

  buildUpdateQueryConfigNoID: function(changedFields, tableName, identifyingColumns) {

    var sql = "UPDATE " + tableName + " SET ";
    var values = [];
    var i = 1;
    for (var key in changedFields) {
      if (changedFields.hasOwnProperty(key)) {
        if (values.length !== 0) {
          sql += ", ";
        }

        sql += (key + " = $" + i);

        var value = changedFields[key];
        values.push(value);

        i++;
      }
    }

    var lengthBeforeWheres = values.length;

    sql += " WHERE ";

    for (key in identifyingColumns) {
      if (identifyingColumns.hasOwnProperty(key)) {
        if (values.length !== lengthBeforeWheres) {
          sql += " AND ";
        }

        sql += (key + " = $" + i);

        value = identifyingColumns[key];
        values.push(value);

        i++;
      }
    }

    return {
      text: sql,
      values: values
    };
  },

  updateObjectWithChangedFields: function(response, changedFields, tableName, rowID) {
    console.log("Update " + tableName + " with " + JSON.stringify(changedFields));

    var queryConfig = this.buildUpdateQueryConfig(changedFields, tableName, rowID);

    console.log("SQL: " + queryConfig.text);
    console.log("Values: " + queryConfig.values);

    return this.executeQueryNoResults(response, queryConfig.text, queryConfig.values);
  },

  updateObjectWithChangedFieldsNoJSON: function(changedFields, tableName, rowID) {
    console.log("Update " + tableName + " with " + JSON.stringify(changedFields));

    var queryConfig = this.buildUpdateQueryConfig(changedFields, tableName, rowID);

    console.log("SQL: " + queryConfig.text);
    console.log("Values: " + queryConfig.values);

    return this.updateNoJSON(queryConfig.text, queryConfig.values);
  }
};
