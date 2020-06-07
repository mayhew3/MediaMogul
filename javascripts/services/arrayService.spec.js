describe('ArrayService', function() {

  let arraySrv;

  beforeEach(function() {
    module(function($provide) {
      $provide.provider('lockProvider', function() {
        this.$get = function() {
          return undefined;
        }
      });
    });

    module('mediaMogulApp');
  });

  beforeEach(inject(function($log, $injector) {
    arraySrv = $injector.get('ArrayService');
  }));

  it('should exist', function() {
    expect(arraySrv).toBeDefined();
  });

});
