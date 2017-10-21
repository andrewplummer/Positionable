(function() {

  var nativeSetTimeout   = window.setTimeout;
  var nativeClearTimeout = window.clearTimeout;
  var nativeDate         = window.Date;

  var startTime, currentTime;

  class SetTimeoutMock {

    // Note that Javascript's sort method is not guaranteed to be
    // stable, so applying the concept of timeMarkers here to
    // retain the correct callback order for a given time.

    constructor() {
      this.currentId = 0;
      this.timeMarkers = [];
      this.setTimeout = this.setTimeout.bind(this);
      this.clearTimeout = this.clearTimeout.bind(this);
    }

    tick(ms) {
      var endTime = startTime + ms;
      this.advanceToTime(endTime);
    }

    // --- Mocks

    apply() {
      this.reset();
      window.setTimeout   = this.setTimeout;
      window.clearTimeout = this.clearTimeout;
      window.Date = MockDate;
    }

    release() {
      this.timeMarkers = [];
      window.setTimeout   = nativeSetTimeout;
      window.clearTimeout = nativeClearTimeout;
      window.Date         = nativeDate;
    }

    clearTimeout(id) {
      this.timeMarkers = this.timeMarkers.filter(tm => {
        tm.callbacks = tm.callbacks.filter(cb => cb.id !== id);
        return tm.callbacks.length > 0;
      });
    }

    setTimeout(fn, delay) {
      var args, time, id, callback, timeMarker;

      args = Array.prototype.slice.call(arguments, 2);
      time = currentTime + delay;
      id   = this.getNextId();
      callback = {
        id: id,
        fn: fn,
        time: time,
        args: args
      };

      timeMarker = this.findOrCreateTimeMarker(time);
      timeMarker.callbacks.push(callback);

      return id;
    }

    // --- Private

    reset() {
      startTime = Date.now();
      startTime = 0;
      currentTime = startTime;
    }

    getNextId() {
      return this.currentId++;
    }

    findOrCreateTimeMarker(time) {
      return this.timeMarkers.find(tm => tm.time === time) || this.getNewTimeMarker(time);
    }

    getNewTimeMarker(time) {
      var timeMarker;
      timeMarker = {
        time: time,
        callbacks: []
      };
      this.timeMarkers.push(timeMarker);
      return timeMarker;
    }

    advanceToTime(time) {
      var timeMarker;

      while (timeMarker = this.getNextTimeMarkerBefore(time)) {
        this.executeTimeMarker(timeMarker);
      }

      currentTime = time;
    }

    executeTimeMarker(timeMarker) {
      currentTime = timeMarker.time;
      timeMarker.callbacks.forEach(cb => cb.fn.apply(null, cb.args));
      this.timeMarkers = this.timeMarkers.filter(tm => tm !== timeMarker);
    }

    getNextTimeMarkerBefore(time) {
      var expiredMarkers;
      this.timeMarkers.sort((a, b) => {
        return a.time - b.time;
      });
      expiredMarkers = this.timeMarkers.filter(tm => tm.time <= time);
      return expiredMarkers[0];
    }

  }

  class MockDate {

    static now() {
      return currentTime;
    }

    constructor() {
      this.time = currentTime;
    }

    valueOf() {
      return this.time;
    }

  }

  window.setTimeoutMock = new SetTimeoutMock();

})();
