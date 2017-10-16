
describe('KeyManager', function(uiRoot) {

  var listener, manager;

  class Listener {

    constructor() {
      this.keyDownEvents = {};
      this.keyUpEvents = {};
      this.commandKeyDownEvents = {};
    }

    onKeyDown(evt) {
      this.lastKeyDownEvent = evt;
      this.keyDownEvents[evt.key] = (this.keyDownEvents[evt.key] || 0) + 1;
    }

    onKeyUp(evt) {
      this.keyUpEvents[evt.key] = (this.keyUpEvents[evt.key] || 0) + 1;
    }

    onCommandKeyDown(evt) {
      this.lastCommandKeyDownEvent = evt;
      this.commandKeyDownEvents[evt.key] = (this.commandKeyDownEvents[evt.key] || 0) + 1;
    }

  }

  setup(function() {
    listener = new Listener();
    manager  = new KeyManager(listener);
  });

  teardown(function() {
    manager.removeAllListeners();
  });

  it('should setup and receive key events', function() {
    manager.setupKey(KeyManager.A_KEY);
    manager.setupKey(KeyManager.S_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY);
    fireDocumentKeyDown(KeyManager.S_KEY);
    fireDocumentKeyDown(KeyManager.B_KEY);

    fireDocumentKeyUp(KeyManager.A_KEY);
    fireDocumentKeyUp(KeyManager.S_KEY);
    fireDocumentKeyUp(KeyManager.B_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY);
    fireDocumentKeyUp(KeyManager.A_KEY);

    // Ensure command key doesn't trigger.
    fireDocumentMetaKeyDown(KeyManager.A_KEY);

    assert.equal(listener.keyDownEvents['a'], 2);
    assert.equal(listener.keyDownEvents['s'], 1);
    assert.equal(listener.keyUpEvents['a'], 2);
    assert.equal(listener.keyUpEvents['s'], 1);
    assert.equal(listener.keyDownEvents['b'], undefined);
    assert.equal(listener.keyUpEvents['b'], undefined);

  });

  it('should setup and receive command key events', function() {
    manager.setupCommandKey(KeyManager.A_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY);
    fireDocumentMetaKeyDown(KeyManager.A_KEY);
    fireDocumentMetaKeyDown(KeyManager.B_KEY);

    assert.equal(listener.commandKeyDownEvents['a'], 1);
    assert.equal(listener.commandKeyDownEvents['b'], undefined);

  });

  it('should handle both command and basic keys separately', function() {
    manager.setupKey(KeyManager.A_KEY);
    manager.setupCommandKey(KeyManager.A_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY);
    fireDocumentMetaKeyDown(KeyManager.A_KEY);
    fireDocumentMetaKeyDown(KeyManager.A_KEY);

    assert.equal(listener.keyDownEvents['a'], 1);
    assert.equal(listener.commandKeyDownEvents['a'], 2);

  });

  it('should not fire when other meta keys are pressed', function() {
    manager.setupKey(KeyManager.A_KEY);
    manager.setupCommandKey(KeyManager.A_KEY);

    fireDocumentKeyDown(KeyManager.A_KEY, { altKey: true, });
    fireDocumentKeyDown(KeyManager.A_KEY, { ctrlKey: true, });
    assert.equal(listener.keyDownEvents['a'], undefined);
    assert.equal(listener.commandKeyDownEvents['a'], undefined);

  });

  it('should prevent default on handled key events', function() {
    manager.setupKey(KeyManager.A_KEY);
    fireDocumentKeyDown(KeyManager.A_KEY);
    assert.equal(listener.lastKeyDownEvent.defaultPrevented, true);
  });

  it('should not allow meta keys when not setup', function() {
    manager.setupKey(KeyManager.A_KEY);

    fireDocumentMetaKeyDown(KeyManager.A_KEY);
    assert.equal(listener.keyDownEvents['a'], undefined);
    assert.equal(listener.commandKeyDownEvents['a'], undefined);

  });


});
