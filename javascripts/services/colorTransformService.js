angular.module('mediaMogulApp')
  .service('ColorTransformService', [ColorTransformService]);
function ColorTransformService() {
  const self = this;

  self.colorStyle = function(value, maxValue) {
    const scaledValue = value;
    const halfVal = maxValue / 2;

    let hue = (scaledValue <= halfVal) ? scaledValue * 0.5 : (halfVal * 0.5 + (scaledValue - halfVal) * 4.5);
    let saturation = scaledValue === null ? '0%' : '50%';
    return {
      'background-color': 'hsla(' + hue + ', ' + saturation + ', 42%, 1)'
    }
  };


}
