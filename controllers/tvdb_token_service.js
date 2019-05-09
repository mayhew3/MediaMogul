const _ = require('underscore');
const requestLib = require('request');
let token = null;

exports.maybeRefreshToken = function() {
  if (token === null) {
    return getToken();
  } else {
    return new Promise(function(resolve) {
      resolve(token);
    });
  }
};

exports.getBaseOptions = function() {
  return new Promise(resolve => {
    exports.maybeRefreshToken().then(token => {
      resolve({
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + token,
          'Accept-Language': 'en'
        },
        json: true
      });
    });
  });
};

function getToken() {
  return new Promise(function(resolve, reject) {
    // noinspection JSUnresolvedVariable
    const apiKey = process.env.TVDB_API_KEY;
    if (_.isUndefined(apiKey)) {
      console.error("No TVDB_API_KEY variable found!");
      reject(new Error("No TVDB_API_KEY variable found!"));
    }

    const urlString = 'https://api.thetvdb.com/login';

    // noinspection SpellCheckingInspection
    const options = {
      url: urlString,
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        'apikey': apiKey
      },
      json: true
    };

    requestLib(options, function(error, response, body) {
      if (error) {
        response.send("Error getting TVDB token: " + error);
        reject(error);
      } else if (response.statusCode !== 200) {
        response.send("Unexpected status code from TVDB API: " + response.statusCode);
        reject("Bad status code: " + response.statusCode);
      } else {
        token = body.token;
        resolve(token);
      }
    });
  });
}
getToken();
