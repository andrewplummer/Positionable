
describe('Settings', function(uiRoot) {

  var listener, storage, settings;

  class Listener {

    constructor () {
      this.updateEvents = 0;
    }

    onSettingsUpdated() {
      this.updateEvents += 1;
    }

  }

  setup(function() {
    listener = new Listener();
    storage  = new MockLocalStorage();
    settings = new Settings(listener, storage, uiRoot);
  });

  teardown(function() {
    settings.form.removeAllListeners();
  });

  it('should have default settings', function() {
    assert.equal(settings.get(Settings.SAVE_FILENAME), 'styles.css');
    assert.equal(settings.get(Settings.TAB_STYLE), 'two');
    assert.equal(settings.get(Settings.OUTPUT_SELECTOR), 'auto');
    assert.isUndefined(settings.get(Settings.INCLUDE_SELECTOR));
    assert.isUndefined(settings.get(Settings.EXCLUDE_SELECTOR));
    assert.isUndefined(settings.get(Settings.OUTPUT_CHANGED_ONLY));
    assert.isUndefined(settings.get(Settings.OUTPUT_UNIQUE_ONLY));
  });

  it('should not set boolean fields when false', function() {
    uiRoot.getElementById('output-unique-only').checked = false;
    fireSubmitEvent(uiRoot.getElementById('settings-form'));
    assert.isUndefined(storage.getItem('output-unique-only'));
  });

  it('should receive submit event', function() {

    withMockedWindowEvents((mock) => {
      fireSubmitEvent(uiRoot.getElementById('settings-form'));
      fireResetEvent(uiRoot.getElementById('settings-form'));

      assert.equal(listener.updateEvents, 1);

      // The update event is deferred to prevent UI jank, so just
      // check that the window confirm method has been called here.
      assert.equal(mock.getCalls('confirm'), 1);
    });

  });

});
