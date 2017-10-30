
describe('DragTarget', function() {

  var target, el;

  class Target extends DragTarget {

    constructor(el, allowInteraction) {
      super(el, allowInteraction);
      this.clicked = false;
      this.doubleClicked = false;
      this.startIntents = 0;
      this.stopIntents  = 0;
      this.dragStarts   = 0;
      this.dragStops    = 0;
      this.setupDragIntents();
    }

    onDragIntentStart() {
      this.startIntents += 1;
    }

    onDragIntentStop() {
      this.stopIntents += 1;
    }

    onDragStart(evt) {
      super.onDragStart(evt);
      this.dragStarts += 1;
    }

    onDragMove(evt) {
      super.onDragMove(evt);
      this.lastDragEvent = evt;
    }

    onDragStop(evt) {
      super.onDragStop(evt);
      this.dragStops += 1;
    }

    onClick() {
      this.clicked = true;
    }

    onDoubleClick() {
      this.doubleClicked = true;
    }

  }

  teardown(function() {
    el = null;
    target = null;
  });

  function setupLink(href) {
    el = createLink(href);
    target = new Target(el);
  }

  function setupStatic() {
    el = createDiv();
    target = new Target(el);
  }

  function setupAbsolute() {
    el = appendBox();
    target = new Target(el);
  }

  teardown(function() {
    releaseAppendedFixtures();
  });

  it('should have drag data set', function() {
    setupStatic();
    dragElement(el, 50, 100, 250, 350);

    assert.equal(target.lastDragEvent.drag.x, 200);
    assert.equal(target.lastDragEvent.drag.y, 250);
    assert.equal(target.lastDragEvent.drag.origin.clientX, 50);
    assert.equal(target.lastDragEvent.drag.origin.clientY, 100);
  });

  it('should trigger click if no drag detected', function() {
    setupStatic();
    fireMouseDown(el, 50, 100);
    fireDocumentMouseUp(50, 100);

    assert.isUndefined(target.lastDragEvent);
    assert.equal(target.clicked, true);
  });

  it('should correctly set origin event data while scrolled', function() {

    whileScrolled(500, () => {
      setupAbsolute();
      dragElement(el, 50, 50, 50, 100);
      assert.equal(target.lastDragEvent.drag.x, 0);
      assert.equal(target.lastDragEvent.drag.y, 50);
      assert.equal(target.lastDragEvent.drag.origin.pageX, 50);
      assert.equal(target.lastDragEvent.drag.origin.pageY, 550);
      assert.equal(target.lastDragEvent.drag.origin.clientX, 50);
      assert.equal(target.lastDragEvent.drag.origin.clientY, 50);
    });

  });

  it('should continue to drag when scrolling', function() {

    setupAbsolute();
    fireMouseDown(el, 50, 50);
    whileFakeScrolled(500, () => {
      target.onScroll();
      target.onScroll();
    });
    fireDocumentMouseUp(50, 50);
    assert.equal(target.lastDragEvent.drag.x, 0);
    assert.equal(target.lastDragEvent.drag.y, 500);

  });

  it('should set dragging to false before firing onDragStop', function() {
    setupStatic();
    target.onDragStop = () => {
      assert.equal(target.dragging, false);
    };
    dragElement(el, 50, 50, 100, 100);
  });

  it('should fire drag intents on mouse events', function() {
    setupStatic();

    fireMouseOver(el);
    assert.equal(target.startIntents, 1);
    assert.equal(target.stopIntents, 0);
    fireMouseOut(el);
    assert.equal(target.startIntents, 1);
    assert.equal(target.stopIntents, 1);

  });

  it('should correctly receive drag intent events', function() {
    setupStatic();

    // This has changed to not take dragging into account.
    // Only the mouseover/mouseout events should be taken
    // into account here, so asserting that.

    // Once through the element, in and out.
    // 1 start and 1 stop event should be triggered here.
    fireMouseOver(el, 200, 200);
    fireMouseOut(el, 200, 200);

    // Back over the element and activating.
    // 1 start event fired here.
    fireMouseOver(el, 200, 200);
    fireMouseDown(el, 200, 200);

    // Drag outside the element, firing a mouseout
    fireDocumentMouseMove(300, 300);
    fireMouseOut(el, 300, 300);

    // Drag back through the element once, triggering
    // a mouseover then mouseout
    fireDocumentMouseMove(200, 200);
    fireMouseOver(el, 200, 200);
    fireDocumentMouseMove(300, 300);
    fireMouseOut(el, 300, 300);

    // Ending outside the element
    // 1 stop event fired here.
    fireDocumentMouseUp(300, 300);

    assert.equal(target.startIntents, 3);
    assert.equal(target.stopIntents, 3);
  });

  it('should not follow links on click', function() {
    setupLink('#foo');
    clickElement(el);
    assert.equal(window.location.hash, '');
  });

  it('should not allow dragging from text or form controls', function() {

    el = createDiv();

    var p      = appendByTag(el, 'p');
    var h1     = appendByTag(el, 'h1');
    var h2     = appendByTag(el, 'h2');
    var h3     = appendByTag(el, 'h3');
    var h4     = appendByTag(el, 'h4');
    var h5     = appendByTag(el, 'h5');
    var h6     = appendByTag(el, 'h6');
    var pre    = appendByTag(el, 'pre');
    var code   = appendByTag(el, 'code');
    var span   = appendByTag(el, 'span');
    var link   = appendByTag(el, 'a');
    var input  = appendByTag(el, 'input');
    var label  = appendByTag(el, 'label');
    var select = appendByTag(el, 'select');

    target = new Target(el);
    target.setupInteractiveElements();

    dragElement(p,      0, 0, 50, 50);
    dragElement(h1,     0, 0, 50, 50);
    dragElement(h2,     0, 0, 50, 50);
    dragElement(h3,     0, 0, 50, 50);
    dragElement(h4,     0, 0, 50, 50);
    dragElement(h5,     0, 0, 50, 50);
    dragElement(h6,     0, 0, 50, 50);
    dragElement(pre,    0, 0, 50, 50);
    dragElement(code,   0, 0, 50, 50);
    dragElement(span,   0, 0, 50, 50);
    dragElement(link,   0, 0, 50, 50);
    dragElement(input,  0, 0, 50, 50);
    dragElement(label,  0, 0, 50, 50);
    dragElement(select, 0, 0, 50, 50);

    assert.isUndefined(target.lastDragEvent);
  });

  it('should disable user selection on mousedown and throughout drag', function() {
    setupAbsolute();
    assert.equal(document.documentElement.style.userSelect, '');
    fireMouseDown(el, 50, 50);
    assert.equal(document.documentElement.style.userSelect, 'none');
    fireDocumentMouseMove(50, 100);
    assert.equal(document.documentElement.style.userSelect, 'none');
    fireDocumentMouseUp(50, 100);
    assert.equal(document.documentElement.style.userSelect, '');
  });

  it('should reset the drag when ctrl key depressed', function() {
    el = appendBox();
    target = new Target(el);
    target.setupCtrlKeyReset();

    dragElementWithCtrlKeyChange(el, [
      [50, 50,  false],
      [50, 100, false],
      [50, 150, true],
      [50, 100, true]
    ]);

    assert.equal(target.dragStarts, 2);
    assert.equal(target.dragStops, 2);
  });

  it('should reset the drag when meta key depressed', function() {
    el = appendBox();
    target = new Target(el);
    target.setupMetaKeyReset();

    dragElementWithMetaKeyChange(el, [
      [50, 50,  false],
      [50, 100, false],
      [50, 150, true],
      [50, 100, true]
    ]);

    assert.equal(target.dragStarts, 2);
    assert.equal(target.dragStops, 2);
  });

  it('should reset the drag when meta key depressed after scroll', function() {
    setupAbsolute();
    target.setupMetaKeyReset();

    fireMouseDown(el, 50, 50);
    whileFakeScrolled(500, () => {
      target.onScroll();
    });
    fireDocumentMetaKeyDown(KeyManager.META_KEY);
    fireDocumentMetaMouseMove(100, 600);
    fireDocumentMetaMouseUp(100, 600);

    assert.equal(target.lastDragEvent.drag.x, 50);
    assert.equal(target.lastDragEvent.drag.y, 50);
  });

  it('should trigger double click', function() {
    setupStatic();
    target.setupDoubleClick();
    fireDoubleClick(el, 100, 100);
    assert.equal(target.doubleClicked, true);
  });

  it('should trigger double click with ctrl key', function() {
    setupStatic();
    target.setupDoubleClick();
    ctrlClickElement(el, 100, 100);
    ctrlClickElement(el, 100, 100);
    assert.equal(target.doubleClicked, true);
  });

  it('should not trigger double click after drag started', function() {
    setupStatic();
    target.setupDoubleClick();
    ctrlDragElement(el, 100, 100, 200, 200);
    ctrlDragElement(el, 100, 100, 200, 200);
    assert.equal(target.doubleClicked, false);
  });

});
