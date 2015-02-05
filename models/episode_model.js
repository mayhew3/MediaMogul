var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var EpisodeSchema = new Schema({
    OnTiVo:Boolean,
    SeriesId:Schema.Types.ObjectId,
    TiVoDescription:String,
    TiVoDeletedDate:Date,
    TiVoEpisodeNumber:Number,
    TiVoEpisodeTitle:String,
    TiVoProgramId:String,
    TiVoSeriesTitle:String,
    TiVoShowingStartTime:Date,
    TiVoSuggestion:Boolean,
    MatchingStump:Boolean,
    Watched:Boolean,
    WatchedDate:Date,
    tvdbEpisodeId:Number,
    tvdbSeason:Number,
    tvdbEpisodeNumber:Number,
    tvdbFirstAired:Date,
    tvdbAirsTime:String
}, {_id : true});
mongoose.model('episodes', EpisodeSchema);
