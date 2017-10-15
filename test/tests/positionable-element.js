
describe('PositionableElement', function(uiRoot) {

  var listener, el, p;

  class Listener {

    // --- Element Events

    onElementMouseDown(evt) {
    }

    onElementDragStart(evt) {
      this.lastDrag = evt.drag;
    }

    onElementDragMove(evt) {
      this.lastDrag = evt.drag;
    }

    onElementDragStop(evt) {
      this.lastDrag = evt.drag;
    }

    // --- Resize Events

    onResizeDragIntentStart(evt) {
    }

    onResizeDragIntentStop(evt) {
    }

    onResizeDragStart(evt) {
    }

    onResizeDragMove(evt) {
      this.lastEventResizeDrag = evt.drag;
    }

    onResizeDragStop(evt) {
    }

    // --- Rotation Events

    onRotationDragIntentStart(evt) {
    }

    onRotationDragIntentStop(evt) {
    }

    onRotationDragStart(evt) {
    }

    onRotationDragMove(evt) {
      this.lastEventRotation = evt.rotation;
    }

    onRotationDragStop(evt) {
    }

    // --- Background Image Events

    onBackgroundImageSnap() {
    }

  }

  setup(function() {
    listener = new Listener();
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  function createRotationMoveEvent(abs, offset) {
    return {
      data: {
        abs: abs,
        offset: offset
      }
    }
  }

  function forceBackgroundImageLoad(element) {
    // Force image loaded event to keep everything synchronous.
    // This can be done since the image is using a dataUri
    var backgroundImage = element.cssBackgroundImage;
    backgroundImage.img.src = backgroundImage.url;
    backgroundImage.onImageLoaded();
  }

  it('should set initial state from stylesheet', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    assert.equal(p.cssBox.cssH.px, 100);
    assert.equal(p.cssBox.cssV.px, 100);
    assert.equal(p.cssBox.cssWidth.px, 100);
    assert.equal(p.cssBox.cssHeight.px, 100);
    assert.equal(p.cssZIndex.val, 'auto');
    assert.equal(p.getRotation(), 0);
  });

  it('more specific styles should take precedence', function() {
    el = appendAbsoluteBox();
    el.classList.add('box--override');
    p = new PositionableElement(el, listener);
    assert.equal(p.cssZIndex.val, 10);
    assert.equal(p.getRotation(), 30);
  });

  it('inline styles should take precedence', function() {
    el = appendAbsoluteBox();
    el.style.left   = '100px';
    el.style.top    = '100px';
    el.style.width  = '100px';
    el.style.height = '100px';
    el.style.zIndex = '5';
    el.style.transform = 'translate(100px, 100px) rotate(45deg)';
    p = new PositionableElement(el, listener);
    assert.equal(p.cssBox.cssH.px, 100);
    assert.equal(p.cssBox.cssV.px, 100);
    assert.equal(p.cssBox.cssWidth.px, 100);
    assert.equal(p.cssBox.cssHeight.px, 100);
    assert.equal(p.cssZIndex.val, 5);
    assert.equal(p.getRotation(), 45);
    assert.equal(p.cssTransform.getTranslation().x, 100);
    assert.equal(p.cssTransform.getTranslation().y, 100);
  });

  it('should force static elements to absolute on init', function() {
    el = appendStaticBox();
    new PositionableElement(el, listener);
    assert.equal(el.style.position, 'absolute');
  });

  // --- Moving

  it('should update position', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.pushState();
    p.move(100, 100);
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.top, '200px');
  });

  it('should constrain position', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.pushState();
    p.move(100, 60, true);
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.top, '100px');
  });

  // --- Background Moving

  it('should be able to move the background image', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.pushState();
    p.moveBackground(200, 200);
    assert.equal(el.style.backgroundPosition,  '200px 200px');
  });

  it('should be able to move the background image on a rotated box', function() {
    el = appendRotatedBox();
    p = new PositionableElement(el, listener);
    p.pushState();
    p.moveBackground(100, 100);
    assert.equal(el.style.backgroundPosition,  '141px 0px');
  });

  // --- Resizing

  it('should resize', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.pushState();
    p.resize(new Point(30, 80), 'se');
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '130px');
    assert.equal(el.style.height, '180px');
  });

  it('should resize by positioned edges', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.pushState();
    p.resize(new Point(30, 80), 'nw');
    assert.equal(el.style.left,   '130px');
    assert.equal(el.style.top,    '180px');
    assert.equal(el.style.width,  '70px');
    assert.equal(el.style.height, '20px');
  });

  it('should constrain resize', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.pushState();
    p.resize(new Point(200, 100), 'se', true);
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '200px');
    assert.equal(el.style.height, '200px');
  });

  it('should receive correct resize events', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    dragElement(getUiElement(el, '.resize-handle-sw'), 200, 200, 300, 300);
    assert.equal(listener.lastEventResizeDrag.x, 100);
    assert.equal(listener.lastEventResizeDrag.y, 100);
  });

  // --- Rotating

  it('should update rotation', function() {
    el = appendAbsoluteBox();
    el.style.transform = 'rotate(45deg)';
    p = new PositionableElement(el, listener);
    p.pushState();
    p.rotate(45);
    assert.equal(el.style.transform, 'rotate(90deg)');
  });

  it('should constrain rotation', function() {
    el = appendAbsoluteBox();
    el.style.transform = 'rotate(30deg)';
    p = new PositionableElement(el, listener);
    p.pushState();
    p.rotate(55, true);
    assert.equal(el.style.transform, 'rotate(75deg)');
  });

  // --- Undo

  it('should be able to undo', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);

    // State 2
    p.pushState();
    p.move(100, 100);

    // State 3
    p.pushState();
    p.resize(new Point(30, 80), 'se');

    // State 4
    p.pushState();
    p.rotate(45);

    // State 5
    p.pushState();
    p.move(100, 100);

    // Check state 5 (last)
    assert.equal(el.style.top,  '300px');
    assert.equal(el.style.left, '300px');
    assert.equal(el.style.width, '130px');
    assert.equal(el.style.height, '180px');
    assert.equal(el.style.transform, 'rotate(45deg)');

    // Undo and check state 4
    p.undo();
    assert.equal(el.style.top,  '200px');
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.width, '130px');
    assert.equal(el.style.height, '180px');
    assert.equal(el.style.transform, 'rotate(45deg)');

    // Undo and check state 3
    p.undo();
    assert.equal(el.style.top,  '200px');
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.width, '130px');
    assert.equal(el.style.height, '180px');
    assert.equal(el.style.transform, '');

    // Undo and check state 2
    p.undo();
    assert.equal(el.style.top,  '200px');
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.width, '100px');
    assert.equal(el.style.height, '100px');
    assert.equal(el.style.transform, '');

    // Undo and check state 1
    p.undo();
    assert.equal(el.style.top,  '100px');
    assert.equal(el.style.left, '100px');
    assert.equal(el.style.width, '100px');
    assert.equal(el.style.height, '100px');
    assert.equal(el.style.transform, '');

    // First state reached, check no operation
    p.undo();
    assert.equal(el.style.top,  '100px');
    assert.equal(el.style.left, '100px');
    assert.equal(el.style.width, '100px');
    assert.equal(el.style.height, '100px');
    assert.equal(el.style.transform, '');

  });

  it('should be able to undo background move', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);

    p.pushState();
    p.moveBackground(200, 200);
    assert.equal(el.style.backgroundPosition,  '200px 200px');

    p.undo();
    assert.equal(el.style.backgroundPosition,  '');

  });

  it('should restore transform to null after undo', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);

    p.pushState();
    p.rotate(45);
    assert.equal(el.style.transform,  'rotate(45deg)');

    p.pushState();
    p.resize(new Point(20, 20), 'nw');
    assert.equal(el.style.transform,  'translate(-10px, 4.14px) rotate(45deg)');
    assert.equal(el.style.top,  '120px');
    assert.equal(el.style.left, '120px');
    assert.equal(el.style.width, '80px');
    assert.equal(el.style.height, '80px');

    p.undo();
    assert.equal(el.style.transform,  'rotate(45deg)');
    assert.equal(el.style.top,  '100px');
    assert.equal(el.style.left, '100px');
    assert.equal(el.style.width, '100px');
    assert.equal(el.style.height, '100px');

    p.undo();
    assert.equal(el.style.transform,  '');

  });

  // --- Background Snapping

  it('should snap to a background sprite', function() {
    el = appendBackgroundImageBox();
    p = new PositionableElement(el, listener);
    forceBackgroundImageLoad(p);

    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    assert.equal(el.style.top,    '141px');
    assert.equal(el.style.left,   '121px');
    assert.equal(el.style.width,  '2px');
    assert.equal(el.style.height, '2px');
  });

  // --- Peeking

  it('should allow peeking on an element with a background', function() {
    el = appendBackgroundImageBox();
    p = new PositionableElement(el, listener);
    p.setPeekMode(true);
    assert.equal(el.style.width, '500px');
    assert.equal(el.style.height, '500px');
  });

  it('should not allow peeking on an element with no background', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.setPeekMode(true);
    assert.equal(el.style.width, '');
    assert.equal(el.style.height, '');
  });

  it('should be able to move while peeking', function() {
    el = appendBackgroundImageBox();
    p = new PositionableElement(el, listener);
    forceBackgroundImageLoad(p);

    p.pushState();
    p.move(100, 100);
    assert.equal(el.style.top,    '200px');
    assert.equal(el.style.left,   '200px');

    p.setPeekMode(true);
    assert.equal(el.style.width,  '500px');
    assert.equal(el.style.height, '500px');

    p.setPeekMode(false);
    assert.equal(el.style.width,  '100px');
    assert.equal(el.style.height, '100px');

    p.setPeekMode(true);
    assert.equal(el.style.width,  '500px');
    assert.equal(el.style.height, '500px');

    p.move(200, 200);
    p.setPeekMode(false);

    assert.equal(el.style.top,    '300px');
    assert.equal(el.style.left,   '300px');
    assert.equal(el.style.width,  '100px');
    assert.equal(el.style.height, '100px');
  });

  it('should be able to resize while peeking', function() {
    el = appendBackgroundImageBox();
    p = new PositionableElement(el, listener);

    p.setPeekMode(true);
    p.lockPeekMode();
    p.pushState();
    p.resize(new Point(30, 80), 'se');
    p.setPeekMode(false);

    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '530px');
    assert.equal(el.style.height, '580px');
  });

  it('should be able to snap while peeking', function() {
    el = appendBackgroundImageBox();
    p = new PositionableElement(el, listener);
    forceBackgroundImageLoad(p);

    p.setPeekMode(true);
    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    p.setPeekMode(false);

    assert.equal(el.style.top,    '141px');
    assert.equal(el.style.left,   '121px');
    assert.equal(el.style.width,  '2px');
    assert.equal(el.style.height, '2px');
  });

  it('should be able to get back to initial state after peeking', function() {
    el = appendBackgroundImageBox();
    p = new PositionableElement(el, listener);
    forceBackgroundImageLoad(p);

    p.setPeekMode(true);
    p.lockPeekMode();
    p.pushState();
    p.resize(new Point(30, 80), 'se');

    p.undo();
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.width,  '500px');
    assert.equal(el.style.height, '500px');

    p.undo();
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.width,  '100px');
    assert.equal(el.style.height, '100px');

  });

  // --- Other

  it('should receive correct rotation events after a move', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.pushState();
    p.move(100, 100);
    dragElement(getUiElement(el, '.rotation-handle'), 300, 300, 250, 300);
    assert.equal(listener.lastEventRotation.abs, 45);
  });

  it('should not remove the element on destroy', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.destroy();
    assert.isTrue(!!el.parentNode);
    assert.equal(Object.keys(p.listeners).length, 0);
    assert.equal(getUiElement(el, '.position-handle'), null);
    assert.equal(getUiElement(el, '.resize-handle-n'), null);
    assert.equal(getUiElement(el, '.resize-handle-s'), null);
    assert.equal(getUiElement(el, '.resize-handle-e'), null);
    assert.equal(getUiElement(el, '.resize-handle-w'), null);
    assert.equal(getUiElement(el, '.resize-handle-nw'), null);
    assert.equal(getUiElement(el, '.resize-handle-ne'), null);
    assert.equal(getUiElement(el, '.resize-handle-se'), null);
    assert.equal(getUiElement(el, '.resize-handle-sw'), null);
  });

});
