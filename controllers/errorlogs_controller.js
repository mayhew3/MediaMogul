exports.getErrorLogs = function(req, res) {
  /*
  ErrorLog.find({Resolved:false}).sort({EventDate:-1})
      .exec(function(err, errorlogs) {
          if (!errorlogs) {
              res.status(404).json({msg: 'ErrorLogs Not Found.'});
          } else {
              res.json(errorlogs);
          }
      });
  */
};
exports.setChosenName = function(req, res) {
  var id = req.body.errorLogID;
  var chosenName = req.body.chosenName;
/*
  ErrorLog.update({_id : id}, {ChosenName: chosenName})
    .exec(function(err) {
      if (err) {
        res.status(404).json({msg: 'Failed to update ChosenName on ErrorLog.'});
      } else {
        res.json({msg: "success"});
      }
    });
  */
};
exports.setIgnoreError = function(req, res) {
  var id = req.body.errorLogID;
  var ignoreError = req.body.ignoreError;
/*
  ErrorLog.update({_id : id}, {IgnoreError: ignoreError})
    .exec(function(err) {
      if (err) {
        res.status(404).json({msg: 'Failed to update IgnoreError on ErrorLog.'});
      } else {
        res.json({msg: "success"});
      }
    });
  */
};
