angular.module('mediaMogulApp')
  .service('LockService', ['$log', '$http', 'store', '$location', 'jwtHelper', '__env',
    '$q', 'ArrayService', '$state',
    function ($log, $http, store, $location, jwtHelper, __env, $q, ArrayService, $state) {

      const self = this;
      let tokenRenewalTimeout;

      const afterLoginCallbacks = [];

      const token = store.get('token');
      self.isAuthenticated = token && !jwtHelper.isTokenExpired(token);

      self.callbackBase = function() {
        var protocol_host = $location.protocol() + "://" + $location.host();
        var optional_port = ($location.port() === 80 || $location.port() === 443) ? '' : ':' + $location.port();
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

      self.addCallback = function(callback) {
        if (self.isAuthenticated) {
          callback();
        } else {
          afterLoginCallbacks.push(callback);
        }
      };

      function executeAfterLoginCallbacks() {
        _.forEach(afterLoginCallbacks, callback => callback());
        ArrayService.emptyArray(afterLoginCallbacks);
      }

      self.lock = new Auth0Lock(__env.auth0_client, __env.auth0_domain, self.options);
      
      console.log("Listeners being added.");
      self.lock.on('authenticated', function(authResult) {
        console.log("Authenticated event detected.");
        if (authResult && authResult.accessToken && authResult.idToken) {
          console.log('Authenticated!', authResult);
          self.isAuthenticated = true;
          self.setSession(authResult, function() {
            executeAfterLoginCallbacks();
            $state.go('tv.shows.my.dashboard')
          });
        }
      });
      
      self.lock.on('authorization_error', function(err) {
        self.isAuthenticated = false;
        console.log(err);
        alert('Error: ' + err.error + ". Check the console for further details.");
      });

      self.renew = function() {
        let deferred = $q.defer();
        console.log("Attempting to renew token...");
        self.lock.checkSession({}, function(err, authResult) {
          if (err || !authResult) {
            self.isAuthenticated = false;
            if (err) {
              console.log("Error on renew: " + err.error);
              if (self.getUserRole() === 'admin') {
                alert('Failed to renew. Error: ' + err.error + ". Check the console for further details.");
                console.log("Full error object: " + JSON.stringify(err));
              }
              deferred.reject(err);
              return deferred.promise;
            } else {
              console.log("No result received on renew.");
              deferred.reject("No result received on renew.");
              return deferred.promise;
            }
          } else {
            if (authResult.accessToken && authResult.idToken) {
              console.log('Authentication renewed!', authResult);
              self.isAuthenticated = true;
              self.setSession(authResult, function () {
                executeAfterLoginCallbacks();
              });
              deferred.resolve();
              return deferred.promise;
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
        store.remove('person_info');
        clearTimeout(tokenRenewalTimeout);
      };

      if (self.isAuthenticated) {
        if (!self.personInfo) {
          self.personInfo = store.get('person_info');
          if (!self.personInfo) {
            self.logout();
            $state.go('home');
          }
          console.log("Setting LockService person id to: " + self.personInfo.id);
        }
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
        return this.isAuthenticated && (self.getUserRole() === 'admin');
      };

      self.isUser = function () {
        return this.isAuthenticated && _.contains(['user', 'admin'], self.getUserRole());
      };

      // accessors

      self.getFirstName = function() {
        return !self.personInfo ? null : self.personInfo.first_name;
      };

      self.getPersonID = function() {
        return !self.personInfo ? null : self.personInfo.id;
      };

      self.getUserRole = function() {
        return !self.personInfo ? null : self.personInfo.user_role;
      };

      self.getRatingNotifications = function() {
        return !self.personInfo ? null : self.personInfo.rating_notifications;
      };

      // user management functions

      function syncPersonWithDB(idTokenPayload, callback) {
        var email = idTokenPayload.email;

        $http.get('/api/person', {params: {email: email}}).then(function (response) {
          var personData = response.data;

          if (personData.length === 0) {
            console.log("Redirecting back to home page, because no user found with e-mail '" + email + "'");
            self.logout();
          } else {
            copyPersonInfoToAuth(personData, idTokenPayload);
          }

          console.log("role found: " + self.getUserRole());

          callback();
        });
      }

      function copyPersonInfoToAuth(personData) {
        const personInfo = personData[0];
        console.log("Successful login!");
        console.log("Name: " + personInfo.first_name + " " + personInfo.last_name);
        console.log("PersonID: " + personInfo.id);

        self.personInfo = personInfo;

        console.log("Setting store with person id: " + self.person_id);
        store.set('person_info', personInfo);
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
