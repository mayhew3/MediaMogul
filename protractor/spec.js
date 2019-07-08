// spec.js
describe('MediaMogul basic tests', () => {
  const baseURL = 'http://localhost:1441';
  const dashboardURL = baseURL + '/tv/shows/my/dashboard';

  const EC = protractor.ExpectedConditions;

  const legionSpec = by.id('show_1');

  function goToShow(id) {
    const spec = by.id('show_' + id);
    const showLink = element(spec);
    expect(showLink).toBeDefined();
    showLink.click();
    browser.sleep(100);
    expect(browser.getCurrentUrl()).toContain('show/' + id + '/episode');
  }

  function getSelectedEpisode() {
    const selectedEpisode = element(by.className('selectedEpisodeTile'));
    expect(selectedEpisode).toBeDefined();
    return selectedEpisode;
  }

  function markWatched() {
    const markWatchedButton = element(by.buttonText('Mark Watched'));
    markWatchedButton.click();
  }

  function markUnwatched() {
    const markUnwatchedButton = element(by.buttonText('Watched'));
    markUnwatchedButton.click();
  }

  beforeAll(() => {
    browser.waitForAngularEnabled(false);
    browser.get(baseURL);
    let signInLink = element(by.id('sign_in'));

    signInLink.isPresent().then(is_displayed => {
      if (is_displayed === false) {
        let signOutLink = element(by.id('sign_out'));
        signOutLink.click();
        browser.sleep(1000);
      }
      signInLink.click();
      browser.sleep(1000);
      expect(browser.getCurrentUrl()).toBe(dashboardURL);
    });

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
    goToShow(1);

    const seriesTitle = element(by.binding('ctrl.series.title'));
    expect(seriesTitle.getText()).toEqual('Legion');
  });

  it('mark watched', () => {
    goToShow(1);

    const selectedEpisodeTile = getSelectedEpisode();
    expect(selectedEpisodeTile.getAttribute('class')).toContain('tile-ready');

    getEpisodeInfo(selectedEpisodeTile).then(episodeInfo => {
      expect(episodeInfo.season).toEqual(1);
      expect(episodeInfo.episode).toEqual(1);

      expectCurrentEpisodeIsUnwatched();
      markWatched();

      waitForElement(by.buttonText('Watched'));

      expectCurrentEpisodeIsWatched();

      waitForElement(by.buttonText('Mark Watched'));

      expectCurrentEpisodeIsUnwatched();

      const firstEpisodeTile = getEpisodeTile(1, 1);
      expect(firstEpisodeTile.getAttribute('class')).toContain('tile-watched');

      const newlySelected = getSelectedEpisode();
      getEpisodeInfo(newlySelected).then(newEpisode => {
        expect(newEpisode.season).toEqual(1);
        expect(newEpisode.episode).toEqual(2);

        expect(newlySelected.getAttribute('class')).toContain('tile-ready');
      });
    });
  });

  it('mark unwatched', () => {
    goToShow(1);

    const firstEpisodeTile = getEpisodeTile(1, 1);
    expect(firstEpisodeTile.getAttribute('class')).toContain('tile-watched');
    firstEpisodeTile.click();

    const selectedEpisodeTile = getSelectedEpisode();
    getEpisodeInfo(selectedEpisodeTile).then(episodeInfo => {
      expect(episodeInfo.season).toEqual(1);
      expect(episodeInfo.episode).toEqual(1);

      expectCurrentEpisodeIsWatched();
      markUnwatched();

      let elementFinder = by.buttonText('Mark Watched');
      waitForElement(elementFinder);
      expectCurrentEpisodeIsUnwatched();

      browser.sleep(800);
      // wait to verify episode is still unwatched.
      expectCurrentEpisodeIsUnwatched();

      expect(firstEpisodeTile.getAttribute('class')).toContain('tile-ready');
    });
  });

  function getEpisodeInfo(episodeTile) {
    return new Promise(resolve => {
      episodeTile.element(by.className('episodeTileNumber')).getText().then(episodeNumber => {

        expect(episodeNumber).toContain('Season');
        expect(episodeNumber).toContain('Episode');

        const splits = episodeNumber.toString().split(' ');
        const currentSeason = parseInt(splits[1]);
        const currentEpisode = parseInt(splits[3]);

        resolve({
          season: currentSeason,
          episode: currentEpisode
        });
      });
    });

  }

  function getEpisodeTile(season, episode) {
    const parent = element(by.id('s' + season + '_e' + episode));
    return parent.element(by.className('episodeTile'));
  }

  function expectElementHasClass(element, className) {
    expect(element.getAttribute('class')).toContain(className);
  }

  function expectCurrentEpisodeIsWatched() {
    let watchedButton = element(by.buttonText('Watched'));
    expectElementHasClass(watchedButton, 'btn-primary');
  }

  function expectCurrentEpisodeIsUnwatched() {
    let markWatchedButton = element(by.buttonText('Mark Watched'));
    expectElementHasClass(markWatchedButton, 'btn-success');
  }

  function waitForElement(elementFinder, optionalTimeout) {
    const timeout = !optionalTimeout ? 2000 : optionalTimeout;
    browser.wait(EC.visibilityOf(element(elementFinder)), timeout);
  }
});
