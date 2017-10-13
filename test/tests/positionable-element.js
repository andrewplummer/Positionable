
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

  it('should set initial state from stylesheet', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    assert.equal(p.cssBox.cssH.px, 100);
    assert.equal(p.cssBox.cssV.px, 100);
    assert.equal(p.cssBox.cssWidth.px, 100);
    assert.equal(p.cssBox.cssHeight.px, 100);
    assert.equal(p.cssZIndex.val, 2);
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

  // --- Other

  it('should receive correct rotation events after a move', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.pushState();
    p.move(100, 100);
    dragElement(getUiElement(el, '.rotation-handle'), 300, 300, 250, 300);
    assert.equal(listener.lastEventRotation.abs, 45);
  });

  it('should destroy the element', function() {
    el = appendAbsoluteBox();
    p = new PositionableElement(el, listener);
    p.destroy();
    assert.equal(el.parentNode, null);
  });

});
