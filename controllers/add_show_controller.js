const db = require('postgres-mmethods');
const requestLib = require('request');
const _ = require('underscore');
const ArrayService = require('./array_util');
const tokens = require('./tvdb_token_service');

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
          seriesObj.poster = _.last(posterData).fileName;
          resolve();
        }
      }
    });
  });
}


/* START EPISODE FETCH */

exports.beginEpisodeFetch = function(request, response) {
  const tvdbSeriesExtId = request.body.series.tvdb_series_ext_id;
  const personId = request.body.series.person_id;

  tokens.getBaseOptions().then(function (options) {

    const seriesUrl = 'https://api.thetvdb.com/series/' + tvdbSeriesExtId;

    requestLib(seriesUrl, options, function (error, tvdb_response, body) {
      if (error) {
        console.log("Error getting TVDB data: " + error);
        response.send("Error getting TVDB data: " + error);
      } else if (tvdb_response.statusCode !== 200) {
        console.log("Unexpected status code from TVDB API: " + tvdb_response.statusCode + ", " + tvdb_response.statusText);
        response.json([]);
      } else {
        const tvdbSeriesObj = body.data;
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
          zap2it_id: tvdbSeriesObj.zap2itId
        };

        insertTVDBSeries(tvdbSeries).then(() => {
          updatePosters(tvdbSeries, tvdbSeriesObj, personId, response);
        });


      }
    });
  });

};

function updatePosters(tvdbSeries, tvdbSeriesObj, personId, response) {
  tokens.getBaseOptions().then(options => {
    const postersUrl = "https://api.thetvdb.com/series/" + tvdbSeries.tvdb_series_ext_id + "/images/query";

    options.qs = {
      'keyType': 'poster'
    };

    requestLib(postersUrl, options, function (error, tvdb_response, body) {
      if (error) {
        console.log(error);
      } else if (tvdb_response.statusCode !== 200) {
        console.log("Invalid status code: " + tvdb_response.statusCode);
      } else {
        const posterData = body.data;
        if (posterData.length === 0) {
          resolve();
        } else {
          tvdbSeries.last_poster = _.last(posterData).fileName;
          updateLastPoster(tvdbSeries);
          _.each(posterData, posterObj => addPoster(tvdbSeries.id, posterObj.fileName));
        }
      }

      updateNewSeries(tvdbSeries, tvdbSeriesObj, personId, response);

    });
  })
}

function updateNewSeries(tvdbSeries, tvdbSeriesObj, personId, response) {
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
      personSeries.unwatched_all = 10;
      personSeries.my_tier = personSeries.tier;
      delete personSeries.tier;
      seriesWithId.personSeries = personSeries;
      updateMatchCompleted(seriesWithId);

      updateEpisodes(seriesWithId);

      response.json(seriesWithId);
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

function updateEpisodesForPage(series, pageNumber, options, episodes, finalCallback) {
  getEpisodesForPage(series.tvdb_series_ext_id, pageNumber, options, function(error, tvdb_response, body) {
    if (error) {
      console.log(error);
    } else if (tvdb_response.statusCode !== 200) {
      console.log("Invalid status code: " + tvdb_response.statusCode);
    } else {
      const lastPage = body.links.last;
      console.log('Updating page ' + pageNumber + ' of ' + lastPage);
      const episodeData = body.data;

      _.each(episodeData, episode => addEpisode(episode, series, episodes));

      if (pageNumber < lastPage) {
        updateEpisodesForPage(series, (pageNumber+1), options, episodes, finalCallback);
      } else {
        finalCallback(episodes);
      }
    }
  });
}

function updateEpisodes(series) {
  tokens.getBaseOptions().then(options => {
    const episodes = [];
    updateEpisodesForPage(series, 1, options, episodes, episodes => {
      // todo: update denorms
    });

  });

}

function addEpisode(tvdbEpisodeObj, series, episodes) {

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

  const episode = {
    series_id: series.id,
    series_title: series.title,
    streaming: true,
    episode_number: tvdbEpisodeObj.airedEpisodeNumber,
    absolute_number: tvdbEpisodeObj.absoluteNumber,
    season: tvdbEpisodeObj.airedSeason,
    title: tvdbEpisodeObj.episodeName,
    air_date: tvdbEpisodeObj.firstAired,
    air_time: tvdbEpisodeObj.firstAired
  };

  // todo: update air_time
  // todo: update absolute_number -- ugh, best to wait until all tvdb_episodes are in, then insert episodes with updated absolutes?

  episodes.push(episode);

  insertObject('tvdb_episode', tvdbEpisode).then(tvdbEpisodeWithId => {
    episode.tvdb_episode_id = tvdbEpisodeWithId.id;
    insertObject('episode', episode);
  });
}

function addPersonSeries(series, personId) {
  const personSeries = {
    series_id: series.id,
    person_id: personId,
    tier: 1
  };

  return insertObject('person_series', personSeries);
}

function updateMatchCompleted(series) {
  const sql = 'UPDATE series ' +
    'SET tvdb_match_status = $1 ' +
    'WHERE id = $2 ';

  const values = ['Match Completed', series.id];

  series.tvdb_match_status = 'Match Completed';
  return db.updateNoJSON(sql, values);
}

function updateLastPoster(tvdbSeries) {
  const sql = 'UPDATE tvdb_series ' +
    'SET last_poster = $1 ' +
    'WHERE id = $2 ';

  const values = [tvdbSeries.last_poster, tvdbSeries.id];

  return db.updateNoJSON(sql, values);
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
  return new Promise(resolve => {
    const fieldNames = _.keys(object);

    const sql = 'INSERT INTO ' + tableName + ' ' +
      '(' + fieldNames.join(', ') + ') ' +
      'VALUES (' + db.createInlineVariableList(fieldNames.length, 1) + ') ' +
      'RETURNING id ';

    const values = _.map(_.values(object), value => value === '' ? null : value);

    db.selectWithJSON(sql, values).then(result => {
      object.id = result[0].id;
      resolve(object);
    })
  });
}
