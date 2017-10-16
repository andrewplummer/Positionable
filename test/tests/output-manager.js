
describe('OutputManager', function(uiRoot) {
  var settings, manager;

  setup(function() {
    settings = new Settings({}, new MockLocalStorage(), uiRoot);
    manager  = new OutputManager(settings);
  });

  teardown(function() {
    releaseAppendedFixtures();
  });

  function appendPositionableElement(classNames) {
    var el = appendAbsoluteBox(classNames);
    return new PositionableElement(el);
  }

  function appendRotatedPositionableElement() {
    var el = appendRotatedBox();
    return new PositionableElement(el);
  }

  function appendTranslatedPositionableElement() {
    var el = appendTranslatedBox();
    return new PositionableElement(el);
  }

  function appendTransformedPositionableElement() {
    var el = appendTransformedBox();
    return new PositionableElement(el);
  }

  function appendSubpixelTransformedPositionableElement() {
    var el = appendSubpixelTransformedBox();
    return new PositionableElement(el);
  }

  function appendBackgroundImagePositionableElement() {
    var el = appendBackgroundImageBox();
    return new PositionableElement(el);
  }

  function appendComplexPositionableElement() {
    var el = appendComplexBox();
    return new PositionableElement(el);
  }

  function appendIncompletePositionableElement() {
    var el = appendIncompleteBox();
    return new PositionableElement(el);
  }

  function assertSimpleBoxSelector(styles, selector, expected) {
    assert.equal(styles, expected || dec`
    ${selector} {
      top: 100px;
      left: 100px;
      width: 100px;
      height: 100px;
    }
    `);
  }

  // Template tag to remove whitespace for asserting
  // declaration blocks.
  function dec(strings, ...args) {
    var str, lines, line, min;

    // Simply concat the strings together adding the interpolated
    // arguments as we go.
    str = strings.map((s, i) => s + (args[i] || '')).join('');

    lines = str.split('\n');

    // Remove any lines with only whitespace from
    // both ends without removing such lines from the middle.

    while ((line = lines.shift()) !== undefined) {
      if (/\S/.test(line)) {
        lines.unshift(line);
        break;
      }
    }

    while ((line = lines.pop()) !== undefined) {
      if (/\S/.test(line)) {
        lines.push(line);
        break;
      }
    }

    min = Infinity;

    for (let i = 0, line; line = lines[i]; i++) {
      min = Math.min(line.match(/^(\s*)/)[1].length, min);
    }

    return lines.map(l => l.slice(min)).join('\n');
  }

  // --- Selectors

  it('should get correct selector', function() {
    var element1 = appendPositionableElement();
    var element2 = appendPositionableElement();

    // Auto (id)
    assert.equal(manager.getSelector(element2), '#absolute-box');

    // Auto (first class)
    element2.el.removeAttribute('id');
    assert.equal(manager.getSelector(element2), '.box');
    element2.el.setAttribute('id', 'absolute-box');

    // First class
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_FIRST);
    assert.equal(manager.getSelector(element2), '.box');

    // Longest class
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_LONGEST);
    assert.equal(manager.getSelector(element2), '.absolute-box');

    // Tag
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG);
    assert.equal(manager.getSelector(element2), 'div');

    // Tag:nth
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG_NTH);
    assert.equal(manager.getSelector(element2), 'div:nth-child(2)');

    // None
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_NONE);
    assert.equal(manager.getSelector(element2), '');
    assert.equal(manager.getSelectorWithDefault(element2), '[element]');

  });

  // --- Headers

  it('should get correct headers for default box', function() {
    var element = appendPositionableElement();

    assert.equal(manager.getPositionHeader(element), '100px, 100px');
    assert.equal(manager.getDimensionsHeader(element), '100px, 100px');
    assert.equal(manager.getZIndexHeader(element), '');
    assert.equal(manager.getTransformHeader(element), '');

  });

  it('should get correct header for a rotated box', function() {
    var element = appendRotatedPositionableElement();
    assert.equal(manager.getTransformHeader(element), '45deg');
  });

  it('should get correct header for a translated box', function() {
    var element = appendTranslatedPositionableElement();
    assert.equal(manager.getTransformHeader(element), '20px, 30px');
  });

  it('should get correct header for a rotated and translated box', function() {
    var element = appendTransformedPositionableElement();
    assert.equal(manager.getTransformHeader(element), '45deg, 20px, 30px');
  });

  it('should get correct header for a rotated and translated box using decimals', function() {
    var element = appendSubpixelTransformedPositionableElement();
    assert.equal(manager.getTransformHeader(element), '45.33deg, 20.23px, 30.21px');
  });

  it('should get correct background image', function() {
    var element = appendBackgroundImagePositionableElement();
    assert.equal(manager.getBackgroundPositionHeader(element), '20px, 40px');
  });

  it('should get headers for incomplete box', function() {
    var element = appendIncompletePositionableElement();
    assert.equal(manager.getPositionHeader(element), '0px, 0px');
    assert.equal(manager.getDimensionsHeader(element), '100px, 0px');
    assert.equal(manager.getZIndexHeader(element), '');
    assert.equal(manager.getTransformHeader(element), '');
  });

  // --- Style Declarations

  it('should get correct styles', function() {
    var element = appendPositionableElement();
    assert.equal(manager.getStyles([element]), dec`

      #absolute-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
      }

    `);
  });

  it('should get correct styles for rotated element', function() {
    var element = appendRotatedPositionableElement();
    assert.equal(manager.getStyles([element]), dec`

      #rotated-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: rotate(45deg);
      }

    `);
  });

  it('should get correct styles for translated element', function() {
    var element = appendTranslatedPositionableElement();
    assert.equal(manager.getStyles([element]), dec`

      #translated-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: translate(20px, 30px);
      }

    `);
  });

  it('should get correct styles for transformed element', function() {
    var element = appendTransformedPositionableElement();
    assert.equal(manager.getStyles([element]), dec`

      #transformed-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: rotate(45deg) translate(20px, 30px);
      }

    `);
  });

  it('should get correct styles for subpixel element', function() {
    var element = appendSubpixelTransformedPositionableElement();
    assert.equal(manager.getStyles([element]), dec`

      #subpixel-transformed-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: rotate(45.33deg) translate(20.23px, 30.21px);
      }

    `);
  });

  it('should get correct styles for background image element', function() {
    var element = appendBackgroundImagePositionableElement();
    assert.equal(manager.getStyles([element]), dec`

      #background-image-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        background-position: 20px 40px;
      }

    `);
  });

  it('should get correct styles for complex element', function() {
    var element = appendComplexPositionableElement();
    assert.equal(manager.getStyles([element]), dec`

      #complex-box {
        bottom: 100px;
        right: 100px;
        width: 100px;
        height: 100px;
        z-index: 400;
        background-position: 20px 40px;
        transform: rotate(45deg) translate(20px, 30px);
      }

    `);
  });

  it('should get correct styles for multiple elements', function() {

    var el1 = appendPositionableElement();
    var el2 = appendComplexPositionableElement();

    assert.equal(manager.getStyles([el1, el2]), dec`

      #absolute-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
      }

      #complex-box {
        bottom: 100px;
        right: 100px;
        width: 100px;
        height: 100px;
        z-index: 400;
        background-position: 20px 40px;
        transform: rotate(45deg) translate(20px, 30px);
      }

    `);
  });

  it('should get correct styles for an incomplete box', function() {
    var element = appendIncompletePositionableElement();
    assert.equal(manager.getStyles([element]), dec`

      #incomplete-box {
        top: 0px;
        left: 0px;
        width: 100px;
        height: 0px;
      }

    `);
  });

  // --- Style Selectors

  it('should get styles with an id selector', function() {
    var element = appendPositionableElement();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_ID);
    assertSimpleBoxSelector(manager.getStyles([element]), '#absolute-box');
  });

  it('should get styles with all selectors', function() {
    var element = appendPositionableElement();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_ALL);
    assertSimpleBoxSelector(manager.getStyles([element]), '.box.absolute-box');
  });

  it('should get styles with tag selector', function() {
    var element = appendPositionableElement();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG);
    assertSimpleBoxSelector(manager.getStyles([element]), 'div');
  });

  it('should get styles with tag nth selector', function() {
    var element = appendPositionableElement();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG_NTH);
    assertSimpleBoxSelector(manager.getStyles([element]), 'div:nth-child(1)');
  });

  it('should get styles with first selector', function() {
    var element = appendPositionableElement();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_FIRST);
    assertSimpleBoxSelector(manager.getStyles([element]), '.box');
  });

  it('should get styles with longest selector', function() {
    var element = appendPositionableElement();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_LONGEST);
    assertSimpleBoxSelector(manager.getStyles([element]), '.absolute-box');
  });

  it('should get styles with no selector', function() {
    var element = appendPositionableElement(), styles, expected;
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_NONE);

    styles = manager.getStyles([element]);
    expected = [
      '  top: 100px;',
      '  left: 100px;',
      '  width: 100px;',
      '  height: 100px;'
    ].join('\n');

    assert.equal(styles, expected);
  });

  // --- Tabs

  it('should use 4 spaces for tab', function() {
    var element = appendPositionableElement();
    settings.set(Settings.TAB_STYLE, Settings.TABS_FOUR_SPACES);
    assert.equal(manager.getStyles([element]), dec`

      #absolute-box {
          top: 100px;
          left: 100px;
          width: 100px;
          height: 100px;
      }

    `);
  });

  it('should use tab character for tab', function() {
    var element = appendPositionableElement();
    settings.set(Settings.TAB_STYLE, Settings.TABS_TAB);
    assert.equal(manager.getStyles([element]), dec`

      #absolute-box {
      	top: 100px;
      	left: 100px;
      	width: 100px;
      	height: 100px;
      }

    `);
  });

  // --- Changed Only Setting

  it('should output no styles when nothing has changed', function() {
    var element = appendPositionableElement();
    settings.set(Settings.OUTPUT_CHANGED_ONLY, true);
    assert.equal(manager.getStyles([element]), '');
  });

  it('should only output changed styles', function() {
    var element = appendPositionableElement('z-box translated-box background-image-box');

    element.pushState();
    element.move(23, 49);

    element.pushState();
    element.resize(30, 80, 'se');

    settings.set(Settings.OUTPUT_CHANGED_ONLY, true);

    assert.equal(manager.getStyles([element]), dec`

    #absolute-box {
      top: 149px;
      left: 123px;
      width: 130px;
      height: 180px;
    }

    `);
  });

  // --- Unique Setting

  it('should output all styles when only one element is passed', function() {
    var element = appendPositionableElement();
    settings.set(Settings.OUTPUT_UNIQUE_ONLY, true);
    assert.equal(manager.getStyles([element]), dec`

    #absolute-box {
      top: 100px;
      left: 100px;
      width: 100px;
      height: 100px;
    }

    `);
  });

  it('should output only styles unique to each element', function() {

    var el1 = appendPositionableElement('background-image-box');
    var el2 = appendPositionableElement('z-box transformed-box');

    el1.el.id = 'one';
    el2.el.id = 'two';

    settings.set(Settings.OUTPUT_UNIQUE_ONLY, true);
    assert.equal(manager.getStyles([el1, el2]), dec`

      #one {
        background-position: 20px 40px;
      }

      #two {
        z-index: 400;
        transform: rotate(45deg) translate(20px, 30px);
      }

    `);
  });

  it('should work on elements with no common styles', function() {
    var el1 = appendPositionableElement();
    var el2 = appendPositionableElement();

    el2.el.id = 'absolute-box-2';
    el2.pushState();
    el2.move(100, 100);

    el2.pushState();
    el2.resize(50, 50, 'se');

    settings.set(Settings.OUTPUT_UNIQUE_ONLY, true);
    assert.equal(manager.getStyles([el1, el2]), dec`

    #absolute-box {
      top: 100px;
      left: 100px;
      width: 100px;
      height: 100px;
    }

    #absolute-box-2 {
      top: 200px;
      left: 200px;
      width: 150px;
      height: 150px;
    }

    `);
  });

  it('should work on elements with all common styles', function() {
    var el1 = appendPositionableElement();
    var el2 = appendPositionableElement();

    el2.el.id = 'absolute-box-2';
    settings.set(Settings.OUTPUT_UNIQUE_ONLY, true);
    assert.equal(manager.getStyles([el1, el2]), '');
  });

  it('should work on elements with all common styles', function() {
    var link;

    createElementMock.apply();
    manager.saveStyles('foo');
    link = createElementMock.getLastCreated();
    createElementMock.release();

    assert.isTrue(link.clickMethodFired);
    assert.equal(link.href, 'data:text/css;base64,' + btoa('foo'));
    assert.equal(link.download, 'styles.css');

  });

  it('should allow a filename based on settings', function() {
    var link;

    settings.set(Settings.SAVE_FILENAME, 'bar.css');

    createElementMock.apply();
    manager.saveStyles('foo');
    link = createElementMock.getLastCreated();
    createElementMock.release();

    assert.equal(link.download, 'bar.css');

  });
});
