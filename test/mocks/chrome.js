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

    getStoredData(key) {
      if (key) {
        return storageData[key];
      } else {
        return storageData;
      }
    }

    setStoredData(key, val) {
      if (!storageData) {
        storageData = {};
      }
      storageData[key] = val;
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

          function copyData(key) {
            // Can't use Object.assign here as it will
            // overwrite undefined values that should
            // not exist.
            if (key in storageData) {
              data[key] = storageData[key];
            }
          }

          if (!arg) {
            data = Object.assign(storageData);
          } else if (Array.isArray(arg)) {
            arg.forEach(key => copyData(key));
          } else if (typeof arg === 'string') {
            copyData(arg);
          } else if (typeof arg === 'object') {
            for (var key in obj) {
              if(!obj.hasOwnProperty(key)) continue;
              copyData(key);
            };
          }
          fn(data);
        },

        set: function(data, fn) {
          storageData = Object.assign(storageData, data);
          fn();
        },

        remove: function(arg, fn) {
          var arr = typeof arg === 'string' ? [arg] : arg;
          arr.forEach(key =>  {
            delete storageData[key];
          });
          fn();
        }

      }
    }
  };

  window.chromeMock = new ChromeMock();

})();
