(function() {

  // Our fixtures are held inside a dislay: none div, so getBoundingClientRect
  // will not report correct values, so instead override this method to report
  // based on computed styles so that the complexities of actually rendering
  // the element do not have to be taken into account. Note that this script
  // is intentionally very simple and does not take into account transform
  // rotation, translation, etc, so should only be used in straightfoward
  // testing cases.

  function mockGetBoundingClientRect(el) {

    el.getBoundingClientRect = function() {
      return getComputedBoundingClientRect(this);
    };

    function getComputedBoundingClientRect(el) {
      var rect = getRect(el), next;
      while (el = el.offsetParent) {
        next = getRect(el, true);
        rect.x      += next.x;
        rect.y      += next.y;
        rect.top    += next.top;
        rect.left   += next.left;
        rect.right  += next.left;
        rect.bottom += next.top;
      }
      return rect;
    }

    function getRect(el, isParent) {
      var style = window.getComputedStyle(el);
      var rect = {};
      rect.width  = getRequiredValue(style, 'width');
      rect.height = getRequiredValue(style, 'height');
      setPositioningValue(rect, style, rect.width, 'Left', 'Right', isParent);
      setPositioningValue(rect, style, rect.height, 'Top',  'Bottom', isParent);
      rect.x = rect.left;
      rect.y = rect.top;
      return rect;
    }

    function setPositioningValue(rect, style, dim, cProp, cInvertedProp, isParent) {
      var prop, invertedProp, marginProp, invertedMarginProp, val;

      prop               = cProp.toLowerCase();
      invertedProp       = cInvertedProp.toLowerCase();
      marginProp         = 'margin' + cProp;
      invertedMarginProp = 'margin' + cInvertedProp;

      if ((val = getValue(style, prop)) !== 0) {
        rect[prop] = val + getOptionalValue(style, marginProp);
        rect[invertedProp] = val + dim;
      } else if ((val = getValue(style, invertedProp)) !== 0) {
        rect[prop] = val - dim;
        rect[invertedProp] = val + getOptionalValue(style, invertedMarginProp);
      } else if (isParent) {
        rect[prop] = getOptionalValue(style, marginProp);
        rect[invertedProp] = 0;
      } else {
        throwError();
      }
    }

    function getValue(style, prop) {
      return parseFloat(style[prop]);
    }

    function getOptionalValue(style, prop) {
      return getValue(style, prop) || 0;
    }

    function getRequiredValue(style, prop) {
      var val = getValue(style, prop);
      if (isNaN(val)) {
        throwError();
      }
      return val;
    }

    function throwError() {
      throw new Error('getBoundingClientRect mock failed');
    }

  }

  window.mockGetBoundingClientRect = mockGetBoundingClientRect;

})();
