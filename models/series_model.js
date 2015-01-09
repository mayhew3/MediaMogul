var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var SeriesSchema = new Schema({
    SeriesTitle: String,
    IsEpisodic: Boolean,
    SeriesId: String,
    Tier: Number,
    Metacritic: Number,
    MyRating: Number,
    ViewingLocations: [String],
    tvdbId: Number,
    tvdbName: String,
    tvdbAirsDayOfWeek: String,
    tvdbAirsTime: String,
    tvdbFirstAired: Date,
    tvdbGenre: [String],
    tvdbNetwork: String,
    tvdbOverview: String,
    tvdbRating: Number,
    tvdbRatingCount: Number,
    tvdbRuntime: Number,
    tvdbStatus: String,
    tvdbPoster: String,
    tvdbEpisodes: [{
        tvdbSeason: Number,
        tvdbEpisodeNumber: Number,
        tvdbEpisodeName: String,
        tvdbFirstAired: Date,
        tvdbOverview: String
    }]
}, {_id : true});
mongoose.model('series', SeriesSchema);
