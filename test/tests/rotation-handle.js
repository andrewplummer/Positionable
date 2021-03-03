
describe('RotationHandle', function() {

  var listener, fragment, handle;

  class Listener {

    constructor() {
      this.handleStartIntents = 0;
      this.handleStopIntents  = 0;
    }

    onRotationHandleDragIntentStart(evt, handle) {
      handle.setOrigin(new Point(50, 50));
      this.handleStartIntents += 1;
    }

    onRotationHandleDragIntentStop() {
      this.handleStopIntents += 1;
    }

    onRotationHandleMouseDown() {
    }

    onRotationHandleDragStart() {
    }

    onRotationHandleDragMove(evt) {
      this.lastDragMove = evt;
    }

    onRotationHandleDragStop() {
    }

  }

  setup(function() {
    listener = new Listener();
    fragment = new MockDocumentFragment();
    handle   = new RotationHandle(listener, fragment);
  });

  function assertCursor(grad, expected) {
    var deg;
    if (expected === undefined) {
      expected = 'rotate-' + grad;
    }
    // Convert grads to degrees
    deg = grad * 360 / 400;
    assertEqual(handle.getCursor(deg), expected);
  }

  it('should fire rotation handle events', function() {
    dragElement(handle.el, 100, 100, 50, 100);
    assertEqual(listener.lastDragMove.clientX, 50);
    assertEqual(listener.lastDragMove.clientY, 100);
  });

  it('should fire drag intent events', function() {
    dragElement(handle.el, 100, 100, 50, 100);
    assertEqual(listener.handleStartIntents, 1);
    assertEqual(listener.handleStopIntents, 1);
  });

  it('should be able to get the correct cursor for rotation', function() {

    // Basic cursor identities
    assertCursor(0);
    assertCursor(16);
    assertCursor(32);
    assertCursor(48);
    assertCursor(64);
    assertCursor(80);
    assertCursor(96);
    assertCursor(112);
    assertCursor(128);
    assertCursor(144);
    assertCursor(160);
    assertCursor(176);
    assertCursor(192);
    assertCursor(208);
    assertCursor(224);
    assertCursor(240);
    assertCursor(256);
    assertCursor(272);
    assertCursor(288);
    assertCursor(304);
    assertCursor(320);
    assertCursor(336);
    assertCursor(352);
    assertCursor(368);
    assertCursor(384);

    // 400 should go back to 0
    assertCursor(400, 'rotate-0');

    // Should respect thresholds
    assertCursor(71.999, 'rotate-64');
    assertCursor(72,     'rotate-80');

  });

});
