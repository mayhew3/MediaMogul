angular.module('mediaMogulApp')
  .service('LockService', ['$log', '$http', 'store', '$location',
    function ($log, $http, store, $location) {

      var self = this;
      var isAuthenticated = false;

      self.options = {
        autoclose: true,
        auth: {
          responseType: 'token id_token',
          redirectUrl: 'http://media-mogul.herokuapp.com/callback'
        }
      };
      
      self.lock = new Auth0Lock('QdwQv7LcXgmiUpYhXnTYyGQsXie2UQNb','mayhew3.auth0.com', self.options);
      
      console.log("Listeners being added.");
      self.lock.on('authenticated', function(authResult) {
        console.log("Authenticated event detected.");
        if (authResult && authResult.accessToken && authResult.idToken) {
          console.log('Authenticated!', authResult);
          self.isAuthenticated = true;
          self.setSession(authResult);
        }
      });
      
      self.lock.on('authorization_error', function(err) {
        self.isAuthenticated = false;
        console.log(err);
        alert('Error: ' + err.error + ". Check the console for further details.");
      });

      self.renew = function() {
        self.lock.checkSession(self.options, function(err, authResult) {
          if (err) {
            self.isAuthenticated = false;
            console.log(err);
            alert('Error: ' + err.error + ". Check the console for further details.");
          } else {
            if (authResult && authResult.accessToken && authResult.idToken) {
              console.log('Authenticated!', authResult);
              self.isAuthenticated = true;
              self.setSession(authResult);
            }
          }
        })
      };

      self.signout = function() {
        self.isAuthenticated = false;
        self.lock.signout();
        store.remove('profile');
        store.remove('token');
        store.remove('person_id');
        self.roles = [];
        self.person_id = undefined;
      };
      
      self.setSession = function(authResult) {
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

        syncPersonWithDB(authResult.idTokenPayload);
      };

      self.isAdmin = function () {
        return this.isAuthenticated && _.contains(this.roles, 'admin');
      };

      self.isUser = function () {
        return this.isAuthenticated && _.contains(this.roles, 'user');
      };

      // user management functions

      function syncPersonWithDB(profile) {
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

          $location.path('/tv/shows/main');
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