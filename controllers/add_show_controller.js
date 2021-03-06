const db = require('postgres-mmethods');
const _ = require('underscore');
const ArrayService = require('./array_util');
const tokens = require('./tvdb_token_service');
const fast_sort = require('fast-sort');
const moment = require('moment');
const person_controller = require('./person_controller');
const sockets = require('./sockets_controller');
const cloudinary = require("cloudinary").v2;
const axios = require('axios');

/* GET POSSIBLE MATCHES */

exports.getTVDBMatches = async function(request, response) {
  const series_name = request.query.series_name;
  const client_id = request.query.client_id;
  console.log("Finding TVDB matches for series: " + series_name);

  const prunedData = [];

  const options = await tokens.getBaseOptions();

  const formatted_name = series_name
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/[^\w-]+/g, '');

  const seriesUrl = 'https://api.thetvdb.com/search/series';

  const optionsCopy = {
    params: {
      'name': formatted_name
    }
  };
  ArrayService.shallowCopy(options, optionsCopy);

  try {
    const tvdbResponse = await axios.get(seriesUrl, optionsCopy);

    const seriesData = tvdbResponse.data.data;
    const newData = _.map(seriesData, function(seriesObj) {
      // noinspection JSUnresolvedVariable
      return {
        title: seriesObj.seriesName,
        tvdb_series_ext_id: seriesObj.id,
        poster: null,
        first_aired: seriesObj.firstAired,
        network: seriesObj.network,
        overview: seriesObj.overview,
        status: seriesObj.status,
        poster_loading: true,
      };
    });

    ArrayService.addToArray(prunedData, newData);

    response.json(prunedData);

  } catch (error) {
    if (error.statusCode === 404) {
      console.log('404 no results found. Returning empty array.');
      response.json([]);
    } else {
      console.log("Error getting TVDB data: " + error);
      response.send("Error getting TVDB data: " + error);
    }
  }

  try {
    const existingPosters = await getSeriesIDsAndPosters();

    for (const prunedSeries of prunedData) {
      const existing = _.findWhere(existingPosters, {tvdb_series_ext_id: prunedSeries.tvdb_series_ext_id});
      if (!!existing) {
        prunedSeries.poster = existing.poster_path;
        prunedSeries.cloud_poster = existing.cloud_poster;
      } else {
        await getTopPoster(prunedSeries, options);
      }
      prunedSeries.poster_loading = false;
      sockets.emitToClient(client_id, 'poster_fetched', prunedSeries);
    }

    sockets.emitToClient(client_id, 'posters_finished', {});
  } catch (error) {
    console.log("Error getting TVDB Posters: " + error);
    sockets.emitToClient(client_id,'poster_error', error);
  }

};

async function getSeriesIDsAndPosters() {
  const sql = 'SELECT s.tvdb_series_ext_id, tp.poster_path, tp.cloud_poster ' +
    'FROM series s ' +
    'INNER JOIN tvdb_poster tp ' +
    ' ON s.tvdb_poster_id = tp.id ' +
    'WHERE s.retired = $1 ' +
    'AND tp.retired = $1 ' +
    'AND s.tvdb_series_ext_id IS NOT NULL ' +
    'AND tp.cloud_poster IS NOT NULL ';
  return await db.selectNoResponse(sql, [0]);
}

function urlExists(url) {
  return new Promise(resolve => {
    axios.get(url).then(response => {
      resolve(!!response && response.status < 400);
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
      console.error("Failed to find ANY posters! Returning first failing image in the list.");
      reject();
    }
  });
}

function findFirstWorkingPoster(posters) {
  return new Promise((resolve, reject) => {
    tryPoster(posters, 0, resolve, reject);
  });
}

async function getTopPoster(seriesObj, options) {
  const posterUrl = 'https://api.thetvdb.com/series/' + seriesObj.tvdb_series_ext_id + '/images/query';

  const optionsCopy = {
    params: {
      'keyType': 'poster'
    }
  };
  ArrayService.shallowCopy(options, optionsCopy);

  try {
    const tvdbResponse = await axios.get(posterUrl, optionsCopy);

    const posterData = tvdbResponse.data.data;
    if (posterData.length !== 0) {

      try {
        const poster = await findFirstWorkingPoster(posterData);
        seriesObj.poster = poster.fileName;
      } catch (error) {
        seriesObj.poster = _.first(posterData).fileName;
      }

      const pending_poster = await getOrCreateCloudinary(seriesObj);
      if (!!pending_poster) {
        seriesObj.cloud_poster = pending_poster.cloudinary_id;
      }
    }
  } catch (error) {
    console.log("No poster results found for series '" + seriesObj.title + "'");
  }
}

async function getOrCreateCloudinary(seriesObj) {
  const existing = await getExistingCloudinary(seriesObj);
  if (!existing) {
    return await uploadPosterAndUpdate(seriesObj);
  } else {
    console.log("Existing poster found for series '" + seriesObj.title + "'");
    return existing;
  }
}

async function getExistingCloudinary(seriesObj) {
  const sql = 'SELECT id, tvdb_series_ext_id, tvdb_poster, cloudinary_id ' +
    'FROM pending_poster ' +
    'WHERE tvdb_series_ext_id = $1 ' +
    'AND retired = $2 ';

  const values = [seriesObj.tvdb_series_ext_id, 0];

  const results = await db.selectNoResponse(sql, values);
  if (results.length === 0) {
    return null;
  } else {
    return results[0];
  }
}

async function uploadPosterAndUpdate(seriesObj) {
  try {
    const result = await uploadPosterToCloudinary(seriesObj.poster);
    const pending_poster = {
      tvdb_series_ext_id: seriesObj.tvdb_series_ext_id,
      tvdb_poster: seriesObj.poster,
      cloudinary_id: result.public_id
    };

    await insertObject("pending_poster", pending_poster);

    console.log("Uploaded new poster for series '" + seriesObj.title + "'.");
    return pending_poster;
  } catch (error) {
    console.error("Error handling cloudinary photo: " + error.message);
    return null;
  }
}

async function uploadPosterToCloudinary(tvdb_filename) {
  try {
    return await cloudinary.uploader.upload("https://www.thetvdb.com/banners/" + tvdb_filename);
  } catch (error) {
    throw new TVDBPosterError("Error uploading cloudinary photo: " + error.message);
  }
}

class TVDBPosterError extends Error {
  constructor(message) {
    super(message);
    this.name = "TVDBPosterError";
  }
}

/* START EPISODE FETCH */

exports.beginEpisodeFetch = function(request, response) {
  const tvdbSeriesExtId = request.body.series.tvdb_series_ext_id;
  const personId = request.body.series.person_id;

  // todo: ignore selected poster
  const selectedPoster = request.body.series.poster;

  try {

    tokens.getBaseOptions().then(function (options) {

      response.json({msg: 'Fetch started.'});

      const seriesUrl = 'https://api.thetvdb.com/series/' + tvdbSeriesExtId;

      axios.get(seriesUrl, options).then(async tvdb_response => {
        if (tvdb_response.status !== 200) {
          throwFetchEpisodesError(new Error("Unexpected status code from TVDB API: " + tvdb_response.statusCode),
            "Error fetching series data from TVDB: " + tvdb_response.statusText,
            'Error fetching series from TVDB',
            personId);
        } else {
          const tvdbSeriesObj = tvdb_response.data.data;

          const tvdbSeries = await insertTVDBSeries(tvdbSeriesObj, tvdbSeriesExtId, selectedPoster);
          const posters = await addTVDBPosters(tvdbSeries, personId);
          const firstWorking = getFirstWorkingPoster(posters);

          await updateTVDBSeries(tvdbSeries, firstWorking);
          await addNewSeries(tvdbSeries, tvdbSeriesObj, personId, firstWorking);
        }

      }).catch(error => {
        throwFetchEpisodesError(error,
          "Error getting TVDB series.",
          'Error getting TVDB Data. ',
          personId);
      });

    });

  } catch (err) {
    console.error(err.message, err.stack);
  }

};

function getFirstWorkingPoster(posters) {
  const workingPosters = _.filter(posters, poster => !!poster.cloud_poster);
  fast_sort(workingPosters).asc([
    poster => poster.id
  ]);
  return _.first(workingPosters);
}

async function addTVDBPosters(tvdbSeries, personId) {

  const options = await tokens.getBaseOptions();
  const postersUrl = "https://api.thetvdb.com/series/" + tvdbSeries.tvdb_series_ext_id + "/images/query";

  options.params = {
    'keyType': 'poster'
  };

  try {
    const tvdb_response = await axios.get(postersUrl, options);

    const posterData = tvdb_response.data.data;
    if (posterData.length > 0) {
      try {
        const posterQueries = _.map(posterData, posterObj => addPoster(tvdbSeries, posterObj.fileName));
        const posterObjs = await Promise.all(posterQueries);
        return _.compact(posterObjs);

      } catch(err) {
        throwFetchEpisodesError(err,
          'Add poster',
          'Internal Database Error',
          personId);
      }
    }
  } catch (error) {
    if (error.statusCode !== 404 || error.error.Error !== 'No results for your query') {
      throwFetchEpisodesError(error,
        "Error getting TVDB posters.",
        'Error getting TVDB Data.',
        personId);
    }
  }
}

async function updateTVDBSeries(tvdbSeries, firstWorking) {
  if (!!firstWorking) {
    const changedFields = {
      first_poster: firstWorking.poster_path
    };

    return await db.updateObjectWithChangedFieldsNoResponse(changedFields, 'tvdb_series', tvdbSeries.id);
  }
}

async function addNewSeries(tvdbSeries, tvdbSeriesObj, personId, firstWorking) {
  const series = {
    air_time: tvdbSeries.airs_time,
    poster: tvdbSeries.last_poster,
    cloud_poster: tvdbSeries.cloud_poster,
    person_id: personId,
    title: tvdbSeries.name,
    date_added: new Date,
    tvdb_new: true,
    metacritic_new: true,
    tvdb_match_status: 'Match Confirmed',
    tvdb_series_ext_id: tvdbSeries.tvdb_series_ext_id,
    tvdb_series_id: tvdbSeries.id,
    tvdb_confirm_date: new Date,
    tvdb_poster_id: !!firstWorking ? firstWorking.id : null
  };

  const seriesWithId = await insertObject('series', series);
  const personSeries = await addPersonSeries(seriesWithId, personId);
  personSeries.my_tier = personSeries.tier;
  personSeries.dynamic_rating = null;
  delete personSeries.tier;

  seriesWithId.personSeries = personSeries;

  updateEpisodes(seriesWithId);
}

function getEpisodesForPage(tvdbSeriesExtId, pageNumber, options, callback, errCallback) {
  const optionsCopy = {
    params: {
      'page': pageNumber
    }
  };
  ArrayService.shallowCopy(options, optionsCopy);

  return axios.get('https://api.thetvdb.com/series/' + tvdbSeriesExtId + '/episodes', optionsCopy)
    .then(callback)
    .catch(errCallback);
}

function updateEpisodesForPage(series, pageNumber, options, addCallbacks, finalCallback) {
  getEpisodesForPage(series.tvdb_series_ext_id, pageNumber, options, tvdb_response => {
    if (tvdb_response.status !== 200) {
      throwFetchEpisodesError(new Error("Unexpected status code from TVDB API: " + tvdb_response.statusCode),
        "Error fetching episode data from TVDB: " + tvdb_response.statusText,
        'Error fetching episode data from TVDB',
        series.person_id);
    } else {
      const lastPage = tvdb_response.data.links.last;
      console.log('Updating page ' + pageNumber + ' of ' + lastPage);
      const episodeData = tvdb_response.data.data;

      const tempCallbacks = _.map(episodeData, episode => addTVDBEpisode(episode, series));
      ArrayService.addToArray(addCallbacks, tempCallbacks);

      if (pageNumber < lastPage) {
        updateEpisodesForPage(series, (pageNumber+1), options, addCallbacks, finalCallback);
      } else {
        finalCallback();
      }
    }
  },
    error => {
      throwFetchEpisodesError(error,
        "Error getting TVDB episodes.",
        'Error getting TVDB episode data.',
        series.person_id);
    }
    );
}

function updateEpisodes(series) {
  tokens.getBaseOptions().then(options => {
    const addCallbacks = [];
    updateEpisodesForPage(series, 1, options, addCallbacks, () => {
      Promise.all(addCallbacks).then(results => {
        const episodes = _.pluck(results, 'episode');
        updateAbsoluteNumbers(episodes);
        commitEpisodes(episodes).then(() => {
          person_controller.updateSeriesDenorms(series, series.personSeries, episodes);

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
      air_date: tvdbEpisodeObj.firstAired,
      tvdb_approval: 'approved'
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

async function addPersonSeries(series, personId) {
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

async function addPoster(tvdbSeries, fileName) {
  const tvdb_poster = {
    poster_path: fileName,
    tvdb_series_id: tvdbSeries.id
  };

  const existing = await getExistingCloudinary({tvdb_series_ext_id: tvdbSeries.tvdb_series_ext_id});

  try {

    if (!existing) {
      const posterObj = await uploadPosterToCloudinary(fileName);
      tvdb_poster.cloud_poster = posterObj.public_id;
    } else {
      tvdb_poster.cloud_poster = existing.cloudinary_id;
      retirePendingPoster(existing);
    }

    let promise = insertObject('tvdb_poster', tvdb_poster);
    return promise;

  } catch (err) {
    console.error("Error fetching and uploading TVDB Poster: " + fileName);
    return new Promise((resolve) => resolve(undefined));
  }
}

function retirePendingPoster(pending_poster) {
  const changedFields = {
    retired: pending_poster.id
  };
  db.updateObjectWithChangedFieldsNoResponse(changedFields, "pending_poster", pending_poster.id);
}

async function insertTVDBSeries(tvdbSeriesObj, tvdbSeriesExtId, selectedPoster) {

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

  return await insertObject('tvdb_series', tvdbSeries);
}

async function insertObject(tableName, object) {
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
