angular.module('mediaMogulApp')
  .service('ArrayService', [ArrayService]);
function ArrayService() {
  const self = this;

  self.addToArray = function(originalArray, newArray) {
    originalArray.push.apply(originalArray, newArray);
  };

  self.refreshArray = function(originalArray, newArray) {
    originalArray.length = 0;
    self.addToArray(originalArray, newArray);
  };

  self.exists = function(object) {
    return !_.isUndefined(object) && !_.isNull(object);
  };


}