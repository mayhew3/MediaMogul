var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var SeriesSchema = new Schema({
    SeriesTitle: String,
    IsEpisodic: Boolean,
    SeriesId: String,
    Tier: Number,
    Metacritic: Number
}, {_id : true});
mongoose.model('series', SeriesSchema);
