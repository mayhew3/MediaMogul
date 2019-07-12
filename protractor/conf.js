// conf.js

// Requires global protractor installation. Run 'npm install -g protractor', then 'webdriver-manager update'.
// Then use the global protractor location in WebStorm config:
//    ~\AppData\Roaming\npm\node_modules\protractor

const assert = require('assert');

const profileDir = process.env.E2E_CHROME_PROFILE;
assert(!!profileDir, 'Need E2E_CHROME_PROFILE environment variable!');

exports.config = {
  framework: 'jasmine',
  specs: ['spec.js'],
  capabilities: {
    'browserName': 'chrome',
    'chromeOptions': {
      'args': ['user-data-dir=' + profileDir]
    }
  },
  plugins: [{
    package: 'protractor-console-plugin',
    failOnWarning: false,
    failOnError: true,
    logWarnings: true
  }]
};
