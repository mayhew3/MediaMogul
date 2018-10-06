angular.module('mediaMogulApp')
  .service('LockService', ['$log', '$http', 'store', '$location', 'jwtHelper', '__env', '$q',
    function ($log, $http, store, $location, jwtHelper, __env, $q) {

      var self = this;

      const token = store.get('token');
      self.isAuthenticated = token && !jwtHelper.isTokenExpired(token);

      if (self.isAuthenticated) {
        const profile = store.get('profile');
        if (isNaN(self.person_id)) {
          console.log("Setting LockService person id to: " + store.get('person_id'));
          self.person_id = store.get('person_id');
        }
        self.roles = profile.app_metadata.roles;
      }

      self.options = {
        autoclose: true,
        auth: {
          responseType: 'token id_token',
          redirectUrl: __env.callbackUrl
        }
      };
      
      self.lock = new Auth0Lock(__env.auth0_client, __env.auth0_domain, self.options);
      
      console.log("Listeners being added.");
      self.lock.on('authenticated', function(authResult) {
        console.log("Authenticated event detected.");
        if (authResult && authResult.accessToken && authResult.idToken) {
          console.log('Authenticated!', authResult);
          self.isAuthenticated = true;
          self.setSession(authResult, function() {
            $location.path('/tv/shows/main');
          });
        }
      });
      
      self.lock.on('authorization_error', function(err) {
        self.isAuthenticated = false;
        console.log(err);
        alert('Error: ' + err.error + ". Check the console for further details.");
      });

      self.renew = function() {
        var deferred = $q.defer();
        console.log("Attempting to renew token...");
        self.lock.checkSession({}, function(err, authResult) {
          if (err || !authResult) {
            self.isAuthenticated = false;
            if (err) {
              console.log("Error on renew: " + err);
              alert('Failed to renew. Error: ' + err.error + ". Check the console for further details.");
              deferred.reject("Error on renew: " + err);
            } else {
              console.log("No result received on renew.");
              deferred.reject("No result received on renew.");
            }
          } else {
            if (authResult.accessToken && authResult.idToken) {
              console.log('Authentication renewed!', authResult);
              self.isAuthenticated = true;
              self.setSession(authResult, function () {});
              deferred.resolve();
            }
          }
        });
        return deferred.promise;
      };

      self.logout = function() {
        self.isAuthenticated = false;
        // todo: re-enable for MM-495
        // self.lock.logout();
        store.remove('profile');
        store.remove('token');
        store.remove('person_id');
        self.roles = [];
        self.person_id = undefined;
      };
      
      self.setSession = function(authResult, callback) {
        // Set the time that the Access Token will expire
        var expiresAt = JSON.stringify(
          authResult.expiresIn * 1000 + new Date().getTime()
        );
        // Save tokens and expiration to localStorage
        store.set('profile', authResult.idTokenPayload);
        store.set('access_token', authResult.accessToken);
        store.set('token', authResult.idToken);
        store.set('refresh_token', authResult.refreshToken);
        store.set('expires_at', expiresAt);

        syncPersonWithDB(authResult.idTokenPayload, callback);
      };

      self.isAdmin = function () {
        return this.isAuthenticated && _.contains(this.roles, 'admin');
      };

      self.isUser = function () {
        return this.isAuthenticated && _.contains(this.roles, 'user');
      };

      // user management functions

      function syncPersonWithDB(profile, callback) {
        var email = profile.email;

        $http.get('/person', {params: {email: email}}).then(function (response) {
          var personData = response.data;
          console.log("User info found: " + personData.length + " rows.");

          if (personData.length === 0) {
            addPersonToDB(profile);
          } else {
            copyPersonInfoToAuth(personData);
          }

          self.roles = profile.app_metadata.roles;
          console.log("roles found: " + self.roles.length);

          callback();
        });
      }

      function addPersonToDB(profile) {
        console.log("No person found. Adding: " + profile.user_metadata.first_name);
        var user_metadata = profile.user_metadata;
        $http.post('/addPerson', {
          Person: {
            email: profile.email,
            first_name: user_metadata.first_name,
            last_name: user_metadata.last_name
          }
        }).then(function (response) {
          console.log("Added successfully. Person ID: " + response.data.PersonId);
          self.person_id = response.data.PersonId;

          console.log("Setting store with person id: " + self.person_id);
          store.set('person_id', self.person_id);
        }, function (err) {
          console.log("Error adding person to DB: " + err);
        });
      }

      function copyPersonInfoToAuth(personData) {
        var personInfo = personData[0];
        console.log("Name: " + personInfo.first_name + " " + personInfo.last_name);
        console.log("ID: " + personInfo.id);

        self.firstName = personInfo.first_name;
        self.lastName = personInfo.last_name;
        self.person_id = personInfo.id;

        console.log("Setting store with person id: " + self.person_id);
        store.set('person_id', self.person_id);
      }


    }
  ]);