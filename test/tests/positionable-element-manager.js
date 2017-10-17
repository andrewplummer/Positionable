
describe('PositionableElementManager', function(uiRoot) {

  var manager, listener, els, el;

  class Listener {

    constructor() {
      this.focusedElementsChangedEvents = 0;
    }

    // --- Focus Events

    onFocusedElementsChanged() {
      this.focusedElementsChangedEvents += 1;
    }

    // --- Position Events

    onPositionDragIntentStart() {
    }

    onPositionDragIntentStop() {
    }

    onPositionDragStart() {
    }

    onPositionDragMove() {
    }

    onPositionDragStop() {
    }

    // --- Resize Events

    onResizeDragIntentStop() {
    }

    onResizeDragStart() {
    }

    onResizeDragMove() {
    }

    onResizeDragStop() {
    }

    // --- Rotation Events

    onRotationDragIntentStop() {
    }

    onRotationDragStart() {
    }

    onRotationDragMove() {
    }

    onRotationDragStop() {
    }

    // --- Background Image Events

    onBackgroundImageSnap() {
    }

    // --- Update Events

    onPositionUpdated() {
    }

    onBackgroundPositionUpdated() {
    }

    onDimensionsUpdated() {
    }

    onRotationUpdated() {
    }

    onZIndexUpdated() {
    }

  }

  setup(function() {
    listener = new Listener();
    manager = new PositionableElementManager(listener);
  });

  teardown(function() {
    releaseAppendedFixtures();
    el       = null;
    els      = null;
    manager  = null;
    listener = null;
  });

  function setupAbsolute(className) {
    el = appendAbsoluteBox(className);
    manager.findElements();
  }

  function setupFixed() {
    el = appendFixedBox();
    manager.findElements();
  }

  function setupMultiple() {
    var el1 = appendAbsoluteBox();
    var el2 = appendAbsoluteBox();
    manager.findElements();
    els = [el1, el2];
  }

  function setupNested() {
    el = appendNestedBox();
    manager.findElements();
  }

  function setupBox(left, top, width, height) {
    el = appendAbsoluteBox();
    el.style.left   = left;
    el.style.top    = top;
    el.style.width  = width;
    el.style.height = height;
    manager.findElements();
  }

  function setupEmBox(left, top, width, height, fontSize) {
    el = appendAbsoluteBox();
    el.style.left   = left;
    el.style.top    = top;
    el.style.width  = width;
    el.style.height = height;
    el.style.fontSize = fontSize;
    manager.findElements();
  }

  function setupBackgroundBox(backgroundPosition) {
    el = appendBackgroundImageBox();
    if (backgroundPosition) {
      el.style.backgroundPosition = backgroundPosition;
    }
    manager.findElements();
    forceBackgroundImageLoad();
  }

  function setupRotatedBackgroundBox() {
    el = appendRotatedBackgroundImageBox();
    manager.findElements();
    forceBackgroundImageLoad();
  }

  function forceBackgroundImageLoad() {
    // Force image loaded event to keep everything synchronous.
    // This can be done since the image is using a dataUri
    var backgroundImage = manager.elements[0].cssBackgroundImage;
    backgroundImage.img.src = backgroundImage.url;
    backgroundImage.onImageLoaded();
  }

  function getElementZIndex(el) {
    var zIndex = window.getComputedStyle(el).zIndex;
    return zIndex === 'auto' ? 0 : zIndex;
  }

  function setupPercentBox(left, top, width, height, offsetWidth, offsetHeight) {
    el = appendAbsoluteBox();
    el.style.left   = left;
    el.style.top    = top;
    el.style.width  = width;
    el.style.height = height;
    mockOffsetParentDimensions(el, offsetWidth, offsetHeight);
    manager.findElements();
  }

  function setupNestedPercentBox(left, top, width, height, offsetWidth, offsetHeight) {
    el = appendNestedBox();
    el.style.left   = left;
    el.style.top    = top;
    el.style.width  = width;
    el.style.height = height;
    mockOffsetParentDimensions(el, offsetWidth, offsetHeight);
    manager.findElements();
  }

  function mockOffsetParentDimensions(el, offsetWidth, offsetHeight) {
    mockGetter(el, 'offsetParent',  {
      offsetWidth: offsetWidth,
      offsetHeight: offsetHeight,
      style: {}
    });
  }

  function setupRotatedBox(left, top, width, height, rotation) {
    el = appendAbsoluteBox();
    el.style.left   = left;
    el.style.top    = top;
    el.style.width  = width;
    el.style.height = height;
    el.style.transform = 'rotate(' + rotation + ')';
    manager.findElements();
  }

  function setupInvertedBox(right, bottom, width, height) {
    el = appendInvertedBox();
    el.style.right  = right;
    el.style.bottom = bottom;
    el.style.width  = width;
    el.style.height = height;
    manager.findElements();
  }

  function setupInvertedRotatedBox(right, bottom, width, height, rotation) {
    el = appendInvertedBox();
    el.style.right  = right;
    el.style.bottom = bottom;
    el.style.width  = width;
    el.style.height = height;
    el.style.transform = 'rotate(' + rotation + ')';
    manager.findElements();
  }

  function clickElement(el) {
    fireMouseDownUp(el);
    fireClick(el)
  }

  function shiftClickElement(el) {
    fireShiftMouseDownUp(el);
    fireShiftClick(el)
  }

  function shiftClickElements(els) {
    els.forEach(el => shiftClickElement(el));
  }

  function assertElementFocused(el, flag) {
    var ui = getUiElement(el, '.ui');
    assert.equal(ui.classList.contains('ui--focused'), flag);
  }

  function assertBoxDimensions(el, left, top, width, height) {
    assert.equal(el.style.left,   left);
    assert.equal(el.style.top,    top);
    assert.equal(el.style.width,  width);
    assert.equal(el.style.height, height);
  }

  function assertInvertedBoxDimensions(right, bottom, width, height) {
    assert.equal(el.style.right,  right);
    assert.equal(el.style.bottom, bottom);
    assert.equal(el.style.width,  width);
    assert.equal(el.style.height, height);
  }

  function assertBoxTranslation(x, y) {
    var match = el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    var matchedX = parseFloat(match[1]);
    var matchedY = parseFloat(match[2]);
    assert.equalWithTolerance(matchedX, x, 0.01);
    assert.equalWithTolerance(matchedY, y, 0.01);
  }


  // --- Finding Elements

  it('should not find elements if they do not exist', function() {
    manager.findElements();
    assert.equal(manager.elements.length, 0);
  });

  it('should find absolute and fixed elements by default', function() {
    appendAbsoluteBox();
    appendFixedBox();
    manager.findElements();
    assert.equal(manager.elements.length, 2);
  });

  it('should not find relative or static elements by default', function() {
    appendRelativeBox();
    appendStaticBox();
    manager.findElements();
    assert.equal(manager.elements.length, 0);
  });

  it('should be able to use an explicit selector to include', function() {
    appendAbsoluteBox('box-1');
    appendAbsoluteBox('box-2');
    manager.findElements('.box-1');
    assert.equal(manager.elements.length, 1);
  });

  it('should be able to use an explicit selector to exclude', function() {
    appendAbsoluteBox('box-1');
    appendAbsoluteBox('box-2');
    manager.findElements(null, '.box-2');
    assert.equal(manager.elements.length, 1);
  });

  it('should not error on boxes with translate percentages', function() {
    appendAbsoluteBox('translate-percent-box');
    manager.findElements();
    assert.equal(manager.elements.length, 1);
  });

  it('should not error on boxes with matrix3d', function() {
    var el = appendAbsoluteBox('matrix-3d-box');
    manager.findElements();

    dragElement(getUiElement(el, '.rotation-handle'), 200, 200, 150, 200);
    dragElement(getUiElement(el, '.resize-handle-se'), 200, 200, 250, 250);

    assert.equal(el.style.transform, '');
    assert.equal(el.style.width, '150px');
    assert.equal(el.style.height, '150px');
  });

  // --- Focusing

  it('should focus element on position handle mousedown', function() {
    setupAbsolute();
    fireMouseDownUp(getUiElement(el, '.position-handle'));
    assertElementFocused(el, true);
  });

  it('should focus element on resize handle mousedown', function() {
    setupAbsolute();
    fireMouseDownUp(getUiElement(el, '.resize-handle'));
    assertElementFocused(el, true);
  });

  it('should focus elements on rotation handle mousedown', function() {
    setupAbsolute();
    fireMouseDownUp(getUiElement(el, '.rotation-handle'));
    assertElementFocused(el, true);
  });

  it('should swap focus by default', function() {
    setupMultiple();

    clickElement(els[0]);
    assertElementFocused(els[0], true);
    assertElementFocused(els[1], false);

    clickElement(els[1]);
    assertElementFocused(els[0], false);
    assertElementFocused(els[1], true);

  });

  it('should not toggle focus on shift click with single element', function() {
    setupAbsolute();

    clickElement(el);
    assertElementFocused(el, true);

    shiftClickElement(el);
    assertElementFocused(el, true);
  });

  it('should toggle focus on shift click when multiple are focused', function() {
    setupMultiple();

    clickElement(els[0]);
    assertElementFocused(els[0], true);
    assertElementFocused(els[1], false);

    shiftClickElement(els[1]);
    assertElementFocused(els[0], true);
    assertElementFocused(els[1], true);

    shiftClickElement(els[1]);
    assertElementFocused(els[0], true);
    assertElementFocused(els[1], false);

  });

  it('should put focused element on top', function() {
    setupMultiple();
    clickElement(els[0]);
    var z1 = getElementZIndex(els[0]);
    var z2 = getElementZIndex(els[1]);
    assert.isTrue(z1 > z2);
  });

  it('should put all focused element parents on top and then restore after unfocus', function() {
    setupNested();

    var zEl = getElementZIndex(el);
    var zParent = getElementZIndex(el.parentNode);

    // Need to mock the offsetParent property here because the
    // fixtures are rendered in a hidden box where it will be null.
    mockGetter(el, 'offsetParent',  el.parentNode);

    clickElement(el);
    assert.equal(getElementZIndex(el), String(PositionableElement.TOP_Z_INDEX));
    assert.equal(getElementZIndex(el.parentNode), String(PositionableElement.TOP_Z_INDEX));

    manager.unfocusAll();
    assert.equal(getElementZIndex(el), zEl);
    assert.equal(getElementZIndex(el.parentNode), zParent);
  });

  it('should fire one focus changed event when focused added', function() {
    setupAbsolute();
    clickElement(el);
    assert.equal(listener.focusedElementsChangedEvents, 1);
  });

  it('should fire one focus changed event when focused removed', function() {
    setupAbsolute();
    clickElement(el);
    manager.unfocusAll();
    assert.equal(listener.focusedElementsChangedEvents, 2);
  });

  it('should fire one focus changed event when focused swapped', function() {
    setupMultiple();
    clickElement(els[0]);
    assert.equal(listener.focusedElementsChangedEvents, 1);
    clickElement(els[1]);
    assert.equal(listener.focusedElementsChangedEvents, 2);
  });

  it('should allow selective focus by function', function() {
    setupMultiple();
    manager.setFocused(element => element.el === els[1]);
    assertElementFocused(els[0], false);
    assertElementFocused(els[1], true);
  });

  it('should temporarily drag a single element with the meta key depressed', function() {
    var positionHandle1;

    setupMultiple();
    manager.focusAll();

    positionHandle1 = getUiElement(els[0], '.position-handle');

    // Meta key depressed before drag start
    fireMetaMouseDown(positionHandle1, 150, 150);
    fireDocumentMetaMouseMove(175, 175);
    fireDocumentMetaMouseMove(200, 200);
    fireDocumentMetaMouseUp(200, 200);

    assert.equal(els[0].style.top,  '150px');
    assert.equal(els[0].style.left, '150px');
    assert.equal(els[1].style.top,  '');
    assert.equal(els[1].style.left, '');

    // Meta key depressed during drag move
    fireMouseDown(positionHandle1, 200, 200);
    fireDocumentMouseMove(225, 225);
    fireDocumentMetaMouseMove(250, 250);
    fireDocumentMetaMouseUp(250, 250);

    assert.equal(els[0].style.top,  '200px');
    assert.equal(els[0].style.left, '200px');
    assert.equal(els[1].style.top,  '125px');
    assert.equal(els[1].style.left, '125px');

    // Meta key released during drag move
    fireMetaMouseDown(positionHandle1, 250, 250);
    fireDocumentMetaMouseMove(275, 275);
    fireDocumentMouseMove(300, 300);
    fireDocumentMouseUp(300, 300);

    assert.equal(els[0].style.top,  '250px');
    assert.equal(els[0].style.left, '250px');
    assert.equal(els[1].style.top,  '150px');
    assert.equal(els[1].style.left, '150px');

  });

  it('should temporarily resize a single element with the meta key depressed', function() {
    var resizeHandle1;

    setupMultiple();
    manager.focusAll();

    resizeHandle1 = getUiElement(els[0], '.resize-handle-se');

    // Meta key depressed before resize start
    fireMetaMouseDown(resizeHandle1, 200, 200);
    fireDocumentMetaMouseMove(225, 225);
    fireDocumentMetaMouseMove(250, 250);
    fireDocumentMetaMouseUp(250, 250);

    assert.equal(els[0].style.width,  '150px');
    assert.equal(els[0].style.height, '150px');
    assert.equal(els[1].style.width,  '');
    assert.equal(els[1].style.height, '');

    // Meta key depressed during resize move
    fireMouseDown(resizeHandle1, 250, 250);
    fireDocumentMouseMove(275, 275);
    fireDocumentMetaMouseMove(300, 300);
    fireDocumentMetaMouseUp(300, 300);

    assert.equal(els[0].style.width,  '200px');
    assert.equal(els[0].style.height, '200px');
    assert.equal(els[1].style.width,  '125px');
    assert.equal(els[1].style.height, '125px');

    // Meta key released during drag move
    fireMetaMouseDown(resizeHandle1, 300, 300);
    fireDocumentMetaMouseMove(325, 325);
    fireDocumentMouseMove(350, 350);
    fireDocumentMouseUp(350, 350);

    assert.equal(els[0].style.width,  '250px');
    assert.equal(els[0].style.height, '250px');
    assert.equal(els[1].style.width,  '150px');
    assert.equal(els[1].style.height, '150px');

  });

  it('should temporarily rotate a single element with the meta key depressed', function() {
    var rotationHandle1;

    setupMultiple();
    manager.focusAll();

    rotationHandle1 = getUiElement(els[0], '.rotation-handle');

    // Meta key depressed before rotate start
    fireMetaMouseDown(rotationHandle1, 200, 200);
    fireDocumentMetaMouseMove(200, 200);
    fireDocumentMetaMouseMove(150, 221);
    fireDocumentMetaMouseMove(100, 200);
    fireDocumentMetaMouseUp(100, 200);

    assert.equal(els[0].style.transform,  'rotate(90deg)');
    assert.equal(els[1].style.transform,  '');

    // Meta key depressed during rotate move
    fireMouseDown(rotationHandle1, 100, 200);
    fireDocumentMouseMove(100, 200);
    fireDocumentMouseMove(79, 150);
    fireDocumentMetaMouseMove(79, 150);
    fireDocumentMetaMouseMove(100, 100);
    fireDocumentMetaMouseUp(100, 100);

    assert.equal(els[0].style.transform,  'rotate(180deg)');
    assert.equal(els[1].style.transform,  'rotate(45deg)');

    // Meta key released during rotate move
    fireMetaMouseDown(rotationHandle1, 100, 100);
    fireDocumentMetaMouseMove(100, 100);
    fireDocumentMetaMouseMove(150, 79);
    fireDocumentMouseMove(150, 79);
    fireDocumentMouseMove(200, 100);
    fireDocumentMouseUp(200, 100);

    assert.equal(els[0].style.transform,  'rotate(270deg)');
    assert.equal(els[1].style.transform,  'rotate(90deg)');

  });

  // --- Positioning

  it('should move', function() {
    setupAbsolute();
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assert.equal(el.style.left, '150px');
    assert.equal(el.style.top,  '150px');
  });

  it('should constrain move horizontally', function() {
    setupAbsolute();
    shiftDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 160);
    assert.equal(el.style.left, '150px');
    assert.equal(el.style.top,  '100px');
  });

  it('should constrain move vertically', function() {
    setupAbsolute();
    shiftDragElement(getUiElement(el, '.position-handle'), 150, 150, 160, 200);
    assert.equal(el.style.left, '100px');
    assert.equal(el.style.top,  '150px');
  });

  it('should move an absolute box with scroll', function() {

    whileFakeScrolled(500, () => {
      setupAbsolute();
      fireMouseDown(getUiElement(el, '.position-handle'), 50, 50);
      fireMouseMove(getUiElement(el, '.position-handle'), 100, 100);
      manager.elements[0].positionHandle.onScroll();
      fireDocumentMouseUp(100, 100);
      assert.equal(el.style.left, '150px');
      assert.equal(el.style.top,  '650px');
    });

  });

  it('should move a fixed box with scroll', function() {
    setupFixed();

    whileFakeScrolled(500, () => {
      dragElement(getUiElement(el, '.position-handle'), 0, 0, 100, 100);
    });

    assert.equal(el.style.left, '200px');
    assert.equal(el.style.top,  '200px');

  });

  it('should move a fixed box while scrolling', function() {
    setupFixed();

    fireMouseDown(getUiElement(el, '.position-handle'), 50, 50);
    fireMouseMove(getUiElement(el, '.position-handle'), 100, 100);
    assert.equal(el.style.left, '150px');
    assert.equal(el.style.top,  '150px');

    whileFakeScrolled(500, () => {
      manager.elements[0].positionHandle.onScroll();
    });
    fireDocumentMouseUp(100, 100);

    assert.equal(el.style.left, '150px');
    assert.equal(el.style.top,  '150px');

  });

  it('should move boxes positioned by percent', function() {
    setupPercentBox('10%', '10%', '100px', '100px', 1000, 1000);
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 300, 300);
    assert.equal(el.style.left, '25%');
    assert.equal(el.style.top,  '25%');
  });

  it('should move boxes nested inside non-positioned elements', function() {
    setupNestedPercentBox('10%', '10%', '100px', '100px', 1000, 1000);
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 300, 300);
    assert.equal(el.style.left, '25%');
    assert.equal(el.style.top,  '25%');
  });

  it('should move boxes positioned by em', function() {
    setupEmBox('5em', '5em', '5em', '5em', '25px');
    dragElement(getUiElement(el, '.position-handle'), 100, 100, 300, 300);
    assert.equal(el.style.left, '13em');
    assert.equal(el.style.top,  '13em');
  });

  // --- Background Positioning

  it('should not move background image when none exists', function() {
    setupAbsolute();
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assert.equal(el.style.backgroundPosition,  '');
  });

  it('should move background', function() {
    setupBackgroundBox();
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assert.equal(el.style.left, '');
    assert.equal(el.style.top,  '');
    assert.equal(el.style.backgroundPosition,  '70px 90px');
  });

  it('should shift to background move after normal move', function() {
    setupBackgroundBox();

    fireMouseDown(getUiElement(el, '.position-handle'), 150, 150);
    fireDocumentMouseMove(200, 150);
    fireDocumentMouseMove(250, 150);
    fireDocumentCtrlMouseMove(300, 150);
    fireDocumentCtrlMouseMove(330, 150);
    fireDocumentCtrlMouseUp(330, 150);

    assert.equal(el.style.top,   '100px');
    assert.equal(el.style.left,  '200px');
    assert.equal(el.style.backgroundPosition,  '100px 40px');

  });

  it('should shift to background move after resize move', function() {
    setupBackgroundBox();

    fireMouseDown(getUiElement(el, '.resize-handle-se'), 200, 200);
    fireDocumentMouseMove(250, 250);
    fireDocumentMouseMove(300, 300);
    fireDocumentCtrlMouseMove(350, 350);
    fireDocumentCtrlMouseMove(400, 400);
    fireDocumentCtrlMouseUp(400, 400);

    assert.equal(el.style.width,   '200px');
    assert.equal(el.style.height,  '200px');
    assert.equal(el.style.backgroundPosition,  '120px 140px');

  });

  it('should constrain background move', function() {
    setupBackgroundBox();
    shiftCtrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 160);
    assert.equal(el.style.left, '');
    assert.equal(el.style.top,  '');
    assert.equal(el.style.backgroundPosition,  '70px 40px');
  });

  it('should move background on resize handle drag while ctrl key down', function() {
    setupBackgroundBox();
    ctrlDragElement(getUiElement(el, '.resize-handle-nw'), 100, 100, 150, 150);
    assert.equal(el.style.left, '');
    assert.equal(el.style.top,  '');
    assert.equal(el.style.backgroundPosition,  '70px 90px');
  });

  it('should move background using percent values', function() {
    setupBackgroundBox('10% 10%');
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assert.equal(el.style.backgroundPosition,  '63.19% 63.19%');
  });

  // --- Resize

  it('should resize', function() {
    setupAbsolute();
    dragElement(getUiElement(el, '.resize-handle-e'), 200, 150, 300, 150);
    assert.equal(el.style.width,  '200px');
    assert.equal(el.style.height, '100px');
  });

  it('should resize inverted box dimensions', function() {
    setupAbsolute();
    dragElement(getUiElement(el, '.resize-handle-se'), 200, 200, 50, 50);
    assertBoxDimensions(el, '50px', '50px', '50px', '50px');
  });

  // --- Resize Reflecting

  it('should allow a box to be reflected from its opposite edges', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    dragElement(getUiElement(el, '.resize-handle-se'), 2420, 1580, 0, 0);
    assertBoxDimensions(el, '0px', '0px', '500px', '500px');
  });

  it('should allow a box to be reflected from its positioned edges', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    dragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 2920, 2080);
    assertBoxDimensions(el, '2420px', '1580px', '500px', '500px');
  });

  it('should allow an inverted box to be reflected from its opposite edges', function() {
    setupInvertedBox('500px', '500px', '1920px', '1080px');
    dragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 2420, 1580);
    assertInvertedBoxDimensions('0px', '0px', '500px', '500px');
  });

  it('should allow an inverted box to be reflected from its positioned edges', function() {
    setupInvertedBox('500px', '500px', '1920px', '1080px');
    dragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, -500, -500);
    assertInvertedBoxDimensions('2420px', '1580px', '500px', '500px');
  });

  // --- Resize Constraining - Basics

  it('should constrain resize', function() {
    setupAbsolute();
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 200, 200, 500, 300);
    assertBoxDimensions(el, '100px', '100px', '200px', '200px');
  });

  it('should not fail to constrain se resize on 0', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 0, 0);
    assertBoxDimensions(el, '0px', '0px', '0px', '0px');
  });

  it('should not fail to constrain nw resize on 0', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 1920, 1080);
    assertBoxDimensions(el, '1920px', '1080px', '0px', '0px');
  });

  it('should not interfere with non-constrainable handles', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-n'), 0, 0, 0, -1000);
    assertBoxDimensions(el, '0px', '-1000px', '1920px', '2080px');
  });

  // --- Resize constraining - special

  it('should allow a zero size element when constraining', function() {
    setupBox('100px', '100px', '100px', '100px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 200, 200, 276, 100);
    assertBoxDimensions(el, '100px', '100px', '0px', '0px');
  });

  // --- Resize Constraining - Normal Box

  it('should constrain ratio when dragging se corner right and down', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 2800, 1100);
    assertBoxDimensions(el, '0px', '0px', '1956px', '1100px');
  });

  it('should constrain ratio when dragging se corner right and up', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 2800, 900);
    assertBoxDimensions(el, '0px', '0px', '1600px', '900px');
  });

  it('should constrain ratio when dragging se corner left and down', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 1080, 1920);
    assertBoxDimensions(el, '0px', '0px', '1080px', '608px');
  });

  it('should constrain ratio when dragging se corner left and up', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 1420, 580);
    assertBoxDimensions(el, '0px', '0px', '1031px', '580px');
  });

  it('should constrain ratio when dragging nw corner right and down', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 500, 500);
    assertBoxDimensions(el, '889px', '500px', '1031px', '580px');
  });

  it('should constrain ratio when dragging nw corner right and up', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 1000, 0);
    assertBoxDimensions(el, '1000px', '781px', '1420px', '799px');
  });

  it('should constrain ratio when dragging nw corner left and down', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 0, 1000);
    assertBoxDimensions(el, '1389px', '1000px', '1031px', '580px');
  });

  it('should constrain ratio when dragging nw corner left and up', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 0, 0);
    assertBoxDimensions(el, '0px', '219px', '2420px', '1361px');
  });

  // --- Resize Constraining - Inverted Box

  it('should constrain ratio on inverted box when dragging se corner right and down', function() {
    setupInvertedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 2420, 1580);
    assertInvertedBoxDimensions('-500px', '-281px', '2420px', '1361px');
  });

  it('should constrain ratio on inverted box when dragging se corner right and up', function() {
    setupInvertedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 2420, 580);
    assertInvertedBoxDimensions('889px', '500px', '1031px', '580px');
  });

  it('should constrain ratio on inverted box when dragging se corner left and down', function() {
    setupInvertedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 1420, 1580);
    assertInvertedBoxDimensions('500px', '281px', '1420px', '799px');
  });

  it('should constrain ratio on inverted box when dragging se corner left and up', function() {
    setupInvertedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 1420, 580);
    assertInvertedBoxDimensions('889px', '500px', '1031px', '580px');
  });

  it('should constrain ratio on inverted box when dragging nw corner right and down', function() {
    setupInvertedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 500, 500);
    assertInvertedBoxDimensions('0px', '0px', '1031px', '580px');
  });

  it('should constrain ratio on inverted box when dragging nw corner right and up', function() {
    setupInvertedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 500, -500);
    assertInvertedBoxDimensions('0px', '0px', '1420px', '799px');
  });

  it('should constrain ratio on inverted box when dragging nw corner left and down', function() {
    setupInvertedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, -500, 500);
    assertInvertedBoxDimensions('0px', '0px', '1031px', '580px');
  });

  it('should constrain ratio on inverted box when dragging nw corner left and up', function() {
    setupInvertedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, -500, -500);
    assertInvertedBoxDimensions('0px', '0px', '2420px', '1361px');
  });

  // --- Resize constraining with reflection - normal box

  it('should allow a constrained resize to reflect from its opposite edge', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 2420, 1580, 0, 0);
    assertBoxDimensions(el, '0px', '219px', '500px', '281px');
  });

  it('should allow a constrained resize to reflect from its positioned edge', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 2920, 2080);
    assertBoxDimensions(el, '2420px', '1580px', '500px', '281px');
  });

  it('should allow a constrained resize on an inverted box to reflect from its opposite edge', function() {
    setupInvertedBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 2920, 2080);
    assertInvertedBoxDimensions('-500px', '-62px', '1000px', '563px');
  });

  it('should allow a constrained resize on an inverted box to reflect from its positioned edge', function() {
    setupInvertedBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 2420, 1580, 0, 0);
    assertInvertedBoxDimensions('2420px', '1580px', '500px', '281px');
  });

  // --- Resize on a rotated element

  it('should stay anchored when resizing a rotated element from se', function() {
    setupRotatedBox('100px', '100px', '100px', '100px', '45deg');
    dragElement(getUiElement(el, '.resize-handle-se'), 150, 221, 150, 280);
    assertBoxDimensions(el, '100px', '100px', '142px', '142px');
    assertBoxTranslation(-20.86, 8.64);
  });

  it('should stay anchored when resizing a rotated element from nw', function() {
    setupRotatedBox('100px', '100px', '100px', '100px', '45deg');
    dragElement(getUiElement(el, '.resize-handle-nw'), 150, 79, 150, 8);
    assertBoxDimensions(el, '50px', '50px', '150px', '150px');
    assertBoxTranslation(25.1, -10.4);
  });

  it('should stay anchored when resizing an inverted rotated element from se', function() {
    setupInvertedRotatedBox('100px', '100px', '100px', '100px', '45deg');
    dragElement(getUiElement(el, '.resize-handle-se'), 150, 221, 150, 280);
    assertInvertedBoxDimensions('58px', '58px', '142px', '142px');
    assertBoxTranslation(-20.86, 8.64);
  });

  it('should stay anchored when resizing an inverted rotated element from nw', function() {
    setupInvertedRotatedBox('100px', '100px', '100px', '100px', '45deg');
    dragElement(getUiElement(el, '.resize-handle-nw'), 150, 79, 150, 8);
    assertInvertedBoxDimensions('100px', '100px', '150px', '150px');
    assertBoxTranslation(25.1, -10.4);
  });

  // --- Resizing multiple elements

  it('should resize multiple elements from se handle', function() {
    setupMultiple();
    shiftClickElements(els);
    dragElement(getUiElement(els[1], '.resize-handle-se'), 200, 200, 250, 300);
    assertBoxDimensions(els[0], '100px', '100px', '150px', '200px');
    assertBoxDimensions(els[1], '100px', '100px', '150px', '200px');
  });

  it('should resize multiple elements from nw handle', function() {
    setupMultiple();
    shiftClickElements(els);
    dragElement(getUiElement(els[1], '.resize-handle-nw'), 100, 100, 50, 150);
    assertBoxDimensions(els[0], '50px', '150px', '150px', '50px');
    assertBoxDimensions(els[1], '50px', '150px', '150px', '50px');
  });

  it('should resize multiple elements with rotation', function() {
    var el1 = appendAbsoluteBox();
    var el2 = appendAbsoluteBox();
    el2.style.transform = 'rotate(45deg)';
    manager.findElements();

    shiftClickElements([el1, el2]);
    dragElement(getUiElement(el1, '.resize-handle-se'), 200, 200, 300, 300);
    assertBoxDimensions(el1, '100px', '100px', '200px', '200px');
    assertBoxDimensions(el2, '100px', '100px', '200px', '200px');
  });

  // --- Rotation

  it('should rotate', function() {
    setupAbsolute();
    dragElement(getUiElement(el, '.rotation-handle'), 200, 200, 150, 200);
    assert.equal(el.style.transform, 'rotate(45deg)');
  });

  it('should rotate with radians', function() {
    setupAbsolute('rotate-radian-box');
    dragElement(getUiElement(el, '.rotation-handle'), 100, 200, 100, 100);
    assert.equal(el.style.transform, 'rotate(3.14rad)');
  });

  it('should not allow radians to go negative', function() {
    setupAbsolute('rotate-radian-box');
    dragElement(getUiElement(el, '.rotation-handle'), 100, 200, 221, 150);
    assert.equal(el.style.transform, 'rotate(5.5rad)');
  });

  it('should rotate with gradians', function() {
    setupAbsolute('rotate-gradian-box');
    dragElement(getUiElement(el, '.rotation-handle'), 100, 200, 100, 100);
    assert.equal(el.style.transform, 'rotate(200grad)');
  });

  it('should not allow gradians to go negative', function() {
    setupAbsolute('rotate-gradian-box');
    dragElement(getUiElement(el, '.rotation-handle'), 100, 200, 221, 150);
    assert.equal(el.style.transform, 'rotate(350grad)');
  });

  it('should rotate with turns', function() {
    setupAbsolute('rotate-turn-box');
    dragElement(getUiElement(el, '.rotation-handle'), 100, 100, 200, 100);
    assert.equal(el.style.transform, 'rotate(0.75turn)');
  });

  it('should rotate based on the handle origin, not the original element rotation', function() {
    setupAbsolute();
    dragElement(getUiElement(el, '.rotation-handle'), 214, 194, 214, 195);
    assert.equal(el.style.transform, 'rotate(0.6deg)');
  });

  it('should constrain rotation', function() {
    setupAbsolute();
    shiftDragElement(getUiElement(el, '.rotation-handle'), 200, 200, 142, 200);
    assert.equal(el.style.transform, 'rotate(45deg)');
    shiftDragElement(getUiElement(el, '.rotation-handle'), 142, 200, 130, 200);
    assert.equal(el.style.transform, 'rotate(67.5deg)');
  });

  it('should rotate properly while scrolled', function() {

    whileFakeScrolled(500, () => {
      setupAbsolute();
      dragElement(getUiElement(el, '.rotation-handle'), 200, 200, 150, 200);
      assert.equal(el.style.transform, 'rotate(45deg)');
    });

  });

  it('should swap focus when rotation handle dragged', function() {
    setupMultiple();

    clickElement(els[0]);
    dragElement(getUiElement(els[1], '.rotation-handle'), 200, 200, 150, 200);
    assert.equal(els[0].style.transform, '');
    assert.equal(els[1].style.transform, 'rotate(45deg)');
  });

  it('should update all element rotation handles', function() {
    setupMultiple();

    // Focus both and drag element 1 to 45 degrees.
    // Both elements should be at 45 degrees.
    shiftClickElements(els);
    dragElement(getUiElement(els[1], '.rotation-handle'), 200, 200, 150, 200);
    assert.equal(els[0].style.transform, 'rotate(45deg)');
    assert.equal(els[1].style.transform, 'rotate(45deg)');

    // Now focus element 1 and drag it to 90 degrees.
    // Element 1 should be at 90 degrees, and element 2 should be at 45 degrees.
    manager.unfocusAll();
    clickElement(els[0]);
    dragElement(getUiElement(els[0], '.rotation-handle'), 150, 200, 100, 200);
    assert.equal(els[0].style.transform, 'rotate(90deg)');
    assert.equal(els[1].style.transform, 'rotate(45deg)');

    // Now focus both again and drag element 2 to 180 degrees.
    // Element 1 should be at 225 degrees, and element 2 should be at 180 degrees.
    manager.unfocusAll();
    shiftClickElements(els);
    dragElement(getUiElement(els[1], '.rotation-handle'), 150, 200, 100, 100);
    assert.equal(els[0].style.transform, 'rotate(225deg)');
    assert.equal(els[1].style.transform, 'rotate(180deg)');

  });

  // --- Background Image

  it('should snap to sprite on double click', function() {
    setupBackgroundBox();

    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    assert.equal(el.style.left,   '121px');
    assert.equal(el.style.top,    '141px');
    assert.equal(el.style.width,  '2px');
    assert.equal(el.style.height, '2px');
    assert.equal(el.style.backgroundPosition, '-1px -1px');
  });

  it('should snap to sprite using percent value', function() {
    setupBackgroundBox('10% 10%');

    fireDoubleClick(getUiElement(el, '.position-handle'), 113, 113);
    assert.equal(el.style.left,   '112px');
    assert.equal(el.style.top,    '112px');
    assert.equal(el.style.width,  '2px');
    assert.equal(el.style.height, '2px');
    assert.equal(el.style.backgroundPosition, '75% 75%');
  });

  it('should snap to sprite when box is rotated and undo', function() {
    setupRotatedBackgroundBox();

    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    assert.equal(el.style.left,   '');
    assert.equal(el.style.top,    '');
    assert.equal(el.style.width,  '');
    assert.equal(el.style.height, '');

    fireDoubleClick(getUiElement(el, '.position-handle'), 135, 124);
    assert.equal(el.style.left,   '121px');
    assert.equal(el.style.top,    '141px');
    assert.equal(el.style.width,  '2px');
    assert.equal(el.style.height, '2px');
    assert.equal(el.style.transform, 'translate(13.86px, -17.46px) rotate(45deg)');

    manager.elements[0].undo();
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '100px');
    assert.equal(el.style.height, '100px');
    assert.equal(el.style.transform, 'rotate(45deg)');

  });

  it('should not snap to sprite after multiple drags with ctrl', function() {
    setupBackgroundBox();

    ctrlDragElement(getUiElement(el, '.position-handle'), 121, 141, 150, 150);
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);

    assert.equal(el.style.backgroundPosition, '99px 99px');
    assert.equal(el.style.left,   '');
    assert.equal(el.style.top,    '');
    assert.equal(el.style.width,  '');
    assert.equal(el.style.height, '');
  });

  // --- Peeking

  it('should be able to peek then resize and undo back to initial', function() {
    setupBackgroundBox();
    manager.focusAll();
    manager.setPeekMode(true);

    dragElement(getUiElement(el, '.resize-handle-se'), 600, 600, 700, 700);
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '600px');
    assert.equal(el.style.height, '600px');

    manager.setPeekMode(false);
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '600px');
    assert.equal(el.style.height, '600px');

    manager.undo();
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '500px');
    assert.equal(el.style.height, '500px');

    manager.undo();
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '100px');
    assert.equal(el.style.height, '100px');
  });

  it('should be able to find undo states after a move and peek', function() {
    setupBackgroundBox();
    manager.focusAll();

    dragElement(getUiElement(el, '.position-handle'), 150, 150, 250, 250);

    manager.setPeekMode(true);
    dragElement(getUiElement(el, '.resize-handle-se'), 700, 700, 800, 800);
    manager.setPeekMode(false);

    assert.equal(el.style.left,   '200px');
    assert.equal(el.style.top,    '200px');
    assert.equal(el.style.width,  '600px');
    assert.equal(el.style.height, '600px');

    manager.undo();
    assert.equal(el.style.left,   '200px');
    assert.equal(el.style.top,    '200px');
    assert.equal(el.style.width,  '500px');
    assert.equal(el.style.height, '500px');

    manager.undo();
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '100px');
    assert.equal(el.style.height, '100px');
  });

  // --- Nudging

  it('should be able to nudge position', function() {
    setupAbsolute();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyPositionNudge(100, 100);
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.top,  '200px');
  });

  it('should be able to nudge size se', function() {
    setupAbsolute();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyResizeNudge(-50, -50, 'se');
    assert.equal(el.style.width,  '50px');
    assert.equal(el.style.height, '50px');
  });

  it('should be able to nudge size nw', function() {
    setupAbsolute();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyResizeNudge(-50, -50, 'nw');
    assert.equal(el.style.width,  '150px');
    assert.equal(el.style.height, '150px');
  });

  it('should be able to nudge rotation', function() {
    setupAbsolute();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyRotationNudge(50, 'nw');
    assert.equal(el.style.transform, 'rotate(50deg)');
  });

  it('should be able to nudge z-index', function() {
    setupAbsolute();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyZIndexNudge(50);
    manager.unfocusAll();

    assert.equal(el.style.zIndex, '50');
  });

  it('should be able to nudge the background image', function() {
    setupBackgroundBox();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyBackgroundNudge(30, 30);

    assert.equal(el.style.backgroundPosition, '50px 70px');
  });

  // --- Other

  it('should find elements with incomplete positioning properties', function() {
    el = appendIncompleteBox();
    manager.findElements();

    dragElement(getUiElement(el, '.position-handle'), 0, 0, 100, 100);
    dragElement(getUiElement(el, '.resize-handle-se'), 100, 0, 50, 70);

    assert.equal(manager.elements.length, 1);
    assert.equal(el.style.top, '100px');
    assert.equal(el.style.left, '100px');
    assert.equal(el.style.width, '50px');
    assert.equal(el.style.height, '70px');

  });

});
