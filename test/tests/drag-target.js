
describe('DragTarget', function(uiRoot) {

  var target, el;

  class Target extends DragTarget {

    constructor(el, allowInteraction) {
      super(el, allowInteraction);
      this.clicked = false;
      this.startIntents = 0;
      this.stopIntents  = 0;
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
    }

    onDragMove(evt) {
      super.onDragMove(evt);
      this.lastDragEvent = evt;
    }

    onDragStop(evt) {
      super.onDragStop(evt);
    }

    onClick(evt) {
      this.clicked = true;
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
    el = appendAbsoluteBox();
    target = new Target(el);
  }

  function setupFixed() {
    el = appendFixedBox();
    target = new Target(el);
  }

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
    dragElement(el, 50, 100, 50, 100);

    assert.isUndefined(target.lastDragEvent);
    assert.equal(target.clicked, true);
  });

  it('should correctly set origin event data while scrolled', function() {

    whileScrolled(500, () => {
      setupAbsolute();
      fireMouseDown(el, 50, 50);
      fireDocumentMouseMove(50, 100);
      assert.equal(target.lastDragEvent.drag.x, 0);
      assert.equal(target.lastDragEvent.drag.y, 50);
      assert.equal(target.lastDragEvent.drag.origin.pageX, 50);
      assert.equal(target.lastDragEvent.drag.origin.pageY, 550);
      assert.equal(target.lastDragEvent.drag.origin.clientX, 50);
      assert.equal(target.lastDragEvent.drag.origin.clientY, 50);
      fireDocumentMouseUp(50, 100);
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
    var moving = true;
    setupStatic();
    target.onDragStop = () => {
      assert.equal(target.dragging, false);
    }
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

    assert.equal(target.startIntents, 2);
    assert.equal(target.stopIntents, 2);
  });

  it('should not follow links on click', function() {
    setupLink('#');
    fireClick(el);
    assert.equal(window.location.hash, '');
  });

  it('should not allow dragging from text or form controls', function() {

    el = createDiv();

    var p      = appendChild(el, 'p');
    var h1     = appendChild(el, 'h1');
    var h2     = appendChild(el, 'h2');
    var h3     = appendChild(el, 'h3');
    var h4     = appendChild(el, 'h4');
    var h5     = appendChild(el, 'h5');
    var h6     = appendChild(el, 'h6');
    var pre    = appendChild(el, 'pre');
    var code   = appendChild(el, 'code');
    var span   = appendChild(el, 'span');
    var link   = appendChild(el, 'a');
    var input  = appendChild(el, 'input');
    var label  = appendChild(el, 'label');
    var select = appendChild(el, 'select');

    target = new Target(el, true);

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

  it('should disable user selection while dragging', function() {
    setupAbsolute();
    fireMouseDown(el, 50, 50);
    assert.equal(document.documentElement.style.userSelect, '');
    fireDocumentMouseMove(50, 100);
    assert.equal(document.documentElement.style.userSelect, 'none');
    fireDocumentMouseUp(50, 100);
    assert.equal(document.documentElement.style.userSelect, '');
  });

});
