(function() {

  // Should be null when testing, but just in case.
  var nativeChromeObject = window.chrome;

  class ChromeMock {

    mockSendMessage(fakeResponse) {
      window.chrome = getSendMessageMock(fakeResponse);
    }

    release() {
      window.chrome = nativeChromeObject;
    }

  }

  function getSendMessageMock(fakeResponse) {
    return {
      runtime: {
        sendMessage: function(message, fn) {
          fn(fakeResponse);
        }
      }
    };
  }

  window.chromeMock = new ChromeMock();

})();
