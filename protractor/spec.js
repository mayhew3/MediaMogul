// spec.js
describe('MediaMogul basic tests', function() {
  it('should have a title', function() {
    browser.get('http://localhost:5000/tv/shows/my/dashboard');

    expect(browser.getTitle()).toEqual('MediaMogul');
  });
});