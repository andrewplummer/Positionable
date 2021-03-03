
describe('Settings', function() {

  var listener, settings;

  class Listener {

    constructor () {
      this.settingsSubmittedCount = 0;
      this.settingsClearedCount   = 0;
      this.selectorUpdatedCount   = 0;
      this.snapUpdatedCount       = 0;
    }

    onSettingsInitialized() {
      this.settingsInitialized = true;
    }

    onSettingsSubmitted() {
      this.settingsSubmittedCount += 1;
    }

    onSettingsCleared() {
      this.settingsClearedCount += 1;
    }

    onSelectorUpdated() {
      this.selectorUpdatedCount += 1;
    }

    onSnappingUpdated(x, y) {
      this.lastSnapX = x;
      this.lastSnapY = y;
      this.snapUpdatedCount += 1;
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
    settings.destroy();
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

  function setupStorageData() {
    chromeMock.setStoredData(Settings.SAVE_FILENAME,      'bar.css');
    chromeMock.setStoredData(Settings.TAB_STYLE,           Settings.TABS_FOUR_SPACES);
    chromeMock.setStoredData(Settings.OUTPUT_SELECTOR,     Settings.OUTPUT_SELECTOR_TAG);
    chromeMock.setStoredData(Settings.OUTPUT_GROUPING,     Settings.OUTPUT_GROUPING_AUTO);
    chromeMock.setStoredData(Settings.INCLUDE_SELECTOR,   'p');
    chromeMock.setStoredData(Settings.EXCLUDE_SELECTOR,   'h2');
    chromeMock.setStoredData(Settings.OUTPUT_CHANGED_ONLY, true);
  }

  function assertQuery(query, expected) {
    assertEqual(settings.isValidQuery(query), expected);
  }

  function assertValidQuery(query) {
    assertQuery(query, true);
  }
  function assertInvalidQuery(query) {
    assertQuery(query, false);
  }

  function assertInputIsDisabled(selector, expected) {
    assertEqual(uiRoot.getElementById(selector).disabled, expected);
  }

  it('should fire an event when initialized', function() {
    setupSettings();
    assertTrue(listener.settingsInitialized);
  });

  it('should not fire change events for non-relevant settings', function() {
    chromeMock.setStoredData(Settings.INCLUDE_SELECTOR,   'p');
    setupSettings();
    settings.set(Settings.SKIP_QUICKSTART, true);
    assertEqual(listener.selectorUpdatedCount, 0);
    assertEqual(listener.snapUpdatedCount,     0);
  });

  it('should initialize with default settings', function() {
    setupSettings();
    assertEqual(settings.get(Settings.SAVE_FILENAME),       'styles.css');
    assertEqual(settings.get(Settings.TAB_STYLE),           'two');
    assertEqual(settings.get(Settings.OUTPUT_SELECTOR),     'auto');
    assertEqual(settings.get(Settings.OUTPUT_GROUPING),     'none');
    assertEqual(settings.get(Settings.INCLUDE_SELECTOR),    '');
    assertEqual(settings.get(Settings.EXCLUDE_SELECTOR),    '');
    assertEqual(settings.get(Settings.OUTPUT_CHANGED_ONLY), false);
  });

  it('should initialize with stored settings', function() {
    setupStorageData();
    setupSettings();
    assertEqual(settings.get(Settings.SAVE_FILENAME),       'bar.css');
    assertEqual(settings.get(Settings.TAB_STYLE),           Settings.TABS_FOUR_SPACES);
    assertEqual(settings.get(Settings.OUTPUT_SELECTOR),     Settings.OUTPUT_SELECTOR_TAG);
    assertEqual(settings.get(Settings.OUTPUT_GROUPING),     Settings.OUTPUT_GROUPING_AUTO);
    assertEqual(settings.get(Settings.INCLUDE_SELECTOR),    'p');
    assertEqual(settings.get(Settings.EXCLUDE_SELECTOR),    'h2');
    assertEqual(settings.get(Settings.OUTPUT_CHANGED_ONLY), true);
  });

  it('should set form fields with stored settings', function() {
    var form = getForm();
    setupStorageData();
    setupSettings();
    assertEqual(form.elements[Settings.SAVE_FILENAME].value,        'bar.css');
    assertEqual(form.elements[Settings.TAB_STYLE].value,             Settings.TABS_FOUR_SPACES);
    assertEqual(form.elements[Settings.OUTPUT_SELECTOR].value,       Settings.OUTPUT_SELECTOR_TAG);
    assertEqual(form.elements[Settings.OUTPUT_GROUPING].value,       Settings.OUTPUT_GROUPING_AUTO);
    assertEqual(form.elements[Settings.INCLUDE_SELECTOR].value,     'p');
    assertEqual(form.elements[Settings.EXCLUDE_SELECTOR].value,     'h2');
    assertEqual(form.elements[Settings.OUTPUT_CHANGED_ONLY].checked, true);
  });

  it('should set boolean fields', function() {
    setupSettings();
    uiRoot.getElementById('output-changed-only').checked = true;
    submitForm();
    assertEqual(chromeMock.getStoredData('output-changed-only'), true);
  });

  it('should receive submit event', function() {
    var form = getForm();
    setupSettings();
    form.elements['save-filename'].value = 'foo.css';
    submitForm();
    assertEqual(listener.settingsSubmittedCount, 1);
    assertEqual(chromeMock.getStoredData('save-filename'), 'foo.css');
  });

  it('should reset the form', function() {
    setupSettings();
    resetForm();
    assertEqual(windowDialogueMock.getConfirmCalls(), 1);
    assertEqual(listener.settingsClearedCount, 1);
    assertEqual(settings.get(Settings.SAVE_FILENAME), 'styles.css');
    assertEqual(settings.get(Settings.TAB_STYLE), 'two');
    assertEqual(settings.get(Settings.OUTPUT_SELECTOR), 'auto');
    assertEqual(settings.get(Settings.OUTPUT_GROUPING), 'none');
    assertEqual(settings.get(Settings.INCLUDE_SELECTOR), '');
    assertEqual(settings.get(Settings.EXCLUDE_SELECTOR), '');
    assertFalse(settings.get(Settings.OUTPUT_CHANGED_ONLY));
  });

  it('should validate selectors on submit', function() {
    setupSettings();

    uiRoot.getElementById('include-selector').value = '1234';
    submitForm();
    assertEqual(listener.settingsSubmittedCount, 0);
    assertEqual(listener.selectorUpdatedCount,   0);
    assertEqual(settings.get(Settings.INCLUDE_SELECTOR), '');
    assertEqual(settings.get(Settings.EXCLUDE_SELECTOR), '');

    uiRoot.getElementById('include-selector').value = '';
    uiRoot.getElementById('exclude-selector').value = '1234';
    submitForm();
    assertEqual(listener.settingsSubmittedCount, 0);
    assertEqual(listener.selectorUpdatedCount,   0);
    assertEqual(settings.get(Settings.INCLUDE_SELECTOR), '');
    assertEqual(settings.get(Settings.EXCLUDE_SELECTOR), '');

    uiRoot.getElementById('include-selector').value = 'p';
    uiRoot.getElementById('exclude-selector').value = 'h2';
    submitForm();
    assertEqual(listener.settingsSubmittedCount, 1);
    assertEqual(listener.selectorUpdatedCount,   1);
    assertEqual(settings.get(Settings.INCLUDE_SELECTOR), 'p');
    assertEqual(settings.get(Settings.EXCLUDE_SELECTOR), 'h2');

  });

  it('should fire correct events when the selector changed', function() {
    setupSettings();
    uiRoot.getElementById('include-selector').value = 'div';
    submitForm();
    assertEqual(listener.settingsSubmittedCount, 1);
    assertEqual(listener.selectorUpdatedCount,   1);
  });

  it('should fire correct events when the selector did not change', function() {
    setupSettings();
    uiRoot.getElementById('include-selector').value = '';
    submitForm();
    assertEqual(listener.settingsSubmittedCount, 1);
    assertEqual(listener.selectorUpdatedCount,   0);
  });

  it('should fire correct events when the default form was cleared', function() {
    setupSettings();
    resetForm();
    assertEqual(listener.settingsSubmittedCount, 0);
    assertEqual(listener.settingsClearedCount,   1);
    assertEqual(listener.selectorUpdatedCount,   0);
  });

  it('should fire correct events when a set form was cleared', function() {
    setupSettings();
    uiRoot.getElementById('include-selector').value = 'div';
    submitForm();
    resetForm();
    assertEqual(listener.settingsSubmittedCount, 1);
    assertEqual(listener.settingsClearedCount,   1);
    assertEqual(listener.selectorUpdatedCount,   2);
  });

  it('should clear previous invalid fields when cleared', function() {
    setupSettings();
    uiRoot.getElementById('include-selector').value = '@#$^';
    submitForm();
    resetForm();
    assertEqual(listener.settingsSubmittedCount, 0);
    assertEqual(listener.settingsClearedCount,   1);
    assertEqual(listener.selectorUpdatedCount,   0);

    // Note that we can't assert that the invalid fields were
    // actually cleared as the reset event that actually clears
    // the form controls can't be mocked.
  });

  it('should be able to revert back to defaults', function() {
    chromeMock.setStoredData(Settings.SAVE_FILENAME, 'test.css');
    setupSettings();
    resetForm();
    assertEqual(settings.get(Settings.SAVE_FILENAME), 'styles.css');
  });

  // --- Query Selectors

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

  // --- Snapping

  it('should have valid initial snap data', function() {
    setupSettings();
    assertEqual(settings.data['snap-x'], 0);
    assertEqual(settings.data['snap-y'], 0);
  });

  it('should fire correct events snapping changed', function() {
    setupSettings();
    uiRoot.getElementById('snap-x').value = '7';
    uiRoot.getElementById('snap-y').value = '5';
    submitForm();
    assertEqual(listener.lastSnapX, 7);
    assertEqual(listener.lastSnapY, 5);
  });

  // --- Grouping Map

  it('should have valid initial grouping map data', function() {
    setupSettings();
    assertEqual(typeof settings.data['grouping-map'], 'object');
    assertEqual(Object.keys(settings.data['grouping-map']).length, 0);
  });

  it('should transform the grouping map on submit', function() {
    var map, textarea;
    textarea = uiRoot.getElementById('grouping-map');
    setupSettings();
    textarea.value = 'width: $foobar';
    submitForm();
    map = chromeMock.getStoredData('grouping-map');
    assertEqual(Object.keys(map).length, 1);
    assertEqual(map.width, '$foobar');
  });

  it('should strip trailing semicolons in the grouping map', function() {
    var map, textarea;
    textarea = uiRoot.getElementById('grouping-map');
    setupSettings();
    textarea.value = 'width: $foobar;';
    submitForm();
    map = chromeMock.getStoredData('grouping-map');
    assertEqual(map.width, '$foobar');
  });

  it('should validate an unparseable grouping map', function() {
    var field    = uiRoot.querySelector('[name="grouping-map-field"]');
    var textarea = uiRoot.getElementById('grouping-map');
    setupSettings();
    textarea.value = '?#()#$';
    submitForm();
    assertTrue(field.classList.contains('settings-field--invalid'));
  });

  it('should correctly set the grouping map control from stored data', function() {
    chromeMock.setStoredData(Settings.GROUPING_MAP, { width: '$foobar' });
    setupSettings();
    assertEqual(uiRoot.getElementById('grouping-map').value, 'width: $foobar');
  });

  // --- Other

  it('should disable advanced features', function() {
    setupSettings();
    settings.toggleAdvancedFeatures(false);
    assertInputIsDisabled('snap-x', true);
    assertInputIsDisabled('snap-y', true);
    assertInputIsDisabled('output-grouping', true);
    assertInputIsDisabled('grouping-map', true);
  });

  it('should re-enable advanced features', function() {
    setupSettings();
    settings.toggleAdvancedFeatures(false);
    settings.toggleAdvancedFeatures(true);
    assertInputIsDisabled('snap-x', false);
    assertInputIsDisabled('snap-y', false);
    assertInputIsDisabled('output-grouping', false);
    assertInputIsDisabled('grouping-map', false);
  });

  it('should remove unset advanced features and fire correct events', function() {
    chromeMock.setStoredData(Settings.SNAP_X, 5);
    chromeMock.setStoredData(Settings.SNAP_Y, 5);
    chromeMock.setStoredData(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_MAP);
    chromeMock.setStoredData(Settings.GROUPING_MAP, 'foo:bar');
    setupSettings();
    settings.toggleAdvancedFeatures(false);
    assertEqual(listener.snapUpdatedCount,       1);
    assertEqual(listener.selectorUpdatedCount,   0);
    assertEqual(listener.settingsSubmittedCount, 0);
    assertEqual(listener.settingsClearedCount,   0);
    assertEqual(settings.get(Settings.SNAP_X), 0);
    assertEqual(settings.get(Settings.SNAP_Y), 0);
    assertEqual(settings.get(Settings.OUTPUT_GROUPING), Settings.OUTPUT_GROUPING_NONE);
    assertEqual(Object.keys(settings.get(Settings.GROUPING_MAP)).length, 0);
  });

});
