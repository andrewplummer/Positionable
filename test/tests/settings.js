
describe('Settings', function(uiRoot) {

  var listener, storage, settings;

  class Listener {

    constructor () {
      this.settingsUpdatedCount = 0;
      this.selectorUpdatedCount = 0;
    }

    onSelectorUpdated() {
      this.selectorUpdatedCount += 1;
    }

    onSettingsUpdated() {
      this.settingsUpdatedCount += 1;
    }

  }

  setup(function() {
    chromeMock.apply();
    promiseMock.apply();
    setTimeoutMock.apply();
    windowDialogueMock.apply();
    listener = new Listener();
  });

  teardown(function() {
    settings.form.removeAllListeners();
    settings.form.el.reset();
    chromeMock.release();
    promiseMock.release();
    setTimeoutMock.release();
    windowDialogueMock.release();
  });

  function setupSettings() {
    settings = new Settings(listener, uiRoot);
  }

  function getForm() {
    return uiRoot.getElementById('settings-form');
  }

  function submitForm() {
    fireSubmitEvent(getForm());
  }

  function resetForm() {
    fireResetEvent(getForm());
    setTimeoutMock.tick(100);
  }

  function getStoredData(name) {
    var val;
    chrome.storage.sync.get(null, (data) => val = data[name]);
    return val;
  }
  function assertQuery(query, expected) {
    assert.equal(settings.isValidQuery(query), expected);
  }

  function assertValidQuery(query) {
    assertQuery(query, true);
  }
  function assertInvalidQuery(query) {
    assertQuery(query, false);
  }

  it('should initialize with default settings', function() {
    setupSettings();
    assert.equal(settings.get(Settings.SAVE_FILENAME),       'styles.css');
    assert.equal(settings.get(Settings.TAB_STYLE),           'two');
    assert.equal(settings.get(Settings.OUTPUT_SELECTOR),     'auto');
    assert.equal(settings.get(Settings.INCLUDE_SELECTOR),    '');
    assert.equal(settings.get(Settings.EXCLUDE_SELECTOR),    '');
    assert.equal(settings.get(Settings.OUTPUT_CHANGED_ONLY), false);
    assert.equal(settings.get(Settings.OUTPUT_UNIQUE_ONLY),  false);
  });

  it('should initialize with stored settings', function() {
    chrome.storage.sync.set({
      [Settings.SAVE_FILENAME]:       'bar.css',
      [Settings.TAB_STYLE]:           Settings.TABS_FOUR_SPACES,
      [Settings.OUTPUT_SELECTOR]:     Settings.OUTPUT_SELECTOR_TAG,
      [Settings.INCLUDE_SELECTOR]:   'p',
      [Settings.EXCLUDE_SELECTOR]:   'h2',
      [Settings.OUTPUT_CHANGED_ONLY]: true,
      [Settings.OUTPUT_UNIQUE_ONLY]:  true,
    });
    setupSettings();
    assert.equal(settings.get(Settings.SAVE_FILENAME),       'bar.css');
    assert.equal(settings.get(Settings.TAB_STYLE),           Settings.TABS_FOUR_SPACES);
    assert.equal(settings.get(Settings.OUTPUT_SELECTOR),     Settings.OUTPUT_SELECTOR_TAG);
    assert.equal(settings.get(Settings.INCLUDE_SELECTOR),    'p');
    assert.equal(settings.get(Settings.EXCLUDE_SELECTOR),    'h2');
    assert.equal(settings.get(Settings.OUTPUT_CHANGED_ONLY), true);
    assert.equal(settings.get(Settings.OUTPUT_UNIQUE_ONLY),  true);
  });

  it('should set form fields with stored settings', function() {
    var form = getForm();
    chrome.storage.sync.set({
      [Settings.SAVE_FILENAME]:       'bar.css',
      [Settings.TAB_STYLE]:           Settings.TABS_FOUR_SPACES,
      [Settings.OUTPUT_SELECTOR]:     Settings.OUTPUT_SELECTOR_TAG,
      [Settings.INCLUDE_SELECTOR]:   'p',
      [Settings.EXCLUDE_SELECTOR]:   'h2',
      [Settings.OUTPUT_CHANGED_ONLY]: true,
      [Settings.OUTPUT_UNIQUE_ONLY]:  true,
    });
    setupSettings();
    assert.equal(form.elements[Settings.SAVE_FILENAME].value,       'bar.css');
    assert.equal(form.elements[Settings.TAB_STYLE].value,           Settings.TABS_FOUR_SPACES);
    assert.equal(form.elements[Settings.OUTPUT_SELECTOR].value,     Settings.OUTPUT_SELECTOR_TAG);
    assert.equal(form.elements[Settings.INCLUDE_SELECTOR].value,    'p');
    assert.equal(form.elements[Settings.EXCLUDE_SELECTOR].value,    'h2');
    assert.equal(form.elements[Settings.OUTPUT_CHANGED_ONLY].checked, true);
    assert.equal(form.elements[Settings.OUTPUT_UNIQUE_ONLY].checked,  true);
  });

  it('should set boolean fields', function() {
    setupSettings();
    uiRoot.getElementById('output-unique-only').checked = true;
    submitForm();
    assert.equal(getStoredData('output-unique-only'), true);
  });

  it('should receive submit event', function() {
    var form = getForm();
    setupSettings();
    form.elements['save-filename'].value = 'foo.css';
    submitForm();
    assert.equal(listener.settingsUpdatedCount, 1);
    assert.equal(getStoredData('save-filename'), 'foo.css');
  });

  it('should reset the form', function() {
    setupSettings();
    resetForm();
    assert.equal(windowDialogueMock.getConfirmCalls(), 1);
    assert.equal(listener.settingsUpdatedCount, 1);
    assert.equal(settings.get(Settings.SAVE_FILENAME), 'styles.css');
    assert.equal(settings.get(Settings.TAB_STYLE), 'two');
    assert.equal(settings.get(Settings.OUTPUT_SELECTOR), 'auto');
    assert.equal(settings.get(Settings.INCLUDE_SELECTOR), '');
    assert.equal(settings.get(Settings.EXCLUDE_SELECTOR), '');
    assert.isFalse(settings.get(Settings.OUTPUT_CHANGED_ONLY));
    assert.isFalse(settings.get(Settings.OUTPUT_UNIQUE_ONLY));
  });

  it('should validate selectors on submit', function() {
    setupSettings();

    uiRoot.getElementById('include-selector').value = '1234';
    submitForm();
    assert.equal(listener.settingsUpdatedCount, 0);
    assert.equal(listener.selectorUpdatedCount, 0);
    assert.equal(settings.get(Settings.INCLUDE_SELECTOR), '');
    assert.equal(settings.get(Settings.EXCLUDE_SELECTOR), '');

    uiRoot.getElementById('include-selector').value = '';
    uiRoot.getElementById('exclude-selector').value = '1234';
    submitForm();
    assert.equal(listener.settingsUpdatedCount, 0);
    assert.equal(listener.selectorUpdatedCount, 0);
    assert.equal(settings.get(Settings.INCLUDE_SELECTOR), '');
    assert.equal(settings.get(Settings.EXCLUDE_SELECTOR), '');

    uiRoot.getElementById('include-selector').value = 'p';
    uiRoot.getElementById('exclude-selector').value = 'h2';
    submitForm();
    assert.equal(listener.settingsUpdatedCount, 1);
    assert.equal(listener.selectorUpdatedCount, 1);
    assert.equal(settings.get(Settings.INCLUDE_SELECTOR), 'p');
    assert.equal(settings.get(Settings.EXCLUDE_SELECTOR), 'h2');
  });

  it('should fire correct events when the selector changed', function() {
    setupSettings();
    uiRoot.getElementById('include-selector').value = 'div';
    submitForm();
    assert.equal(listener.settingsUpdatedCount, 1);
    assert.equal(listener.selectorUpdatedCount, 1);
  });

  it('should fire correct events when the selector did not change', function() {
    setupSettings();
    uiRoot.getElementById('include-selector').value = '';
    submitForm();
    assert.equal(listener.settingsUpdatedCount, 1);
    assert.equal(listener.selectorUpdatedCount, 0);
  });

  it('should fire correct events when the default form was cleared', function() {
    setupSettings();
    settings.onFormReset();
    setTimeoutMock.tick(100);
    assert.equal(listener.settingsUpdatedCount, 1);
    assert.equal(listener.selectorUpdatedCount, 0);
  });

  it('should fire correct events when a set form was cleared', function() {
    setupSettings();
    uiRoot.getElementById('include-selector').value = 'div';
    submitForm();
    resetForm();
    assert.equal(listener.settingsUpdatedCount, 2);
    assert.equal(listener.selectorUpdatedCount, 2);
  });

  it('should validate correct queries', function() {
    setupSettings();

    assertValidQuery('*');
    assertValidQuery('div');
    assertValidQuery('.box');
    assertValidQuery('#box');
    assertValidQuery('div p');
    assertValidQuery('div + p');
    assertValidQuery('div ~ p');
    assertValidQuery('div > p');
    assertValidQuery('a:hover');
    assertValidQuery('a::after');

    // Attribute Queries
    assertValidQuery('[foo]');
    assertValidQuery('[foo=bar]');
    assertValidQuery('[foo~=bar]');
    assertValidQuery('[foo|=bar]');
    assertValidQuery('[foo^=bar]');
    assertValidQuery('[foo=bar]');
    assertValidQuery('[foo*=bar]');
    assertValidQuery('[foo="23"]');
    assertValidQuery('foo[bar]');
    assertValidQuery('[foo][bar]');

    // Invalid Attribute Queries
    assertInvalidQuery('[]');
    assertInvalidQuery('[1]');
    assertInvalidQuery('[foo');
    assertInvalidQuery('[[foo');
    assertInvalidQuery('foo]');
    assertInvalidQuery('foo]]');
    assertInvalidQuery('[foo][bar');
    assertInvalidQuery('foo][bar');
    assertInvalidQuery('foo[bar');
    assertInvalidQuery('[foo[bar]');
    assertInvalidQuery('[foo]bar');

    // Other
    assertInvalidQuery('^foo');
    assertInvalidQuery('#15');
    assertInvalidQuery('.15');
    assertInvalidQuery('[foo=23]');
  });

});
