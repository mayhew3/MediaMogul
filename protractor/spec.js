// spec.js
describe('MediaMogul basic tests', () => {
  const baseURL = 'http://localhost:1441';
  const dashboardURL = baseURL + '/tv/shows/my/dashboard';

  const legionSpec = by.id('show_1');

  beforeAll(() => {
    browser.waitForAngularEnabled(false);
    browser.get(baseURL);
    let signInLink = element(by.id('sign_in'));

    if (signInLink.isPresent() === true) {
      signInLink.click();

      const loginButtonExists = by.buttonText('Log in with Google');
      browser.wait(() => browser.isElementPresent(loginButtonExists), 5000).then(() => {
        const loginButton = element(loginButtonExists);
        browser.sleep(4000);
        loginButton.click();
        browser.sleep(2000);
        expect(browser.getCurrentUrl()).toBe(dashboardURL);
      });
    } else {
      browser.get(dashboardURL);
    }
  });

  beforeEach(() => {
    browser.get(dashboardURL);
    expect(browser.getTitle()).toEqual('MediaMogul');
  });

  it('should have legion in its shows', () => {
    const legionShow = element(legionSpec);
    expect(legionShow).toBeDefined();
  });

  it('click legion takes you to detail page', () => {
    const legionShow = element(legionSpec);
    legionShow.click();
    expect(browser.getCurrentUrl()).toContain('show/1/episode');

    const seriesTitle = element(by.binding('ctrl.series.title'));
    expect(seriesTitle.getText()).toEqual('Legion');
  });

});
