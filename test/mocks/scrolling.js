(function() {

  // Note that forcing the browser to appear scrolled for the purposes of testing
  // is tricky. The whileScrolled method will attempt to actually scroll the page
  // by making the document height taller and using window.scrollTo. This will
  // correctly set the window.scrollX/Y properties as well as pageX/Y properties
  // in mouse events, however the document scroll event doesn't appear to fire
  // in the same thread (it may be asynchronous?) so this method cannot be used
  // to test things that are expecting it to fire immediately. Instead, the
  // whileFakeScrolled method can be used to simply shadow the window globals
  // allowing you to call handlers that would use onScroll manually.


  function whileScrolled(y, fn) {
    document.documentElement.style.height = '10000px';
    window.scrollTo(0, y);
    fn();
    document.documentElement.style.height = '';
    window.scrollTo(0, 0);
    // Need to access this property once to force it to
    // update after the document has returned to normal height.
    window.scrollY;
  }

  function whileFakeScrolled(y, fn) {
    var lastY = window.scrollY;
    window.scrollY = y;
    fn();
    window.scrollY = lastY;
  }

  window.whileScrolled = whileScrolled;
  window.whileFakeScrolled = whileFakeScrolled;

})();
