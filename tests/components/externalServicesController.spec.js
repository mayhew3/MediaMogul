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

  it('timeAgo with undefined', () => {
    expect(ExternalServicesController.timeAgo(undefined)).toEqual('');
  });

  it('timeAgo with earlier date', () => {
    const dateObj = moment().subtract(3, 'days').toDate();
    expect(ExternalServicesController.timeAgo(dateObj)).toEqual('3 days ago');
  });

  it('getLastConnect with undefined', () => {
    const serviceObj = {
      last_connect: undefined,
      last_failure: undefined
    };
    expect(ExternalServicesController.getLastConnect(serviceObj)).toEqual('never');
  });

  it('getLastConnect with real date', () => {
    const serviceObj = {
      last_connect: moment().subtract(3, 'days').toDate(),
      last_failure: undefined
    };
    expect(ExternalServicesController.getLastConnect(serviceObj)).toEqual('3 days ago');
  });

  it('getLastFailure with undefined', () => {
    const serviceObj = {
      last_connect: undefined,
      last_failure: undefined
    };
    expect(ExternalServicesController.getLastFailure(serviceObj)).toEqual('');
  });

  it('getLastFailure with real date and no connect date', () => {
    const serviceObj = {
      last_connect: undefined,
      last_failure: moment().subtract(3, 'days').toDate()
    };
    expect(ExternalServicesController.getLastFailure(serviceObj)).toEqual('3 days ago');
  });

  it('getLastFailure with real date and later connect date', () => {
    const serviceObj = {
      last_connect: moment().subtract(2, 'days').toDate(),
      last_failure: moment().subtract(3, 'days').toDate()
    };
    expect(ExternalServicesController.getLastFailure(serviceObj)).toEqual('');
  });

  it('getLastFailure with real date and earlier connect date', () => {
    const serviceObj = {
      last_connect: moment().subtract(4, 'days').toDate(),
      last_failure: moment().subtract(3, 'days').toDate()
    };
    expect(ExternalServicesController.getLastFailure(serviceObj)).toEqual('3 days ago');
  });

});
