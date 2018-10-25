function GamesService($log, $http, LockService) {
  var games = [];
  var platforms = [];
  var possibleMatches = [];
  var self = this;

  this.updateGamesList = function() {
    return $http.get('/api/games', {params: {PersonId: LockService.person_id}}).then(function (gamesResponse) {
      $log.debug("Games returned " + gamesResponse.data.length + " items.");
      var tempGames = gamesResponse.data;
      tempGames.forEach(function (game) {
        self.updateNumericFields(game);
        self.updateImages(game);
        self.updatePlaytimes(game);
        self.updateRating(game);
        self.updatePlatforms(game);
      });
      $log.debug("Finished updating.");
      games = tempGames;
    }, function (errResponse) {
      console.error('Error while fetching games list: ' + errResponse);
    });
  };



  this.updateNumericFields = function(game) {
    if (game.metacritic !== null) {
      game.metacritic = parseFloat(game.metacritic);
    }
    if (game.rating !== null) {
      game.rating = parseFloat(game.rating);
    }
    if (game.minutes_played !== null) {
      game.minutes_played = parseInt(game.minutes_played);
    }
    if (game.timetotal !== null) {
      game.timetotal = parseFloat(game.timetotal);
    }
    if (game.replay_score !== null) {
      game.replay_score = parseFloat(game.replay_score);
    }
    if (game.final_score !== null) {
      game.final_score = parseFloat(game.final_score);
    }
    if (game.howlong_id !== null) {
      game.howlong_id = parseInt(game.howlong_id);
    }
    if (game.giantbomb_id !== null) {
      game.giantbomb_id = parseInt(game.giantbomb_id);
    }
    if (game.last_played !== null) {
      game.last_played = new Date(game.last_played);
    }
  };

  this.getGamesList = function() {
    return games;
  };

  this.getPlatformList = function() {
    return platforms;
  };

  this.getGameWithTitleAndPlatform = function(title, platform) {
    var filtered = games.filter(function(gameElement) {
      return (gameElement.title === title && gameElement.platform === platform);
    });
    return filtered[0];
  };

  this.addGame = function(game) {
    $log.debug("Adding game " + JSON.stringify(game));
    $http.post('/api/addgame', {game: game}).then(function() {
      self.updateRating(game);
      $log.debug(game.title + " updated to rating: " + game.FullRating);
      games.push(game);
      return null;
    }, function(errResponse) {
      return errResponse;
    });
  };

  this.addGameplaySession = function(gameplaySession) {
    $log.debug("Adding gameplay " + JSON.stringify(gameplaySession));
    return $http.post('/api/addgameplay', {gameplaySession: gameplaySession});
  };

  this.updateGame = function(GameId, ChangedFields) {
    $log.debug('Received update for Game ' + GameId + " with data " + JSON.stringify(ChangedFields));
    return $http.post('/api/updategame', {GameId: GameId, ChangedFields: ChangedFields});
  };

  this.updatePersonGame = function(PersonGameId, ChangedFields) {
    $log.debug('Received update for Game ' + PersonGameId + " with data " + JSON.stringify(ChangedFields));
    return $http.post('/api/updatePersonGame', {PersonGameId: PersonGameId, ChangedFields: ChangedFields});
  };

  this.updateRating = function(game) {
    var metacritic = game.metacritic;
    var myRating = game.rating;

    game.FullRating = myRating === null ? metacritic : myRating;
  };

  this.updateImages = function(game) {
    game.imageUrl = null;
    game.imageDoesNotExist = false;

    if (game.igdb_poster !== null && game.igdb_poster !== '') {
      game.imageUrl = "https://images.igdb.com/igdb/image/upload/t_720p/" + game.igdb_poster +  ".jpg";
    } else if (game.logo !== null && game.logo !== '') {
      game.imageUrl = "http://cdn.edgecast.steamstatic.com/steam/apps/" + game.steamid + "/header.jpg";
    } else if (game.giantbomb_medium_url !== null) {
      game.imageUrl = game.giantbomb_medium_url;
    } else {
      game.imageUrl = 'images/GenericSeries.gif';
      game.imageDoesNotExist = true;
    }
  };

  this.updatePossibleMatches = function(game) {
    return $http.get('/api/possibleGameMatches', {params: {GameId: game.id}}).then(function(response) {
      $log.debug("Possible matches returned " + response.data.length + " items.");
      possibleMatches = response.data;
      possibleMatches.forEach(function(possibleMatch) {
        if (possibleMatch.poster) {
          possibleMatch.imageUrl = "https://images.igdb.com/igdb/image/upload/t_720p/" + possibleMatch.poster + ".jpg";
        } else {
          possibleMatch.imageUrl = 'images/GenericSeries.gif';
        }
      });
    }, function(errResponse) {
      console.error('Error while fetching possible match list: ' + errResponse);
    });
  };

  this.getPossibleMatches = function() {
    return possibleMatches;
  };

  this.updateGamesMatchList = function() {
    return $http.get('/api/gamesMatchList').then(function (showresponse) {
      $log.debug("Shows returned " + showresponse.data.length + " items.");
      var tempGames = showresponse.data;
      tempGames.forEach(function (game) {
        if (game.first_match_poster) {
          game.imageUrl = "https://images.igdb.com/igdb/image/upload/t_720p/" + game.first_match_poster + ".jpg";
        } else {
          game.imageUrl = 'images/GenericSeries.gif';
        }
      });
      $log.debug("Finished updating.");
      games = tempGames;

    }, function (errResponse) {
      console.error('Error while fetching series list: ' + errResponse);
    });
  };

  this.updatePlaytimes = function(game) {
    var minutes_played = game.minutes_played;

    game.aggPlaytime = minutes_played === null ? null : minutes_played / 60;

    var timetotal = game.timetotal;
    var howlong_time = game.howlong_extras;
    var natural_end = game.natural_end;

    game.aggTimetotal = natural_end ? (timetotal === null ? howlong_time : timetotal) : null;
  };

  this.updatePlatforms = function(game) {
    var found = platforms.some(function (g1) {
      return g1 === game.platform;
    });
    if (!found) {
      platforms.push(game.platform);
    }
  };
}

angular.module('mediaMogulApp')
  .service('GamesService', ['$log', '$http', 'LockService', GamesService]);