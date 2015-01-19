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
    DateAdded: Date,
    ActiveEpisodes: Number,
    DeletedEpisodes: Number,
    SuggestionEpisodes: Number,
    UnwatchedEpisodes: Number,
    UnwatchedUnrecorded: Number,
    tvdbOnlyEpisodes: Number,
    UnmatchedEpisodes: Number,
    LastUnwatched: Date,
    MostRecent: Date,
    tvdbId: Number,
    tvdbName: String,
    tvdbAirsDayOfWeek: String,
    tvdbAirsTime: String,
    tvdbFirstAired: String,
    tvdbGenre: [String],
    tvdbNetwork: String,
    tvdbOverview: String,
    tvdbRating: Number,
    tvdbRatingCount: Number,
    tvdbRuntime: Number,
    tvdbStatus: String,
    tvdbPoster: String,
    episodes: [Schema.Types.ObjectId]
}, {_id : true});
mongoose.model('series', SeriesSchema);
