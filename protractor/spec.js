const _ = require('underscore');

// spec.js
describe('MediaMogul basic tests', () => {
  const baseURL = 'http://localhost:1441';
  const dashboardURL = baseURL + '/tv/shows/my/dashboard';

  const EC = protractor.ExpectedConditions;

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
    const legionSpec = by.id('show_1');
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
      toggleMarkWatchedButton();

      waitForWatch();
      expectCurrentEpisodeIsWatched();

      waitForUnwatch();
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
      toggleMarkWatchedButton();

      waitForUnwatch();
      expectCurrentEpisodeIsUnwatched();

      browser.sleep(800);
      // wait to verify episode is still unwatched.
      expectCurrentEpisodeIsUnwatched();

      expect(firstEpisodeTile.getAttribute('class')).toContain('tile-ready');
    });
  });

  it('mark multiple watched', () => {
    goToShow(1);

    const firstEpisodeTile = getEpisodeTile(1, 5);

    getPreviousUnwatchedTilesOnPage(1, 5).then(previousUnwatched => {
      const previousUnwatchedCount = previousUnwatched.length;

      expect(firstEpisodeTile.getAttribute('class')).toContain('tile-ready');
      firstEpisodeTile.click();

      expectCurrentEpisodeIsUnwatched(previousUnwatchedCount);
      let markWatchedButton = getMarkWatchedButton();
      expect(markWatchedButton.getText()).toContain('Mark ' + previousUnwatchedCount + ' Watched');

      toggleMarkWatchedButton();

      waitForWatch();

      expectCurrentEpisodeIsWatched();

      waitForUnwatch();

      expectCurrentEpisodeIsUnwatched();

      expectCurrentEpisodeToBe(1, 6);
    });

  });

  it('mark unwatched episode that was multi-watched', () => {

  });

  // HELPER METHODS

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
          episode: currentEpisode,
          episodeTile: episodeTile
        });
      });
    });

  }

  function getEpisodeTile(season, episode) {
    const parent = element(by.id('s' + season + '_e' + episode));
    return parent.element(by.className('episodeTile'));
  }

  function getPreviousUnwatchedTilesOnPage(season, episode) {
    return new Promise(resolve => {
      element.all(by.className('tile-ready')).then(unwatched => {
        const infoPromises = _.map(unwatched, tile => {
          return getEpisodeInfo(tile);
        });
        Promise.all(infoPromises).then(infos => {
          const earlierEps = _.filter(infos, info => {
            return info.season === season && info.episode <= episode;
          });

          resolve(earlierEps);
        });
      });
    });
  }

  function expectElementHasClass(element, className) {
    expect(element.getAttribute('class')).toContain(className);
  }

  function getMarkWatchedButton() {
    return element(by.id('mark_watched'));
  }

  function expectCurrentEpisodeIsWatched() {
    let markWatchedButton = getMarkWatchedButton();
    expect(markWatchedButton.getText()).toEqual('Watched');
    expectElementHasClass(markWatchedButton, 'btn-primary');
  }

  function expectCurrentEpisodeIsUnwatched(previousUnwatched) {
    const expectedText = !previousUnwatched ? 'Mark Watched' : 'Mark ' + previousUnwatched + ' Watched';
    let markWatchedButton = getMarkWatchedButton();
    expect(markWatchedButton.getText()).toEqual(expectedText);
    expectElementHasClass(markWatchedButton, 'btn-success');
  }

  function waitForElementToContainText(element, text, optionalTimeout) {
    const timeout = !optionalTimeout ? 2000 : optionalTimeout;
    browser.wait(EC.textToBePresentInElement(element, text), timeout);
  }

  function waitForElementToNotContainText(element, text, optionalTimeout) {
    const timeout = !optionalTimeout ? 2000 : optionalTimeout;
    browser.wait(EC.not(EC.textToBePresentInElement(element, text), timeout));
  }

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

  function toggleMarkWatchedButton() {
    getMarkWatchedButton().click();
  }

  function waitForWatch() {
    waitForElementToNotContainText(getMarkWatchedButton(), 'Mark');
    expect(getMarkWatchedButton().getText()).toContain('Watched')
  }

  function waitForUnwatch() {
    waitForElementToContainText(getMarkWatchedButton(), 'Mark Watched');
  }

  function expectCurrentEpisodeToBe(season, episode) {
    let selectedEpisode = getSelectedEpisode();
    getEpisodeInfo(selectedEpisode).then(newEpisode => {
      expect(newEpisode.season).toEqual(season);
      expect(newEpisode.episode).toEqual(episode);
    });
  }

});
