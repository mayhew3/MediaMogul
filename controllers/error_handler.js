
exports.throwError = function(err, consoleMsg, response) {
  response.status(500);
  response.json({ error: consoleMsg });
  console.error(consoleMsg);
  throw err;
};
