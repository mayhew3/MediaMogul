var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var ErrorLogSchema = new Schema({
    TiVoName: String,
    FormattedName: String,
    TVDBName: String,
    ErrorType: String,
    ErrorMessage: String,
    TiVoID: String,
    EventDate : Date,
    Resolved : Boolean,
    ResolvedDate: Date,
    Context: String,
    IgnoreError: Boolean,
    ChosenName: String
}, {_id : true});
mongoose.model('errorlogs', ErrorLogSchema);
