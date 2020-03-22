const db = require('postgres-mmethods');
const _ = require('underscore');

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

exports.getEpisodesNeedingApproval = async function(request, response) {
  console.log("TVDB Episode Approval request received");

  const sql = 'SELECT e.id, e.series_title, e.series_id, e.title, e.season, e.episode_number ' +
    'FROM episode e ' +
    'WHERE tvdb_approval = $1 ';

  return db.selectSendResponse(response, sql, ['pending']);
};
