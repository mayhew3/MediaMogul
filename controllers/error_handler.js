
exports.throwError = function(err, consoleMsg, response) {
  response.status(500);
  response.json({ error: consoleMsg });
  throw new Error(consoleMsg + ': ' + err.message);
};
