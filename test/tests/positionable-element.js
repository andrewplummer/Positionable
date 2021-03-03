
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
    imageMock.apply();
    promiseMock.apply();
  });

  teardown(function() {
    releaseAppendedFixtures();
    imageMock.release();
    promiseMock.release();
  });

  function setupBox(className) {
    el = appendBox(className);
    element = new PositionableElement(listener, el);
  }

  it('should set initial state from stylesheet', function() {
    setupBox();
    assertEqual(element.cssBox.cssH.px, 100);
    assertEqual(element.cssBox.cssV.px, 100);
    assertEqual(element.cssBox.cssWidth.px, 100);
    assertEqual(element.cssBox.cssHeight.px, 100);
    assertEqual(element.cssZIndex.cssValue.val, 0);
    assertEqual(element.getRotation(), 0);
  });

  it('more specific styles should take precedence', function() {
    setupBox('z-box');
    assertEqual(element.cssZIndex.cssValue.val, 400);
  });

  it('inline styles should take precedence', function() {
    el = appendBox();
    el.style.left   = '100px';
    el.style.top    = '100px';
    el.style.width  = '100px';
    el.style.height = '100px';
    el.style.zIndex = '5';
    el.style.transform = 'translate(100px, 100px) rotate(45deg)';
    element = new PositionableElement(listener, el);
    assertEqual(element.cssBox.cssH.px, 100);
    assertEqual(element.cssBox.cssV.px, 100);
    assertEqual(element.cssBox.cssWidth.px, 100);
    assertEqual(element.cssBox.cssHeight.px, 100);
    assertEqual(element.cssZIndex.cssValue.val, 5);
    assertEqual(element.getRotation(), 45);
    assertEqual(element.cssTransform.getTranslation().x, 100);
    assertEqual(element.cssTransform.getTranslation().y, 100);
  });

  it('should force static elements to relative on init', function() {
    setupBox('static-box');
    assertEqual(el.style.position, 'relative');
    element.destroy();
    assertEqual(el.style.position, '');
  });

  // --- Moving

  it('should update position', function() {
    setupBox();
    element.pushState();
    element.move(100, 100);
    assertEqual(el.style.left, '200px');
    assertEqual(el.style.top, '200px');
  });

  it('should constrain position', function() {
    setupBox();
    element.pushState();
    element.move(100, 60, true);
    assertEqual(el.style.left, '200px');
    assertEqual(el.style.top, '100px');
  });

  // --- Background Moving

  it('should be able to move the background image', function() {
    setupBox('background-box');
    element.pushState();
    element.moveBackground(200, 200);
    assertEqual(el.style.backgroundPosition,  '220px 240px');
  });

  it('should be able to move the background image on a rotated box', function() {
    setupBox('background-box rotate-box');
    element.pushState();
    element.moveBackground(100, 100);
    assertEqual(el.style.backgroundPosition,  '161px 40px');
  });

  // --- Resizing

  it('should resize', function() {
    setupBox();
    element.pushState();
    element.resize(30, 80, 'se');
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.width,  '130px');
    assertEqual(el.style.height, '180px');
  });

  it('should resize by positioned edges', function() {
    setupBox();
    element.pushState();
    element.resize(30, 80, 'nw');
    assertEqual(el.style.left,   '130px');
    assertEqual(el.style.top,    '180px');
    assertEqual(el.style.width,  '70px');
    assertEqual(el.style.height, '20px');
  });

  it('should constrain resize', function() {
    setupBox();
    element.pushState();
    element.resize(200, 100, 'se', true);
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.width,  '200px');
    assertEqual(el.style.height, '200px');
  });

  it('should receive correct resize events', function() {
    setupBox();
    dragElement(getUiElement(el, '.resize-handle-sw'), 200, 200, 300, 300);
    assertEqual(listener.lastEventResizeDrag.x, 100);
    assertEqual(listener.lastEventResizeDrag.y, 100);
  });

  // --- Rotating

  it('should update rotation', function() {
    el = appendBox();
    el.style.transform = 'rotate(45deg)';
    element = new PositionableElement(listener, el);
    element.pushState();
    element.rotate(45);
    assertEqual(el.style.transform, 'rotate(90deg)');
  });

  it('should constrain rotation', function() {
    el = appendBox();
    el.style.transform = 'rotate(30deg)';
    element = new PositionableElement(listener, el);
    element.pushState();
    element.rotate(55, true);
    assertEqual(el.style.transform, 'rotate(75deg)');
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
    assertEqual(el.style.top,  '300px');
    assertEqual(el.style.left, '300px');
    assertEqual(el.style.width, '130px');
    assertEqual(el.style.height, '180px');
    assertEqual(el.style.transform, 'rotate(45deg)');

    // Undo and check state 4
    element.undo();
    assertEqual(el.style.top,  '200px');
    assertEqual(el.style.left, '200px');
    assertEqual(el.style.width, '130px');
    assertEqual(el.style.height, '180px');
    assertEqual(el.style.transform, 'rotate(45deg)');

    // Undo and check state 3
    element.undo();
    assertEqual(el.style.top,  '200px');
    assertEqual(el.style.left, '200px');
    assertEqual(el.style.width, '130px');
    assertEqual(el.style.height, '180px');
    assertEqual(el.style.transform, '');

    // Undo and check state 2
    element.undo();
    assertEqual(el.style.top,  '200px');
    assertEqual(el.style.left, '200px');
    assertEqual(el.style.width, '100px');
    assertEqual(el.style.height, '100px');
    assertEqual(el.style.transform, '');

    // Undo and check state 1
    element.undo();
    assertEqual(el.style.top,  '100px');
    assertEqual(el.style.left, '100px');
    assertEqual(el.style.width, '100px');
    assertEqual(el.style.height, '100px');
    assertEqual(el.style.transform, '');

    // First state reached, check no operation
    element.undo();
    assertEqual(el.style.top,  '100px');
    assertEqual(el.style.left, '100px');
    assertEqual(el.style.width, '100px');
    assertEqual(el.style.height, '100px');
    assertEqual(el.style.transform, '');

  });

  it('should be able to undo background move', function() {
    setupBox('background-box');

    element.pushState();
    element.moveBackground(200, 200);
    assertEqual(el.style.backgroundPosition,  '220px 240px');

    element.undo();
    assertEqual(el.style.backgroundPosition,  '20px 40px');

  });

  it('should restore transform to null after undo', function() {
    setupBox();

    element.pushState();
    element.rotate(45);
    assertEqual(el.style.transform,  'rotate(45deg)');

    element.pushState();
    element.resize(20, 20, 'nw');
    assertEqual(el.style.transform,  'translate(-10px, 4.14px) rotate(45deg)');
    assertEqual(el.style.top,  '120px');
    assertEqual(el.style.left, '120px');
    assertEqual(el.style.width, '80px');
    assertEqual(el.style.height, '80px');

    element.undo();
    assertEqual(el.style.transform,  'rotate(45deg)');
    assertEqual(el.style.top,  '100px');
    assertEqual(el.style.left, '100px');
    assertEqual(el.style.width, '100px');
    assertEqual(el.style.height, '100px');

    element.undo();
    assertEqual(el.style.transform,  '');

  });

  // --- Background Snapping

  it('should snap to a background sprite', function() {
    setupBox('background-box');

    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    assertEqual(el.style.top,    '141px');
    assertEqual(el.style.left,   '121px');
    assertEqual(el.style.width,  '2px');
    assertEqual(el.style.height, '2px');
  });

  // --- Peeking

  it('should allow peeking on an element with a background', function() {
    setupBox('background-box');
    element.setPeekMode(true);
    assertEqual(el.style.width, '500px');
    assertEqual(el.style.height, '500px');
  });

  it('should not allow peeking on an element with no background', function() {
    setupBox();
    element.setPeekMode(true);
    assertEqual(el.style.width, '');
    assertEqual(el.style.height, '');
  });

  it('should be able to move while peeking', function() {
    setupBox('background-box');

    element.pushState();
    element.move(100, 100);
    assertEqual(el.style.top,    '200px');
    assertEqual(el.style.left,   '200px');

    element.setPeekMode(true);
    assertEqual(el.style.width,  '500px');
    assertEqual(el.style.height, '500px');

    element.setPeekMode(false);
    assertEqual(el.style.width,  '100px');
    assertEqual(el.style.height, '100px');

    element.setPeekMode(true);
    assertEqual(el.style.width,  '500px');
    assertEqual(el.style.height, '500px');

    element.move(200, 200);
    element.setPeekMode(false);

    assertEqual(el.style.top,    '300px');
    assertEqual(el.style.left,   '300px');
    assertEqual(el.style.width,  '100px');
    assertEqual(el.style.height, '100px');
  });

  it('should be able to resize while peeking', function() {
    setupBox('background-box');

    element.setPeekMode(true);
    element.lockPeekMode();
    element.pushState();
    element.resize(30, 80, 'se');
    element.setPeekMode(false);

    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.width,  '530px');
    assertEqual(el.style.height, '580px');
  });

  it('should be able to snap while peeking', function() {
    setupBox('background-box');

    element.setPeekMode(true);
    fireDoubleClick(getUiElement(el, '.position-handle'), 121, 141);
    element.setPeekMode(false);

    assertEqual(el.style.top,    '141px');
    assertEqual(el.style.left,   '121px');
    assertEqual(el.style.width,  '2px');
    assertEqual(el.style.height, '2px');
  });

  it('should be able to get back to initial state after peeking', function() {
    setupBox('background-box');

    element.setPeekMode(true);
    element.lockPeekMode();
    element.pushState();
    element.resize(30, 80, 'se');

    element.undo();
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.width,  '500px');
    assertEqual(el.style.height, '500px');

    element.undo();
    assertEqual(el.style.top,    '100px');
    assertEqual(el.style.left,   '100px');
    assertEqual(el.style.width,  '100px');
    assertEqual(el.style.height, '100px');

  });

  // --- CSS Declarations

  it('should get its CSS declarations', function() {
    setupBox();
    var decs = element.getCSSDeclarations();
    assertEqual(decs[0], 'top: 100px;');
    assertEqual(decs[1], 'left: 100px;');
    assertEqual(decs[2], 'width: 100px;');
    assertEqual(decs[3], 'height: 100px;');
    assertEqual(decs.length, 4);
  });

  it('should get its CSS declarations for complex box', function() {
    setupBox('complex-box');

    var decs = element.getCSSDeclarations();
    assertEqual(decs[0], 'bottom: 100px;');
    assertEqual(decs[1], 'right: 100px;');
    assertEqual(decs[2], 'width: 100px;');
    assertEqual(decs[3], 'height: 100px;');
    assertEqual(decs[4], 'z-index: 400;');
    assertEqual(decs[5], 'background-position: 20px 40px;');
    assertEqual(decs[6], 'transform: rotate(45deg) translate(20px, 30px);');
    assertEqual(decs.length, 7);
  });

  it('should get only changed CSS declarations', function() {
    setupBox('complex-box');

    element.pushState();
    element.move(-50, -50);

    var decs = element.getChangedCSSDeclarations();
    assertEqual(decs[0], 'bottom: 150px;');
    assertEqual(decs[1], 'right: 150px;');
    assertEqual(decs.length, 2);
  });

  it('should append a relative declaration if it was forced relative', function() {
    setupBox('static-box');
    var decs = element.getCSSDeclarations();
    assertEqual(decs[0], 'position: relative;');
    assertEqual(decs.length, 5);
  });

  // --- Anchors

  it('should not have transfom after basic move', function() {
    setupBox();
    element.pushState();
    element.move(100, 100);
    assertEqual(el.style.transform, '');
  });

  it('should not have transform after basic resize', function() {
    setupBox();
    element.pushState();
    element.resize(100, 100, 'se');
    assertEqual(el.style.transform, '');
  });

  it('should have tranform after rotated resize', function() {
    setupBox('rotate-box');
    element.pushState();
    element.resize(100, 100, 'se');
    assertEqual(el.style.transform, 'translate(-50px, 20.71px) rotate(45deg)');
  });

  // --- Other

  it('should receive correct rotation events after a move', function() {
    setupBox();
    element.pushState();
    element.move(100, 100);
    dragElement(getUiElement(el, '.rotation-handle'), 300, 300, 250, 300);
    assertEqualWithTolerance(listener.lastEventRotation.abs, 45, .01);
  });

  it('should not remove the ui only on destroy', function() {
    setupBox();
    element.destroy();
    assertTrue(!!el.parentNode);
    assertEqual(Object.keys(element.listeners).length, 0);
    assertEqual(el.querySelector('.positionable-extension-ui'), null);
  });

  it('should not fail on a box using CSS variables', function() {
    setupBox('var-box');
    element.renderBox();
    assertEqual(el.style.top,    '100%');
    assertEqual(el.style.left,   '100%');
    assertEqual(el.style.width,  '100%');
    assertEqual(el.style.height, '100%');
  });

  it('should not error on unsupported values', function() {
    el = appendBox();
    el.style.width = 'max-content';
    element = new PositionableElement(listener, el);
    assertEqual(element.cssBox.cssWidth.px, 0);
  });

  it('should not error on unsupported units', function() {
    el = appendBox();
    el.style.width = '3cm';
    element = new PositionableElement(listener, el);
    assertEqual(element.cssBox.cssWidth.px, 0);
  });

  it('should use computed properties on an incomplete box', function() {
    setupBox('incomplete-box');
    assertEqual(element.cssBox.cssHeight.px, 0);
  });

  it('should not error when positioning values are auto', function() {
    setupBox('hidden-box');
    assertEqual(element.cssBox.cssWidth.px, 0);
  });

  it('should turn off transitions while active', function() {
    setupBox('transition-box');
    element.pushState();
    element.resize(100, 100, 'se');
    assertEqual(el.style.transitionProperty, 'none');
    element.destroy();
    assertEqual(el.style.transitionProperty, '');
  });

  it('should turn off animations while active', function() {
    setupBox('animation-box');
    element.pushState();
    element.resize(100, 100, 'se');
    assertEqual(el.style.animation, '0s ease 0s 1 normal none running none');
    element.destroy();
    assertEqual(el.style.animation, '');
  });

  it('should turn off user select while active', function() {
    setupBox();
    assertEqual(el.style.userSelect, 'none');
    element.destroy();
    assertEqual(el.style.userSelect, '');
  });

  it('should turn off min/max height while active', function() {
    setupBox();
    assertEqual(el.style.minWidth,  '0px');
    assertEqual(el.style.minHeight, '0px');
    assertEqual(el.style.maxWidth,  'none');
    assertEqual(el.style.maxHeight, 'none');
    element.destroy();
    assertEqual(el.style.minWidth,  '');
    assertEqual(el.style.minHeight, '');
    assertEqual(el.style.maxWidth,  '');
    assertEqual(el.style.maxHeight, '');
  });

  it('should not clear all rendered styles when destroyed', function() {
    setupBox('animation-box');
    element.pushState();
    element.resize(100, 100, 'se');
    element.destroy();
    assertEqual(el.style.top, '100px');
  });

  it('should be able to set a highlight mode', function() {
    setupBox();
    element.setHighlightMode(true);
    assertTrue(getUiElement(el, '#ui').classList.contains('ui--highlight'));
    element.setHighlightMode(false);
    assertFalse(getUiElement(el, '#ui').classList.contains('ui--highlight'));
  });

  it('should clear temporary z-index when destroyed', function() {
    setupBox();
    element.focus();
    element.destroy();
    assertEqual(el.style.zIndex, '');
  });

  it('should set ui z-index on focus', function() {
    setupBox();
    element.focus();
    assertEqual(getUiContainer(element.el).style.zIndex, String(PositionableElement.TOP_Z_INDEX));
    element.unfocus();
    assertEqual(getUiContainer(element.el).style.zIndex, '');
  });

});
