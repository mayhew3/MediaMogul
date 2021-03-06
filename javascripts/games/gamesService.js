function GamesService($log, $http, LockService, ArrayService) {
  var games = [];
  var notMyGames = [];
  var platforms = [];
  var possibleMatches = [];
  var self = this;

  this.updateGamesList = function() {
    return $http.get('/api/games', {params: {PersonId: LockService.getPersonID()}}).then(function (gamesResponse) {
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

  this.updateNotMyGamesList = function() {
    return $http.get('/api/notMyGames', {params: {PersonId: LockService.getPersonID()}}).then(function (gamesResponse) {
      $log.debug("Games returned " + gamesResponse.data.length + " items.");
      var tempGames = gamesResponse.data;
      tempGames.forEach(function (game) {
        self.updateNumericFields(game);
        self.updateImages(game);
        self.updateRating(game);
        self.updatePlatforms(game);
      });
      $log.debug("Finished updating.");
      notMyGames = tempGames;
    }, function (errResponse) {
      console.error('Error while fetching games list: ' + errResponse);
    });
  };




  this.updateNumericFields = function(game) {
    if (ArrayService.exists(game.metacritic)) {
      game.metacritic = parseFloat(game.metacritic);
    }
    if (ArrayService.exists(game.rating)) {
      game.rating = parseFloat(game.rating);
    }
    if (ArrayService.exists(game.minutes_played)) {
      game.minutes_played = parseInt(game.minutes_played);
    }
    if (ArrayService.exists(game.timetotal)) {
      game.timetotal = parseFloat(game.timetotal);
    }
    if (ArrayService.exists(game.replay_score)) {
      game.replay_score = parseFloat(game.replay_score);
    }
    if (ArrayService.exists(game.final_score)) {
      game.final_score = parseFloat(game.final_score);
    }
    if (ArrayService.exists(game.howlong_id)) {
      game.howlong_id = parseInt(game.howlong_id);
    }
    if (ArrayService.exists(game.giantbomb_id)) {
      game.giantbomb_id = parseInt(game.giantbomb_id);
    }
    if (ArrayService.exists(game.last_played)) {
      game.last_played = new Date(game.last_played);
    }
  };

  this.getGamesList = function() {
    return games;
  };

  this.getNotMyGamesList = function() {
    return notMyGames;
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
    $http.post('/api/addgame', {game: game, PersonId: LockService.getPersonID()}).then(function() {
      self.updateRating(game);
      $log.debug(game.title + " updated to rating: " + game.FullRating);
      games.push(game);
      return null;
    }, function(errResponse) {
      return errResponse;
    });
  };

  this.addToMyGames = function(game) {
    $log.debug("Adding to my games: " + JSON.stringify(game));
    return $http.post('/api/addToMyGames', {PersonId: LockService.getPersonID(), GameId: game.id}).then(function() {
      game.tier = 1;
      game.minutes_played = 0;
      game.addedSuccessfully = true;
    }, function(errResponse) {
      $log.debug("Error adding to my games: " + errResponse);
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
      game.imageUrl = "https://cdn.edgecast.steamstatic.com/steam/apps/" + game.steamid + "/header.jpg";
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
  .service('GamesService', ['$log', '$http', 'LockService', 'ArrayService', GamesService]);
