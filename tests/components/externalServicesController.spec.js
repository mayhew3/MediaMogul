describe('ExternalServicesController', function() {

  let $controller;

  beforeEach(module('mediaMogulApp'));

  beforeEach(
    module(function($provide) {
      $provide.service('LockService', function() {
      });
    })
  );

  beforeEach(
    module(function($provide) {
      $provide.service('ExternalServiceService', function() {
        this.needsWarning = jasmine.createSpy('needsWarning').andCallFake(() => false);
      });
    })
  );

  beforeEach(inject(function(_$controller_) {
    $controller = _$controller_;
  }));


  it('should exist', function() {
    expect($controller).toBeDefined();
  });


});
