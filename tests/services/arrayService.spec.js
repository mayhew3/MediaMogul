describe('ArrayService', function() {

  let arraySrv;

  beforeEach(module('mediaMogulApp'));

  beforeEach(inject(($log, ArrayService) => {
    arraySrv = ArrayService;
  }));

  it('should exist', function() {
    expect(arraySrv).toBeDefined();
  });

  it('addToArray works', () => {
    const originalArray = [1, 3];
    const addedArray = [2, 4, 3];
    const expectedArray = [1, 3, 2, 4, 3];

    arraySrv.addToArray(originalArray, addedArray);

    expect(originalArray).toEqual(expectedArray);
  });

  it('refreshArray works', () => {
    const originalArray = [1, 3];
    const addedArray = [2, 4, 3];
    const expectedArray = [2, 4, 3];

    arraySrv.refreshArray(originalArray, addedArray);

    expect(originalArray).toEqual(expectedArray);
  });

  it('emptyArray works', () => {
    const originalArray = [1, 3];
    const expectedArray = [];

    arraySrv.emptyArray(originalArray);

    expect(originalArray).toEqual(expectedArray);
  });

  it('removeFromArray works', () => {
    const originalArray = [1, 3, 4];
    const expectedArray = [1, 4];

    arraySrv.removeFromArray(originalArray, 3);

    expect(originalArray).toEqual(expectedArray);
  });

  it('exists works', () => {
    expect(arraySrv.exists(undefined)).toBeFalse();
    expect(arraySrv.exists(false)).toBeTrue();
    expect(arraySrv.exists(null)).toBeFalse();
    expect(arraySrv.exists(0)).toBeTrue();
  });


});
