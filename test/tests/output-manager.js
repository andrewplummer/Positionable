
describe('OutputManager', function(uiRoot) {
  var settings, manager, element, el, els;

  class Listener {
    onSettingsInitialized() {}
    onSettingsUpdated() {}
    onSelectorUpdated() {}
    onSnappingUpdated() {}
  }

  setup(function() {
    chromeMock.apply();
    settings = new Settings(new Listener(), uiRoot);
    manager  = new OutputManager(settings);
  });

  teardown(function() {
    chromeMock.release();
    releaseAppendedFixtures();
  });

  function buildPositionableElement(className) {
    el = appendBox(className);
    return new PositionableElement(el);
  }

  function setupBox(className) {
    element = buildPositionableElement(className);
  }

  function setupNestedBox(className, parentClassName) {
    el = appendNestedBox(className, parentClassName);
    element = new PositionableElement(el);
  }

  function setupMultipleElements(className1, className2) {
    els = [];
    els.push(buildPositionableElement(className1));
    els.push(buildPositionableElement(className2));
  }

  function getMockGroupMap() {
    return {
      top: "$mockTop",
      left: "$mockLeft",
      width: "$mockWidth",
      height: "$mockHeight"
    }
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
    setupBox();

    // Auto (id)
    assert.equal(manager.getSelector(element), '#absolute-box');

    // Auto (first class)
    element.el.removeAttribute('id');
    assert.equal(manager.getSelector(element), '.box');
    element.el.setAttribute('id', 'absolute-box');

    // First class
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_FIRST);
    assert.equal(manager.getSelector(element), '.box');

    // Longest class
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_LONGEST);
    assert.equal(manager.getSelector(element), '.absolute-box');

    // Tag
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG);
    assert.equal(manager.getSelector(element), 'div');

    // Tag:nth
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG_NTH);
    assert.equal(manager.getSelector(element), 'div:nth-child(1)');

    // None
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_NONE);
    assert.equal(manager.getSelector(element), '');
    assert.equal(manager.getSelectorWithDefault(element), '[element]');

  });

  // --- Headers

  it('should get correct headers for default box', function() {
    setupBox();
    assert.equal(manager.getPositionHeader(element), '100px, 100px');
    assert.equal(manager.getDimensionsHeader(element), '100px, 100px');
    assert.equal(manager.getZIndexHeader(element), '');
    assert.equal(manager.getTransformHeader(element), '');
  });

  it('should get correct header for a rotated box', function() {
    setupBox('rotate-box');
    assert.equal(manager.getTransformHeader(element), 'r: 45deg');
  });

  it('should get correct header for a translated box', function() {
    setupBox('translate-box');
    assert.equal(manager.getTransformHeader(element), 't: 20px, 30px');
  });

  it('should get correct header for a rotated and translated box', function() {
    setupBox('rotate-translate-box');
    assert.equal(manager.getTransformHeader(element), 'r: 45deg | t: 20px, 30px');
  });

  it('should get correct header for a rotated and translated box using decimals', function() {
    setupBox('subpixel-rotate-translate-box');
    assert.equal(manager.getTransformHeader(element), 'r: 45.33deg | t: 20.23px, 30.21px');
  });

  it('should get correct background image', function() {
    setupBox('background-box');
    assert.equal(manager.getBackgroundPositionHeader(element), '20px, 40px');
  });

  it('should get headers for incomplete box', function() {
    setupBox('incomplete-box');
    assert.equal(manager.getPositionHeader(element), '0px, 0px');
    assert.equal(manager.getDimensionsHeader(element), '100px, 0px');
    assert.equal(manager.getZIndexHeader(element), '');
    assert.equal(manager.getTransformHeader(element), '');
  });

  it('should get headers for a matrix3d box', function() {
    setupBox('matrix-3d-box');
    assert.equal(manager.getPositionHeader(element), '100px, 100px');
    assert.equal(manager.getDimensionsHeader(element), '100px, 100px');
    assert.equal(manager.getZIndexHeader(element), '');
    assert.equal(manager.getTransformHeader(element), 'matrix3d: 1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1');
  });

  it('should get headers for a null rotation box', function() {
    setupBox('null-rotate-box');
    assert.equal(manager.getTransformHeader(element), 'r: 0deg');
  });

  it('should get headers for a null translate box', function() {
    setupBox('null-translate-box');
    assert.equal(manager.getTransformHeader(element), 't: 0px, 0px');
  });

  it('should get headers when even one function exists', function() {
    setupBox('null-rotate-with-translate-box');
    assert.equal(manager.getTransformHeader(element), 'r: 0deg | t: 20px, 20px');
  });

  it('should get correct headers for a reflected box', function() {
    setupBox();
    element.cssBox.cssWidth.px = -100;
    element.cssBox.cssHeight.px = -100;
    assert.equal(manager.getPositionHeader(element), '0px, 0px');
    assert.equal(manager.getDimensionsHeader(element), '100px, 100px');
  });

  it('should get correct headers for a reflected inverted box', function() {
    setupBox('inverted-box');
    element.cssBox.cssWidth.px = -100;
    element.cssBox.cssHeight.px = -100;
    assert.equal(manager.getPositionHeader(element), '0px, 0px');
    assert.equal(manager.getDimensionsHeader(element), '100px, 100px');
  });

  // --- Style Declarations

  it('should get correct styles', function() {
    setupBox();
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
    setupBox('rotate-box');
    assert.equal(manager.getStyles([element]), dec`

      #rotate-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: rotate(45deg);
      }

    `);
  });

  it('should get correct styles for translated element', function() {
    setupBox('translate-box');
    assert.equal(manager.getStyles([element]), dec`

      #translate-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: translate(20px, 30px);
      }

    `);
  });

  it('should get correct styles for rotate translate element', function() {
    setupBox('rotate-translate-box');
    assert.equal(manager.getStyles([element]), dec`

      #rotate-translate-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: rotate(45deg) translate(20px, 30px);
      }

    `);
  });

  it('should get correct styles for subpixel element', function() {
    setupBox('subpixel-rotate-translate-box');
    assert.equal(manager.getStyles([element]), dec`

      #subpixel-rotate-translate-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: rotate(45.33deg) translate(20.23px, 30.21px);
      }

    `);
  });

  it('should get correct styles for background image element', function() {
    setupBox('background-box');
    assert.equal(manager.getStyles([element]), dec`

      #background-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        background-position: 20px 40px;
      }

    `);
  });

  it('should get correct styles for complex element', function() {
    setupBox('complex-box');
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

  it('should get correct styles for multiple elements with no grouping', function() {
    setupMultipleElements('absolute-box', 'complex-box');
    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_NONE);
    assert.equal(manager.getStyles(els), dec`

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

  it('should not output missing styles from incomplete properties', function() {
    setupBox('incomplete-box');
    assert.equal(manager.getStyles([element]), dec`

      #incomplete-box {
        top: 0px;
        width: 100px;
      }

    `);
  });

  it('should not output rotate when null', function() {
    setupBox('null-rotate-box');
    assert.equal(manager.getStyles([element]), dec`

      #null-rotate-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
      }

    `);
  });

  it('should not output translate when null', function() {
    setupBox('null-translate-box');
    assert.equal(manager.getStyles([element]), dec`

      #null-translate-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
      }

    `);
  });

  it('should output transform when even one exists', function() {
    setupBox('null-rotate-with-translate-box');
    assert.equal(manager.getStyles([element]), dec`

      #null-rotate-with-translate-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: rotate(0deg) translate(20px, 20px);
      }

    `);
  });

  it('should get correct styles for a reflected box', function() {
    setupBox();
    element.cssBox.cssWidth.px = -100;
    element.cssBox.cssHeight.px = -100;
    assert.equal(manager.getStyles([element]), dec`

      #absolute-box {
        top: 0px;
        left: 0px;
        width: 100px;
        height: 100px;
      }

    `);
  });

  // --- Style Selectors

  it('should get styles with an id selector', function() {
    setupBox();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_ID);
    assertSimpleBoxSelector(manager.getStyles([element]), '#absolute-box');
  });

  it('should get styles with all selectors', function() {
    setupBox();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_ALL);
    assertSimpleBoxSelector(manager.getStyles([element]), '.box.absolute-box');
  });

  it('should get styles with tag selector', function() {
    setupBox();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG);
    assertSimpleBoxSelector(manager.getStyles([element]), 'div');
  });

  it('should get styles with tag nth selector', function() {
    setupBox();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_TAG_NTH);
    assertSimpleBoxSelector(manager.getStyles([element]), 'div:nth-child(1)');
  });

  it('should get styles with first selector', function() {
    setupBox();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_FIRST);
    assertSimpleBoxSelector(manager.getStyles([element]), '.box');
  });

  it('should get styles with longest selector', function() {
    setupBox();
    settings.set(Settings.OUTPUT_SELECTOR, Settings.OUTPUT_SELECTOR_LONGEST);
    assertSimpleBoxSelector(manager.getStyles([element]), '.absolute-box');
  });

  it('should get styles with no selector', function() {
    var styles, expected;

    setupBox();
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
    setupBox();
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

  it('should use 8 spaces for tab', function() {
    setupBox();
    settings.set(Settings.TAB_STYLE, Settings.TABS_EIGHT_SPACES);
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
    setupBox();
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
    setupBox();
    settings.set(Settings.OUTPUT_CHANGED_ONLY, true);
    assert.equal(manager.getStyles([element]), '');
  });

  it('should only output changed styles', function() {
    setupBox('z-box translate-box background-box');

    element.pushState();
    element.move(23, 49);

    element.pushState();
    element.resize(30, 80, 'se');

    settings.set(Settings.OUTPUT_CHANGED_ONLY, true);

    assert.equal(manager.getStyles([element]), dec`

    #z-box {
      top: 149px;
      left: 123px;
      width: 130px;
      height: 180px;
    }

    `);
  });

  // --- Grouping Styles

  it('should not group styles when grouping is set to none', function() {
    setupMultipleElements('background-box', 'rotate-box');
    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_NONE);
    assert.equal(manager.getStyles(els), dec`

      #background-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        background-position: 20px 40px;
      }

      #rotate-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
        transform: rotate(45deg);
      }

    `);
  });

  it('should not group styles when only one element is passed', function() {
    setupBox();
    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_REMOVE);
    assert.equal(manager.getStyles([element]), dec`

    #absolute-box {
      top: 100px;
      left: 100px;
      width: 100px;
      height: 100px;
    }

    `);
  });

  it('should remove common styles when grouping is set to remove', function() {
    setupMultipleElements('background-box', 'rotate-box');
    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_REMOVE);
    assert.equal(manager.getStyles(els), dec`

      #background-box {
        background-position: 20px 40px;
      }

      #rotate-box {
        transform: rotate(45deg);
      }

    `);
  });

  it('should output everything when grouping is set to remove and there are no common styles', function() {
    setupMultipleElements();
    els[0].el.id = 'absolute-box-1';
    els[1].el.id = 'absolute-box-2';

    els[1].pushState();
    els[1].move(100, 100);

    els[1].pushState();
    els[1].resize(50, 50, 'se');

    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_REMOVE);
    assert.equal(manager.getStyles(els), dec`

    #absolute-box-1 {
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

  it('should output nothing when grouping is set to remove and all styles are common', function() {
    setupMultipleElements();
    els[0].el.id = 'absolute-box-1';
    els[1].el.id = 'absolute-box-2';
    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_REMOVE);
    assert.equal(manager.getStyles(els), '');
  });

  it('should auto group styles by common class', function() {
    setupMultipleElements('background-box', 'rotate-box');
    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_AUTO);
    assert.equal(manager.getStyles(els), dec`

      .absolute-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
      }

      #background-box {
        background-position: 20px 40px;
      }

      #rotate-box {
        transform: rotate(45deg);
      }

    `);
  });

  it('should auto group styles using all selectors', function() {
    setupMultipleElements('background-box', 'rotate-box');
    els[0].el.classList.remove('box', 'absolute-box');
    els[1].el.classList.remove('box', 'absolute-box');
    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_AUTO);
    assert.equal(manager.getStyles(els), dec`

      #background-box, #rotate-box {
        top: 100px;
        left: 100px;
        width: 100px;
        height: 100px;
      }

      #background-box {
        background-position: 20px 40px;
      }

      #rotate-box {
        transform: rotate(45deg);
      }

    `);
  });

  it('should allow a map of properties to sass variables', function() {
    setupMultipleElements('background-box', 'rotate-box');
    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_MAP);
    settings.set(Settings.GROUPING_MAP, getMockGroupMap());
    assert.equal(manager.getStyles(els), dec`

      $mockTop: 100px;
      $mockLeft: 100px;
      $mockWidth: 100px;
      $mockHeight: 100px;

      #background-box {
        top: $mockTop;
        left: $mockLeft;
        width: $mockWidth;
        height: $mockHeight;
        background-position: 20px 40px;
      }

      #rotate-box {
        top: $mockTop;
        left: $mockLeft;
        width: $mockWidth;
        height: $mockHeight;
        transform: rotate(45deg);
      }

    `);
  });

  it('should map variables on a single common property', function() {
    setupMultipleElements();
    settings.set(Settings.OUTPUT_GROUPING, Settings.OUTPUT_GROUPING_MAP);
    settings.set(Settings.GROUPING_MAP, getMockGroupMap());

    els[0].el.id = 'absolute-box-1';
    els[1].el.id = 'absolute-box-2';

    els[0].pushState();
    els[0].move(100, 0);

    els[0].pushState();
    els[0].resize(100, 100, 'se');

    assert.equal(manager.getStyles(els), dec`

      $mockTop: 100px;

      #absolute-box-1 {
        top: $mockTop;
        left: 200px;
        width: 200px;
        height: 200px;
      }

      #absolute-box-2 {
        top: $mockTop;
        left: 100px;
        width: 100px;
        height: 100px;
      }

    `);
  });

  // --- Other

  it('should save styles', function() {
    var link;

    createElementMock.apply();
    manager.saveStyles('foo');
    link = createElementMock.getLastCreated();
    createElementMock.release();

    assert.isTrue(link.clickMethodFired);
    assert.equal(link.href, 'data:text/css;base64,' + btoa('foo'));
    assert.equal(link.download, 'styles.css');

  });

  it('should not output incorrect headers on a percent box when the parent has no dimensions', function() {
    setupNestedBox('percent-box', 'zero-dimension-box');

    // Manipulate the element to force values to update
    element.pushState();
    element.move(50, 50);
    element.pushState();
    element.resize(50, 50, 'se');

    assert.equal(manager.getPositionHeader(element), '0%, 0%');
    assert.equal(manager.getDimensionsHeader(element), '0%, 0%');
  });

  it('should not output incorrect styles on a percent box when the parent has no dimensions', function() {
    setupNestedBox('percent-box', 'zero-dimension-box');

    // Manipulate the element to force values to update
    element.pushState();
    element.move(50, 50);
    element.pushState();
    element.resize(50, 50, 'se');

    assert.equal(manager.getStyles([element]), dec`

      #percent-box {
        top: 0%;
        left: 0%;
        width: 0%;
        height: 0%;
      }

    `);
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

  it('should not output empty spaces for multiple elements', function() {
    var el1 = buildPositionableElement();
    var el2 = buildPositionableElement();
    settings.set(Settings.OUTPUT_CHANGED_ONLY, true);
    assert.equal(manager.getStyles([el1, el2]), '');
  });

});
