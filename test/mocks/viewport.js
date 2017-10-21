(function() {

  var nativeInnerWidth  = window.innerWidth;
  var nativeInnerHeight = window.innerHeight;

  class ViewportMock {

    // It seems innerWidth/innerHeight are writeable so
    // we can get away with this.

    apply(w, h) {
      window.innerWidth  = w;
      window.innerHeight = h;
    }

    release() {
      window.innerWidth  = nativeInnerWidth;
      window.innerHeight = nativeInnerHeight;
    }

  }

  window.viewportMock = new ViewportMock();

})();
