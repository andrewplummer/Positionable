(function() {

  /*-------------------------] Mouse Events [--------------------------*/

  function fireMouseEvent(type, el, x, y, opt) {
    opt = Object.assign({
      clientX: x || 0,
      clientY: y || 0,
      view: window,
      bubbles: true,
      cancelable: true
    }, opt);
    var evt = new MouseEvent(type, opt);
    el.dispatchEvent(evt);
  }

  function fireMouseDown(el, x, y, opt) {
    fireMouseEvent('mousedown', el, x, y, opt);
  }

  function fireMouseMove(el, x, y, opt) {
    fireMouseEvent('mousemove', el, x, y, opt);
  }

  function fireMouseUp(el, x, y, opt) {
    fireMouseEvent('mouseup', el, x, y, opt);
  }

  function fireMouseOver(el, x, y, opt) {
    fireMouseEvent('mouseover', el, x, y, opt);
  }

  function fireMouseOut(el, x, y, opt) {
    fireMouseEvent('mouseout', el, x, y, opt);
  }

  function fireMouseEnter(el, x, y, opt) {
    fireMouseEvent('mouseenter', el, x, y, opt);
  }

  function fireMouseLeave(el, x, y, opt) {
    fireMouseEvent('mouseleave', el, x, y, opt);
  }

  function fireContextMenu(el, x, y, opt) {
    fireMouseEvent('contextmenu', el, x, y, opt);
  }

  function fireClick(el, x, y, opt) {
    fireMouseEvent('click', el, x, y, opt);
  }

  function fireDoubleClick(el, x, y, opt) {
    fireMouseEvent('dblclick', el, x, y, opt);
  }

  /*-------------------------] Document Mouse Events [--------------------------*/

  function fireDocumentMouseMove(x, y, opt) {
    fireMouseMove(document.documentElement, x, y, opt);
  }

  function fireDocumentMouseUp(x, y, opt) {
    fireMouseUp(document.documentElement, x, y, opt);
  }

  function fireDocumentMetaMouseMove(x, y) {
    fireMouseMove(document.documentElement, x, y, { metaKey: true });
  }

  function fireDocumentMetaMouseUp(x, y) {
    fireMouseUp(document.documentElement, x, y, { metaKey: true });
  }

  /*-------------------------] Click Events [--------------------------*/

  function clickElement(el, opt) {
    fireMouseDown(el, 0, 0, opt);
    fireMouseUp(el, 0, 0, opt);
    fireClick(el, 0, 0, opt);
  }

  function shiftClickElement(el) {
    clickElement(el, { shiftKey: true });
  }

  function ctrlClickElement(el) {
    clickElement(el, { ctrlKey: true });
    fireContextMenu(el, 0, 0, { ctrlKey: true });
  }

  /*-------------------------] Drag Events [--------------------------*/

  function dragElement(el) {
    executeElementDrag(el, getCoordsForSimpleDrag(arguments));
  }

  function ctrlDragElement(el) {
    executeElementDrag(el, getCoordsForSimpleDrag(arguments, { ctrlKey: true }));
  }

  function metaDragElement(el) {
    executeElementDrag(el, getCoordsForSimpleDrag(arguments, { metaKey: true }));
  }

  function shiftDragElement(el) {
    executeElementDrag(el, getCoordsForSimpleDrag(arguments, { shiftKey: true }));
  }

  function shiftCtrlDragElement(el) {
    executeElementDrag(el, getCoordsForSimpleDrag(arguments, { shiftKey: true, ctrlKey: true }));
  }

  function dragElementWithCtrlKeyChange(el, coords) {
    executeElementDrag(el, getCoordsForDetailedDrag(coords, 'ctrlKey'));
  }

  function dragElementWithMetaKeyChange(el, coords) {
    executeElementDrag(el, getCoordsForDetailedDrag(coords, 'metaKey'));
  }

  // --- Private

  function executeElementDrag(el, points) {
    var x, y, opt;
    for (let i = 0, point; point = points[i]; i++) {
      checkDragKeysChanged(point[2], opt);
      x   = point[0];
      y   = point[1];
      opt = point[2];
      if (i === 0) {
        fireMouseOver(el, x, y, opt);
        fireMouseDown(el, x, y, opt);
      }
      fireDocumentMouseMove(x, y, opt);
    }
    fireDocumentMouseUp(x, y, opt);
    if (opt.ctrlKey) {
      fireContextMenu(el, x, y, opt);
    }
    fireMouseOut(el, x, y, opt);
  }

  function checkDragKeysChanged(opt, lastOpt) {
    lastOpt = lastOpt || {};
    checkKeyChangeAndFire(opt.altKey,   lastOpt.altKey,   'Alt', opt);
    checkKeyChangeAndFire(opt.metaKey,  lastOpt.metaKey,  'Meta', opt);
    checkKeyChangeAndFire(opt.shiftKey, lastOpt.shiftKey, 'Shift', opt);
    checkKeyChangeAndFire(opt.ctrlKey,  lastOpt.ctrlKey,  'Control', opt);
  }

  function checkKeyChangeAndFire(down, wasDown, name, opt) {
    if (down && !wasDown) {
      fireDocumentKeyDown(name, opt);
    } else if (!down && wasDown) {
      fireDocumentKeyUp(name, opt);
    }
  }

  function getCoordsForSimpleDrag(args, opt) {
    // Passing in arguments de-optimizes the function, but
    // we're not really concerned about this for testing.
    var flat = Array.prototype.slice.call(args, 1), coords = [];
    for (let i = 0; i < flat.length; i += 2) {
      coords.push([flat[i], flat[i + 1], opt || {}]);
    }
    return coords;
  }

  function getCoordsForDetailedDrag(coords, name) {
    coords.forEach(c => {
      c[2] = { [name]: c[2] };
    });
    return coords;
  }

  /*-------------------------] Key Events [--------------------------*/

  function fireKeyEvent(type, el, key, opt) {
    opt = Object.assign({
      key: key,
      view: window,
      bubbles: true,
      cancelable: true
    }, opt);
    var evt = new KeyboardEvent(type, opt);
    el.dispatchEvent(evt);
  }

  function fireKeyDown(el, key, opt) {
    fireKeyEvent('keydown', el, key, opt);
  }

  function fireKeyUp(el, key, opt) {
    fireKeyEvent('keyup', el, key, opt);
  }

  function fireDocumentKeyDown(key, opt) {
    fireKeyDown(document.documentElement, key, opt);
  }

  function fireDocumentKeyUp(key, opt) {
    fireKeyUp(document.documentElement, key, opt);
  }

  function fireDocumentShiftKeyDown(key) {
    fireKeyDown(document.documentElement, key, { shiftKey: true });
  }

  function fireDocumentMetaKeyDown(key) {
    fireKeyDown(document.documentElement, key, { metaKey: true });
  }

  function fireDocumentMetaKeyUp(key) {
    fireKeyUp(document.documentElement, key, { metaKey: true });
  }

  function fireDocumentCtrlKeyDown(key) {
    fireKeyDown(document.documentElement, key, { ctrlKey: true });
  }

  function fireDocumentCtrlKeyUp(key) {
    fireKeyUp(document.documentElement, key, { ctrlKey: true });
  }

  /*-------------------------] Form Events [--------------------------*/

  function fireSubmitEvent(el) {
    el.dispatchEvent(new Event('submit'));
  }

  function fireResetEvent(el) {
    el.dispatchEvent(new Event('reset'));
  }

  /*-------------------------] Form Events [--------------------------*/

  function fireScrollEvent() {
    document.dispatchEvent(new Event('scroll'));
  }

  /*-------------------------] Export [--------------------------*/

  window.fireMouseDown   = fireMouseDown;
  window.fireMouseMove   = fireMouseMove;
  window.fireMouseUp     = fireMouseUp;
  window.fireMouseOver   = fireMouseOver;
  window.fireMouseOut    = fireMouseOut;
  window.fireMouseEnter  = fireMouseEnter;
  window.fireMouseLeave  = fireMouseLeave;
  window.fireDoubleClick = fireDoubleClick;
  window.fireContextMenu = fireContextMenu;

  window.fireDocumentMouseMove     = fireDocumentMouseMove;
  window.fireDocumentMouseUp       = fireDocumentMouseUp;
  window.fireDocumentMetaMouseMove = fireDocumentMetaMouseMove;
  window.fireDocumentMetaMouseUp   = fireDocumentMetaMouseUp;

  window.clickElement      = clickElement;
  window.ctrlClickElement  = ctrlClickElement;
  window.shiftClickElement = shiftClickElement;

  window.dragElement                  = dragElement;
  window.metaDragElement              = metaDragElement;
  window.ctrlDragElement              = ctrlDragElement;
  window.shiftDragElement             = shiftDragElement;
  window.shiftCtrlDragElement         = shiftCtrlDragElement;
  window.dragElementWithCtrlKeyChange = dragElementWithCtrlKeyChange;
  window.dragElementWithMetaKeyChange = dragElementWithMetaKeyChange;

  window.fireDocumentKeyDown      = fireDocumentKeyDown;
  window.fireDocumentShiftKeyDown = fireDocumentShiftKeyDown;
  window.fireDocumentMetaKeyDown  = fireDocumentMetaKeyDown;
  window.fireDocumentKeyUp        = fireDocumentKeyUp;
  window.fireDocumentMetaKeyUp    = fireDocumentMetaKeyUp;
  window.fireDocumentCtrlKeyDown  = fireDocumentCtrlKeyDown;
  window.fireDocumentCtrlKeyUp    = fireDocumentCtrlKeyUp;

  window.fireSubmitEvent = fireSubmitEvent;
  window.fireResetEvent  = fireResetEvent;

  window.fireScrollEvent = fireScrollEvent;

})();
