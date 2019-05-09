const db = require('postgres-mmethods');

exports.getTVDBErrors = function(req, response) {
  console.log("TVDB Errors request received.");

  var sql = 'SELECT * ' +
    'FROM tvdb_update_error ' +
    'ORDER BY id DESC ';

  return db.selectSendResponse(response, sql, []);
};

exports.getExternalServices = function(request, response) {
  console.log("External Services request received.");

  const sql = 'SELECT * ' +
    'FROM external_service ' +
    'ORDER BY id DESC ';

  return db.selectSendResponse(response, sql, []);
};
