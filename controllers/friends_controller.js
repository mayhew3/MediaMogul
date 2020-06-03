const db = require('postgres-mmethods');
const _ = require('underscore');

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

  response.json(friendship);
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

  await updateFriendship(response, request.body.friendship_id, 'approved');

  response.json(friendship);
};

exports.ignoreFriendRequest = async function(request, response) {
  await updateFriendship(request.body.friendship_id, 'ignored');

  response.json({msg: 'Success!'});
};

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
