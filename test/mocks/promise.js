(function() {

  var nativePromise = Promise;

  class PromiseMock {

    // --- Mocks

    apply() {
      window.Promise = MockPromise;
    }

    release() {
      window.Promise = nativePromise;
    }

  }

  class MockPromise {

    static resolve(arg) {
      return new MockPromise((resolve) => {
        resolve(arg);
      });
    }

    constructor(fn) {
      fn((arg) => {
        this.fulfilled = true;
        this.arg = arg;
      }, (arg) => {
        this.rejected = true;
        this.arg = arg;
      });
    }

    then(fn) {
      if (this.fulfilled) {
        fn(this.arg);
      }
    }

    catch(fn) {
      if (this.rejected) {
        fn(this.arg);
      }
    }

  }

  window.promiseMock = new PromiseMock();

})();
