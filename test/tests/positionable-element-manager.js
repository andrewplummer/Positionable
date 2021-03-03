
fdescribe('PositionableElementManager', function() {

  var manager, listener, els, el;

  class Listener {

    constructor() {
      this.focusedElementsChangedEvents = 0;
    }

    // --- Element Events

    onElementMouseDown() {}

    // --- Focus Events

    onFocusedElementsChanged() {
      this.focusedElementsChangedEvents += 1;
    }

    // --- Position Events

    onPositionDragIntentStart() {}
    onPositionDragIntentStop() {}
    onPositionDragStart() {}
    onPositionDragMove() {}
    onPositionDragStop() {}

    // --- Resize Events

    onResizeDragIntentStart() {}
    onResizeDragIntentStop() {}
    onResizeDragStart() {}
    onResizeDragMove() {}
    onResizeDragStop() {}

    // --- Rotation Events

    onRotationDragIntentStart() {}
    onRotationDragIntentStop() {}
    onRotationDragStart() {}
    onRotationDragMove() {}
    onRotationDragStop() {}

    // --- Background Image Events

    onBackgroundImageSnap() {}

    // --- Update Events

    onBackgroundPositionUpdated() {}
    onDimensionsUpdated() {}
    onPositionUpdated() {}
    onRotationUpdated() {}
    onZIndexUpdated() {}

  }

  setup(function() {
    listener = new Listener();
    manager  = new PositionableElementManager(listener);
    manager.addIgnoredClass(ShadowDomInjector.UI_HOST_CLASS_NAME);
  });

  teardown(function() {
    releaseAppendedFixtures();
    imageMock.release();
    promiseMock.release();
    viewportMock.release();
    el       = null;
    els      = null;
    manager  = null;
    listener = null;
  });

  function setupBox(className) {
    el = appendBox(className);
    manager.findElements();
  }

  function setupNested(className) {
    el = appendNestedBox(className);
    manager.findElements();
  }

  function setupMultiple() {
    var el1 = appendBox();
    var el2 = appendBox();
    manager.findElements();
    els = [el1, el2];
  }

  function setupPositionedBox(left, top, width, height) {
    el = appendBox();
    setBoxPosition(left, top, width, height);
    manager.findElements();
  }

  function setupPercentBox(left, top, width, height, offsetWidth, offsetHeight) {
    el = appendBox();
    setBoxPosition(left, top, width, height);
    mockOffsetParentDimensions(el, offsetWidth, offsetHeight);
    manager.findElements();
  }

  function setupNestedPercentBox(left, top, width, height, offsetWidth, offsetHeight) {
    el = appendNestedBox();
    setBoxPosition(left, top, width, height);
    mockOffsetParentDimensions(el, offsetWidth, offsetHeight);
    manager.findElements();
  }

  function setupRotatedBox(left, top, width, height, rotation) {
    el = appendBox();
    setBoxPosition(left, top, width, height);
    el.style.transform = 'rotate(' + rotation + ')';
    manager.findElements();
  }

  function setupEmBox(left, top, width, height, fontSize) {
    el = appendBox();
    el.style.fontSize = fontSize;
    setBoxPosition(left, top, width, height);
    manager.findElements();
  }

  function setupRemBox(left, top, width, height, fontSize) {
    el = appendBox();
    el.style.fontSize = '100px';
    document.documentElement.style.fontSize = fontSize;
    setBoxPosition(left, top, width, height);
    manager.findElements();
  }

  function releaseDocumentFontSize() {
    document.documentElement.style.fontSize = '';
  }

  function setupInvertedBox(right, bottom, width, height) {
    el = appendBox('inverted-box');
    setInvertedBoxPosition(right, bottom, width, height);
    manager.findElements();
  }

  function setupInvertedRotatedBox(right, bottom, width, height, rotation) {
    el = appendBox('inverted-box');
    setInvertedBoxPosition(right, bottom, width, height);
    el.style.transform = 'rotate(' + rotation + ')';
    manager.findElements();
  }

  function setBoxPosition(left, top, width, height) {
    el.style.left   = left;
    el.style.top    = top;
    el.style.width  = width;
    el.style.height = height;
  }

  function setInvertedBoxPosition(right, bottom, width, height) {
    el.style.right  = right;
    el.style.bottom = bottom;
    el.style.width  = width;
    el.style.height = height;
  }

  function setupBackgroundBox(className) {
    el = appendBox(className || 'background-box');
    applyBackgroundImageMocks();
    manager.findElements();
  }

  function setupRotatedBackgroundBox() {
    el = appendBox('rotate-box background-box');
    applyBackgroundImageMocks();
    manager.findElements();
  }

  function applyBackgroundImageMocks() {
    imageMock.apply();
    imageMock.setFakeDimensions(6, 6);
    promiseMock.apply();
  }

  function getElementZIndex(el) {
    var zIndex = window.getComputedStyle(el).zIndex;
    return zIndex === 'auto' ? 0 : zIndex;
  }

  function mockOffsetParentDimensions(el, offsetWidth, offsetHeight) {
    mockGetter(el, 'offsetParent',  {
      offsetWidth: offsetWidth,
      offsetHeight: offsetHeight,
      style: {}
    });
  }

  function shiftClickElements(els) {
    els.forEach(el => shiftClickElement(el));
  }

  function assertElementFocused(el, flag) {
    var ui = getUiElement(el, '.ui');
    assertEqual(ui.classList.contains('ui--focused'), flag);
  }

  function assertBoxDimensions(el, left, top, width, height) {
    assertEqual(el.style.left,   left);
    assertEqual(el.style.top,    top);
    assertEqual(el.style.width,  width);
    assertEqual(el.style.height, height);
  }

  function assertInvertedBoxDimensions(right, bottom, width, height) {
    assertEqual(el.style.right,  right);
    assertEqual(el.style.bottom, bottom);
    assertEqual(el.style.width,  width);
    assertEqual(el.style.height, height);
  }

  function assertBoxTranslation(x, y) {
    var match = el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    var matchedX = parseFloat(match[1]);
    var matchedY = parseFloat(match[2]);
    assertEqualWithTolerance(matchedX, x, 0.01);
    assertEqualWithTolerance(matchedY, y, 0.01);
  }

  // --- Finding Elements

  it('should not find elements if they do not exist', function() {
    manager.findElements();
    assertEqual(manager.elements.length, 0);
  });

  it('should find absolute and fixed elements by default', function() {
    appendBox();
    appendBox('fixed-box');
    manager.findElements();
    assertEqual(manager.elements.length, 2);
  });

  it('should not find relative or static elements by default', function() {
    appendBox('relative-box');
    appendBox('static-box');
    manager.findElements();
    assertEqual(manager.elements.length, 0);
  });

  it('should ignore display: hidden boxes', function() {
    appendBox('hidden-box');
    manager.findElements();
    assertEqual(manager.elements.length, 0);
  });

  it('should be able to use an explicit selector to include', function() {
    appendBox('box-1');
    appendBox('box-2');
    manager.findElements('.box-1');
    assertEqual(manager.elements.length, 1);
  });

  it('should be able to use an explicit selector to exclude', function() {
    appendBox('box-1');
    appendBox('box-2');
    manager.findElements(null, '.box-2');
    assertEqual(manager.elements.length, 1);
  });

  it('should not error on boxes with translate percentages', function() {
    appendBox('translate-percent-box');
    manager.findElements();
    assertEqual(manager.elements.length, 1);
  });

  it('should be able to rotate matrix3d translated boxes', function() {
    var el = appendBox('matrix-3d-box');
    manager.findElements();

    dragElement(getUiElement(el, '.rotation-handle'), 200, 200, 150, 221);
    dragElement(getUiElement(el, '.resize-handle-se'), 150, 221, 150, 321);

    assertEqual(el.style.transform, 'translate(-35.5px, 14.7px) matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1) rotate(45deg)');
    assertEqual(el.style.width, '171px');
    assertEqual(el.style.height, '171px');
  });

  it('should not fail on a broken selector', function() {
    manager.findElements('foo]');
    assertEqual(manager.elements.length, 0);
    manager.findElements('[foo');
    assertEqual(manager.elements.length, 0);
  });

  it('should not find svg elements', function() {
    appendSvg();
    manager.findElements('svg');
    assertEqual(manager.elements.length, 0);
  });

  // --- Focusing

  it('should focus element on position handle mousedown', function() {
    setupBox();
    fireMouseDown(getUiElement(el, '.position-handle'));
    assertElementFocused(el, true);
  });

  it('should focus element on resize handle mousedown', function() {
    setupBox();
    fireMouseDown(getUiElement(el, '.resize-handle'));
    assertElementFocused(el, true);
  });

  it('should focus elements on rotation handle mousedown', function() {
    setupBox();
    fireMouseDown(getUiElement(el, '.rotation-handle'));
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
    setupBox();

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
    assertTrue(z1 > z2);
  });

  it('should put all focused element parents on top and then restore after unfocus', function() {
    setupNested();

    var zEl = getElementZIndex(el);
    var zParent = getElementZIndex(el.parentNode);

    // Need to mock the offsetParent property here because the
    // fixtures are rendered in a hidden box where it will be null.
    mockGetter(el, 'offsetParent',  el.parentNode);

    clickElement(el);
    assertEqual(getElementZIndex(el), String(PositionableElement.TOP_Z_INDEX));
    assertEqual(getElementZIndex(el.parentNode), String(PositionableElement.TOP_Z_INDEX));

    manager.unfocusAll();
    assertEqual(getElementZIndex(el), zEl);
    assertEqual(getElementZIndex(el.parentNode), zParent);
  });

  it('should fire one focus changed event when focused added', function() {
    setupBox();
    clickElement(el);
    assertEqual(listener.focusedElementsChangedEvents, 1);
  });

  it('should fire one focus changed event when focused removed', function() {
    setupBox();
    clickElement(el);
    manager.unfocusAll();
    assertEqual(listener.focusedElementsChangedEvents, 2);
  });

  it('should fire one focus changed event when focused swapped', function() {
    setupMultiple();
    clickElement(els[0]);
    assertEqual(listener.focusedElementsChangedEvents, 1);
    clickElement(els[1]);
    assertEqual(listener.focusedElementsChangedEvents, 2);
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

    // Meta key depressed throughout
    dragElementWithMetaKeyChange(positionHandle1, [
      [150, 150, true],
      [175, 175, true],
      [200, 200, true]
    ]);

    assertEqual(els[0].style.top,  '150px');
    assertEqual(els[0].style.left, '150px');
    assertEqual(els[1].style.top,  '');
    assertEqual(els[1].style.left, '');

    // Meta key depressed in the middle of the move
    dragElementWithMetaKeyChange(positionHandle1, [
      [200, 200, false],
      [225, 225, false],
      [250, 250, true],
      [300, 300, true]
    ]);

    assertEqual(els[0].style.top,  '250px');
    assertEqual(els[0].style.left, '250px');
    assertEqual(els[1].style.top,  '125px');
    assertEqual(els[1].style.left, '125px');

    // Meta key released in the middle of the move
    dragElementWithMetaKeyChange(positionHandle1, [
      [300, 300, true],
      [325, 325, true],
      [375, 375, false]
    ]);

    assertEqual(els[0].style.top,  '325px');
    assertEqual(els[0].style.left, '325px');
    assertEqual(els[1].style.top,  '175px');
    assertEqual(els[1].style.left, '175px');

  });

  it('should temporarily resize a single element with the meta key depressed', function() {
    var resizeHandle1;

    setupMultiple();
    manager.focusAll();

    resizeHandle1 = getUiElement(els[0], '.resize-handle-se');

    // Meta key depressed throughout
    dragElementWithMetaKeyChange(resizeHandle1, [
      [200, 200, true],
      [225, 225, true],
      [250, 250, true]
    ]);

    assertEqual(els[0].style.width,  '150px');
    assertEqual(els[0].style.height, '150px');
    assertEqual(els[1].style.width,  '');
    assertEqual(els[1].style.height, '');

    // Meta key depressed in the middle of the move
    dragElementWithMetaKeyChange(resizeHandle1, [
      [250, 250, false],
      [275, 275, false],
      [300, 300, true]
    ]);

    assertEqual(els[0].style.width,  '200px');
    assertEqual(els[0].style.height, '200px');
    assertEqual(els[1].style.width,  '125px');
    assertEqual(els[1].style.height, '125px');

    // Meta key released in the middle of the move
    dragElementWithMetaKeyChange(resizeHandle1, [
      [300, 300, true],
      [325, 325, true],
      [350, 350, false],
      [375, 375, false]
    ]);

    assertEqual(els[0].style.width,  '275px');
    assertEqual(els[0].style.height, '275px');
    assertEqual(els[1].style.width,  '175px');
    assertEqual(els[1].style.height, '175px');

  });

  it('should temporarily rotate a single element with the meta key depressed', function() {
    var rotationHandle1;

    setupMultiple();
    manager.focusAll();

    rotationHandle1 = getUiElement(els[0], '.rotation-handle');

    // Dragging se -> s -> sw
    // Meta key depressed throughout
    dragElementWithMetaKeyChange(rotationHandle1, [
      [200, 200, true],
      [150, 221, true],
      [100, 200, true]
    ]);

    assertEqual(els[0].style.transform,  'rotate(90deg)');
    assertEqual(els[1].style.transform,  '');

    // Dragging sw -> w -> nw
    // Meta key depressed during rotate move
    dragElementWithMetaKeyChange(rotationHandle1, [
      [100, 200, false],
      [79,  150, false],
      [100, 100, true]
    ]);

    assertEqual(els[0].style.transform,  'rotate(180deg)');
    assertEqual(els[1].style.transform,  'rotate(45deg)');

    // Dragging nw -> n -> ne -> se
    // Meta key released during rotate move
    dragElementWithMetaKeyChange(rotationHandle1, [
      [100, 100, true],
      [150, 79,  true],
      [200, 100, false],
      [200, 200, false]
    ]);

    assertEqual(els[0].style.transform,  'rotate(360deg)');
    assertEqual(els[1].style.transform,  'rotate(180deg)');

  });

  // --- Positioning

  it('should move', function() {
    setupBox();
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.left, '150px');
    assertEqual(el.style.top,  '150px');
  });

  it('should constrain move horizontally', function() {
    setupBox();
    shiftDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 160);
    assertEqual(el.style.left, '150px');
    assertEqual(el.style.top,  '100px');
  });

  it('should constrain move vertically', function() {
    setupBox();
    shiftDragElement(getUiElement(el, '.position-handle'), 150, 150, 160, 200);
    assertEqual(el.style.left, '100px');
    assertEqual(el.style.top,  '150px');
  });

  it('should move an absolute box with scroll', function() {

    whileFakeScrolled(500, () => {
      setupBox();
      fireMouseDown(getUiElement(el, '.position-handle'), 50, 50);
      fireMouseMove(getUiElement(el, '.position-handle'), 100, 100);
      fireScrollEvent();
      fireDocumentMouseUp(100, 100);
      assertEqual(el.style.left, '150px');
      assertEqual(el.style.top,  '650px');
    });

  });

  it('should move a fixed box with scroll', function() {
    setupBox('fixed-box');

    whileFakeScrolled(500, () => {
      dragElement(getUiElement(el, '.position-handle'), 0, 0, 100, 100);
    });

    assertEqual(el.style.left, '200px');
    assertEqual(el.style.top,  '200px');

  });

  it('should move a fixed box while scrolling', function() {
    setupBox('fixed-box');

    fireMouseDown(getUiElement(el, '.position-handle'), 50, 50);
    fireMouseMove(getUiElement(el, '.position-handle'), 100, 100);
    assertEqual(el.style.left, '150px');
    assertEqual(el.style.top,  '150px');

    whileFakeScrolled(500, () => {
      fireScrollEvent();
    });
    fireDocumentMouseUp(100, 100);

    assertEqual(el.style.left, '150px');
    assertEqual(el.style.top,  '150px');

  });

  it('should move boxes positioned by percent', function() {
    setupPercentBox('10%', '10%', '100px', '100px', 1000, 1000);
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 300, 300);
    assertEqual(el.style.left, '25%');
    assertEqual(el.style.top,  '25%');
  });

  it('should move boxes nested inside non-positioned elements', function() {
    setupNestedPercentBox('10%', '10%', '100px', '100px', 1000, 1000);
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 300, 300);
    assertEqual(el.style.left, '25%');
    assertEqual(el.style.top,  '25%');
  });

  it('should move boxes positioned by em', function() {
    setupEmBox('5em', '5em', '5em', '5em', '25px');
    dragElement(getUiElement(el, '.position-handle'), 100, 100, 300, 300);
    assertEqual(el.style.left, '13em');
    assertEqual(el.style.top,  '13em');
  });

  it('should move boxes positioned by rem', function() {
    setupRemBox('6rem', '6rem', '6rem', '6rem', '20px');
    dragElement(getUiElement(el, '.position-handle'), 100, 100, 300, 300);
    assertEqual(el.style.left, '16rem');
    assertEqual(el.style.top,  '16rem');
    releaseDocumentFontSize();
  });

  it('should move a vw positioned element', function() {
    viewportMock.apply(1000, 2000);
    setupBox('vw-box');
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.left, '15vw');
    assertEqual(el.style.top,  '15vw');
  });

  it('should move a vh positioned element', function() {
    viewportMock.apply(1000, 2000);
    setupBox('vh-box');
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.left, '12.5vh');
    assertEqual(el.style.top,  '12.5vh');
  });

  it('should move a vmin positioned element', function() {
    viewportMock.apply(1000, 2000);
    setupBox('vmin-box');
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.left, '15vmin');
    assertEqual(el.style.top,  '15vmin');
  });

  it('should move a vmax positioned element', function() {
    viewportMock.apply(1000, 2000);
    setupBox('vmax-box');
    dragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.left, '12.5vmax');
    assertEqual(el.style.top,  '12.5vmax');
  });

  it('should not jump while scrolled and resetting the drag', function() {

    whileFakeScrolled(500, () => {
      setupBox();
      dragElementWithMetaKeyChange(getUiElement(el, '.position-handle'), [
        [150, 150, false],
        [200, 200, false],
        [220, 220, true],
        [250, 250, true]
      ]);
      assertEqual(el.style.left, '200px');
      assertEqual(el.style.top,  '200px');
    });

  });

  it('should not error on unknown units', function() {
    setupPositionedBox('5cm', '5cm', '5in', '5in');
    assertEqual(el.style.left,   '5cm');
    assertEqual(el.style.top,    '5cm');
    assertEqual(el.style.width,  '5in');
    assertEqual(el.style.height, '5in');
  });

  it('should snap position when snapping enabled', function() {
    setupBox();
    manager.setSnap(10, 10);
    dragElement(getUiElement(el, '.position-handle'), 100, 100, 157, 191);
    assertEqual(el.style.left, '160px');
    assertEqual(el.style.top,  '190px');
  });

  it('should snap dimensions when snapping enabled', function() {
    setupBox();
    manager.setSnap(10, 10);
    dragElement(getUiElement(el, '.resize-handle-nw'), 100, 100, 157, 191);
    assertEqual(el.style.left,   '160px');
    assertEqual(el.style.top,    '190px');
    assertEqual(el.style.width,  '40px');
    assertEqual(el.style.height, '10px');
  });

  // --- Background Positioning

  it('should not move background image when none exists', function() {
    setupBox();
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.backgroundPosition,  '');
  });

  it('should move background', function() {
    setupBackgroundBox();
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.left, '');
    assertEqual(el.style.top,  '');
    assertEqual(el.style.backgroundPosition,  '70px 90px');
  });

  it('should shift to background move after normal move', function() {
    setupBackgroundBox();

    dragElementWithCtrlKeyChange(getUiElement(el, '.position-handle'), [
      [150, 150, false],
      [200, 150, false],
      [250, 150, false],
      [300, 150, true],
      [330, 150, true]
    ]);

    assertEqual(el.style.top,   '100px');
    assertEqual(el.style.left,  '200px');
    assertEqual(el.style.backgroundPosition,  '100px 40px');

  });

  it('should shift to background move after resize move', function() {
    setupBackgroundBox();

    dragElementWithCtrlKeyChange(getUiElement(el, '.resize-handle-se'), [
      [200, 200, false],
      [250, 250, false],
      [300, 300, false],
      [350, 350, true],
      [400, 400, true]
    ]);

    assertEqual(el.style.width,   '200px');
    assertEqual(el.style.height,  '200px');
    assertEqual(el.style.backgroundPosition,  '120px 140px');

  });

  it('should constrain background move', function() {
    setupBackgroundBox();
    shiftCtrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 160);
    assertEqual(el.style.left, '');
    assertEqual(el.style.top,  '');
    assertEqual(el.style.backgroundPosition,  '70px 40px');
  });

  it('should move background on resize handle drag while ctrl key down', function() {
    setupBackgroundBox();
    ctrlDragElement(getUiElement(el, '.resize-handle-nw'), 100, 100, 150, 150);
    assertEqual(el.style.left, '');
    assertEqual(el.style.top,  '');
    assertEqual(el.style.backgroundPosition,  '70px 90px');
  });

  it('should move background using percent values', function() {
    setupBackgroundBox('background-box background-percent-box');
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.backgroundPosition,  '78.19% 103.19%');
  });

  it('should move a big background using percent values', function() {
    setupBackgroundBox('background-big-box background-percent-box');
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.backgroundPosition,  '-25% 0%');
  });

  it('should not work when using percentages and image size is same as element', function() {
    setupBackgroundBox('big-box background-big-box background-percent-box');
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.backgroundPosition,  '0% 0%');
  });

  it('should allow top left background position', function() {
    setupBackgroundBox('background-box background-tl-box');
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.backgroundPosition,  '53.19% 53.19%');
  });

  it('should allow bottom right background position', function() {
    setupBackgroundBox('background-box background-br-box');
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.backgroundPosition,  '153.19% 153.19%');
  });

  it('should allow right center background position', function() {
    setupBackgroundBox('background-box background-rc-box');
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.backgroundPosition,  '153.19% 103.19%');
  });

  it('should not error on background-image: none', function() {
    setupBackgroundBox('background-box background-none-box');
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);
    assertEqual(el.style.backgroundPosition,  '');
  });

  // --- Resize

  it('should resize', function() {
    setupBox();
    dragElement(getUiElement(el, '.resize-handle-e'), 200, 150, 300, 150);
    assertEqual(el.style.width,  '200px');
    assertEqual(el.style.height, '100px');
  });

  it('should resize inverted box dimensions', function() {
    setupBox();
    dragElement(getUiElement(el, '.resize-handle-se'), 200, 200, 50, 50);
    assertBoxDimensions(el, '50px', '50px', '50px', '50px');
  });

  // --- Resize Reflecting

  it('should allow a box to be reflected from its opposite edges', function() {
    setupPositionedBox('500px', '500px', '1920px', '1080px');
    dragElement(getUiElement(el, '.resize-handle-se'), 2420, 1580, 0, 0);
    assertBoxDimensions(el, '0px', '0px', '500px', '500px');
  });

  it('should allow a box to be reflected from its positioned edges', function() {
    setupPositionedBox('500px', '500px', '1920px', '1080px');
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

  it('should allow a box to be reflected even if rotated', function() {
    setupBox('rotate-box');
    dragElement(getUiElement(el, '.resize-handle-se'), 150, 221, 150, -62);
    assertBoxDimensions(el, '0px', '0px', '100px', '100px');
    assertBoxTranslation(100.11, -41.47);
  });

  // --- Resize Constraining - Basics

  it('should constrain resize', function() {
    setupBox();
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 200, 200, 500, 300);
    assertBoxDimensions(el, '100px', '100px', '200px', '200px');
  });

  it('should not fail to constrain se resize on 0', function() {
    setupPositionedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 0, 0);
    assertBoxDimensions(el, '0px', '0px', '0px', '0px');
  });

  it('should not fail to constrain nw resize on 0', function() {
    setupPositionedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 1920, 1080);
    assertBoxDimensions(el, '1920px', '1080px', '0px', '0px');
  });

  it('should not interfere with non-constrainable handles', function() {
    setupPositionedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-n'), 0, 0, 0, -1000);
    assertBoxDimensions(el, '0px', '-1000px', '1920px', '2080px');
  });

  // --- Resize constraining - Special

  it('should allow a zero size element when constraining', function() {
    setupPositionedBox('100px', '100px', '100px', '100px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 200, 200, 276, 100);
    assertBoxDimensions(el, '100px', '100px', '0px', '0px');
  });

  // --- Resize Constraining - Normal Box

  it('should constrain ratio when dragging se corner right and down', function() {
    setupPositionedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 2800, 1100);
    assertBoxDimensions(el, '0px', '0px', '1956px', '1100px');
  });

  it('should constrain ratio when dragging se corner right and up', function() {
    setupPositionedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 2800, 900);
    assertBoxDimensions(el, '0px', '0px', '1600px', '900px');
  });

  it('should constrain ratio when dragging se corner left and down', function() {
    setupPositionedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 1080, 1920);
    assertBoxDimensions(el, '0px', '0px', '1080px', '608px');
  });

  it('should constrain ratio when dragging se corner left and up', function() {
    setupPositionedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 1420, 580);
    assertBoxDimensions(el, '0px', '0px', '1031px', '580px');
  });

  it('should constrain ratio when dragging nw corner right and down', function() {
    setupPositionedBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 500, 500);
    assertBoxDimensions(el, '889px', '500px', '1031px', '580px');
  });

  it('should constrain ratio when dragging nw corner right and up', function() {
    setupPositionedBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 1000, 0);
    assertBoxDimensions(el, '1000px', '781px', '1420px', '799px');
  });

  it('should constrain ratio when dragging nw corner left and down', function() {
    setupPositionedBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 0, 1000);
    assertBoxDimensions(el, '1389px', '1000px', '1031px', '580px');
  });

  it('should constrain ratio when dragging nw corner left and up', function() {
    setupPositionedBox('500px', '500px', '1920px', '1080px');
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
    setupPositionedBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 2420, 1580, 0, 0);
    assertBoxDimensions(el, '0px', '219px', '500px', '281px');
  });

  it('should allow a constrained resize to reflect from its positioned edge', function() {
    setupPositionedBox('500px', '500px', '1920px', '1080px');
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
    assertBoxTranslation(-21, 8.7);
  });

  it('should stay anchored when resizing a rotated element from nw', function() {
    setupRotatedBox('100px', '100px', '100px', '100px', '45deg');
    dragElement(getUiElement(el, '.resize-handle-nw'), 150, 79, 150, 8);
    assertBoxDimensions(el, '50px', '50px', '150px', '150px');
    assertBoxTranslation(25.2, -10.44);
  });

  it('should stay anchored when resizing an inverted rotated element from se', function() {
    setupInvertedRotatedBox('100px', '100px', '100px', '100px', '45deg');
    dragElement(getUiElement(el, '.resize-handle-se'), 150, 221, 150, 280);
    assertInvertedBoxDimensions('58px', '58px', '142px', '142px');
    assertBoxTranslation(-21, 8.7);
  });

  it('should stay anchored when resizing an inverted rotated element from nw', function() {
    setupInvertedRotatedBox('100px', '100px', '100px', '100px', '45deg');
    dragElement(getUiElement(el, '.resize-handle-nw'), 150, 79, 150, 8);
    assertInvertedBoxDimensions('100px', '100px', '150px', '150px');
    assertBoxTranslation(25.2, -10.44);
  });

  it('should stay anchored when resizing a rotated box with top left origin', function() {
    setupBox('rotate-tl-box');
    dragElement(getUiElement(el, '.resize-handle-se'), 100, 241, 100, 341);
    assertInvertedBoxDimensions('', '', '171px', '171px');
    assertEqual(el.style.transform, '');
  });

  it('should stay anchored when resizing a rotated box with top right origin', function() {
    setupBox('rotate-tr-box');
    dragElement(getUiElement(el, '.resize-handle-se'), 100, 221, 100, 321);
    assertInvertedBoxDimensions('', '', '171px', '171px');
    assertBoxTranslation(-20.8, 50.2);
  });

  it('should stay anchored when resizing a rotated box with bottom left origin', function() {
    setupBox('rotate-bl-box');
    dragElement(getUiElement(el, '.resize-handle-se'), 673, 346, 673, 446);
    assertInvertedBoxDimensions('', '', '171px', '171px');
    assertBoxTranslation(-50.2, -20.8);
  });

  it('should stay anchored when resizing a rotated box with bottom right origin', function() {
    setupBox('rotate-br-box');
    dragElement(getUiElement(el, '.resize-handle-se'), 700, 277, 700, 377);
    assertInvertedBoxDimensions('', '', '171px', '171px');
    assertBoxTranslation(-71, 29.41);
  });

  it('should stay anchored when using explicit initial transform origin', function() {
    setupBox('rotate-initial-box');
    dragElement(getUiElement(el, '.resize-handle-se'), 150, 221, 150, 321);
    assertInvertedBoxDimensions('', '', '171px', '171px');
    assertBoxTranslation(-35.5, 14.7);
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
    var el1 = appendBox();
    var el2 = appendBox();
    el2.style.transform = 'rotate(45deg)';
    manager.findElements();

    shiftClickElements([el1, el2]);
    dragElement(getUiElement(el1, '.resize-handle-se'), 200, 200, 300, 300);
    assertBoxDimensions(el1, '100px', '100px', '200px', '200px');
    assertBoxDimensions(el2, '100px', '100px', '200px', '200px');
  });

  // --- Resizing Other

  it('should resize a box with percent translation', function() {
    setupBox('translate-percent-box');
    dragElement(getUiElement(el, '.resize-handle-se'), 200, 200, 300, 300);
    assertEqual(el.style.width,     '200px');
    assertEqual(el.style.height,    '200px');
    assertEqual(el.style.transform, 'translate(10%, 15%)');
  });

  it('should resize from nw corner multiple times', function() {
    setupBox();
    dragElement(getUiElement(el, '.resize-handle-nw'), 100, 100, 300, 300);
    dragElement(getUiElement(el, '.resize-handle-nw'), 200, 200, 400, 400);
    assertEqual(el.style.left,      '300px');
    assertEqual(el.style.top,       '300px');
    assertEqual(el.style.width,     '100px');
    assertEqual(el.style.height,    '100px');
  });

  // --- Rotation

  it('should rotate', function() {
    setupBox();
    dragElement(getUiElement(el, '.rotation-handle'), 200, 200, 150, 221);
    assertEqual(el.style.transform, 'rotate(45deg)');
  });

  it('should rotate with radians', function() {
    setupBox('rotate-radian-box');
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 100, 200);
    assertEqual(el.style.transform, 'rotate(1.57rad)');
  });

  it('should allow radians to go negative', function() {
    setupBox('rotate-radian-box');
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 221, 150);
    assertEqual(el.style.transform, 'rotate(-0.79rad)');
  });

  it('should rotate with gradians', function() {
    setupBox('rotate-gradian-box');
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 100, 200);
    assertEqual(el.style.transform, 'rotate(100grad)');
  });

  it('should allow gradians to go negative', function() {
    setupBox('rotate-gradian-box');
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 221, 150);
    assertEqual(el.style.transform, 'rotate(-50grad)');
  });

  it('should rotate with turns', function() {
    setupBox('rotate-turn-box');
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 100, 200);
    assertEqual(el.style.transform, 'rotate(0.25turn)');
  });

  it('should allow turns to go negative', function() {
    setupBox('rotate-turn-box');
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 221, 150);
    assertEqual(el.style.transform, 'rotate(-0.12turn)');
  });

  it('should rotate based on the handle origin, not the original element rotation', function() {
    setupBox();
    dragElement(getUiElement(el, '.rotation-handle'), 214, 194, 214, 195);
    assertEqual(el.style.transform, 'rotate(0.6deg)');
  });

  it('should constrain rotation', function() {
    setupBox();
    shiftDragElement(getUiElement(el, '.rotation-handle'), 200, 200, 142, 200);
    assertEqual(el.style.transform, 'rotate(45deg)');
    shiftDragElement(getUiElement(el, '.rotation-handle'), 142, 200, 130, 200);
    assertEqual(el.style.transform, 'rotate(67.5deg)');
  });

  it('should rotate properly while scrolled', function() {

    whileFakeScrolled(500, () => {
      setupBox();
      dragElement(getUiElement(el, '.rotation-handle'), 200, 200, 150, 221);
      assertEqual(el.style.transform, 'rotate(45deg)');
    });

  });

  it('should swap focus when rotation handle dragged', function() {
    setupMultiple();

    clickElement(els[0]);
    dragElement(getUiElement(els[1], '.rotation-handle'), 200, 200, 150, 221);
    assertEqual(els[0].style.transform, '');
    assertEqual(els[1].style.transform, 'rotate(45deg)');
  });

  it('should update all element rotation handles', function() {
    setupMultiple();

    // Focus both and drag element 1 to 45 degrees.
    // Both elements should be at 45 degrees.
    shiftClickElements(els);
    dragElement(getUiElement(els[1], '.rotation-handle'), 200, 200, 150, 221);
    assertEqual(els[0].style.transform, 'rotate(45deg)');
    assertEqual(els[1].style.transform, 'rotate(45deg)');

    // Now focus element 1 and drag it to 90 degrees.
    // Element 1 should be at 90 degrees, and element 2 should be at 45 degrees.
    manager.unfocusAll();
    clickElement(els[0]);
    dragElement(getUiElement(els[0], '.rotation-handle'), 150, 200, 100, 200);
    assertEqual(els[0].style.transform, 'rotate(90deg)');
    assertEqual(els[1].style.transform, 'rotate(45deg)');

    // Now focus both again and drag element 2 to 180 degrees.
    // Element 1 should be at 225 degrees, and element 2 should be at 180 degrees.
    manager.unfocusAll();
    shiftClickElements(els);
    dragElement(getUiElement(els[1], '.rotation-handle'), 150, 200, 100, 100);
    assertEqual(els[0].style.transform, 'rotate(225deg)');
    assertEqual(els[1].style.transform, 'rotate(180deg)');

  });

  it('should rotate multiple times', function() {
    setupBox();
    dragElement(getUiElement(el, '.rotation-handle'), 200, 200, 150, 221);
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 79,  150);
    dragElement(getUiElement(el, '.rotation-handle'), 79,  150, 150, 121);
    assertEqual(el.style.transform, 'rotate(225deg)');
  });

  it('should be able to rotate past 360', function() {
    setupBox();
    // From 0 to 45, then one full turn
    dragElement(getUiElement(el, '.rotation-handle'), 200, 200, 150, 221);
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 79,  150);
    dragElement(getUiElement(el, '.rotation-handle'), 79,  150, 150, 79);
    dragElement(getUiElement(el, '.rotation-handle'), 150, 79,  221, 150);
    dragElement(getUiElement(el, '.rotation-handle'), 221, 150, 150, 221);
    assertEqual(el.style.transform, 'rotate(405deg)');
  });

  it('should be able to rotate from -675', function() {
    setupBox('rotate-negative-box');
    // Rotate 2 positive full turns to bring to 45 deg
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 79,  150);
    dragElement(getUiElement(el, '.rotation-handle'), 79,  150, 150, 79);
    dragElement(getUiElement(el, '.rotation-handle'), 150, 79,  221, 150);
    dragElement(getUiElement(el, '.rotation-handle'), 221, 150, 150, 221);
    dragElement(getUiElement(el, '.rotation-handle'), 150, 221, 79,  150);
    dragElement(getUiElement(el, '.rotation-handle'), 79,  150, 150, 79);
    dragElement(getUiElement(el, '.rotation-handle'), 150, 79,  221, 150);
    dragElement(getUiElement(el, '.rotation-handle'), 221, 150, 150, 221);
    assertEqual(el.style.transform, 'rotate(45deg)');
  });

  // --- Background Image

  it('should snap to sprite on double click', function() {
    setupBackgroundBox();

    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    assertEqual(el.style.left,   '121px');
    assertEqual(el.style.top,    '141px');
    assertEqual(el.style.width,  '2px');
    assertEqual(el.style.height, '2px');
    assertEqual(el.style.backgroundPosition, '-1px -1px');
  });

  it('should snap to first sprite using percent value', function() {
    setupBackgroundBox('background-box background-percent-box');
    fireDoubleClick(getUiElement(el, '.position-handle'), 125, 148);
    assertEqual(el.style.left,   '125px');
    assertEqual(el.style.top,    '148px');
    assertEqual(el.style.width,  '2px');
    assertEqual(el.style.height, '2px');
    assertEqual(el.style.backgroundPosition, '25% 25%');
  });

  it('should snap to second sprite using percent value', function() {
    setupBackgroundBox('background-box background-percent-box');
    fireDoubleClick(getUiElement(el, '.position-handle'), 127, 150);
    assertEqual(el.style.left,   '127px');
    assertEqual(el.style.top,    '150px');
    assertEqual(el.style.width,  '2px');
    assertEqual(el.style.height, '2px');
    assertEqual(el.style.backgroundPosition, '75% 75%');
  });

  it('should snap to sprite when box is rotated and undo', function() {
    setupRotatedBackgroundBox();

    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    assertEqual(el.style.left,   '');
    assertEqual(el.style.top,    '');
    assertEqual(el.style.width,  '');
    assertEqual(el.style.height, '');

    fireDoubleClick(getUiElement(el, '.position-handle'), 135, 124);
    assertEqual(el.style.left,   '121px');
    assertEqual(el.style.top,    '141px');
    assertEqual(el.style.width,  '2px');
    assertEqual(el.style.height, '2px');
    assertEqual(el.style.transform, 'translate(13.86px, -17.46px) rotate(45deg)');

    manager.elements[0].undo();
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.width,  '100px');
    assertEqual(el.style.height, '100px');
    assertEqual(el.style.transform, 'rotate(45deg)');

  });

  it('should not snap to sprite after multiple drags with ctrl', function() {
    setupBackgroundBox();

    ctrlDragElement(getUiElement(el, '.position-handle'), 121, 141, 150, 150);
    ctrlDragElement(getUiElement(el, '.position-handle'), 150, 150, 200, 200);

    assertEqual(el.style.backgroundPosition, '99px 99px');
    assertEqual(el.style.left,   '');
    assertEqual(el.style.top,    '');
    assertEqual(el.style.width,  '');
    assertEqual(el.style.height, '');
  });

  it('should not fail on elements with multiple backgrounds', function() {
    var backgroundImage, pos;

    setupBackgroundBox('background-multiple-box');
    backgroundImage = manager.elements[0].cssBackgroundImage;
    pos = backgroundImage.getPosition();

    assertEqual(pos.x, 20);
    assertEqual(pos.y, 40);
    assertEqual(backgroundImage.hasImage(), true);
  });

  // --- Peeking

  it('should be able to peek then resize and undo back to initial', function() {
    setupBackgroundBox();
    manager.focusAll();
    manager.setPeekMode(true);

    dragElement(getUiElement(el, '.resize-handle-se'), 600, 600, 700, 700);
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.width,  '600px');
    assertEqual(el.style.height, '600px');

    manager.setPeekMode(false);
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.width,  '600px');
    assertEqual(el.style.height, '600px');

    manager.undo();
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.width,  '500px');
    assertEqual(el.style.height, '500px');

    manager.undo();
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.width,  '100px');
    assertEqual(el.style.height, '100px');
  });

  it('should be able to find undo states after a move and peek', function() {
    setupBackgroundBox();
    manager.focusAll();

    dragElement(getUiElement(el, '.position-handle'), 150, 150, 250, 250);

    manager.setPeekMode(true);
    dragElement(getUiElement(el, '.resize-handle-se'), 700, 700, 800, 800);
    manager.setPeekMode(false);

    assertEqual(el.style.left,   '200px');
    assertEqual(el.style.top,    '200px');
    assertEqual(el.style.width,  '600px');
    assertEqual(el.style.height, '600px');

    manager.undo();
    assertEqual(el.style.left,   '200px');
    assertEqual(el.style.top,    '200px');
    assertEqual(el.style.width,  '500px');
    assertEqual(el.style.height, '500px');

    manager.undo();
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.width,  '100px');
    assertEqual(el.style.height, '100px');
  });

  // --- Nudging

  it('should be able to nudge position', function() {
    setupBox();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyPositionNudge(100, 100);
    assertEqual(el.style.left, '200px');
    assertEqual(el.style.top,  '200px');
  });

  it('should be able to nudge size se', function() {
    setupBox();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyResizeNudge(-50, -50, 'se');
    assertEqual(el.style.width,  '50px');
    assertEqual(el.style.height, '50px');
  });

  it('should be able to nudge size nw', function() {
    setupBox();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyResizeNudge(-50, -50, 'nw');
    assertEqual(el.style.width,  '150px');
    assertEqual(el.style.height, '150px');
  });

  it('should be able to nudge rotation', function() {
    setupBox();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyRotationNudge(50, 'nw');
    assertEqual(el.style.transform, 'rotate(50deg)');
  });

  it('should be able to nudge z-index', function() {
    setupBox();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyZIndexNudge(1);
    manager.applyZIndexNudge(2);
    manager.applyZIndexNudge(3);
    manager.unfocusAll();

    assertEqual(el.style.zIndex, '3');
  });

  it('should be able to nudge the background image', function() {
    setupBackgroundBox();
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyBackgroundNudge(30, 30);

    assertEqual(el.style.backgroundPosition, '50px 70px');
  });

  it('should snap position nudge to grid', function() {
    setupBox();

    manager.setSnap(10, 10);
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyPositionNudge(1, 2);
    assertEqual(el.style.left, '110px');
    assertEqual(el.style.top,  '120px');
  });

  it('should snap dimensions nudge to grid', function() {
    setupBox();

    manager.setSnap(10, 10);
    manager.focusAll();

    manager.pushFocusedStates();
    manager.applyResizeNudge(1, 2, 'se');
    assertEqual(el.style.width,  '110px');
    assertEqual(el.style.height, '120px');
  });

  // --- Missing Properties

  it('should update box for elements with incomplete positioning properties', function() {
    setupBox('incomplete-box');

    dragElement(getUiElement(el, '.position-handle'), 0, 0, 100, 100);
    dragElement(getUiElement(el, '.resize-handle-se'), 200, 100, 150, 170);

    assertEqual(el.style.top, '100px');
    assertEqual(el.style.left, '100px');
    assertEqual(el.style.width, '50px');
    assertEqual(el.style.height, '70px');
  });

  it('should update initial background position when moving', function() {
    setupBackgroundBox('background-box background-initial-box');
    ctrlDragElement(getUiElement(el, '.position-handle'), 100, 100, 150, 160);
    assertEqual(el.style.backgroundPosition, '50px 60px');
  });

  it('should update initial background position when snapping', function() {
    setupBackgroundBox('background-box background-initial-box');
    fireDoubleClick(getUiElement(el, '.position-handle'), 101, 101);
    assertEqual(el.style.backgroundPosition, '-1px -1px');
  });

  it('should update auto z-index', function() {
    setupBox();
    manager.focusAll();
    manager.pushFocusedStates();
    manager.applyZIndexNudge(50);
    manager.unfocusAll();
    assertEqual(el.style.zIndex, '50');
  });

  it('should be able to undo back to initial state', function() {
    setupBox('incomplete-box background-initial-box');
    manager.focusAll();

    // Apply z-index nudge
    manager.pushFocusedStates();
    manager.applyZIndexNudge(50);

    // Drag position handle
    dragElement(getUiElement(el, '.position-handle'), 100, 100, 200, 200);

    // Drag resize handle
    dragElement(getUiElement(el, '.resize-handle-se'), 300, 300, 400, 400);

    // Drag background
    ctrlDragElement(getUiElement(el, '.position-handle'), 100, 100, 150, 160);

    // Now pop 4 states to arrive at initial
    manager.undo();
    manager.undo();
    manager.undo();
    manager.undo();

    assertEqual(el.style.top,    '0px');
    assertEqual(el.style.left,   '');
    assertEqual(el.style.width,  '100px');
    assertEqual(el.style.height, '');
    assertEqual(el.style.zIndex, '');
    assertEqual(el.style.backgroundPosition, '');
  });

  // --- Other

  it('should preserve precision after undo', function() {
    setupRotatedBox('100px', '100px', '100px', '100px', '45deg');
    dragElement(getUiElement(el, '.resize-handle-se'), 150, 221, 150, 271);
    dragElement(getUiElement(el, '.resize-handle-se'), 150, 271, 150, 321);
    manager.undo();
    assertEqual(el.style.transform,   'translate(-17.5px, 7.25px) rotate(45deg)');
  });

  it('should no longer have any elements after releasing', function() {
    setupMultiple();
    manager.focusAll();
    assertEqual(manager.elements.length, 2);
    assertEqual(manager.focusedElements.length, 2);
    manager.releaseAll();
    assertEqual(manager.elements.length, 0);
    assertEqual(manager.focusedElements.length, 0);
  });

});
