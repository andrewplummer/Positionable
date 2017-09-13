
describe('PositionableElementManager', function(uiRoot) {

  var manager, listener, els, el;

  class Listener {

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

  }

  setup(function() {
    listener = new Listener();
    manager = new PositionableElementManager(listener);
  });

  teardown(function() {
    manager.destroyAll();
    el       = null;
    els      = null;
    manager  = null;
    listener = null;
  });

  function setupAbsolute() {
    el = appendAbsoluteBox();
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

  function setupBox(left, top, width, height) {
    el = appendAbsoluteBox();
    el.style.left   = left;
    el.style.top    = top;
    el.style.width  = width;
    el.style.height = height;
    manager.findElements();
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

  function focusElement(el) {
    fireShiftMouseDownUp(getUiElement(el, '.position-handle'))
  }

  function focusElements(els) {
    els.forEach(el => focusElement(el));
  }

  function assertBoxDimensions(left, top, width, height) {
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

  // --- Focusing

  it('should focus element on position handle mousedown', function() {
    setupAbsolute();
    fireMouseDownUp(getUiElement(el, '.position-handle'));
    assert.equal(manager.focusedElements.length, 1);
  });

  it('should focus element on resize handle mousedown', function() {
    setupAbsolute();
    fireMouseDownUp(getUiElement(el, '.resize-handle'));
    assert.equal(manager.focusedElements.length, 1);
  });

  it('should focus elements on rotation handle mousedown', function() {
    setupAbsolute();
    fireMouseDownUp(getUiElement(el, '.rotation-handle'));
    assert.equal(manager.focusedElements.length, 1);
  });

  it('should swap focus by default', function() {
    setupMultiple();

    fireMouseDownUp(getUiElement(els[0], '.position-handle'));
    assert.equal(manager.focusedElements.length, 1);
    assert.equal(manager.focusedElements[0], manager.elements[0]);

    fireMouseDownUp(getUiElement(els[1], '.position-handle'));
    assert.equal(manager.focusedElements.length, 1);
    assert.equal(manager.focusedElements[0], manager.elements[1]);

  });

  it('should not swap focus when shift key is pressed', function() {
    setupMultiple();
    fireMouseDownUp(getUiElement(els[0], '.position-handle'));
    fireShiftMouseDownUp(getUiElement(els[0], '.position-handle'));
    fireShiftMouseDown(els[1]);
    fireMouseUp(getUiElement(els[0], '.position-handle'));
    assert.equal(manager.focusedElements.length, 2);
  });

  // --- Positioning

  it('should move', function() {
    setupAbsolute();
    dragElement(getUiElement(el, '.position-handle'), 0, 0, 50, 50);
    assert.equal(el.style.left, '150px');
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
    assertBoxDimensions('50px', '50px', '50px', '50px');
  });

  // --- Resize Reflecting

  it('should allow a box to be reflected from its opposite edges', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    dragElement(getUiElement(el, '.resize-handle-se'), 2420, 1580, 0, 0);
    assertBoxDimensions('0px', '0px', '500px', '500px');
  });

  it('should allow a box to be reflected from its positioned edges', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    dragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 2920, 2080);
    assertBoxDimensions('2420px', '1580px', '500px', '500px');
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
    assertBoxDimensions('100px', '100px', '200px', '200px');
  });

  it('should not fail to constrain se resize on 0', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 0, 0);
    assertBoxDimensions('0px', '0px', '0px', '0px');
  });

  it('should not fail to constrain nw resize on 0', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 1920, 1080);
    assertBoxDimensions('1920px', '1080px', '0px', '0px');
  });

  it('should not interfere with non-constrainable handles', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-n'), 0, 0, 0, -1000);
    assertBoxDimensions('0px', '-1000px', '1920px', '2080px');
  });

  // --- Resize constraining - special

  it('should allow a zero size element when constraining', function() {
    setupBox('100px', '100px', '100px', '100px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 200, 200, 276, 100);
    assertBoxDimensions('100px', '100px', '0px', '0px');
  });

  // --- Resize Constraining - Normal Box

  it('should constrain ratio when dragging se corner right and down', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 2800, 1100);
    assertBoxDimensions('0px', '0px', '1956px', '1100px');
  });

  it('should constrain ratio when dragging se corner right and up', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 2800, 900);
    assertBoxDimensions('0px', '0px', '1600px', '900px');
  });

  it('should constrain ratio when dragging se corner left and down', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 1080, 1920);
    assertBoxDimensions('0px', '0px', '1080px', '608px');
  });

  it('should constrain ratio when dragging se corner left and up', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 1920, 1080, 1420, 580);
    assertBoxDimensions('0px', '0px', '1031px', '580px');
  });

  it('should constrain ratio when dragging nw corner right and down', function() {
    setupBox('0px', '0px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 500, 500);
    assertBoxDimensions('889px', '500px', '1031px', '580px');
  });

  it('should constrain ratio when dragging nw corner right and up', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 1000, 0);
    assertBoxDimensions('1000px', '781px', '1420px', '799px');
  });

  it('should constrain ratio when dragging nw corner left and down', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 0, 1000);
    assertBoxDimensions('1389px', '1000px', '1031px', '580px');
  });

  it('should constrain ratio when dragging nw corner left and up', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 0, 0);
    assertBoxDimensions('0px', '219px', '2420px', '1361px');
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
    assertBoxDimensions('0px', '219px', '500px', '281px');
  });

  it('should allow a constrained resize to reflect from its positioned edge', function() {
    setupBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 500, 500, 2920, 2080);
    assertBoxDimensions('2420px', '1580px', '500px', '281px');
  });

  it('should allow a constrained resize on an inverted box to reflect from its opposite edge', function() {
    setupInvertedBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-nw'), 0, 0, 2920, 2080);
    assertInvertedBoxDimensions('-500px', '-63px', '1000px', '563px');
  });

  it('should allow a constrained resize on an inverted box to reflect from its positioned edge', function() {
    setupInvertedBox('500px', '500px', '1920px', '1080px');
    shiftDragElement(getUiElement(el, '.resize-handle-se'), 2420, 1580, 0, 0);
    assertInvertedBoxDimensions('2420px', '1580px', '500px', '281px');
  });

  // --- Resize on a rotated element

  it('should keep anchors when resizing a rotated element', function() {
    setupRotatedBox('100px', '100px', '100px', '100px', '45deg');
    dragElement(getUiElement(el, '.resize-handle-se'), 150, 221, 150, 280);
    assertBoxDimensions('100px', '100px', '142px', '142px');
    assertBoxTranslation(-20.86, 8.64);
  });

  // --- Rotation

  it('should rotate', function() {
    setupAbsolute();
    dragElement(getUiElement(el, '.rotation-handle'), 200, 200, 150, 200);
    assert.equal(el.style.transform, 'rotate(45deg)');
  });

  it('should constrain rotation', function() {
    setupAbsolute();
    fireShiftMouseDown(getUiElement(el, '.rotation-handle'), 200, 200);
    fireShiftDocumentMouseMove(142, 200);
    assert.equal(el.style.transform, 'rotate(45deg)');
    fireShiftDocumentMouseMove(140, 200);
    assert.equal(el.style.transform, 'rotate(68deg)');
    fireShiftDocumentMouseUp(140, 200);
  });

  it('should update all element rotation handles', function() {
    setupMultiple();

    // Focus both and drag element 1 to 45 degrees.
    // Both elements should be at 45 degrees.
    focusElements(els);
    dragElement(getUiElement(els[1], '.rotation-handle'), 200, 200, 150, 200);
    assert.equal(els[0].style.transform, 'rotate(45deg)');
    assert.equal(els[1].style.transform, 'rotate(45deg)');

    // Now focus element 1 and drag it to 90 degrees.
    // Element 1 should be at 90 degrees, and element 2 should be at 45 degrees.
    manager.unfocusAll();
    focusElement(els[0]);
    dragElement(getUiElement(els[0], '.rotation-handle'), 150, 200, 100, 200);
    assert.equal(els[0].style.transform, 'rotate(90deg)');
    assert.equal(els[1].style.transform, 'rotate(45deg)');

    // Now focus both again and drag element 2 to 180 degrees.
    // Element 1 should be at 225 degrees, and element 2 should be at 180 degrees.
    focusElements(els);
    dragElement(getUiElement(els[1], '.rotation-handle'), 150, 200, 100, 100);
    assert.equal(els[0].style.transform, 'rotate(225deg)');
    assert.equal(els[1].style.transform, 'rotate(180deg)');

  });

});
