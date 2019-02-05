angular.module('mediaMogulApp')
  .controller('myGroupSeriesDetailController', ['$log', 'EpisodeService', '$uibModalInstance', 'series', 'group',
    '$uibModal', '$filter', 'LockService', '$http', '$timeout', 'ArrayService',
  function($log, EpisodeService, $uibModalInstance, series, group, $uibModal, $filter, LockService, $http, $timeout, ArrayService) {
    var self = this;

    self.LockService = LockService;

    self.series = series;
    self.group = group;

    // TEMP: Use to view a bunch of fields to help debug filters.
    self.debugOn = false;

    self.episodes = [];

    self.seasonLabels = [];
    self.selectedSeason = null;

    self.firstUnwatchedNumber = null;

    self.updateEpisodes = function() {
      $http.get('/api/groupEpisodes', {params: {series_id: series.id, tv_group_id: self.group.id}}).then(function(result) {
        ArrayService.refreshArray(self.episodes, result.data);
        updateSeasonLabels();
        $timeout(function() {
          console.log('Delay finished! Populating tooltips!');
          self.refreshTooltips();
        }, 100);

      });
    };
    self.updateEpisodes();

    self.shouldHide = function(episode) {
      // todo: remove when MM-236 is resolved.
      return episode.air_time === null;
    };

    function isUnwatchedEpisode(episode) {
      return episode.season !== null && episode.season > 0 &&
        episode.watched === false &&
        episode.skipped === false &&
        !self.shouldHide(episode);
    }

    function updateNextUp() {

      self.episodes.forEach(function(episode) {
        episode.nextUp = false;
      });

      var unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      if (unwatchedEpisodes.length > 0) {
        var firstUnwatched = unwatchedEpisodes[0];
        self.firstUnwatchedNumber = firstUnwatched.absolute_number;
        if (!firstUnwatched.unaired) {
          firstUnwatched.nextUp = true;
        }
      }
    }

    self.rowClass = function(episode) {
      if (episode.nextUp) {
        return "nextUpRow";
      } else if (episode.unaired) {
        return "unairedRow";
      } else if (episode.skipped) {
        return "skippedRow"
      } else if (isUnwatchedEpisode(episode)) {
        return "unwatchedRow";
      }

      return "";
    };

    // BALLOT HELPERS

    function getBallotForShow() {
      return _.findWhere(self.series.ballots, {voting_closed: null});
    }

    self.getOutstandingVoteCount = function() {
      const ballot = getBallotForShow();
      return ArrayService.exists(ballot) ?
        group.members.length - ballot.votes.length :
        0;
    };

    self.hasOpenBallot = function() {
      return ArrayService.exists(getBallotForShow());
    };

    function updateSeasonLabels() {
      self.episodes.forEach(function (episode) {
        var season = episode.season;
        if (season !== null && !(self.seasonLabels.indexOf(season) > -1) && !self.shouldHide(episode)) {
          self.seasonLabels.push(season);
        }
        if (isUnaired(episode)) {
          episode.unaired = true;
        }

        episode.imageResolved = episode.tvdb_filename ?
          'https://thetvdb.com/banners/' + episode.tvdb_filename :
          'images/GenericEpisode.gif';
      });

      var unwatchedEpisodes = self.episodes.filter(function (episode) {
        return isUnwatchedEpisode(episode);
      });

      $log.debug("Unwatched: " + unwatchedEpisodes.length);

      if (unwatchedEpisodes.length > 0) {
        var firstUnwatched = unwatchedEpisodes[0];
        self.selectedSeason = firstUnwatched.season;
        self.firstUnwatchedNumber = firstUnwatched.absolute_number;
        if (!firstUnwatched.unaired) {
          firstUnwatched.nextUp = true;
        }
      } else {
        var allEpisodes = self.episodes.filter(function (episode) {
          return episode.season !== null && episode.season > 0 &&
                  !self.shouldHide(episode);
        });

        if (allEpisodes.length > 0) {
          self.selectedSeason = allEpisodes[0].season;
        } else {
          self.selectedSeason = 0;
        }
      }
    }

    /* TOOLTIPS */

    self.getPersonWatchedLabel = function(episode) {
      const watchers = getWatchersWhoArentMe(episode);
      return watchers.length;
    };

    self.getTooltipText = function(episode) {
      if (!hasSomeWatchersWhoArentMe(episode) || isClosed(episode)) {
        return '';
      }

      let texts = [];
      getWatchersWhoArentMe(episode).forEach(function(person_id) {
        texts.push(getPersonNameFromId(person_id));
      });
      return texts.join('<br>');
    };

    function getPersonNameFromId(person_id) {
      let foundPerson = _.find(group.members, function(person) {
        return person_id === person.person_id;
      });
      return _.isUndefined(foundPerson) ? null : foundPerson.first_name;
    }

    function showAnyLabels(episode) {
      return !isClosed(episode);
    }

    self.showMeLabel = function(episode) {
      return showAnyLabels(episode) && meWatcher(episode);
    };

    self.showSomeLabel = function(episode) {
      return showAnyLabels(episode) && hasSomeWatchersWhoArentMe(episode);
    };

    self.showAllLabel = function(episode) {
      return showAnyLabels(episode) && hasAllWatchers(episode);
    };

    self.refreshTooltips = function() {
      $('.personsTooltip').tooltip({
        placement: 'left',
        html: true,
        animation: false
      });
    };

    function hasAllWatchers(episode) {
      const person_ids = episode.person_ids;
      return !_.isUndefined(person_ids) && (person_ids.length === self.group.members.length);
    }

    function getWatchersWhoArentMe(episode) {
      const person_ids = episode.person_ids;
      return _.without(person_ids, self.LockService.person_id);
    }

    function hasSomeWatchersWhoArentMe(episode) {
      return !hasAllWatchers(episode) && getWatchersWhoArentMe(episode).length > 0;
    }

    function meWatcher(episode) {
      return _.contains(episode.person_ids, self.LockService.person_id);
    }

    function isClosed(episode) {
      return episode.watched || episode.skipped;
    }

    self.getTooltipClass = function(episode) {
      return !hasSomeWatchersWhoArentMe(episode) || isClosed(episode) ?
        '' : 'personsTooltip';
    };


    self.getLabelInfo = function(episode) {
      if (episode.on_tivo) {
        if (episode.tivo_deleted_date) {
          return {labelClass: "label label-default", labelText: "Deleted"};
        } else if (episode.tivo_suggestion === true) {
          return {labelClass: "label label-warning", labelText: "Suggestion"};
        } else {
          return {labelClass: "label label-info", labelText: "Recorded"};
        }
      } else if (episode.streaming) {
        if (isUnaired(episode)) {
          return {labelClass: "label label-danger", labelText: "Unaired"};
        } else {
          return {labelClass: "label label-success", labelText: "Streaming"};
        }
      } else {
        if (isUnaired(episode)) {
          return {labelClass: "label label-danger", labelText: "Unaired"};
        }
        return null;
      }
    };

    self.getWatchedDateOrWatched = function(episode) {
      // $log.debug("In getWatchedDateOrWatched. WatchedDate: " + episode.watched_date);
      if (episode.watched_date === null) {
        if (episode.watched) {
          return "Watched";
        } else if (episode.skipped) {
          return "Skipped";
        } else {
          return "";
        }
      } else {
        return $filter('date')(episode.watched_date, self.getDateFormat(episode.watched_date), 'America/Los_Angeles');
      }
    };

    function isUnaired(episode) {
      // unaired if the air time is after now.

      var isNull = episode.air_time === null;
      var diff = (new Date(episode.air_time) - new Date);
      var hasSufficientDiff = (diff > 0);

      return isNull || hasSufficientDiff;
    }

    self.episodeFilter = function(episode) {
      return episode.season === self.selectedSeason && !self.shouldHide(episode);
    };


    self.getSeasonButtonClass = function(season) {
      return self.selectedSeason === season ? "btn btn-success" : "btn btn-primary";
    };

    self.getDateFormat = function(date) {
      var thisYear = (new Date).getFullYear();

      if (date !== null) {
        var year = new Date(date).getFullYear();

        if (year === thisYear) {
          return 'EEE M/d';
        } else {
          return 'yyyy.M.d';
        }
      }
      return 'yyyy.M.d';
    };

    function markAllPreviousWatched(lastWatchedNumber, episodeFields) {
      self.episodes.forEach(function(episode) {
        if (episode.absolute_number < lastWatchedNumber) {
          if (!episode.watched && !episode.skipped) {
            episode.watched = episodeFields.watched;
            episode.watched_date = null;
            episode.skipped = episodeFields.skipped;
            episode.skip_reason = episodeFields.skip_reason;
          }
        }
      });
    }

    function getPreviousEpisodes(episode) {
      var allEarlierEpisodes = self.episodes.filter(function (otherEpisode) {
        return  otherEpisode.air_date !== null &&
                otherEpisode.season !== 0 &&
                ((otherEpisode.season < episode.season) ||
                (otherEpisode.season === episode.season &&
                otherEpisode.episode_number < episode.episode_number));
      });

      var earlierSorted = allEarlierEpisodes.sort(function(e1, e2) {
        if (e1.season === e2.season) {
          return e2.episode_number - e1.episode_number;
        } else {
          return e2.season - e1.season;
        }
      });


      if (earlierSorted.length < 5) {
        return earlierSorted;
      }

      return [
        earlierSorted[0],
        earlierSorted[1],
        earlierSorted[2],
        earlierSorted[3]
      ];

    }

    self.colorStyle = function(scaledValue) {
      var hue = (scaledValue <= 50) ? scaledValue * 0.5 : (50 * 0.5 + (scaledValue - 50) * 4.5);
      var saturation = scaledValue === null ? '0%' : '50%';
      return {
        'background-color': 'hsla(' + hue + ', ' + saturation + ', 42%, 1)',
        'font-size': '1.6em',
        'text-align': 'center',
        'font-weight': '800',
        'color': 'white'
      }
    };

    self.openEpisodeDetail = function(episode) {
      $uibModal.open({
        templateUrl: 'views/tv/groups/episodeDetail.html',
        controller: 'myGroupEpisodeDetailController as ctrl',
        size: 'lg',
        resolve: {
          episode: function() {
            return episode;
          },
          group: function() {
            return self.group;
          },
          previousEpisodes: function() {
            return getPreviousEpisodes(episode);
          },
          series: function() {
            return self.series;
          },
          allPastWatchedCallback: function() {
            return markAllPreviousWatched;
          },
          firstUnwatched: function() {
            return episode.absolute_number === self.firstUnwatchedNumber;
          }
        }
      }).result.finally(function() {
        EpisodeService.updateMySeriesDenorms(self.series, self.episodes, doNothing);
        updateNextUp();
      });
    };

    function doNothing() {
      return new Promise(function(resolve) {
        return resolve();
      });
    }

    function addBallot(ballot) {
      if (!_.isArray(self.series.ballots)) {
        self.series.ballots = [ballot];
      } else {
        self.series.ballots.push(ballot);
      }
    }

    self.addBallot = function() {
      if (self.LockService.isAdmin()) {
        $uibModal.open({
          templateUrl: 'views/tv/groups/addBallot.html',
          controller: 'addBallotController',
          controllerAs: 'ctrl',
          size: 'lg',
          resolve: {
            series: function () {
              return self.series;
            },
            addBallotCallback: function() {
              return addBallot;
            }
          }
        });
      }
    };

    self.openEditSeries = function() {
      $uibModal.open({
        templateUrl: 'views/tv/editSeries.html',
        controller: 'editSeriesController',
        controllerAs: 'ctrl',
        size: 'lg',
        resolve: {
          series: function() {
            return self.series;
          }, episodes: function() {
            return self.episodes;
          }
        }
      })
    };

    self.openChangePoster = function () {
      if (LockService.isAdmin()) {
        $uibModal.open({
          templateUrl: 'views/tv/shows/changePoster.html',
          controller: 'changePosterController',
          controllerAs: 'ctrl',
          size: 'lg',
          resolve: {
            series: function () {
              return self.series;
            }
          }
        });
      }
    };

    self.ok = function() {
      $uibModalInstance.close();
    };
  }]);