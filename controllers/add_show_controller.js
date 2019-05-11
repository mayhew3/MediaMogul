const db = require('postgres-mmethods');
const requestLib = require('request');
const _ = require('underscore');
const ArrayService = require('./array_util');
const tokens = require('./tvdb_token_service');
const fast_sort = require('fast-sort');
const moment = require('moment');
const person_controller = require('./person_controller');
const sockets = require('./sockets_controller');

/* GET POSSIBLE MATCHES */

exports.getTVDBMatches = function(request, response) {
  const series_name = request.query.series_name;
  console.log("Finding TVDB matches for series: " + series_name);

  tokens.getBaseOptions().then(function (options) {

    const formatted_name = series_name
      .toLowerCase()
      .replace(/ /g, '_')
      .replace(/[^\w-]+/g, '');

    const seriesUrl = 'https://api.thetvdb.com/search/series';

    const optionsCopy = {
      qs: {
        'name': formatted_name
      }
    };
    ArrayService.shallowCopy(options, optionsCopy);

    requestLib(seriesUrl, optionsCopy, function (error, tvdb_response, body) {
      if (error) {
        console.log("Error getting TVDB data: " + error);
        response.send("Error getting TVDB data: " + error);
      } else if (tvdb_response.statusCode !== 200) {
        console.log("Unexpected status code from TVDB API: " + tvdb_response.statusCode + ", " + tvdb_response.statusText);
        response.json([]);
      } else {
        const seriesData = body.data;
        const prunedData = _.map(seriesData, function(seriesObj) {
          // noinspection JSUnresolvedVariable
          return {
            title: seriesObj.seriesName,
            tvdb_series_ext_id: seriesObj.id,
            poster: null,
            first_aired: seriesObj.firstAired,
            network: seriesObj.network,
            overview: seriesObj.overview,
            status: seriesObj.status
          };
        });

        let posterUpdates = [];
        prunedData.forEach(function(prunedSeries) {
          posterUpdates.push(getTopPoster(prunedSeries, options));
        });

        Promise.all(posterUpdates).then(function() {
          response.json(prunedData);
        }).catch(function(error) {
          console.log("Error on poster retrieval: " + error);
        });
      }
    });
  });

};

function urlExists(url) {
  return new Promise(resolve => {
    requestLib(url, function(error, response) {
      resolve(!!response && response.statusCode < 400);
    });
  });
}

function tryPoster(posters, index, resolve, reject) {
  const currPoster = posters[index];
  const posterFileName = currPoster.fileName;
  urlExists('https://thetvdb.com/banners/' + posterFileName).then(exists => {
    if (!!exists) {
      resolve(posters[index]);
    } else if (index < posters.length - 1) {
      console.log("Failed to find poster: " + posterFileName);
      tryPoster(posters, index+1, resolve, reject);
    } else {
      console.error("Failed to find ANY posters! Returning final failing image in the list.");
      reject();
    }
  });
}

function findFirstWorkingPoster(posters) {
  return new Promise((resolve, reject) => {
    tryPoster(posters, 0, resolve, reject);
  });
}

function getTopPoster(seriesObj, options) {
  return new Promise(function(resolve) {
    const posterUrl = 'https://api.thetvdb.com/series/' + seriesObj.tvdb_series_ext_id + '/images/query';

    const optionsCopy = {
      qs: {
        'keyType': 'poster'
      }
    };
    ArrayService.shallowCopy(options, optionsCopy);

    requestLib(posterUrl, optionsCopy, function (error, tvdb_response, body) {
      if (error) {
        resolve();
      } else if (tvdb_response.statusCode !== 200) {
        resolve();
      } else {
        const posterData = body.data;
        if (posterData.length === 0) {
          resolve();
        } else {
          findFirstWorkingPoster(posterData)
            .then(poster => {
              seriesObj.poster = poster.fileName;
              resolve();
            })
            .catch(() => {
              seriesObj.poster = _.last(posterData).fileName;
              resolve();
            });
        }
      }
    });
  });
}


/* START EPISODE FETCH */

exports.beginEpisodeFetch = function(request, response) {
  const tvdbSeriesExtId = request.body.series.tvdb_series_ext_id;
  const personId = request.body.series.person_id;
  const selectedPoster = request.body.series.poster;

  try {

    tokens.getBaseOptions().then(function (options) {

      response.json({msg: 'Fetch started.'});

      const seriesUrl = 'https://api.thetvdb.com/series/' + tvdbSeriesExtId;

      requestLib(seriesUrl, options, function (error, tvdb_response, body) {
        if (error) {
          throwFetchEpisodesError(error,
            "Error getting TVDB series.",
            'Error getting TVDB Data. ',
            personId);
        } else if (tvdb_response.statusCode !== 200) {
          throwFetchEpisodesError(new Error("Unexpected status code from TVDB API: " + tvdb_response.statusCode),
            "Error fetching series data from TVDB: " + tvdb_response.statusText,
            'Error fetching series from TVDB',
            personId);
        } else {
          const tvdbSeriesObj = body.data;

          // noinspection JSUnresolvedVariable
          const tvdbSeries = {
            name: tvdbSeriesObj.seriesName,
            tvdb_series_ext_id: tvdbSeriesExtId,
            airs_day_of_week: tvdbSeriesObj.airsDayOfWeek,
            airs_time: tvdbSeriesObj.airsTime,
            first_aired: tvdbSeriesObj.firstAired,
            network: tvdbSeriesObj.network,
            overview: tvdbSeriesObj.overview,
            rating: tvdbSeriesObj.siteRating,
            rating_count: tvdbSeriesObj.siteRatingCount,
            runtime: tvdbSeriesObj.runtime,
            status: tvdbSeriesObj.status,
            banner: tvdbSeriesObj.banner,
            api_version: 2,
            last_updated: tvdbSeriesObj.lastUpdated,
            imdb_id: tvdbSeriesObj.imdbId,
            zap2it_id: tvdbSeriesObj.zap2itId,
            date_added: new Date,
            last_poster: selectedPoster
          };

          insertTVDBSeries(tvdbSeries).then(() => {
            updatePosters(tvdbSeries, tvdbSeriesObj, personId, selectedPoster).then(() => {
              updateNewSeries(tvdbSeries, tvdbSeriesObj, personId);
            }).catch(() => console.error('Skipping execution of rest of series due to fatal poster error.'));
          }).catch(err => throwFetchEpisodesError(err,
            'insert tvdb_series',
            'Internal Database Error',
            personId));

        }
      });
    });

  } catch (err) {
    console.error(err.message, err.stack);
  }

};

function updatePosters(tvdbSeries, tvdbSeriesObj, personId) {
  return new Promise((resolve, reject) => {
    tokens.getBaseOptions().then(options => {
      const postersUrl = "https://api.thetvdb.com/series/" + tvdbSeries.tvdb_series_ext_id + "/images/query";

      options.qs = {
        'keyType': 'poster'
      };

      requestLib(postersUrl, options, function (error, tvdb_response, body) {
        if (error) {
          throwFetchEpisodesError(error,
            "Error getting TVDB posters.",
            'Error getting TVDB Data.',
            personId);
          reject();
        } else if (tvdb_response.statusCode !== 200) {
          if (!!body && body.Error === "No results for your query") {
            console.log("No posters found for series '" + tvdbSeries.name + "'. Continuing with empty poster array.");
            resolve();
          } else {
            throwFetchEpisodesError(new Error("Unexpected status code from TVDB API: " + tvdb_response.statusCode),
              "Error fetching poster data from TVDB: " + tvdb_response.statusText,
              'Error fetching poster data from TVDB',
              personId);
            reject();
          }
        } else {
          const posterData = body.data;
          if (posterData.length > 0) {
            _.each(posterData, posterObj => addPoster(tvdbSeries.id, posterObj.fileName)
              .catch(err => throwFetchEpisodesError(err,
                'Add poster',
                'Internal Database Error',
                personId)));
          }
          resolve();
        }
      });
    })
  });
}

function updateNewSeries(tvdbSeries, tvdbSeriesObj, personId) {
  const series = {
    air_time: tvdbSeries.airs_time,
    poster: tvdbSeries.last_poster,
    person_id: personId,
    title: tvdbSeries.name,
    date_added: new Date,
    tvdb_new: true,
    metacritic_new: true,
    tvdb_match_status: 'Match Confirmed',
    tvdb_series_ext_id: tvdbSeries.tvdb_series_ext_id,
    tvdb_series_id: tvdbSeries.id,
    tvdb_confirm_date: new Date
  };

  insertObject('series', series).then(seriesWithId => {
    addPersonSeries(seriesWithId, personId).then(personSeries => {
      personSeries.my_tier = personSeries.tier;
      personSeries.dynamic_rating = null;
      delete personSeries.tier;

      seriesWithId.personSeries = personSeries;

      updateEpisodes(seriesWithId);
    });
  });
}

function getEpisodesForPage(tvdbSeriesExtId, pageNumber, options, callback) {
  const optionsCopy = {
    qs: {
      'page': pageNumber
    }
  };
  ArrayService.shallowCopy(options, optionsCopy);

  return requestLib('https://api.thetvdb.com/series/' + tvdbSeriesExtId + '/episodes', optionsCopy, callback);
}

function updateEpisodesForPage(series, pageNumber, options, addCallbacks, finalCallback) {
  getEpisodesForPage(series.tvdb_series_ext_id, pageNumber, options, function(error, tvdb_response, body) {
    if (error) {
      throwFetchEpisodesError(error,
        "Error getting TVDB episodes.",
        'Error getting TVDB episode data.',
        series.person_id);
    } else if (tvdb_response.statusCode !== 200) {
      throwFetchEpisodesError(new Error("Unexpected status code from TVDB API: " + tvdb_response.statusCode),
        "Error fetching episode data from TVDB: " + tvdb_response.statusText,
        'Error fetching episode data from TVDB',
        series.person_id);
    } else {
      const lastPage = body.links.last;
      console.log('Updating page ' + pageNumber + ' of ' + lastPage);
      const episodeData = body.data;

      const tempCallbacks = _.map(episodeData, episode => addTVDBEpisode(episode, series));
      ArrayService.addToArray(addCallbacks, tempCallbacks);

      if (pageNumber < lastPage) {
        updateEpisodesForPage(series, (pageNumber+1), options, addCallbacks, finalCallback);
      } else {
        finalCallback();
      }
    }
  });
}

function updateEpisodes(series) {
  tokens.getBaseOptions().then(options => {
    const addCallbacks = [];
    updateEpisodesForPage(series, 1, options, addCallbacks, () => {
      Promise.all(addCallbacks).then(results => {
        const episodes = _.pluck(results, 'episode');
        updateAbsoluteNumbers(episodes);
        commitEpisodes(episodes).then(() => {
          person_controller.calculateUnwatchedDenorms(series, series.personSeries, episodes);

          updateMatchCompleted(series).then(() => {
            console.log('Successfully added all episodes for series "' + series.title + '"! Sending events.');

            // OPERATION COMPLETE! SEND EVENT TO ALL CLIENTS THAT NEW SHOW IS READY.
            sockets.emitToPerson(series.person_id, 'fetch_complete', series);
            delete series.personSeries;
            sockets.emitToAllExceptPerson(series.person_id, 'show_added', series);

          }).catch(err => throwFetchEpisodesError(err,
            'Marking series Match Completed',
            'Error fetching episodes',
            series.person_id));
        }).catch(err => throwFetchEpisodesError(err,
          'Commit episodes',
          'Internal Database Error',
          series.person_id));
      }).catch(err => throwFetchEpisodesError(err,
        'Commit tvdb_episodes',
        'Internal Database Error',
        series.person_id));
    });
  });

}

function throwFetchEpisodesError(error, consoleMsg, clientMsg, person_id) {
  sockets.emitToPerson(person_id, 'fetch_failed', clientMsg);
  console.error(consoleMsg + ': ' + error, error.stack);
}

function commitEpisodes(episodes) {
  const episodeUpdates = _.map(episodes, episode => insertObject('episode', episode));
  return Promise.all(episodeUpdates);
}

function updateAbsoluteNumbers(episodes) {
  const dated = _.filter(episodes, episode => !!episode.air_date);
  fast_sort(dated).asc([
    episode => episode.season,
    episode => episode.episode_number,
    episode => episode.air_date
  ]);
  let index = 1;
  _.each(dated, episode => {
    episode.absolute_number = index;
    index++;
  });
  return dated;
}

function addTVDBEpisode(tvdbEpisodeObj, series) {
  return new Promise((resolve, reject) => {
    // noinspection JSUnresolvedVariable
    const tvdbEpisode = {
      tvdb_episode_ext_id: tvdbEpisodeObj.id,
      season_number: tvdbEpisodeObj.airedSeason,
      episode_number: tvdbEpisodeObj.airedEpisodeNumber,
      name: tvdbEpisodeObj.episodeName,
      first_aired: tvdbEpisodeObj.firstAired,
      tvdb_series_id: series.tvdb_series_id,
      overview: tvdbEpisodeObj.overview,
      production_code: tvdbEpisodeObj.productionCode,
      rating: tvdbEpisodeObj.siteRating,
      rating_count: tvdbEpisodeObj.siteRatingCount,
      director: tvdbEpisodeObj.director,
      last_updated: tvdbEpisodeObj.lastUpdated,
      tvdb_season_ext_id: tvdbEpisodeObj.airedSeasonID,
      filename: tvdbEpisodeObj.filename,
      airs_after_season: tvdbEpisodeObj.airsAfterSeason,
      airs_before_season: tvdbEpisodeObj.airsBeforeSeason,
      airs_before_episode: tvdbEpisodeObj.airsBeforeEpisode,
      thumb_height: tvdbEpisodeObj.thumbHeight,
      thumb_width: tvdbEpisodeObj.thumbWidth,
      api_version: 2
    };

    // noinspection JSUnresolvedVariable
    const episode = {
      series_id: series.id,
      series_title: series.title,
      streaming: true,
      episode_number: tvdbEpisodeObj.airedEpisodeNumber,
      absolute_number: tvdbEpisodeObj.absoluteNumber,
      season: tvdbEpisodeObj.airedSeason,
      title: tvdbEpisodeObj.episodeName,
      air_date: tvdbEpisodeObj.firstAired
    };

    updateAirTime(episode, series);

    insertObject('tvdb_episode', tvdbEpisode).then(tvdbEpisodeWithId => {
      episode.tvdb_episode_id = tvdbEpisodeWithId.id;
      resolve({
        tvdbEpisode: tvdbEpisodeWithId,
        episode: episode
      });
    }).catch(err => reject(err));
  });

}

function updateAirTime(episode, series) {
  const seriesAirTime = !series.air_time ? '12:00 AM' : series.air_time;
  if (!episode.air_date || episode.air_date === '') {
    episode.air_date = null;
    episode.air_time = null;
  } else {
    const airDateMoment = moment(episode.air_date);
    if (isInFuture(airDateMoment)) {
      const airTimeFormatted = reformatTimeString(seriesAirTime);
      const airTimeStr = episode.air_date + ' ' + airTimeFormatted;
      episode.air_time = moment(airTimeStr).toDate();
    } else {
      episode.air_time = airDateMoment.toDate();
    }
    episode.air_date = airDateMoment.toDate();
  }
}

function reformatTimeString(timeStr) {
  const time = moment(timeStr, ["h:mm a",
    "hh:mm a",
    "hh:mma",
    "h a",
    "ha",
    "h.mma",
    "hh:mm a zzz",
    "HH:mm",
    "HHmm"]);
  return time.format('HH:mm:ss');
}

function isInFuture(dateMoment) {
  const today = moment().startOf('day');
  return dateMoment.isAfter(today);
}

function addPersonSeries(series, personId) {
  const personSeries = {
    series_id: series.id,
    person_id: personId,
    tier: 1,
    date_added: new Date
  };

  return insertObject('person_series', personSeries);
}

function updateMatchCompleted(series) {
  const sql = 'UPDATE series ' +
    'SET tvdb_match_status = $1 ' +
    'WHERE id = $2 ';

  const values = ['Match Completed', series.id];

  series.tvdb_match_status = 'Match Completed';
  return db.updateNoResponse(sql, values);
}

function addPoster(tvdbSeriesId, fileName) {
  const poster = {
    poster_path: fileName,
    tvdb_series_id: tvdbSeriesId
  };

  return insertObject('tvdb_poster', poster);
}

function insertTVDBSeries(tvdbSeries) {
  return insertObject('tvdb_series', tvdbSeries);
}

function insertObject(tableName, object) {
  return new Promise((resolve, reject) => {
    const fieldNames = _.keys(object);

    const sql = 'INSERT INTO ' + tableName + ' ' +
      '(' + fieldNames.join(', ') + ') ' +
      'VALUES (' + db.createInlineVariableList(fieldNames.length, 1) + ') ' +
      'RETURNING id ';

    const values = _.map(_.values(object), value => value === '' ? null : value);

    db.selectNoResponse(sql, values).then(result => {
      object.id = result[0].id;
      resolve(object);
    }).catch(err => {
      reject(err);
    });
  });
}