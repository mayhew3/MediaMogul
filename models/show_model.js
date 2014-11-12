var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var ShowSchema = new Schema({
    Title: String,
    EpisodeNumber: Number,
    EpisodeTitle: String,
    ShowingStartTime: Date,
    DeletedDate: Date,
    Suggestion: Boolean
});
mongoose.model('episodes', ShowSchema);
