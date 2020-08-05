describe('episodeDetail', function() {

  let $controller, EpisodeDetailController, $rootScope, GroupService;
  let LockService;

  const episodeObj = {
    id: 123,
    title: 'Crunchy Nooks',
    absolute_number: 5,
    air_date: '2020-05-29T07:00:00.000Z',
    air_time: '2020-05-29T10:00:00.000Z',
    episode_number: 5,
    other_viewers: [],
    season: 1,
    series_id: 13
  };

  const myUnwatchedEpisode = {
    rating_id: null,
    rating_value: null,
    review: null,
    watched: false,
    watched_date: null
  }

  const myWatchedEpisode = {
    rating_id: 34,
    rating_value: 87,
    review: 'It was okay',
    watched: true,
    watched_date: '2020-05-30T15:23:54.126Z'
  }

  const groupViewers = [{
    first_name: 'Mayhew',
    person_id: 1,
    watched: true
  }, {
    first_name: 'Shirley',
    person_id: 4,
    watched: false
  }];

  const groupUnwatchedEpisode = {
    skipped: false,
    tv_group_id: 1,
    viewerInfos: groupViewers,
    watched: false
  }

  const groupWatchedEpisode = {
    skipped: false,
    tv_group_episode_id: 1234,
    tv_group_id: 1,
    viewerInfos: groupViewers,
    watched: true,
    watched_date: '2020-05-30T15:23:54.126Z'
  }

  const myViewerObj = {
    type: 'my',
    group_id: NaN
  };

  const groupViewerObj = {
    type: 'group',
    group_id: 1
  };

  beforeEach(module('mediaMogulApp'));

  beforeEach(inject(function(_$componentController_, _$rootScope_, _EpisodeService_, _ArrayService_, _LockService_, _DateService_,
                             _$q_, _GroupService_, _$http_, _SocketService_, _ObjectCopyService_) {
    $controller = _$componentController_;
    LockService = _LockService_;
    $rootScope = _$rootScope_;
    GroupService = _GroupService_;
  }));

  function create(viewerObj, watched) {
    spyOn(GroupService, 'getGroupEpisode').and.callFake((episode) => {
      expect(episode).toEqual(episodeObj);
      return !watched ? groupUnwatchedEpisode : groupWatchedEpisode;
    });

    const dependencies = {
      $scope: $rootScope.$new(true),
      GroupService: GroupService
    };

    episodeObj.personEpisode = !watched ? myUnwatchedEpisode : myWatchedEpisode;

    const bindings = {
      episode: episodeObj,
      postViewingCallback: () => {},
      postRatingChangeCallback: () => {},
      viewer: viewerObj,
      isInViewerCollection: () => true,
      previousUnwatched: {}
    };

    EpisodeDetailController = $controller('episodeDetail', dependencies, bindings);
  }

  function createAsMy(watched) {
    create(myViewerObj, watched);
  }

  function createAsMyWatched() {
    createAsMy(true);
  }

  function createAsMyUnwatched() {
    createAsMy(false);
  }

  function createAsGroup(watched) {
    create(groupViewerObj, watched);
  }

  function createAsGroupWatched() {
    createAsGroup(true);
  }

  function createAsGroupUnwatched() {
    createAsGroup(false);
  }

  function init() {
    EpisodeDetailController.$onInit();
  }

  function initAsMy() {
    createAsMy();
    init();
  }

  it('should exist', () => {
    createAsMy();
    expect(EpisodeDetailController).toBeDefined();
  });

  it('episode exists', () => {
    createAsMy();
    const episode = EpisodeDetailController.episode;
    expect(episode).toBeDefined();
    expect(episode.id).toEqual(123);
  });

  it('my viewer', () => {
    createAsMy();
    const viewer = EpisodeDetailController.viewer;
    expect(viewer).toBeDefined();
    expect(viewer.type).toEqual('my');
    expect(viewer.group_id).toBeNaN();
    expect(EpisodeDetailController.isInGroupMode()).toBeFalse();
  });

  it('group viewer', () => {
    createAsGroup();
    const viewer = EpisodeDetailController.viewer;
    expect(viewer).toBeDefined();
    expect(viewer.type).toEqual('group');
    expect(viewer.group_id).toEqual(1);
    expect(EpisodeDetailController.isInGroupMode()).toBeTrue();
  });

  it('init my unwatched', () => {
    createAsMyUnwatched();
    expect(EpisodeDetailController.watchedDate).toBeUndefined();
    init();
    expect(EpisodeDetailController.watchedDate).toBeCloseTo(new Date());
    expect(EpisodeDetailController.airDate).toEqual(new Date(episodeObj.air_date));
    expect(EpisodeDetailController.original_rating_value).toBeNull();
    expect(EpisodeDetailController.rating_value).toBeNull();
    expect(EpisodeDetailController.original_review).toBeNull();
    expect(EpisodeDetailController.review).toBeNull();
  });

  it('init my watched', () => {
    createAsMyWatched();
    expect(EpisodeDetailController.watchedDate).toBeUndefined();
    init();
    expect(EpisodeDetailController.watchedDate).toEqual(new Date(myWatchedEpisode.watched_date));
    expect(EpisodeDetailController.airDate).toEqual(new Date(episodeObj.air_date));
    expect(EpisodeDetailController.original_rating_value).toEqual(87);
    expect(EpisodeDetailController.rating_value).toEqual(87);
    expect(EpisodeDetailController.original_review).toEqual('It was okay');
    expect(EpisodeDetailController.review).toEqual('It was okay');
  });

  it('init group unwatched', () => {
    createAsGroupUnwatched();
    expect(EpisodeDetailController.watchedDate).toBeUndefined();
    init();
    expect(EpisodeDetailController.watchedDate).toBeCloseTo(new Date());
    expect(EpisodeDetailController.airDate).toEqual(new Date(episodeObj.air_date));
    expect(EpisodeDetailController.original_rating_value).toBeNull();
    expect(EpisodeDetailController.rating_value).toBeNull();
    expect(EpisodeDetailController.original_review).toBeNull();
    expect(EpisodeDetailController.review).toBeNull();
  });

  it('init group watched', () => {
    createAsGroupWatched();
    expect(EpisodeDetailController.watchedDate).toBeUndefined();
    init();
    expect(EpisodeDetailController.watchedDate).toEqual(new Date(myWatchedEpisode.watched_date));
    expect(EpisodeDetailController.airDate).toEqual(new Date(episodeObj.air_date));
    expect(EpisodeDetailController.original_rating_value).toEqual(87);
    expect(EpisodeDetailController.rating_value).toEqual(87);
    expect(EpisodeDetailController.original_review).toEqual('It was okay');
    expect(EpisodeDetailController.review).toEqual('It was okay');
  });

});
