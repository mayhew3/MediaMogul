const _ = require('underscore');

exports.addToArray = function(originalArray, newArray) {
  originalArray.push.apply(originalArray, newArray);
};

exports.exists = function(object) {
  return !_.isUndefined(object) && !_.isNull(object);
};