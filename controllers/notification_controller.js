const db = require('postgres-mmethods');
const _ = require('underscore');
const sockets = require('./sockets_controller');
const assert = require('assert');

/* GET POSSIBLE MATCHES */

exports.getNotifications = function(request, response) {
  const person_id = request.query.person_id;
  assert(!!person_id);

  const sql = 'SELECT * ' +
    'FROM notification ' +
    'WHERE person_id = $1 ' +
    'AND status = $2 ';

  db.selectSendResponse(response, sql, [person_id, 'pending']);
}

async function insertObject(tableName, object) {
  return new Promise((resolve, reject) => {
    const fieldNames = _.keys(object);

    const sql = 'INSERT INTO ' + tableName + ' ' +
      '(' + fieldNames.join(', ') + ') ' +
      'VALUES (' + db.createInlineVariableList(fieldNames.length, 1) + ') ' +
      'RETURNING id ';

    const values = _.map(_.values(object), value => value === '' ? null : value);

    db.selectNoResponse(sql, values).then(result => {
      object.id = result[0].id;
      resolve(object);
    }).catch(err => {
      reject(err);
    });
  });
}
