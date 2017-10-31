(function() {

  // Should be null when testing, but just in case.
  var nativeConsole = window.console;

  class ConsoleMock {

    apply() {
      window.console = new MockConsole();
    }

    release() {
      window.console = nativeConsole;
    }

    getLogCount() {
      return window.console.logCount;
    }

    getInfoCount() {
      return window.console.infoCount;
    }

    getWarnCount() {
      return window.console.warnCount;
    }

    getErrorCount() {
      return window.console.errorCount;
    }

  }

  class MockConsole {

    constructor() {
      this.logCount = 0;
      this.infoCount = 0;
      this.warnCount = 0;
      this.errorCount = 0;
    }

    log() {
      this.logCount += 1;
    }

    info() {
      this.infoCount += 1;
    }

    warn() {
      this.warnCount += 1;
    }

    error() {
      this.errorCount += 1;
    }

  }

  window.consoleMock = new ConsoleMock();

})();
