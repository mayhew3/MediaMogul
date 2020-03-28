const db = require('postgres-mmethods');
const _ = require('underscore');
const sockets = require('./sockets_controller');

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

  const sql = 'SELECT e.id, e.series_title, e.series_id, e.title, e.season, e.episode_number, e.air_time, e.date_added ' +
    'FROM episode e ' +
    'WHERE tvdb_approval = $1 ' +
    'AND retired = $2 ';

  return db.selectSendResponse(response, sql, ['pending', 0]);
};

exports.getUpdaterStatus = async function(request, response) {
  console.log("Updater status request received");

  const updaterConnected = sockets.isUpdaterConnected();
  const backupConnected = sockets.isBackupConnected();

  response.json({updater_connected: updaterConnected, backup_connected: backupConnected});
};
