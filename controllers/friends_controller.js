const db = require('postgres-mmethods');
const _ = require('underscore');
const sockets = require('./sockets_controller');

/* GET POSSIBLE MATCHES */

exports.getFriendships = function(request, response) {
  const person_id = request.query.person_id;

  const sql = 'SELECT * ' +
    'FROM friendship ' +
    'WHERE hugging_person_id = $1 ';

  db.selectSendResponse(response, sql, [person_id]);
}

exports.getFriendRequests = function(request, response) {
  const person_id = request.query.person_id;

  const sql = 'SELECT * ' +
    'FROM friendship ' +
    'WHERE hugged_person_id = $1 ';

  db.selectSendResponse(response, sql, [person_id]);
};

exports.addFriendRequest = async function(request, response) {
  const person_id = request.body.person_id;
  const hugged_person_id = request.body.hugged_person_id;

  const payload = {
    hugged_person_id: hugged_person_id,
    hugging_person_id: person_id,
    status: 'pending'
  };

  const friendship = await insertObject('friendship', payload);

  sockets.emitToPerson(hugged_person_id, 'request_received', friendship);
  sockets.emitToPerson(person_id, 'request_sent', friendship);

  response.json(friendship);
};

exports.removeFriendRequest = async function(request, response) {
  const friendship_id = request.query.friendship_id;
  const person_id = request.query.person_id;
  const hugged_person_id = request.query.hugged_person_id;

  const sql = 'DELETE FROM friendship ' +
    'WHERE id = $1 ' +
    'AND status = $2 ';

  sockets.emitToPerson(hugged_person_id, 'request_removed', friendship_id);
  sockets.emitToPerson(person_id, 'request_removed', friendship_id);

  db.updateSendResponse(response, sql, [friendship_id, 'pending']);
};


exports.approveFriendRequest = async function(request, response) {
  const person_id = request.body.person_id;
  const hugged_person_id = request.body.hugged_person_id;

  const payload = {
    hugged_person_id: hugged_person_id,
    hugging_person_id: person_id,
    status: 'approved'
  }

  const friendship = await insertObject('friendship', payload);

  await updateFriendship(request.body.friendship_id, 'approved');

  sockets.emitToPerson(hugged_person_id, 'request_approved', friendship);
  sockets.emitToPerson(person_id, 'request_approved', friendship);

  response.json(friendship);
};

exports.ignoreFriendRequest = async function(request, response) {
  const person_id = request.query.person_id;

  const friendship_id = request.body.friendship_id;
  await updateFriendship(friendship_id, 'ignored');

  sockets.emitToPerson(person_id, 'request_ignored', friendship_id);

  response.json({msg: 'Success!'});
};

exports.unIgnoreFriendRequest = async function(request, response) {
  const person_id = request.query.person_id;

  const friendship_id = request.body.friendship_id;
  await updateFriendship(friendship_id, 'pending');

  sockets.emitToPerson(person_id, 'request_unignored', friendship_id);

  response.json({msg: 'Success!'});
};


exports.removeFriendship = async function(request, response) {
  const person_id = request.body.person_id;
  const hugged_person_id = request.body.hugged_person_id;

  const friendship_id = request.query.friendship_id;
  const reverse_id = await findReverseFriendshipID(friendship_id);

  const sql = 'DELETE FROM friendship ' +
    'WHERE id = $1 ';

  await db.updateNoResponse(sql, [friendship_id]);
  await db.updateNoResponse(sql, [reverse_id]);

  sockets.emitToPerson(hugged_person_id, 'friendship_removed', friendship_id);
  sockets.emitToPerson(person_id, 'friendship_removed', friendship_id);

  sockets.emitToPerson(hugged_person_id, 'friendship_removed', reverse_id);
  sockets.emitToPerson(person_id, 'friendship_removed', reverse_id);

  response.json({msg: 'Success!'});
};

async function findReverseFriendshipID(friendship_id) {
  const sql = 'SELECT rev.id ' +
    'FROM friendship rev ' +
    'INNER JOIN friendship orig ' +
    '  ON (rev.hugged_person_id = orig.hugging_person_id AND rev.hugging_person_id = orig.hugged_person_id) ' +
    'WHERE orig.id = $1 ';

  const result = await db.selectNoResponse(sql, [friendship_id]);
  return result[0].id;
}

async function updateFriendship(friendship_id, status) {
  const changedFields = {
    status: status
  };

  await db.updateObjectWithChangedFieldsNoResponse(changedFields, 'friendship', friendship_id);
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
