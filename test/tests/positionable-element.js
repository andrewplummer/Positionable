
describe('PositionableElement', function() {

  var listener, el, element;

  class Listener {

    // --- Element Events

    onElementMouseDown() {
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

    onResizeDragIntentStart() {
    }

    onResizeDragIntentStop() {
    }

    onResizeDragStart() {
    }

    onResizeDragMove(evt) {
      this.lastEventResizeDrag = evt.drag;
    }

    onResizeDragStop() {
    }

    // --- Rotation Events

    onRotationDragIntentStart() {
    }

    onRotationDragIntentStop() {
    }

    onRotationDragStart() {
    }

    onRotationDragMove(evt) {
      this.lastEventRotation = evt.rotation;
    }

    onRotationDragStop() {
    }

    // --- Background Image Events

    onBackgroundImageSnap() {
    }

  }

  setup(function() {
    listener = new Listener();
    promiseMock.apply();
    imageLoadMock.apply();
  });

  teardown(function() {
    releaseAppendedFixtures();
    promiseMock.release();
    imageLoadMock.release();
  });

  function setupBox(className) {
    el = appendBox(className);
    element = new PositionableElement(el, listener);
  }

  it('should set initial state from stylesheet', function() {
    setupBox();
    assert.equal(element.cssBox.cssH.px, 100);
    assert.equal(element.cssBox.cssV.px, 100);
    assert.equal(element.cssBox.cssWidth.px, 100);
    assert.equal(element.cssBox.cssHeight.px, 100);
    assert.equal(element.cssZIndex.cssValue.val, 0);
    assert.equal(element.getRotation(), 0);
  });

  it('more specific styles should take precedence', function() {
    setupBox('z-box');
    assert.equal(element.cssZIndex.cssValue.val, 400);
  });

  it('inline styles should take precedence', function() {
    el = appendBox();
    el.style.left   = '100px';
    el.style.top    = '100px';
    el.style.width  = '100px';
    el.style.height = '100px';
    el.style.zIndex = '5';
    el.style.transform = 'translate(100px, 100px) rotate(45deg)';
    element = new PositionableElement(el, listener);
    assert.equal(element.cssBox.cssH.px, 100);
    assert.equal(element.cssBox.cssV.px, 100);
    assert.equal(element.cssBox.cssWidth.px, 100);
    assert.equal(element.cssBox.cssHeight.px, 100);
    assert.equal(element.cssZIndex.cssValue.val, 5);
    assert.equal(element.getRotation(), 45);
    assert.equal(element.cssTransform.getTranslation().x, 100);
    assert.equal(element.cssTransform.getTranslation().y, 100);
  });

  it('should force static elements to absolute on init', function() {
    setupBox('static-box');
    assert.equal(el.style.position, 'absolute');
    element.destroy();
    assert.equal(el.style.position, '');
  });

  // --- Moving

  it('should update position', function() {
    setupBox();
    element.pushState();
    element.move(100, 100);
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.top, '200px');
  });

  it('should constrain position', function() {
    setupBox();
    element.pushState();
    element.move(100, 60, true);
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.top, '100px');
  });

  // --- Background Moving

  it('should be able to move the background image', function() {
    setupBox('background-box');
    element.pushState();
    element.moveBackground(200, 200);
    assert.equal(el.style.backgroundPosition,  '220px 240px');
  });

  it('should be able to move the background image on a rotated box', function() {
    setupBox('background-box rotate-box');
    element.pushState();
    element.moveBackground(100, 100);
    assert.equal(el.style.backgroundPosition,  '161px 40px');
  });

  // --- Resizing

  it('should resize', function() {
    setupBox();
    element.pushState();
    element.resize(30, 80, 'se');
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '130px');
    assert.equal(el.style.height, '180px');
  });

  it('should resize by positioned edges', function() {
    setupBox();
    element.pushState();
    element.resize(30, 80, 'nw');
    assert.equal(el.style.left,   '130px');
    assert.equal(el.style.top,    '180px');
    assert.equal(el.style.width,  '70px');
    assert.equal(el.style.height, '20px');
  });

  it('should constrain resize', function() {
    setupBox();
    element.pushState();
    element.resize(200, 100, 'se', true);
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '200px');
    assert.equal(el.style.height, '200px');
  });

  it('should receive correct resize events', function() {
    setupBox();
    dragElement(getUiElement(el, '.resize-handle-sw'), 200, 200, 300, 300);
    assert.equal(listener.lastEventResizeDrag.x, 100);
    assert.equal(listener.lastEventResizeDrag.y, 100);
  });

  // --- Rotating

  it('should update rotation', function() {
    el = appendBox();
    el.style.transform = 'rotate(45deg)';
    element = new PositionableElement(el, listener);
    element.pushState();
    element.rotate(45);
    assert.equal(el.style.transform, 'rotate(90deg)');
  });

  it('should constrain rotation', function() {
    el = appendBox();
    el.style.transform = 'rotate(30deg)';
    element = new PositionableElement(el, listener);
    element.pushState();
    element.rotate(55, true);
    assert.equal(el.style.transform, 'rotate(75deg)');
  });

  // --- Undo

  it('should be able to undo', function() {
    setupBox();

    // State 2
    element.pushState();
    element.move(100, 100);

    // State 3
    element.pushState();
    element.resize(30, 80, 'se');

    // State 4
    element.pushState();
    element.rotate(45);

    // State 5
    element.pushState();
    element.move(100, 100);

    // Check state 5 (last)
    assert.equal(el.style.top,  '300px');
    assert.equal(el.style.left, '300px');
    assert.equal(el.style.width, '130px');
    assert.equal(el.style.height, '180px');
    assert.equal(el.style.transform, 'rotate(45deg)');

    // Undo and check state 4
    element.undo();
    assert.equal(el.style.top,  '200px');
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.width, '130px');
    assert.equal(el.style.height, '180px');
    assert.equal(el.style.transform, 'rotate(45deg)');

    // Undo and check state 3
    element.undo();
    assert.equal(el.style.top,  '200px');
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.width, '130px');
    assert.equal(el.style.height, '180px');
    assert.equal(el.style.transform, '');

    // Undo and check state 2
    element.undo();
    assert.equal(el.style.top,  '200px');
    assert.equal(el.style.left, '200px');
    assert.equal(el.style.width, '100px');
    assert.equal(el.style.height, '100px');
    assert.equal(el.style.transform, '');

    // Undo and check state 1
    element.undo();
    assert.equal(el.style.top,  '100px');
    assert.equal(el.style.left, '100px');
    assert.equal(el.style.width, '100px');
    assert.equal(el.style.height, '100px');
    assert.equal(el.style.transform, '');

    // First state reached, check no operation
    element.undo();
    assert.equal(el.style.top,  '100px');
    assert.equal(el.style.left, '100px');
    assert.equal(el.style.width, '100px');
    assert.equal(el.style.height, '100px');
    assert.equal(el.style.transform, '');

  });

  it('should be able to undo background move', function() {
    setupBox('background-box');

    element.pushState();
    element.moveBackground(200, 200);
    assert.equal(el.style.backgroundPosition,  '220px 240px');

    element.undo();
    assert.equal(el.style.backgroundPosition,  '20px 40px');

  });

  it('should restore transform to null after undo', function() {
    setupBox();

    element.pushState();
    element.rotate(45);
    assert.equal(el.style.transform,  'rotate(45deg)');

    element.pushState();
    element.resize(20, 20, 'nw');
    assert.equal(el.style.transform,  'translate(-10px, 4.14px) rotate(45deg)');
    assert.equal(el.style.top,  '120px');
    assert.equal(el.style.left, '120px');
    assert.equal(el.style.width, '80px');
    assert.equal(el.style.height, '80px');

    element.undo();
    assert.equal(el.style.transform,  'rotate(45deg)');
    assert.equal(el.style.top,  '100px');
    assert.equal(el.style.left, '100px');
    assert.equal(el.style.width, '100px');
    assert.equal(el.style.height, '100px');

    element.undo();
    assert.equal(el.style.transform,  '');

  });

  // --- Background Snapping

  it('should snap to a background sprite', function() {
    setupBox('background-box');

    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    assert.equal(el.style.top,    '141px');
    assert.equal(el.style.left,   '121px');
    assert.equal(el.style.width,  '2px');
    assert.equal(el.style.height, '2px');
  });

  // --- Peeking

  it('should allow peeking on an element with a background', function() {
    setupBox('background-box');
    element.setPeekMode(true);
    assert.equal(el.style.width, '500px');
    assert.equal(el.style.height, '500px');
  });

  it('should not allow peeking on an element with no background', function() {
    setupBox();
    element.setPeekMode(true);
    assert.equal(el.style.width, '');
    assert.equal(el.style.height, '');
  });

  it('should be able to move while peeking', function() {
    setupBox('background-box');

    element.pushState();
    element.move(100, 100);
    assert.equal(el.style.top,    '200px');
    assert.equal(el.style.left,   '200px');

    element.setPeekMode(true);
    assert.equal(el.style.width,  '500px');
    assert.equal(el.style.height, '500px');

    element.setPeekMode(false);
    assert.equal(el.style.width,  '100px');
    assert.equal(el.style.height, '100px');

    element.setPeekMode(true);
    assert.equal(el.style.width,  '500px');
    assert.equal(el.style.height, '500px');

    element.move(200, 200);
    element.setPeekMode(false);

    assert.equal(el.style.top,    '300px');
    assert.equal(el.style.left,   '300px');
    assert.equal(el.style.width,  '100px');
    assert.equal(el.style.height, '100px');
  });

  it('should be able to resize while peeking', function() {
    setupBox('background-box');

    element.setPeekMode(true);
    element.lockPeekMode();
    element.pushState();
    element.resize(30, 80, 'se');
    element.setPeekMode(false);

    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.width,  '530px');
    assert.equal(el.style.height, '580px');
  });

  it('should be able to snap while peeking', function() {
    setupBox('background-box');

    element.setPeekMode(true);
    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    element.setPeekMode(false);

    assert.equal(el.style.top,    '141px');
    assert.equal(el.style.left,   '121px');
    assert.equal(el.style.width,  '2px');
    assert.equal(el.style.height, '2px');
  });

  it('should be able to get back to initial state after peeking', function() {
    setupBox('background-box');

    element.setPeekMode(true);
    element.lockPeekMode();
    element.pushState();
    element.resize(30, 80, 'se');

    element.undo();
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.width,  '500px');
    assert.equal(el.style.height, '500px');

    element.undo();
    assert.equal(el.style.top,    '100px');
    assert.equal(el.style.left,   '100px');
    assert.equal(el.style.width,  '100px');
    assert.equal(el.style.height, '100px');

  });

  // --- CSS Declarations

  it('should get its CSS declarations', function() {
    setupBox();
    var decs = element.getCSSDeclarations();
    assert.equal(decs[0], 'top: 100px;');
    assert.equal(decs[1], 'left: 100px;');
    assert.equal(decs[2], 'width: 100px;');
    assert.equal(decs[3], 'height: 100px;');
    assert.equal(decs.length, 4);
  });

  it('should get its CSS declarations for complex box', function() {
    setupBox('complex-box');

    var decs = element.getCSSDeclarations();
    assert.equal(decs[0], 'bottom: 100px;');
    assert.equal(decs[1], 'right: 100px;');
    assert.equal(decs[2], 'width: 100px;');
    assert.equal(decs[3], 'height: 100px;');
    assert.equal(decs[4], 'z-index: 400;');
    assert.equal(decs[5], 'background-position: 20px 40px;');
    assert.equal(decs[6], 'transform: rotate(45deg) translate(20px, 30px);');
    assert.equal(decs.length, 7);
  });

  it('should get only changed CSS declarations', function() {
    setupBox('complex-box');

    element.pushState();
    element.move(-50, -50);

    var decs = element.getChangedCSSDeclarations();
    assert.equal(decs[0], 'bottom: 150px;');
    assert.equal(decs[1], 'right: 150px;');
    assert.equal(decs.length, 2);
  });

  // --- Anchors

  it('should not have transfom after basic move', function() {
    setupBox();
    element.pushState();
    element.move(100, 100);
    assert.equal(el.style.transform, '');
  });

  it('should not have transform after basic resize', function() {
    setupBox();
    element.pushState();
    element.resize(100, 100, 'se');
    assert.equal(el.style.transform, '');
  });

  it('should have tranform after rotated resize', function() {
    setupBox('rotate-box');
    element.pushState();
    element.resize(100, 100, 'se');
    assert.equal(el.style.transform, 'translate(-50px, 20.71px) rotate(45deg)');
  });

  // --- Other

  it('should receive correct rotation events after a move', function() {
    setupBox();
    element.pushState();
    element.move(100, 100);
    dragElement(getUiElement(el, '.rotation-handle'), 300, 300, 250, 300);
    assert.equalWithTolerance(listener.lastEventRotation.abs, 45, .01);
  });

  it('should not remove the ui only on destroy', function() {
    setupBox();
    element.destroy();
    assert.isTrue(!!el.parentNode);
    assert.equal(Object.keys(element.listeners).length, 0);
    assert.equal(el.querySelector('.positionable-extension-ui'), null);
  });

  it('should not fail on a box using CSS variables', function() {
    setupBox('var-box');
    element.renderBox();
    assert.equal(el.style.top,    '100%');
    assert.equal(el.style.left,   '100%');
    assert.equal(el.style.width,  '100%');
    assert.equal(el.style.height, '100%');
  });

  it('should not error on unsupported values', function() {
    el = appendBox();
    el.style.width = 'max-content';
    element = new PositionableElement(el, listener);
    assert.equal(element.cssBox.cssWidth.px, 0);
  });

  it('should not error on unsupported units', function() {
    el = appendBox();
    el.style.width = '3cm';
    element = new PositionableElement(el, listener);
    assert.equal(element.cssBox.cssWidth.px, 0);
  });

  it('should use computed properties on an incomplete box', function() {
    setupBox('incomplete-box');
    assert.equal(element.cssBox.cssHeight.px, 0);
  });

  it('should not error when positioning values are auto', function() {
    setupBox('hidden-box');
    assert.equal(element.cssBox.cssWidth.px, 0);
  });

  it('should turn off transitions while active', function() {
    setupBox('transition-box');
    element.pushState();
    element.resize(100, 100, 'se');
    assert.equal(el.style.transitionProperty, 'none');
    element.destroy();
    assert.equal(el.style.transitionProperty, '');
  });

  it('should turn off animations while active', function() {
    setupBox('animation-box');
    element.pushState();
    element.resize(100, 100, 'se');
    assert.equal(el.style.animation, 'none');
    element.destroy();
    assert.equal(el.style.animation, '');
  });

  it('should turn off user select while active', function() {
    setupBox();
    assert.equal(el.style.userSelect, 'none');
    element.destroy();
    assert.equal(el.style.userSelect, '');
  });

  it('should not clear all rendered styles when destroyed', function() {
    setupBox('animation-box');
    element.pushState();
    element.resize(100, 100, 'se');
    element.destroy();
    assert.equal(el.style.top, '100px');
  });

  it('should be able to set a highlight mode', function() {
    setupBox();
    element.setHighlightMode(true);
    assert.isTrue(getUiElement(el, '#ui').classList.contains('ui--highlight'));
    element.setHighlightMode(false);
    assert.isFalse(getUiElement(el, '#ui').classList.contains('ui--highlight'));
  });

  it('should clear temporary z-index when destroyed', function() {
    setupBox();
    element.focus();
    element.destroy();
    assert.equal(el.style.zIndex, '');
  });

});
