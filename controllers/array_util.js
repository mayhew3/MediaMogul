const _ = require('underscore');

exports.addToArray = function(originalArray, newArray) {
  originalArray.push.apply(originalArray, newArray);
};

exports.removeFromArray = function(arr, element) {
  var indexOf = arr.indexOf(element);
  if (indexOf < 0) {
    $log.debug("No element found!");
    return;
  }
  arr.splice(indexOf, 1);
};

exports.exists = function(object) {
  return !_.isUndefined(object) && !_.isNull(object);
};
