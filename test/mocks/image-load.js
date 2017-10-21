(function() {

  var nativeImage = Image, fakeSrc, fakeWidth, fakeHeight;

  class ImageLoadMock {

    // --- Mocks

    apply() {
      window.Image = MockImage;
    }

    release() {
      window.Image = nativeImage;
      fakeSrc    = undefined;
      fakeWidth  = undefined;
      fakeHeight = undefined;
    }

    setFakeDimensions(w, h) {
      fakeWidth = w;
      fakeHeight = h;
    }

  }

  class MockImage extends Image {

    get src() {
      if (fakeSrc !== undefined) {
        return fakeSrc;
      } else {
        return super.url;
      }
    }

    set src(url) {
      // If the src is not a real URL, then store it to retrieve
      // later. Doing this to avoid actually loading the image.
      var protocol = url.slice(0, 4);
      if (protocol === 'http' || protocol === 'data') {
        super.src = url;
      } else {
        fakeSrc = url;
      }
    }

    get width() {
      if (fakeWidth !== undefined) {
        return fakeWidth;
      } else {
        return super.width;
      }
    }

    get height() {
      if (fakeHeight !== undefined) {
        return fakeHeight;
      } else {
        return super.height;
      }
    }

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
