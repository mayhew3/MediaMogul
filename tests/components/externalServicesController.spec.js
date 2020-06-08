describe('ExternalServicesController', function() {

  let $controller, LockService, ExternalServicesService, ExternalServicesController;

  beforeEach(module('mediaMogulApp'));

  beforeEach(inject(function(_$controller_, _$log_, _LockService_, _ExternalServicesService_) {
    $controller = _$controller_;
    LockService = _LockService_;
    ExternalServicesService = _ExternalServicesService_;

    ExternalServicesController = $controller('externalServicesController',
      {
        $log: _$log_,
        LockService: LockService,
        ExternalServicesService: ExternalServicesService
      });
  }));

  function overrideNeedsWarning(needsWarning) {
    spyOn(ExternalServicesService, 'needsWarning').and.callFake(() => needsWarning);
  }

  it('should exist', function() {
    expect(ExternalServicesController).toBeDefined();
  });

  it('row class no warning', () => {
    overrideNeedsWarning(false);
    expect(ExternalServicesController.getRowClass({})).toEqual('');
  });

  it('row class with warning', () => {
    overrideNeedsWarning(true);
    expect(ExternalServicesController.getRowClass({})).toEqual('danger');
  });

});
