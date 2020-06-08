describe('ArrayService', function() {

  let ArrayService;

  beforeEach(module('mediaMogulApp'));

  beforeEach(inject(($log, _ArrayService_) => {
    ArrayService = _ArrayService_;
  }));

  it('should exist', function() {
    expect(ArrayService).toBeDefined();
  });

  it('addToArray works', () => {
    const originalArray = [1, 3];
    const addedArray = [2, 4, 3];
    const expectedArray = [1, 3, 2, 4, 3];

    ArrayService.addToArray(originalArray, addedArray);

    expect(originalArray).toEqual(expectedArray);
  });

  it('refreshArray works', () => {
    const originalArray = [1, 3];
    const addedArray = [2, 4, 3];
    const expectedArray = [2, 4, 3];

    ArrayService.refreshArray(originalArray, addedArray);

    expect(originalArray).toEqual(expectedArray);
  });

  it('emptyArray works', () => {
    const originalArray = [1, 3];
    const expectedArray = [];

    ArrayService.emptyArray(originalArray);

    expect(originalArray).toEqual(expectedArray);
  });

  it('removeFromArray works', () => {
    const originalArray = [1, 3, 4];
    const expectedArray = [1, 4];

    ArrayService.removeFromArray(originalArray, 3);

    expect(originalArray).toEqual(expectedArray);
  });

  it('exists works', () => {
    expect(ArrayService.exists(undefined)).toBeFalse();
    expect(ArrayService.exists(false)).toBeTrue();
    expect(ArrayService.exists(null)).toBeFalse();
    expect(ArrayService.exists(0)).toBeTrue();
  });


});
