const random_string = require("randomstring");
const db = require('postgres-mmethods');
const errs = require('./error_handler');
const _ = require('underscore');

const firstNames = ["Adam", "Alex", "Aaron", "Ben", "Carl", "Dan", "David", "Edward", "Fred", "Frank", "George", "Hal", "Hank", "Ike", "John", "Jack", "Joe", "Larry", "Monte", "Matthew", "Mark", "Nathan", "Otto", "Paul", "Peter", "Roger", "Roger", "Steve", "Thomas", "Tim", "Ty", "Victor", "Walter"];
const lastNames = ["Anderson", "Ashwoon", "Aikin", "Bateman", "Bongard", "Bowers", "Boyd", "Cannon", "Cast", "Deitz", "Dewalt", "Ebner", "Frick", "Hancock", "Haworth", "Hesch", "Hoffman", "Kassing", "Knutson", "Lawless", "Lawicki", "Mccord", "McCormack", "Miller", "Myers", "Nugent", "Ortiz", "Orwig", "Ory", "Paiser", "Pak", "Pettigrew", "Quinn", "Quizoz", "Ramachandran", "Resnick", "Sagar", "Schickowski", "Schiebel", "Sellon", "Severson", "Shaffer", "Solberg", "Soloman", "Sonderling", "Soukup", "Soulis", "Stahl", "Sweeney", "Tandy", "Trebil", "Trusela", "Trussel", "Turco", "Uddin", "Uflan", "Ulrich", "Upson", "Vader", "Vail", "Valente", "Van Zandt", "Vanderpoel", "Ventotla", "Vogal", "Wagle", "Wagner", "Wakefield", "Weinstein", "Weiss", "Woo", "Yang", "Yates", "Yocum", "Zeaser", "Zeller", "Ziegler", "Bauer", "Baxster", "Casal", "Cataldi", "Caswell", "Celedon", "Chambers", "Chapman", "Christensen", "Darnell", "Davidson", "Davis", "DeLorenzo", "Dinkins", "Doran", "Dugelman", "Dugan", "Duffman", "Eastman", "Ferro", "Ferry", "Fletcher", "Fietzer", "Hylan", "Hydinger", "Illingsworth", "Ingram", "Irwin", "Jagtap", "Jenson", "Johnson", "Johnsen", "Jones", "Jurgenson", "Kalleg", "Kaskel", "Keller", "Leisinger", "LePage", "Lewis", "Linde", "Lulloff", "Maki", "Martin", "McGinnis", "Mills", "Moody", "Moore", "Napier", "Nelson", "Norquist", "Nuttle", "Olson", "Ostrander", "Reamer", "Reardon", "Reyes", "Rice", "Ripka", "Roberts", "Rogers", "Root", "Sandstrom", "Sawyer", "Schlicht", "Schmitt", "Schwager", "Schutz", "Schuster", "Tapia", "Thompson", "Tiernan", "Tisler"];

exports.createTestData = function(request, response) {
  createPerson(response).then(person => {
    addShows(person, response).then(() => {
      response.json(person);
    });
  });
};

function createPerson(response) {
  return new Promise(resolve => {
    const email = createEmail();
    const firstName = createRandomFirstName();
    const lastName = createRandomLastName();

    const personObj = {
      email: email,
      first_name: firstName,
      last_name: lastName,
      user_role: 'user',
      rating_notifications: true
    };

    insertObject('person', personObj)
      .then(() => resolve(personObj))
      .catch(err => errs.throwError(err, 'Insert person', response));
  });
}

function addShows(person, response) {
  return new Promise(resolve => {
    const showPromises = [];
    showPromises.push(addShow(person, 1));

    Promise.all(showPromises)
      .then(() => resolve())
      .catch(err => errs.throwError(err, 'Add person series', response));
  });
}

function addShow(person, show_id) {
  const personSeries = {
    series_id: show_id,
    person_id: person.id,
    tier: 1
  };
  return insertObject('person_series', personSeries);
}

function createEmail() {
  const firstPart = random_string.generate(10);
  return firstPart + '@gmail.com';
}

function createRandomFirstName() {
  return getRandomValueFromArray(firstNames);
}

function createRandomLastName() {
  return getRandomValueFromArray(lastNames);
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomValueFromArray(arr) {
  const randomIndex = getRandomInt(0, arr.length - 1);
  return arr[randomIndex];
}


function insertObject(tableName, object) {
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
