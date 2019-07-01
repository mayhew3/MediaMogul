// conf.js

// Requires global protractor installation. Run 'npm install -g protractor', then 'webdriver-manager update'.
// Then use the global protractor location in WebStorm config:
//    ~\AppData\Roaming\npm\node_modules\protractor

const userDir = process.env.USERPROFILE;

exports.config = {
  framework: 'jasmine',
  seleniumServerJar: userDir + '\\AppData\\Roaming\\npm\\node_modules\\' +
    'protractor\\node_modules\\' +
    'webdriver-manager\\selenium\\' +
    'selenium-server-standalone-3.141.59.jar',
  specs: ['spec.js']
};
