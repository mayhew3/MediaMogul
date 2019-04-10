angular.module('mediaMogulApp')
  .service('ArrayService', ['$log', ArrayService]);
function ArrayService($log) {
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

  self.removeFromArray = function(arr, element) {
    const indexOf = arr.indexOf(element);
    if (indexOf < 0) {
      $log.debug("No element found!");
      return;
    }
    arr.splice(indexOf, 1);
  };

  function formatDate(unformattedDate) {
    let originalDate = (unformattedDate === '' || unformattedDate === null) ? null :
      new Date(unformattedDate);
    if (originalDate !== null) {
      originalDate.setHours(0, 0, 0, 0);
    }
    return originalDate;
  }

  function dateHasChanged(originalDate, updatedDate) {
    if (updatedDate === null && originalDate === null) {
      return false;
    } else if (updatedDate === null) {
      return true;
    } else if (originalDate === null) {
      return true;
    } else {
      return formatDate(updatedDate).getTime() !== formatDate(originalDate).getTime();
    }
  }

  self.getChangedFields = function(originalObject, updatedObject) {
    let allKeys = _.keys(updatedObject);
    let changedFields = {};
    allKeys.forEach(function(itsaIndex) {
      if (updatedObject.hasOwnProperty(itsaIndex)) {
        let updatedValue = updatedObject[itsaIndex];

        let originalValue = originalObject[itsaIndex];

        if (updatedValue instanceof Date || originalValue instanceof Date) {
          if (dateHasChanged(originalValue, updatedValue)) {
            changedFields[itsaIndex] = updatedValue;
          }

        } else if (updatedValue !== originalValue) {
          changedFields[itsaIndex] = updatedValue;
        }
      }
    });

    return changedFields;
  };


}
