angular.module('mediaMogulApp')
  .service('LockService', ['$log', '$http', 'store', '$location', 'jwtHelper', '__env', '$q',
    function ($log, $http, store, $location, jwtHelper, __env, $q) {

      const self = this;
      self.user_role = 'none';
      let tokenRenewalTimeout;

      const token = store.get('token');
      self.isAuthenticated = token && !jwtHelper.isTokenExpired(token);

      self.callbackBase = function() {
        var protocol_host = $location.protocol() + "://" + $location.host();
        var optional_port = $location.port() === 80 ? '' : ':' + $location.port();
        return protocol_host + optional_port;
      };

      console.log('CallbackBase: ' + self.callbackBase());

      self.options = {
        autoclose: true,
        auth: {
          responseType: 'token id_token',
          redirectUrl: self.callbackBase() + "/callback"
        }
      };

      self.scheduleRenewal = function() {
        let expiresAt = JSON.parse(store.get('expires_at'));
        let delay = expiresAt - Date.now();
        if (delay > 0) {
          tokenRenewalTimeout = setTimeout(function() {
            console.log('TIMEOUT REACHED!');
            self.renew();
          }, delay);
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
              return deferred.resolve();
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
        store.remove('first_name');
        store.remove('user_role');
        self.user_role = 'none';
        self.person_id = undefined;
        clearTimeout(tokenRenewalTimeout);
      };

      if (self.isAuthenticated) {
        if (isNaN(self.person_id)) {
          console.log("Setting LockService person id to: " + store.get('person_id'));
          self.person_id = store.get('person_id');
        }

        self.firstName = store.get('first_name');
        self.user_role = store.get('user_role');
      }

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

        self.scheduleRenewal();

        syncPersonWithDB(authResult.idTokenPayload, callback);
      };

      self.isAdmin = function () {
        return this.isAuthenticated && (self.user_role === 'admin');
      };

      self.isUser = function () {
        return this.isAuthenticated && _.contains(['user', 'admin'], self.user_role);
      };

      // user management functions

      function syncPersonWithDB(idTokenPayload, callback) {
        var email = idTokenPayload.email;

        $http.get('/person', {params: {email: email}}).then(function (response) {
          var personData = response.data;

          if (personData.length === 0) {
            console.log("Redirecting back to home page, because no user found with e-mail '" + email + "'");
            self.logout();
          } else {
            copyPersonInfoToAuth(personData, idTokenPayload);
          }

          console.log("role found: " + self.user_role);

          callback();
        });
      }

      function copyPersonInfoToAuth(personData) {
        var personInfo = personData[0];
        console.log("Successful login!");
        console.log("Name: " + personInfo.first_name + " " + personInfo.last_name);
        console.log("PersonID: " + personInfo.id);

        self.firstName = personInfo.first_name;
        self.lastName = personInfo.last_name;
        self.person_id = personInfo.id;
        self.user_role = personInfo.user_role;

        console.log("Setting store with person id: " + self.person_id);
        store.set('person_id', self.person_id);
        store.set('first_name', self.firstName);
        store.set('user_role', self.user_role);
/*
        $http.post('/api/updateUser', {
          user_id: idTokenPayload.sub,
          access_token: store.get('access_token'),
          first_name: self.firstName,
          last_name: self.lastName,
          user_role: personInfo.user_role
        });*/
      }


    }
  ]);