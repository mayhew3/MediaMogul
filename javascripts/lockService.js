angular.module('mediaMogulApp')
  .service('LockService', ['$log', '$http', 'store', '$location', 'jwtHelper', '__env',
    '$q', 'ArrayService', '$state', 'SystemEnvService',
    function ($log, $http, store, $location, jwtHelper, __env, $q, ArrayService, $state, SystemEnvService) {

      const self = this;
      let tokenRenewalTimeout;

      const afterLoginCallbacks = [];

      let envName;

      self.isAuthenticated = function() {
        return isLoggedInAsTest() || isLoggedInAsAuth();
      };

      function isLoggedInAsTest() {
        const personInfo = getPersonInfo();
        return (envName === 'test' && !!personInfo);
      }

      function isLoggedInAsAuth() {
        const token = getToken();
        const personInfo = getPersonInfo();
        return !!personInfo && !!token && !jwtHelper.isTokenExpired(token);
      }

      self.loginAsTest = function() {
        return new Promise((resolve, reject) => {
          $http.get('/api/testData').then(result => {
            const person = result.data;
            if(!person || !person.email || !person.id) {
              console.log('Invalid person returned: ' + JSON.stringify(person));
              reject(new Error('Invalid person returned: ' + JSON.stringify(person)));
            } else {
              self.personInfo = person;
              store.set('person_info', person);
              resolve(person);
            }
          }).catch(err => reject(err));
        });
      };

      function handleEnvName(env) {
        envName = env;

        if (envName !== 'test') {

          self.lock = new Auth0Lock(__env.auth0_client, __env.auth0_domain, self.options);

          console.log("Listeners being added.");
          self.lock.on('authenticated', function(authResult) {
            console.log("Authenticated event detected.");
            if (authResult && authResult.accessToken && authResult.idToken) {
              console.log('Authenticated!', authResult);
              // self.isAuthenticated = true;
              self.setSession(authResult, function() {
                executeAfterLoginCallbacks();
                $state.go('tv.shows.my.dashboard')
              });
            }
          });

          self.lock.on('authorization_error', function(err) {
            // self.isAuthenticated = false;
            console.log(err);
            alert('Error: ' + err.error + ". Check the console for further details.");
          });

        }

        if (self.isAuthenticated() || self.isInTestMode()) {
          if (!self.personInfo) {
            self.personInfo = store.get('person_info');
            if (!self.personInfo) {
              self.logout();
              $state.go('home');
            } else {
              console.log("Setting LockService person id to: " + self.personInfo.id);
            }
          }
        }

      }

      SystemEnvService.waitForEnvName(handleEnvName);

      function isInTestMode() {
        return envName === 'test';
      }

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
        if (self.isAuthenticated()) {
          callback();
        } else {
          afterLoginCallbacks.push(callback);
        }
      };

      function executeAfterLoginCallbacks() {
        _.forEach(afterLoginCallbacks, callback => callback());
        ArrayService.emptyArray(afterLoginCallbacks);
      }

      self.renew = function() {
        let deferred = $q.defer();
        console.log("Attempting to renew token...");
        self.lock.checkSession({}, function(err, authResult) {
          if (err || !authResult) {
            // self.isAuthenticated = false;
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
              // self.isAuthenticated = true;
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
        // self.isAuthenticated = false;
        // todo: re-enable for MM-495
        // self.lock.logout();
        store.remove('profile');
        store.remove('token');
        store.remove('person_info');
        delete self.personInfo;
        clearTimeout(tokenRenewalTimeout);
      };

      function getToken() {
        return store.get('token');
      }

      function getPersonInfo() {
        return store.get('person_info');
      }

      self.loginAsAdminForTest = () => {
        if (isInTestMode()) {
          syncPersonWithDB('scorpy@gmail.com', () => {
            executeAfterLoginCallbacks();
            $state.go('tv.shows.my.dashboard');
          });
        }
      };

      self.isInTestMode = () => SystemEnvService.isInTestMode();

      self.login = function() {
        if (isInTestMode()) {
          self.loginAsTest().then(() => $state.go('tv.shows.my.dashboard'));
        } else {
          self.lock.show();
        }
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

        self.scheduleRenewal();

        syncPersonWithDB(authResult.idTokenPayload.email, callback);
      };

      self.isAdmin = function () {
        return self.isAuthenticated() && (self.getUserRole() === 'admin');
      };

      self.isUser = function () {
        return self.isAuthenticated() && _.contains(['user', 'admin'], self.getUserRole());
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

      function syncPersonWithDB(email, callback) {

        $http.get('/api/person', {params: {email: email}}).then(function (response) {
          const personData = response.data;

          if (personData.length === 0) {
            console.log("Redirecting back to home page, because no user found with e-mail '" + email + "'");
            self.logout();
          } else {
            copyPersonInfoToAuth(personData);
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
      }


    }
  ]);
