(function() {

  // Should be null when testing, but just in case.
  var nativeChrome = window.chrome;

  var storageData, mockChrome, fakeResponse;

  class ChromeMock {

    apply() {
      storageData = {};
      window.chrome = mockChrome;
    }

    release() {
      window.chrome = nativeChrome;
    }

    mockSendMessage(response) {
      fakeResponse = response;
    }

  }

  mockChrome = {

    runtime: {
      sendMessage: function(message, fn) {
        fn(fakeResponse);
      }
    },

    storage: {
      sync: {

        get: function(arg, fn) {
          var data = {};
          if (!arg) {
            data = Object.assign(storageData);
          } else if (Array.isArray(arg)) {
            arg.forEach(s => data[s] = storageData[s]);
          } else if (typeof arg === 'string') {
            data[arg] = storageData[arg];
          } else if (typeof arg === 'object') {
            data = Object.assign(storageData, arg);
          }
          fn(data);
        },

        set: function(data, fn) {
          storageData = Object.assign(storageData, data);
          if (fn) {
            fn();
          }
        },

        clear: function(fn) {
          storageData = {};
          if (fn) {
            fn();
          }
        }

      }
    }
  };

  window.chromeMock = new ChromeMock();

})();
