
describe('Settings', function(uiRoot) {

  var listener, storage, settings;

  class Listener {

    constructor () {
      this.saveEvents  = 0;
      this.resetEvents = 0;
    }

    onSettingsSaved() {
      this.saveEvents += 1;
    }

    onSettingsReset() {
      this.resetEvents += 1;
    }

  }

  setup(function() {
    listener = new Listener();
    storage  = new MockLocalStorage();
    settings = new Settings(listener, storage, uiRoot);
  });

  teardown(function() {
    settings.removeAllListeners();
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

  it('should receive events', function() {

    withMockedWindowEvents((mock) => {
      fireSubmitEvent(uiRoot.getElementById('settings-form'));
      fireResetEvent(uiRoot.getElementById('settings-form'));

      assert.equal(listener.saveEvents, 1);
      assert.equal(listener.resetEvents, 1);
      assert.equal(mock.getCalls('confirm'), 1);
    });

  });

});
