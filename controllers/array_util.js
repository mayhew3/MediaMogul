
exports.addToArray = function(originalArray, newArray) {
  originalArray.push.apply(originalArray, newArray);
};
