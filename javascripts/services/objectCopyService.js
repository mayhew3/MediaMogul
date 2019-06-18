angular.module('mediaMogulApp')
  .service('ObjectCopyService', [ObjectCopyService]);
function ObjectCopyService() {
  const self = this;

  self.shallowCopy = function(sourceObj, destinationObj) {
    for (let propertyName in sourceObj) {
      if (sourceObj.hasOwnProperty(propertyName)) {
        const originalProp = sourceObj[propertyName];
        if (!_.isArray(originalProp)) {
          destinationObj[propertyName] = originalProp;
        }
      }
    }
  }
}
