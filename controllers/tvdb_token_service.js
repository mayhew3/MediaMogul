const _ = require('underscore');
const axios = require('axios');
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
      data: {
        'apikey': apiKey
      },
      json: true
    };

    axios(options).then(tvdb_response => {
      if (tvdb_response.status !== 200) {
        reject("Bad status code: " + tvdb_response.status);
      } else {
        token = tvdb_response.data.token;
        resolve(token);
      }
    }).catch(error => {
      reject(error);
    });
  });
}
getToken();
