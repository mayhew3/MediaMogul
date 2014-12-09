var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var EpisodeSchema = new Schema({
    Title: String,
    EpisodeNumber: Number,
    EpisodeTitle: String,
    ShowingStartTime: Date,
    DeletedDate: Date,
    Suggestion: Boolean,
    Watched : Boolean
}, {_id : true});
mongoose.model('episodes', EpisodeSchema);
