(function() {

  var nativeImage = Image;

  class ImageLoadMock {

    // --- Mocks

    apply(width, height) {
      window.Image = MockImage;
    }

    release() {
      window.Image = nativeImage;
    }

  }

  class MockImage extends Image {

    addEventListener(type, fn) {
      if (type === 'load') {
        // Naively not worrying about a fake
        // event for testing purposes.
        fn();
      } else {
        super.addEventListener(type, fn);
      }
    }

  }

  window.imageLoadMock = new ImageLoadMock();

})();
