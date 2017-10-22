(function() {

  var nativeConsole = window.console;

  class ConsoleMock {

    apply(fakeResponse) {
      window.console = new MockConsole();
    }

    release() {
      window.console = nativeConsole;
    }

  }

  class MockConsole {

    constructor() {
      this.errorCount = 0;
      this.error = this.error.bind(this);
    }

    error() {
      this.errorCount += 1;
    }

  }

  window.consoleMock = new ConsoleMock();

})();
