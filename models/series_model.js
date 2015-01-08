var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var SeriesSchema = new Schema({
    SeriesTitle: String,
    IsEpisodic: Boolean,
    SeriesId: String,
    Tier: Number,
    Metacritic: Number,
    MyRating: Number,
    tvdbId: Number,
    tvdbName: String,
    airsDayOfWeek: String,
    airsTime: String,
    firstAired: Date,
    genre: [String],
    network: String,
    overview: String,
    rating: Number,
    ratingCount: Number,
    status: String,
    poster: String
}, {_id : true});
mongoose.model('series', SeriesSchema);
