/*
 *  Positionable Chrome Extension
 *
 *  Freely distributable and licensed under the MIT-style license.
 *  Copyright (c) 2017 Andrew Plummer
 *
 * ---------------------------- */

// TODO: test with:
// - bug: go to zindex nudging and unfocus window, then focus back, move is rendered
// - test "auto" values? what should happen here?
// - add "8 spaces" to tab style list
// - test background-image: none
// - resize while flipping between sizing modes (jumps?)
// - make sure static elements are changed to absolute
// - test command key on windows
// - test undefined top/left/width/height values
// - test z-index on overlapping elements when dragging
// - test on elements with transitions
// - should it work on absolute elements with no left/right/top/bottom properties?
// - test after save should go back to element area
// - test finding elements after settings update
// - test what happens if extension button hit twice
// - test with animations?
// - cursors working ok??
// - bug: select multiple then command to drag one... jumps? (looks like scrolling)
// - bug: select multiple then drag fixed with scroll... others jump way down
// - bug: undo after align doesn't seem to work??

// - TODO: if I rotate back to 0, the transform should maybe not be copied? what about other properties?
// - TODO: more rotate icon increments for smoother transition?
// - TODO: can we not handle percents in transforms??
// - TODO: how to handle auto values?
// - TODO: test that it doesn't fail on display: none elements
// - TODO: check that each class only knows about itself to as much a degree as possible
// - TODO: can we get away with not cloning everything by using the drag vectors instead of the offset?
// - TODO: do we really want to throw errors to halt??
// - TODO: rotated box won't reflect

// TODO: allow bottom/right position properties??
// TODO: validate query selectors! and also re-get elements on query selector change

const UI_HOST_CLASS_NAME = 'positionable-extension-ui';

/*-------------------------] Utilities [--------------------------*/

function camelize(str) {
  return str.replace(/-(\w)/g, function(match, letter) {
    return letter.toUpperCase();
  });
}

function hashIntersect(obj1, obj2) {
  var result = {}, key;
  for (key in obj1) {
    if (!obj1.hasOwnProperty(key)) continue;
    if (obj1[key] === obj2[key]) {
      result[key] = obj1[key];
    }
  }
  return result;
}

function roundWithPrecision(n, precision) {
  var mult = Math.pow(10, precision);
  return Math.round(n * mult) / mult;
}

function throwError(str, halt) {
  var msg = 'Positionable: ' + str;
  if (halt === false) {
    console.error(msg);
  } else {
    throw new Error(msg);
  }
}

/*-------------------------] NudgeManager [--------------------------*/

class NudgeManager {

  static get DELAY_TO_SLOW() { return 250;  }
  static get DELAY_TO_MID()  { return 1500; }
  static get DELAY_TO_FAST() { return 3000; }

  static get REPEAT_SLOW()   { return 20; }
  static get REPEAT_MID ()   { return 10; }
  static get REPEAT_FAST()   { return 5;  }

  static get POSITION_MODE()   { return 'position';   }
  static get ROTATE_MODE()     { return 'rotate';     }
  static get Z_INDEX_MODE()    { return 'z-index';    }
  static get RESIZE_NW_MODE()  { return 'resize-nw';  }
  static get RESIZE_SE_MODE()  { return 'resize-se';  }
  static get BACKGROUND_MODE() { return 'background'; }

  static get MULTIPLIER() { return 5; }

  constructor(listener) {
    this.listener = listener;
    this.vectors  = {};

    this.setPositionMode();
    this.setMultiplier(false);
    this.checkNextNudge = this.checkNextNudge.bind(this);
  }

  getCurrentMode() {
    return this.mode;
  }

  addDirection(dir) {
    if (!this.isNudging()) {
      this.start();
    }
    this.vectors[dir] = true;
    this.next();
  }

  // --- Modes

  setPositionMode() {
    this.setMode(NudgeManager.POSITION_MODE);
  }

  toggleResizeMode() {
    this.toggleMode(NudgeManager.RESIZE_SE_MODE);
  }

  toggleRotateMode() {
    this.toggleMode(NudgeManager.ROTATE_MODE);
  }

  toggleBackgroundMode() {
    this.toggleMode(NudgeManager.BACKGROUND_MODE);
  }

  toggleZIndexMode() {
    this.toggleMode(NudgeManager.Z_INDEX_MODE);
  }

  // --- Multiplier

  setMultiplier(on) {
    this.multiplier = on ? NudgeManager.MULTIPLIER : 1;
  }

  // --- Private

  dispatchNudge(x, y) {
    var evt = new CustomEvent('nudge');
    if (this.isMode(NudgeManager.RESIZE_NW_MODE)) {
      evt.dir = 'nw';
    } else if (this.isMode(NudgeManager.RESIZE_SE_MODE)) {
      evt.dir = 'se';
    }
    this.vector.x += x;
    this.vector.y += y;
    evt.x = this.vector.x;
    evt.y = this.vector.y;
    evt.mode = this.mode;
    this.listener.onNudgeMove(evt);
  }

  removeDirection(dir) {
    this.vectors[dir] = false;
    if (!this.isNudging()) {
      this.resetTimeout();
      this.listener.onNudgeStop(this.mode);
    }
  }

  start() {
    this.vector = new Point(0, 0);
    this.startTime = new Date();
    this.listener.onNudgeStart(this.mode);
  }

  next() {
    var vectors, nudgeX, nudgeY;

    if (this.timer !== undefined) {
      return;
    }

    vectors = this.vectors;
    nudgeX  = 0;
    nudgeY  = 0;

    if (vectors.up) {
      nudgeY -= 1;
    }
    if (vectors.down) {
      nudgeY += 1;
    }
    if (vectors.left) {
      nudgeX -= 1;
    }
    if (vectors.right) {
      nudgeX += 1;
    }

    this.dispatchNudge(nudgeX * this.multiplier, nudgeY * this.multiplier);
    this.timer = setTimeout(this.checkNextNudge, this.getDelay());
  }

  checkNextNudge() {
    this.timer = undefined;
    if (this.isNudging()) {
      this.next();
    }
  }

  isNudging() {
    var vectors = this.vectors;
    return !!(vectors.up || vectors.down || vectors.left || vectors.right);
  }

  setMode(mode) {
    if (this.mode !== mode) {
      this.mode = mode;
      this.listener.onNudgeModeChanged(mode);
    }
  }

  toggleMode(mode) {
    if (this.mode === mode) {
      // Resize SE -> Resize NW
      // Resize NW -> Resize SE
      // All other modes toggle back to position mode.
      if (mode === NudgeManager.RESIZE_SE_MODE) {
        mode = NudgeManager.RESIZE_NW_MODE;
      } else if (mode === NudgeManager.RESIZE_NW_MODE) {
        mode = NudgeManager.RESIZE_SE_MODE;
      } else {
        mode = NudgeManager.POSITION_MODE;
      }
    }
    this.setMode(mode);
  }

  isMode(mode) {
    return this.mode === mode;
  }

  getDelay() {
    var ms = new Date() - this.startTime;
    if (ms >= NudgeManager.DELAY_TO_FAST) {
      return NudgeManager.REPEAT_FAST;
    } else if (ms >= NudgeManager.DELAY_TO_MID) {
      return NudgeManager.REPEAT_MID;
    } else if (ms >= NudgeManager.DELAY_TO_SLOW) {
      return NudgeManager.REPEAT_SLOW;
    } else {
      return NudgeManager.DELAY_TO_SLOW;
    }
  }

  resetTimeout() {
    this.timer = clearTimeout(this.timer);
  }

  destroy() {
    this.resetTimeout();
  }

}

/*-------------------------] KeyEventManager [--------------------------*/

/*
class KeyEventManager {

  static get LEFT()  { return 37; }
  static get UP()    { return 38; }
  static get RIGHT() { return 39; }
  static get DOWN()  { return 40; }

  static get ENTER() { return 13; }
  static get SHIFT() { return 16; }
  static get CTRL()  { return 17; }
  static get ALT()   { return 18; }
  static get CMD()   { return 91; }

  static get A()     { return 65; }
  static get B()     { return 66; }
  static get M()     { return 77; }
  static get S()     { return 83; }
  static get R()     { return 82; }
  static get Z()     { return 90; }

  constructor() {
    this.handledKeys = {};
    this.setupHandlers();
  }

  setupHandlers() {

    this.setupKeyHandler('keydown', this.onKeyDown);
    this.setupKeyHandler('keyup', this.onKeyUp);

    this.setupKey('b');
    this.setupKey('m');
    this.setupKey('r');
    this.setupKey('s', true);
    this.setupKey('z', true);
    this.setupKey('a', true);

    this.setupKey('left');
    this.setupKey('up');
    this.setupKey('right');
    this.setupKey('down');

    this.setupKey('shift');
    this.setupKey('ctrl');
    this.setupKey('alt');
    this.setupKey('cmd', true);

  }

  // --- Setup

  setupKeyHandler(name, handler) {
    document.documentElement.addEventListener(name, handler.bind(this));
  }

  delegateEventToElementManager(name, target) {
    var evtName = name.slice(2).toLowerCase();
    this.setupHandler(evtName, function(evt) {
      elementManager[name](evt);
    }, target);
  }

  setupKey(name, allowsCommand) {
    var code = KeyEventManager[name.toUpperCase()];
    this.handledKeys[code] = {
      name: name,
      allowsCommand: !!allowsCommand
    }
  }

  onKeyDown(evt) {
    this.checkKeyEvent('KeyDown', evt);
  }

  onKeyUp(evt) {
    this.checkKeyEvent('KeyUp', evt);
  }

  checkKeyEvent(type, evt) {
    var code = evt.keyCode;
    if (this.isArrowKey(code)) {
      this.callKeyHandler('arrow', type, evt, this.getArrowName(code));
    } else {
      var key = this.getHandledKey(code);
      var withCommand = this.hasCommandKey(evt);
      if (key && (key.allowsCommand || !withCommand)) {
        this.callKeyHandler(key.name, type, evt, withCommand);
      }
    }
  }

  callKeyHandler(name, type, evt, arg) {
    var fn = this[name + type];
    if (fn) {
      evt.preventDefault();
      evt.stopPropagation();
      evt.stopImmediatePropagation();
      fn.call(this, arg);
    }
  }

  getHandledKey(code) {
    return this.isArrowKey(code) ? 'arrow' : this.handledKeys[code];
  }

  isArrowKey(code) {
    return code === KeyEventManager.UP ||
           code === KeyEventManager.RIGHT ||
           code === KeyEventManager.DOWN ||
           code === KeyEventManager.LEFT;
  }

  hasCommandKey(evt) {
    // TODO: this only works for OSX
    return evt.metaKey;
  }

  // --- Events

  shiftKeyDown() {
    nudgeManager.setMultiplier(true);
  }

  shiftKeyUp() {
    nudgeManager.setMultiplier(false);
  }

  ctrlKeyDown() {
    elementManager.toggleHandles(false);
    elementManager.dragReset();
  }

  ctrlKeyUp() {
    elementManager.toggleHandles(true);
    nudgeManager.setMode(NudgeManager.POSITION_MODE);
    elementManager.dragReset();
    statusBar.update();
  }

  cmdKeyDown() {
    elementManager.temporarilyFocusDraggingElement();
  }

  cmdKeyUp() {
    elementManager.releasedFocusedDraggingElement();
    nudgeManager.resetNudges();
  }

  altKeyDown() {
    elementManager.peek(true);
  }

  altKeyUp() {
    elementManager.peek(false);
  }

  rKeyDown() {
    nudgeManager.toggleMode(NudgeManager.ROTATE_MODE);
    statusBar.update();
  }

  bKeyDown() {
    nudgeManager.toggleMode(NudgeManager.BG_POSITION_MODE);
    statusBar.update();
  }

  mKeyDown() {
    nudgeManager.setMode(NudgeManager.POSITION_MODE);
    statusBar.update();
  }

  sKeyDown(withCommand) {
    if (withCommand) {
      elementManager.save();
    } else {
      nudgeManager.toggleMode(NudgeManager.RESIZE_SE_MODE);
      statusBar.update();
    }
  }

  zKeyDown(withCommand) {
    if (withCommand) {
      elementManager.undo();
    } else {
      nudgeManager.toggleMode(NudgeManager.Z_INDEX_MODE);
      statusBar.update();
    }
  }

  aKeyDown(withCommand) {
    if (withCommand) {
      elementManager.focusAll(true);
      statusBar.update();
    }
  }

  arrowKeyDown(arrowName) {
    nudgeManager.addDirection(arrowName);
  }

  arrowKeyUp(arrowName) {
    nudgeManager.removeDirection(arrowName);
  }

  getArrowName(code) {
    switch(code) {
      case KeyEventManager.LEFT:  return 'left';
      case KeyEventManager.UP:    return 'up';
      case KeyEventManager.RIGHT: return 'right';
      case KeyEventManager.DOWN:  return 'down';
    }
  }

}
*/

/*-------------------------] Element [--------------------------*/

// TODO: cleanup
// TODO: can we now get away with no creation of elements at all (with the exception of ShadowDomInjector)?
class Element {

  static create(parent, tag, className) {
    var el = new Element(parent.appendChild(document.createElement(tag)));
    if (className) {
      className.split(' ').forEach(function(name) {
        el.addClass(name);
      }, this);
    }
    return el;
  }

  constructor(el) {
    this.el = el;
  }

  delegate(methodName, target) {
    this[methodName] = target[methodName].bind(target);
  }

  addClass(name) {
    this.el.classList.add(this.getClassName(name));
    return this;
  }

  removeClass(name) {
    this.el.classList.remove(this.getClassName(name));
    return this;
  }

  getClassName(name) {
    return name;
  }

  resetScroll() {
    this.el.scrollTop = 0;
    this.el.scrollLeft = 0;
  }

  hide() {
    this.el.style.display = 'none';
  }

  show() {
    this.el.style.display = 'block';
  }

  unhide() {
    this.el.style.display = '';
  }

  text(str) {
    this.el.textContent = str;
  }

  title(title) {
    this.el.title = title;
    return this;
  }

  setStyle(name, val) {
    this.el.style[name] = val;
  }

  bindElementsById() {
    var els = this.el.querySelectorAll('[id]');
    for (var i = 0, el; el = els[i]; i++) {
      this[camelize(el.id)] = new Element(el);
    }
  }

  getViewportCenter() {
    var rect = this.el.getBoundingClientRect();
    return new Point(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  destroy() {
    this.el.remove();
  }

}


/*-------------------------] ShadowDomInjector [--------------------------*/

class ShadowDomInjector {

  static get EXTENSION_RELATIVE_PATH_REG() { return /chrome-extension:\/\/__MSG_@@extension_id__\//g; }

  static setBasePath(path) {
    this.BASE_PATH = path;
  }

  // Template Preloading
  // -------------------
  // This saves I/O requests and makes testing a lot easier by allowing an initial
  // preload of templates and caching them so they can resolve synchronously.

  static preload(templatePath, stylesheetPath) {

    this.preloadedTemplatesByPath = this.preloadedTemplatesByPath || {};
    this.preloadedTemplateTasks = this.preloadedTemplateTasks || [];

    this.preloadedTemplateTasks.push(this.preloadTemplateAndCache(templatePath, stylesheetPath));
  }

  static preloadTemplateAndCache(templatePath, stylesheetPath) {
    var injector = new ShadowDomInjector();
    injector.setTemplate(templatePath);
    injector.setStylesheet(stylesheetPath);
    return injector.fetchTemplate().then(templateHtml => {
      this.preloadedTemplatesByPath[templatePath] = templateHtml;
    });
  }

  static resolvePreloadTasks() {
    return Promise.all(this.preloadedTemplateTasks || []);
  }

  static getPreloadedTemplate(templatePath) {
    return this.preloadedTemplatesByPath && this.preloadedTemplatesByPath[templatePath];
  }

  static getPreloadedTemplateOrFetch(injector, callback) {
    var html = this.getPreloadedTemplate(injector.templatePath);
    if (html) {
      callback(injector.injectShadowDom(html));
    } else {
      this.resolvePreloadTasks().then(injector.fetchTemplate).then(injector.injectShadowDom).then(callback);
    }
  }


  constructor(parent, expand) {
    this.parent = parent;
    this.expand = expand;
    this.fetchTemplate    = this.fetchTemplate.bind(this);
    this.injectStylesheet = this.injectStylesheet.bind(this);
    this.injectShadowDom  = this.injectShadowDom.bind(this);
  }

  setTemplate(templatePath) {
    this.templatePath = templatePath;
  }

  setStylesheet(stylesheetPath) {
    this.stylesheetPath = stylesheetPath;
  }

  run(fn) {
    ShadowDomInjector.getPreloadedTemplateOrFetch(this, fn);
  }

  // --- Private

  getUrl(path) {
    return ShadowDomInjector.BASE_PATH + path;
  }

  fetchFile(filePath) {
    return fetch(this.getUrl(filePath)).then(function(response) {
      return response.text();
    });
  }

  fetchTemplate() {
    return this.fetchFile(this.templatePath).then(this.injectStylesheet);
  }

  // Shadow DOM seems to have issues with transitions unexpectedly triggering
  // when using an external stylesheet, so manually injecting the stylesheet
  // in <style> tags to prevent this. This can be removed if this issue is
  // fixed.
  injectStylesheet(templateHtml) {
    if (!this.stylesheetPath) {
      // Pass through if no stylesheet.
      return Promise.resolve(templateHtml);
    }
    return this.fetchFile(this.stylesheetPath).then(function(styles) {
      var styleHtml = '<style>' + styles + '</style>';
      return styleHtml + templateHtml;
    });
  }

  injectShadowDom(templateHtml) {
    var container = document.createElement('div');
    container.style.position = 'absolute';
    if (this.expand) {
      container.style.top    = '0';
      container.style.left   = '0';
      container.style.width  = '100%';
      container.style.height = '100%';
    }
    container.className = UI_HOST_CLASS_NAME;

    // Note that changing this to attachShadow was causing some weird
    // issues with eventing (window copy event was not firing) in both
    // open and closed modes, so going back to createShadowRoot.
    var root = container.createShadowRoot();

    // Relative extension paths don't seem to be supported in HTML template
    // files, so manually swap out these tokens for the extension path.
    root.innerHTML = templateHtml.replace(ShadowDomInjector.EXTENSION_RELATIVE_PATH_REG, ShadowDomInjector.BASE_PATH);

    this.parent.insertBefore(container, this.parent.firstChild);

    return root;
  }

}

/*-------------------------] CursorManager [--------------------------*/

class CursorManager {

  constructor(basePath) {
    this.basePath = basePath;
    this.injectStylesheet();
  }

  // --- Drag Cursors

  setDragCursor(name, isImage) {
    this.dragCursor = this.getFullCursor(name, isImage);
    this.render();
  }

  clearDragCursor() {
    this.dragCursor = '';
    this.render();
  }

  // --- Hover Cursor

  setHoverCursor(name, isImage) {
    this.hoverCursor = this.getFullCursor(name, isImage);
    this.render();
  }

  clearHoverCursor() {
    this.hoverCursor = '';
    this.render();
  }

  // --- Priority Hover Cursor

  setPriorityHoverCursor(name, isImage) {
    this.priorityHoverCursor = this.getFullCursor(name, isImage);
    this.render();
  }

  clearPriorityHoverCursor() {
    this.priorityHoverCursor = '';
    this.render();
  }

  // --- Private

  getFullCursor(name, isImage) {
    if (isImage) {
      // Note that a fallback must be provided for image
      // cursors or the style will be considered invalid.
      return `url(${this.basePath}images/cursors/${name}.png) 13 13, pointer`;
    } else {
      return name;
    }
  }

  render() {
    this.style.cursor = this.getActiveCursor();
  }

  getActiveCursor() {
    if (this.dragCursor) {
      return this.dragCursor;
    } else if (this.hoverCursor && this.priorityHoverCursor) {
      return this.priorityHoverCursor;
    } else if (this.hoverCursor) {
      return this.hoverCursor;
    } else {
      return '';
    }
  }

  injectStylesheet() {
    var el = document.createElement('style');
    document.head.appendChild(el);
    el.sheet.insertRule('html, html * {}');
    this.style = el.sheet.rules[0].style;
  }

}

/*-------------------------] BrowserEventTarget [--------------------------*/

class BrowserEventTarget extends Element {

  constructor(el, tag, className) {
    super(el, tag, className);
    this.listeners = {};
  }

  bindEvent(eventName, fn) {
    // TODO: can remove bindEventListener?
    this.addEventListener(eventName, evt => {
      fn.call(this, evt);
    });
  }

  /*
  // TODO: I think it's clearer prefer just calling this in the method directly..
  bindEventWithPrevent(eventName, fn) {
    this.bindEvent(eventName, evt => {
      evt.preventDefault();
      fn.call(this, evt);
    });
  }

  preventDefault(eventName) {
    this.bindEventWithPrevent(eventName, () => {});
  }
  */

  stopEventPropagation(evt) {
    evt.stopPropagation();
  }


  addEventListener(eventName, handler) {
    this.listeners[eventName] = handler;
    this.el.addEventListener(eventName, handler);
  }

  removeEventListener(eventName) {
    this.el.removeEventListener(eventName, this.listeners[eventName]);
    delete this.listeners[eventName];
  }

  removeAllListeners() {
    for (var eventName in this.listeners) {
      if(!this.listeners.hasOwnProperty(eventName)) continue;
      this.removeEventListener(eventName);
    }
  }

  destroy() {
    this.removeAllListeners();
    super.destroy();
  }

}

/*-------------------------] MouseEventTarget [--------------------------*/

/* TODO: REMOVE
* TODO: this class seems unnecessary now... pageX vs clientX can provide
* the distinction between viewport/page relative coordinates
class MouseEventTarget extends BrowserEventTarget {

  constructor(el, tag, className) {
    super(el, tag, className);
  }

  setEventData(evt) {
    evt.absX = this.getMouseEventCoord(evt, 'X');
    evt.absY = this.getMouseEventCoord(evt, 'Y');
  }

  // --- Private

  getMouseEventCoord(evt, axis) {
    return evt['client' + axis] + window['scroll' + axis];
    // TODO: test this on both absolute and fixed position elements
    // ... the element positioning shouldn't matter??
    //if (this.isAbsolute()) {
      ///px += window['scroll' + axis];
    //}
    ///return px;
  }

}
  */

/*-------------------------] DragTarget [--------------------------*/

class DragTarget extends BrowserEventTarget {

  static get INTERACTIVE_ELEMENTS_SELECTOR() { return 'h1,h2,h3,h4,h5,h6,p,a,input,form,label,select,code,pre,span'; }
  static get CTRL_DOUBLE_CLICK_TIMEOUT()     { return 500; }

  constructor(el) {
    super(el);
    this.setupDragEvents();
    this.dragging = false;
    this.hovering = false;
  }

  // --- Setup

  setupCtrlKeyReset() {
    this.ctrlKeyReset = true;
  }

  setupMetaKeyReset() {
    this.metaKeyReset = true;
  }

  allowDoubleClick() {
    this.bindEvent('dblclick', this.onDoubleClick);
    this.bindEvent('contextmenu', this.onContextMenu);
  }

  disableEventsForInteractiveElements() {
    var els = this.el.querySelectorAll(DragTarget.INTERACTIVE_ELEMENTS_SELECTOR);
    els.forEach(el => {
      el.addEventListener('mousedown', this.stopEventPropagation);
      el.addEventListener('click', this.stopEventPropagation);
    });
  }

  setupDragIntents() {
    this.bindEvent('mouseover', this.onMouseOver);
    this.bindEvent('mouseout', this.onMouseOut);
  }

  setupDragEvents() {
    this.bindEvent('mousedown', this.onMouseDown);
    this.bindEvent('click',     this.onNativeClick);
    this.bindEvent('dragstart', this.onNativeDragStart);

    // These two events are actually on the document, so bind manually.
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp   = this.onMouseUp.bind(this);

    this.onScroll    = this.onScroll.bind(this);
  }

  onNativeDragStart(evt) {
    // Image elements that are children to a
    // drag target should not be draggable.
    evt.preventDefault();
  }

  onNativeClick(evt) {
    // Draggable links should not be followed when clicked.
    evt.preventDefault();
  }

  // --- Events

  onMouseOver(evt) {
    evt.stopPropagation();
    this.checkDragIntentStarted(evt);
    this.hovering = true;
  }

  onMouseOut(evt) {
    evt.stopPropagation();
    this.hovering = false;
    this.checkDragIntentStopped(evt);
  }

  onMouseDown(evt) {

    // Only allow left mouse button.
    if (evt.button !== 0) {
      return;
    }

    this.lastMouseEvent = evt;

    this.dragOrigin = {
      pageX:    evt.pageX,
      pageY:    evt.pageY,
      clientX:  evt.clientX,
      clientY:  evt.clientY
    };

    //this.resetTarget = null;

    document.documentElement.addEventListener('mousemove', this.onMouseMove);
    document.documentElement.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('scroll', this.onScroll);
  }

  onMouseMove(evt) {

    if (this.canResetDrag(evt)) {
      this.resetDrag(evt);
      return;
    }

    /*
    // TODO: better way to handle this?
    if (this.resetTarget) {
      // Setting the reset target flags this element for a
      // reset. In practice this means that a canceling key
      // (such as ctrl) has interrupted the flow and is telling
      // the drag to reset itself, so call a mouseup and mousedown
      // here. However, since we're leveraging the mousemove event
      // to do this, the actual event may be on a child element
      // so resetTarget so that it can be picked up and used later
      // if needed.
      evt.resetTarget = this.resetTarget;
      this.onMouseUp(evt);
      this.onMouseDown(evt);
    }
    */

    this.lastMouseEvent = evt;

    if (!this.dragging) {
      this.onDragStart(this.lastMouseEvent);
      this.dragging = true;
    }
    this.onDragMove(evt);
  }

  onMouseUp(evt) {
    if (!this.dragging) {
      this.onClick(evt);
    } else {
      this.dragging = false;
      this.onDragStop(evt);
    }
    this.dragOrigin = null;
    this.lastMouseEvent = null;
    document.documentElement.removeEventListener('mousemove', this.onMouseMove);
    document.documentElement.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('scroll', this.onScroll);
  }

  onScroll() {
    // Elements that are relative to the page (not fixed) should also be dragged
    // while scrolling, as this will affect their positioning, so need to force
    // a mousemove event here. Note that there is no way to set pageX/Y on
    // triggered events, so we can't use dispatchEvent.
    //
    // Also very random note here that my Logitech Performance MX mouse has a
    // bug where it fires alternating mousedown/mouseup events while using the
    // mousewheel to scroll, so don't expect this to work with it!
    this.onMouseMove({
      clientX:  this.lastMouseEvent.clientX,
      clientY:  this.lastMouseEvent.clientY,
      pageX:    this.lastMouseEvent.clientX + window.scrollX,
      pageY:    this.lastMouseEvent.clientY + window.scrollY,
      shiftKey: this.lastMouseEvent.shiftKey,
      metaKey:  this.lastMouseEvent.metaKey,
      ctrlKey:  this.lastMouseEvent.ctrlKey,
      altKey:   this.lastMouseEvent.altKey
    });
  }

  /*
  onKeyDown(evt) {
    this.resetDrag();
  }

  onKeyUp(evt) {
    this.resetDrag();
  }
  */

  // --- Data

  setEventDrag(evt) {
    if (!evt.drag) {

      // The page and client positions are for the most part
      // interchangeable here as we are dealing with position
      // deltas. However the one exception to this rule is when
      // the user initiates a scroll during a drag. The way to
      // handle this will depend on the situation, however, so
      // expose both properties and alias one to a simple x/y
      // property for ease of use.
      var pageX   = evt.pageX   - this.dragOrigin.pageX;
      var pageY   = evt.pageY   - this.dragOrigin.pageY;
      var clientX = evt.clientX - this.dragOrigin.clientX;
      var clientY = evt.clientY - this.dragOrigin.clientY;

      evt.drag = {
        x: pageX,
        y: pageY,
        pageX: pageX,
        pageY: pageY,
        clientX: clientX,
        clientY: clientY,
        constrained: evt.shiftKey,
        origin: this.dragOrigin
      };
    }
  }

  onContextMenu(evt) {
    if (evt.ctrlKey) {
      evt.preventDefault();
      this.handleCtrlDoubleClick(evt);
    }
  }

  // --- Overrides

  onClick() {}
  onDoubleClick() {}

  onDragIntentStart() {}
  onDragIntentStop()  {}

  onDragStart() {
    this.ctrlDoubleClickTimer = null;
    this.disableUserSelect();
  }

  onDragMove(evt)  {
    this.setEventDrag(evt);
  }

  onDragStop(evt)  {
    this.clearUserSelect();
    this.checkDragIntentStopped(evt);
  }

  // --- Private

  canResetDrag(evt) {
    return (this.ctrlKeyReset && evt.ctrlKey !== this.lastMouseEvent.ctrlKey) ||
           (this.metaKeyReset && evt.metaKey !== this.lastMouseEvent.metaKey);

  }

  resetDrag(evt) {
    if (this.dragging) {
      // Certain drag targets may require a change in keys to reset the
      // drag. We can accomplish this by firing mouseup, mousedown, and
      // mousemove events in succession to simulate the drag being stopped
      // and restarted again. The mousedown event needs to be a combination
      // of the position of the previous event and the keys of the new
      // event to ensure the offsets remain accurate.
      var last = this.lastMouseEvent;
      this.onMouseUp(evt);
      this.onMouseDown(this.getUpdatedMouseEvent('mousedown', evt, last));
      this.onMouseMove(evt);
    }
  }

  getUpdatedMouseEvent(type, keyEvt, posEvt) {
    return new MouseEvent(type, {
      altKey:   keyEvt.altKey,
      metaKey:  keyEvt.metaKey,
      ctrlKey:  keyEvt.ctrlKey,
      shiftKey: keyEvt.shiftKey,

      button:  posEvt.button,
      screenX: posEvt.screenX,
      screenY: posEvt.screenY,
      clientX: posEvt.clientX,
      clientY: posEvt.clientY
    });
  }

  disableUserSelect() {
    document.documentElement.style.userSelect = 'none';
  }

  clearUserSelect() {
    document.documentElement.style.userSelect = '';
  }

  checkDragIntentStarted(evt) {
    if (!this.dragging && !this.hovering) {
      this.onDragIntentStart(evt);
    }
  }

  checkDragIntentStopped(evt) {
    if (!this.dragging && !this.hovering) {
      this.onDragIntentStop(evt);
    }
  }

  handleCtrlDoubleClick(evt) {
    if (this.ctrlDoubleClickTimer) {
      this.onDoubleClick(evt);
    }
    this.ctrlDoubleClickTimer = setTimeout(() => {
      this.ctrlDoubleClickTimer = null;
    }, DragTarget.CTRL_DOUBLE_CLICK_TIMEOUT);
  }

  /*
  // TODO: can this be removed?
  dragReset(evt) {
    this.resetTarget = this.el;
  }
  */

}

/*-------------------------] DraggableElement [--------------------------*/

class DraggableElement extends DragTarget {

  //static get DRAGGABLE_CLASS()       { return 'draggable-element'; }
  //static get DRAGGING_ACTIVE_CLASS() { return 'draggable-element--active'; }

  constructor(el) {
    super(el);
    this.setupPosition();
  }

  setupPosition() {
    var matcher = new CSSRuleMatcher(this.el);
    this.cssH = CSSPositioningProperty.horizontalFromMatcher(matcher);
    this.cssV = CSSPositioningProperty.verticalFromMatcher(matcher);
  }

  // TODO: move "useClasses" flag to the constructor if we can remove
  // the whole tag, className song and dance

  /*
  useDraggableClasses() {
    this.useClasses = true;
    this.addClass(DraggableElement.DRAGGABLE_CLASS);
  }

  addClass(name) {
    if (this.useClasses) {
      super.addClass(name);
    }
  }

  removeClass(name) {
    if (this.useClasses) {
      super.removeClass(name);
    }
  }
  */

  onMouseDown(evt) {
    super.onMouseDown(evt);
    evt.stopPropagation();
  }

  onDragStart(evt) {
    super.onDragStart(evt);
    this.dragStartH = this.cssH;
    this.dragStartV = this.cssV;
    this.addClass(DraggableElement.DRAGGING_ACTIVE_CLASS);
  }

  onDragMove(evt) {
    super.onDragMove(evt);
    this.cssH = this.dragStartH.clone();
    this.cssV = this.dragStartV.clone();
    this.cssH.add(evt.drag.x);
    this.cssV.add(evt.drag.y);
    this.render();
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.removeClass(DraggableElement.DRAGGING_ACTIVE_CLASS);
  }

  render() {
    this.cssH.render(this.el.style);
    this.cssV.render(this.el.style);
  }

   // --- Compute

  /*
   getPosition() {
   }
   */

   // --- Update

  /*
   updatePosition() {
     this.el.style.left   = this.position.x + 'px';
     this.el.style.bottom = this.position.y + 'px';
   }
   */

}

/*-------------------------] DragEvent [--------------------------*/

/*
class DragEvent extends Event {

  constructor(target, browserEvent) {
    super();

    this.target = target;
    this.browserEvent = browserEvent;

    this.absX    = target.absX;
    this.absY    = target.absY;
    this.originX = target.originX;
    this.originY = target.originY;

    this.offsetX = this.absX - this.originX;
    this.offsetY = this.absY - this.originY;
  }

  isConstrained() {
    return this.browserEvent.shiftKey;
  }

}
*/

/*-------------------------] Handle [--------------------------*/

/*
class Handle extends DragTarget {

  constructor(el) {
    super(el);
    //this.name = name;
    //this.target = target;
  }

  onMouseDown(evt) {
    super.onMouseDown(evt);
    this.listener.onHandleFocus(evt);
  }

  onMouseUp(evt) {
    super.onMouseUp(evt);
    this.listener.onHandleBlur(evt);
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.stopIntent(evt);
  }

}

  */
/*-------------------------] PositionHandle [--------------------------*/

class PositionHandle extends DragTarget {

  // TODO: arg order?
  constructor(root, listener) {
    super(root.getElementById('position-handle'));
    this.allowDoubleClick();
    this.setupDragIntents();
    this.setupMetaKeyReset();
    this.setupCtrlKeyReset();

    this.listener = listener;
    /*
    //this.setup(target, name);
    this.addClass('sizing-handle');
    this.handle = new Element(listener.el, 'div', 'handle-border handle-' + name + '-border');
    this.xDir  = !xProp ? 0 : xProp === 'left' ? -1 : 1;
    this.yDir  = !yProp ? 0 : yProp === 'top'  ? -1 : 1;
    */
  }

  // --- Setup

  /*
  destroy() {
    this.handle.remove();
    this.remove();
  }
  */

  // --- Events

  onDragIntentStart(evt) {
    this.listener.onPositionHandleDragIntentStart(evt, this);
  }

  onDragIntentStop(evt) {
    this.listener.onPositionHandleDragIntentStop(evt, this);
  }

  onDragStart(evt) {
    super.onDragStart(evt);
    this.listener.onPositionHandleDragStart(evt, this);
  }

  onDragMove(evt) {
    super.onDragMove(evt);
    this.listener.onPositionHandleDragMove(evt, this);
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.listener.onPositionHandleDragStop(evt, this);
  }

  onDoubleClick(evt) {
    this.listener.onPositionHandleDoubleClick(evt, this);
  }

}

/*-------------------------] ResizeHandle [--------------------------*/

class ResizeHandle extends DragTarget {

  static get DIRECTIONS() { return ['se','s','sw','w','nw','n','ne','e'];             }
  static get CURSORS()    { return ['nwse','ns','nesw','ew','nwse','ns','nesw','ew']; }

  // TODO: arg order?
  constructor(root, dir, listener) {
    super(root.getElementById('resize-handle-' + dir));
    this.allowDoubleClick();
    this.setupDragIntents();
    this.setupMetaKeyReset();
    this.setupCtrlKeyReset();

    this.dir = dir;
    this.listener = listener;

    /*
    //this.setup(target, name);
    this.addClass('sizing-handle');
    this.handle = new Element(listener.el, 'div', 'handle-border handle-' + name + '-border');
    this.xDir  = !xProp ? 0 : xProp === 'left' ? -1 : 1;
    this.yDir  = !yProp ? 0 : yProp === 'top'  ? -1 : 1;
    */
  }

  // --- Setup

  /*
  destroy() {
    this.handle.remove();
    this.remove();
  }
  */

  getCursorForRotation(rotation) {
    var index   = ResizeHandle.DIRECTIONS.indexOf(this.dir);
    var cursor  = ResizeHandle.CURSORS[(((rotation + 22.5) / 45 | 0) + index) % 8];
    return cursor + '-resize';
  }

  // --- Events

  onDragIntentStart(evt) {
    this.listener.onResizeHandleDragIntentStart(evt, this);
  }

  onDragIntentStop(evt) {
    this.listener.onResizeHandleDragIntentStop(evt, this);
  }

  onDragStart(evt) {
    super.onDragStart(evt);
    this.listener.onResizeHandleDragStart(evt, this);
  }

  onDragMove(evt) {
    super.onDragMove(evt);
    this.listener.onResizeHandleDragMove(evt, this);
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.listener.onResizeHandleDragStop(evt, this);
  }

  onDoubleClick(evt) {
    this.listener.onResizeHandleDoubleClick(evt, this);
  }

  // --- Private

  // --- Actions

  /*
  applyConstraint(box, ratio) {
    var w, h, xMult, yMult, min;
    w = box.width;
    h = box.height;
    xMult = 1 * (ratio || 1);
    yMult = 1;
    min = Math.min(w, h);
    if (this.name === 'nw' || this.name === 'sw') {
      xMult = -1;
    }
    if (this.name === 'nw' || this.name === 'ne') {
      yMult = -1;
    }
    box[this.xProp] = box[this.anchor.xProp] + (min * xMult);
    box[this.yProp] = box[this.anchor.yProp] + (min * yMult);
  }
  */


  // --- Calculations

  /*
  getCoords(box) {
    return new Point(this.getX(box), this.getY(box));
  }

  getCoords(box, rotation) {
    // TODO: next fix specificity issues!!!!!!!!!!!!!!!!!!!!!
    var coords = new Point(this.getX(box), this.getY(box));
    if (rotation) {
      var center = box.getCenterCoords();
      coords = coords.subtract(center).rotate(rotation).add(center);
    }
    return coords;
  }
  */

  /*
  getPosition(box, rotation) {
    var coords = new Point(this.getX(box), this.getY(box));
    if (rotation) {
      var center = box.getCenterCoords();
      coords = coords.subtract(center).rotate(rotation).add(center);
    }
    return coords.add(box.getPosition());
  }
  */

  /*
   * TODO: remove?
  getCoords() {
    var coords, center, d;

    coords = new Point(this.getX(), this.getY());
    d = this.target.box;

    if (d.rotation) {
      center = new Point(d.width / 2, d.height / 2);
      coords = center.add(coords.subtract(center).rotate(d.rotation));
    }

    return coords;
  }

  getPosition() {
    return this.target.box.getPosition().add(this.getCoords());
  }

  getX(box) {
    switch (this.xProp) {
      case 'left':  return 0;
      case 'right': return box.width;
    }
  }

  getY(box) {
    switch (this.yProp) {
      case 'top':    return 0;
      case 'bottom': return box.height;
    }
  }

  offsetToCenter(x, y) {
    if (this.xProp === 'right')  x *= -1;
    if (this.yProp === 'bottom') y *= -1;
    return new Point(x, y);
  }
  */

}

/*-------------------------] RotationHandle [--------------------------*/

class RotationHandle extends DragTarget {

  static get OFFSET_ANGLE()     { return -45; }
  static get TURN_THRESHOLD()   { return 180; }
  static get GRADS_PER_CURSOR() { return 16;  }

  constructor(root, listener) {
    super(root.getElementById('rotation-handle'));
    this.setupDragIntents();
    this.setupMetaKeyReset();

    this.listener = listener;
  }

  setOrigin(origin) {
    this.origin = origin;
  }

  getCursorForRotation(rotation) {
    var grad = Point.degToGrad(rotation, true);
    var per  = RotationHandle.GRADS_PER_CURSOR;
    // Step the cursor into one of 25 cursors and ensure that 400 is 0.
    grad = Math.round(grad / per) * per % 400;
    return 'rotate-' + grad;
  }

  // --- Private

  onDragIntentStart(evt) {
    this.listener.onRotationHandleDragIntentStart(evt, this);
  }

  onDragIntentStop(evt) {
    this.listener.onRotationHandleDragIntentStop(evt, this);
  }

  onDragStart(evt) {
    super.onDragStart(evt);

    this.startRotation = this.getRotationForEvent(evt);
    this.lastRotation  = this.startRotation;
    this.turns = 0;

    this.listener.onRotationHandleDragStart(evt, this);
  }

  onDragMove(evt) {
    super.onDragMove(evt);
    this.applyRotation(evt);
    this.listener.onRotationHandleDragMove(evt, this);
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.listener.onRotationHandleDragStop(evt, this);
  }

  applyRotation(evt) {
    var r = this.getRotationForEvent(evt);
    this.updateTurns(r);
    this.setEventData(evt, r);
    this.lastRotation = r;
  }

  getRotationForEvent(evt) {
    // Note this method will always return 0 <= x < 360
    var p = new Point(evt.clientX, evt.clientY);
    var offset = RotationHandle.OFFSET_ANGLE;
    return p.subtract(this.origin).rotate(offset).getAngle(true);
  }

  updateTurns(r) {
    var diff = r - this.lastRotation;
    if (Math.abs(diff) > RotationHandle.TURN_THRESHOLD) {
      this.turns += diff < 0 ? 1 : -1;
    }
  }

  setEventData(evt, r) {
    evt.rotation = {
      abs: r,
      offset: (this.turns * 360 + r) - this.startRotation
    };
  }

  /*
  addRotationEventData(evt) {
    evt.rotation = this.getRotationData(evt);
    return evt;
  }

  getRotationData(evt) {
    var r = new Point(evt.absX, evt.absY).subtract(origin).getAngle();
    return {
      abs: r,
      offset: r - this.startRotation
    }
  }
  */

  /*
  getAngleForMouseEvent(evt, origin) {
    return new Point(evt.absX, evt.absY).subtract(origin).getAngle();
  }
  */

}

/*-------------------------] PositionableElement [--------------------------*/

class PositionableElement extends BrowserEventTarget {

  // --- Constants

  static get UI_FOCUSED_CLASS()   { return 'ui--focused'; }
  static get PEEKING_DIMENSIONS() { return 500;           }
  static get ROTATION_SNAPPING()  { return 22.5;          }
  static get TOP_Z_INDEX()        { return 9999995;       }

  constructor(el, listener) {
    super(el);
    this.listener = listener;

    this.states = [];
    this.setup();
    this.isFixed = this.isFixedPosition();
    //this.addClass('positioned-element');

  }

  // --- Setup

  setup() {
    this.setupEvents();
    this.setupInitialState();
    this.injectInterface();
  }

  injectInterface() {
    var injector = new ShadowDomInjector(this.el, true);
    injector.setTemplate('element.html');
    injector.setStylesheet('element.css');
    // TODO: can listeners be applied instead of binding everything? If not,
    // then at least clean up binding ahead of time vs binding inline
    injector.run(this.onInterfaceInjected.bind(this));
  }

  onInterfaceInjected(root) {
    this.ui = new Element(root.getElementById('ui'));
    this.setupHandles(root);
  }

  setupEvents() {
    this.bindEvent('click', this.onClick);
    this.bindEvent('mousedown', this.onMouseDown);
  }

  setupInitialState() {
    var el = this.el, matcher = new CSSRuleMatcher(el);

    // TODO: make sure this property is exported as well!
    if (matcher.getValue('position') === 'static') {
      el.style.position = 'absolute';
    }

    this.cssBox = CSSBox.fromMatcher(matcher);
    this.cssZIndex = CSSZIndex.fromMatcher(matcher);
    this.cssTransform = CSSTransform.fromMatcher(matcher);
    this.cssBackgroundImage = CSSBackgroundImage.fromMatcher(matcher);
  }

  /*
  setupPositionedParents() {
    var el = this.el, style;
    this.positionedParents = [];
    while(el = el.offsetParent) {
      style = window.getComputedStyle(el);
      if (style.position !== 'static') {
        this.positionedParents.push(new Element(el));
      }
    }
  }
  */

  setupHandles(root) {
    /* TODO: do we need an object to hold handles? */
    // TODO: consolidate order of listener in arguments?
    // TODO: rename sizingHandles??
    this.handles = {
      n:  new ResizeHandle(root, 'n',  this),
      e:  new ResizeHandle(root, 'e',  this),
      s:  new ResizeHandle(root, 's',  this),
      w:  new ResizeHandle(root, 'w',  this),
      ne: new ResizeHandle(root, 'ne', this),
      se: new ResizeHandle(root, 'se', this),
      sw: new ResizeHandle(root, 'sw', this),
      nw: new ResizeHandle(root, 'nw', this)
    };

    this.positionHandle = new PositionHandle(root, this);
    this.rotationHandle = new RotationHandle(root, this);
  }

  getRotation() {
    return this.cssTransform.getRotation();
  }

  setRotation(r) {
    this.transform.setRotation(r);
  }

  /*
  getRotationOrigin() {
    return this.cssBox.getCenter();
    var p = this.box.getCenterPosition();
    if (this.isFixedPosition) {
      p.x -= window.scrollX;
      p.y -= window.scrollY;
    }
    return p;
  }

  getPosition() {
    // TODO: this won't work on inverted position!
    return new Point(this.cssH.px, this.cssV.px);
  }

  getCenter() {
    var rect = this.el.getBoundingClientRect();
  }
    */


  // --- Mouse Events

  onMouseDown(evt) {
    evt.stopPropagation();
    this.listener.onElementMouseDown(evt, this);
  }

  onClick(evt) {
    evt.stopPropagation();
    this.listener.onElementClick(evt, this);
  }

  // --- Position Handle Drag Events

  onPositionHandleDragIntentStart(evt, handle) {
    this.listener.onPositionDragIntentStart(evt, handle, this);
  }

  onPositionHandleDragIntentStop(evt, handle) {
    this.listener.onPositionDragIntentStop(evt, handle, this);
  }

  onPositionHandleDragStart(evt, handle) {
    this.listener.onPositionDragStart(evt, handle, this);
  }

  onPositionHandleDragMove(evt, handle) {
    this.listener.onPositionDragMove(evt, handle, this);
  }

  onPositionHandleDragStop(evt, handle) {
    this.listener.onPositionDragStop(evt, handle, this);
  }

  onPositionHandleDoubleClick(evt) {
    this.snapToSprite(evt);
  }

  // --- Resize Handle Drag Events

  onResizeHandleDragIntentStart(evt, handle) {
    this.listener.onResizeDragIntentStart(evt, handle, this);
  }

  onResizeHandleDragIntentStop(evt, handle) {
    this.listener.onResizeDragIntentStop(evt, handle, this);
  }

  onResizeHandleDragStart(evt, handle) {
    this.listener.onResizeDragStart(evt, handle, this);
  }

  onResizeHandleDragMove(evt, handle) {
    this.listener.onResizeDragMove(evt, handle, this);
  }

  onResizeHandleDragStop(evt, handle) {
    this.listener.onResizeDragStop(evt, handle, this);
  }

  onResizeHandleDoubleClick(evt) {
    this.snapToSprite(evt);
  }

  // --- Rotation Handle Drag Events

  onRotationHandleDragIntentStart(evt, handle) {
    handle.setOrigin(this.getViewportCenter());
    this.listener.onRotationDragIntentStart(evt, handle, this);
  }

  onRotationHandleDragIntentStop(evt, handle) {
    this.listener.onRotationDragIntentStop(evt, handle, this);
  }

  onRotationHandleDragStart(evt, handle) {
    this.listener.onRotationDragStart(evt, handle, this);
  }

  onRotationHandleDragMove(evt, handle) {
    this.listener.onRotationDragMove(evt, handle, this);
  }

  onRotationHandleDragStop(evt, handle) {
    this.listener.onRotationDragStop(evt, handle, this);
  }

  /*
  createHandles() {
    this.handles = {
      n:         new ResizeHandle(this, 'n',   null,   'top'),
      ne:        new ResizeHandle(this, 'ne', 'right', 'top'),
      e:         new ResizeHandle(this, 'e',  'right',  null),
      se:        new ResizeHandle(this, 'se', 'right', 'bottom'),
      s:         new ResizeHandle(this, 's',   null,   'bottom'),
      sw:        new ResizeHandle(this, 'sw', 'left',  'bottom'),
      w:         new ResizeHandle(this, 'w',  'left',   null),
      nw:        new ResizeHandle(this, 'nw', 'left',  'top'),
      rotation:  new RotationHandle(this)
    };
  }
  */

  snapToSprite(evt) {
    var rect, center, origin, pos, coords, bounds, dim, cDim, iPos;

    if (!this.cssBackgroundImage.hasImage()) {
      return;
    }

    // Here we need to find the position of the click event in the element's
    // coordinate system, taking into account any rotation. The cssBox
    // representing this element may be positioned top/left or bottom/right,
    // however, so using getBoundingClientRect here and taking advantage of
    // the fact that the center will always be the same regardless of rotation
    // so that we can reconstruct the page/viewport origin (top/left) and
    // use this to get the coordinates.

    // Start by getting the element's center point.
    rect = this.el.getBoundingClientRect();
    center = new Point(rect.left + (rect.width / 2), rect.top + (rect.height / 2));

    // The non-rotated origin can be found by subtracting the
    // box dimensions from the element's center.
    dim  = this.cssBox.getDimensions();
    cDim = this.isPeeking ? this.getPeekDimensions() : dim;
    origin = center.add(cDim.multiply(-.5));

    // We can now get the event coordinates by getting the offset
    // to the center and removing any rotation.
    pos    = new Point(evt.clientX, evt.clientY);
    coords = center.add(pos.subtract(center).rotate(-this.getRotation())).subtract(origin);

    // Finally get any sprite bounds that may exist for these coordinates.
    bounds = this.cssBackgroundImage.getSpriteBounds(coords);

    if (bounds) {

      this.lockPeekMode();

      // Locking the peek mode may update the dimensions
      // to the peek size so we need to fetch them again.
      dim = this.cssBox.getDimensions();
      iPos = this.cssBackgroundImage.getPosition();

      var nwOffset = new Point(iPos.x + bounds.left, iPos.y + bounds.top);
      var seOffset = new Point(iPos.x + bounds.right - dim.x, iPos.y + bounds.bottom - dim.y);

      // Resizing the element uses calculations based on the last state
      // on the assumption that only one resize direction will be updated
      // between states. Rather than complicating that logic, it's simpler
      // here to simply push another state after resizing once, then pop it
      // off the end once we're done.

      this.pushState();
      this.resize(nwOffset.x, nwOffset.y, 'nw', false);

      this.pushState();
      this.resize(seOffset.x, seOffset.y, 'se', false);

      // Note that we need to set the background position after resizing
      // here for percentage based background positions, as they use the
      // container size as a reference.
      this.cssBackgroundImage.setPosition(-bounds.left, -bounds.top);

      this.states.pop();

      this.renderBackgroundPosition();
      this.listener.onBackgroundImageSnap();
    }
  }

  // --- Focusing

  focus() {
    this.ui.addClass(PositionableElement.UI_FOCUSED_CLASS);
    this.setTemporaryZIndex(PositionableElement.TOP_Z_INDEX);
  }

  unfocus() {
    this.ui.removeClass(PositionableElement.UI_FOCUSED_CLASS);
    this.setTemporaryZIndex('');
    this.renderZIndex();
  }

  setTemporaryZIndex(zIndex) {
    var el = this.el;
    do {
      el.style.zIndex = zIndex;
    } while (el = el.offsetParent);
  }

  // --- Move Z-Index

  addZIndex(val) {
    this.cssZIndex = this.getLastState().cssZIndex.clone();
    this.cssZIndex.add(val);
    this.renderZIndex();
  }

  // --- Resizing

  getHandle(handleName) {
    return this.handles[handleName];
  }

  getHandleAnchor(handleName) {
    switch (handleName) {
      case 'nw': return this.getHandle('se');
      case 'ne': return this.getHandle('sw');
      case 'se': return this.getHandle('nw');
      case 'sw': return this.getHandle('ne');
      case 'n':  return this.getHandle('s');
      case 's':  return this.getHandle('n');
      case 'e':  return this.getHandle('w');
      case 'w':  return this.getHandle('e');
    }
  }

  resize(x, y, dir, constrain) {
    var rotation, lastState, lastBox, nextBox;

    rotation  = this.getRotation();
    lastState = this.getLastState();
    lastBox   = lastState.cssBox;
    nextBox   = lastBox.clone();

    nextBox.moveEdges(x, y, dir);

    if (constrain) {
      nextBox.constrain(lastBox.getRatio(), dir);
    }

    // Render the box first so that percentage values can update
    // below to ensure correct anchor calculations.
    this.cssBox = nextBox;
    this.renderBox();

    this.cssTransform = this.cssTransform.clone();
    this.cssBackgroundImage = this.cssBackgroundImage.clone();

    // When the box is resized, both the background image and
    // transform (origin and percentage translations) may change,
    // so update their values here.
    this.cssTransform.update();
    this.cssBackgroundImage.update();

    if (rotation || this.cssTransform.hasPercentTranslation()) {
      // If a box is rotated or its transform has a translate using percent
      // values, then the anchor positions will shift as the box is resized,
      // so update the translation here to keep them aligned.
      this.alignBoxAnchors(dir, lastState, this, rotation);
    }

  }

  alignBoxAnchors(dir, lastState, nextState, rotation) {
    var anchorOffset = this.getAnchorOffset(dir, lastState, nextState, rotation);
    this.cssTransform.addTranslation(anchorOffset);
    this.renderTransform();
  }

  getAnchorOffset(dir, lastState, nextState, rotation) {
    var lastAnchorPos = this.getAnchorPosition(dir, lastState, rotation);
    var nextAnchorPos = this.getAnchorPosition(dir, nextState, rotation);
    return lastAnchorPos.subtract(nextAnchorPos);
  }

  getAnchorPosition(dir, state, rotation) {
    var origin, translation, dimensions, boxXYOffset, boxDirection, anchorCoords;

    origin       = state.cssTransform.getOrigin();
    translation  = state.cssTransform.getTranslation();
    dimensions   = state.cssBox.getDimensions();
    boxXYOffset  = state.cssBox.getXYOffset();
    boxDirection = state.cssBox.getDirectionVector();

    // The coordinates of the anchor are the result of getting
    // the non-rotated anchor position, rotating it around the
    // transform origin, and adding the origin back to arrive
    // at the final position.
    anchorCoords = this.getAnchorNormal(dir)
      .multiply(dimensions)
      .subtract(origin)
      .rotate(rotation)
      .add(origin);

    // The returned value is the box's offset in x/y space plus
    // the anchor coords and translation. If the box is inverted,
    // it needs to take this into account by adding the amount
    // that its dimensions expand into x/y space and flipping its
    // direction vectors. Note that the return value is not an
    // actual position, but can be used to calculate offsets to
    // determine how much an anchor has moved.
    return state.cssBox.getOffsetPosition()
      .add(boxXYOffset)
      .multiply(boxDirection)
      .add(anchorCoords)
      .add(translation);
  }

  getAnchorNormal(dir) {
    // The anchor normal represents the normalized offset of an
    // anchor point opposite the given handle direction. These
    // These are given in a normal x/y coordinate system.
    switch (dir) {
      case 'n':  return new Point(.5, 1);
      case 's':  return new Point(.5, 0);
      case 'w':  return new Point( 1,.5);
      case 'e':  return new Point( 0,.5);
      case 'sw': return new Point( 1, 0);
      case 'nw': return new Point( 1, 1);
      case 'ne': return new Point( 0, 1);
      case 'se': return new Point( 0, 0);
    }
  }

  /*
  constrainRatio(lastBox, handle) {
    var box      = this.box;
    var anchor   = this.getHandleAnchor(handle.name);
    var oldRatio = lastBox.getRatio();
    var newRatio = this.box.getRatio();

    if (newRatio < oldRatio) {
      box[handle.vSide] = box[anchor.vSide] + box.width / oldRatio * handle.yDir;
    } else if (newRatio > oldRatio) {
      box[handle.hSide] = box[anchor.hSide] + box.height * oldRatio * handle.xDir;
    }
  }

  toggleHandles(on) {
    if (on) {
      this.removeClass('handles-hidden');
    } else {
      this.addClass('handles-hidden');
    }
  }
  */

  // --- Rotation

  rotate(offset, constrained) {
    if (constrained) {
      offset = Math.round(offset / PositionableElement.ROTATION_SNAPPING) * PositionableElement.ROTATION_SNAPPING;
    }
    this.cssTransform = this.getLastState().cssTransform.clone();
    this.cssTransform.addRotation(offset);
    this.renderTransform();
  }

  // --- Position

  move(x, y, constrain) {
    var p = this.getConstrainedMovePosition(x, y, constrain);
    this.cssBox = this.getLastState().cssBox.clone();
    this.cssBox.addOffsetPosition(p.x, p.y);
    this.renderBox();
  }

  moveBackground(x, y, constrain) {
    var p;
    if (!this.cssBackgroundImage.hasImage()) {
      return;
    }
    p = this.getConstrainedMovePosition(x, y, constrain, true);
    this.cssBackgroundImage = this.getLastState().cssBackgroundImage.clone();
    this.cssBackgroundImage.move(p.x, p.y);
    this.renderBackgroundPosition();
  }

  getConstrainedMovePosition(x, y, constrain, removeRotation) {
    var absX, absY, p;

    if (constrain) {
      absX = Math.abs(x);
      absY = Math.abs(y);
      if (absX < absY) {
        x = 0;
      } else {
        y = 0;
      }
    }

    p = new Point(x, y);

    if (removeRotation) {
      p = p.rotate(-this.getRotation());
    }

    return p;
  }

  // TODO: rename? ... this will be called for nudging as well...
  getDraggedPosition(x, y, constrain, lastPosition) {
    var pos, absX, absY;

    pos = lastPosition.add(new Point(x, y));

    if (constrain) {
      absX = Math.abs(x);
      absY = Math.abs(y);
      if (absX < absY) {
        pos.x = lastPosition.x;
      } else {
        pos.y = lastPosition.y;
      }
    }

    return pos;
  }


  // --- History & State

  pushState() {
    this.states.push({
      cssBox: this.cssBox,
      cssZIndex: this.cssZIndex,
      cssTransform: this.cssTransform,
      cssBackgroundImage: this.cssBackgroundImage
    });
  }

  getLastState() {
    return this.states[this.states.length - 1];
  }

  undo() {
    var state = this.states.pop();
    if (!state) {
      return;
    }
    this.cssBox = state.cssBox;
    this.cssZIndex = state.cssZIndex;
    this.cssTransform = state.cssTransform;
    this.cssBackgroundImage = state.cssBackgroundImage;
    this.render();
  }



  // --- Peeking

  setPeekMode(on) {
    if (this.cssBackgroundImage.hasImage()) {
      this.isPeeking = on;
      this.renderBox();
    }
  }

  getPeekDimensions() {
    return new Point(
      PositionableElement.PEEKING_DIMENSIONS,
      PositionableElement.PEEKING_DIMENSIONS
    );
  }

  lockPeekMode() {
    if (this.isPeeking) {
      if (this.states.length === 0) {
        this.pushState();
      }
      var p = this.getPeekDimensions();
      this.cssBox = this.cssBox.clone();
      this.cssBox.setDimensions(p.x, p.y);
      this.setPeekMode(false);
    }
  }

  // --- Scrolling

  checkScrollBounds() {
    var dim = this.getAbsoluteDimensions(), boundary;
    if (dim.top < window.scrollY) {
      window.scrollTo(window.scrollX, dim.top);
    }
    if (dim.left < window.scrollX) {
      window.scrollTo(dim.left, window.scrollY);
    }
    boundary = window.scrollX + window.innerWidth;
    if (dim.right > boundary) {
      window.scrollTo(window.scrollX + (dim.right - boundary), window.scrollY);
    }
    boundary = window.scrollY + window.innerHeight;
    if (dim.bottom > boundary) {
      window.scrollTo(window.scrollX, window.scrollY + (dim.bottom - boundary));
    }
  }




  // --- Transform

  /*
  setBackgroundPosition(p) {
    this.backgroundImage.setPosition(p);
    this.updateBackgroundPosition();
  }
  */

  // TODO: remove?
  /*
  setPosition(point) {
    // TODO: Remove all direct this. properties
    this.position = point;
    this.box.setPosition(point);
    this.updatePosition();
  }
  */

  /*
  incrementBackgroundPosition(vector) {
    if (this.backgroundImage.hasImage()) {
      return;
    }
    var rotation = this.transform.getRotation();
    if (rotation) {
      vector = vector.rotate(-rotation);
    }
    this.setBackgroundPosition(this.backgroundImage.getPosition(vector).add(vector));
  }

  incrementPosition(vector) {
    this.box.addPosition(vector);
    this.updatePosition();
    //this.setPosition(this.position.add(vector));
    this.checkScrollBounds();
  }

  incrementRotation(vector) {
    this.transform.addRotation(vector.y);
    this.renderTransform();
  }

  incrementZIndex(vector) {
    // Positive Y is actually down, so decrement here.
    this.zIndex.add(vector.y);
    this.renderZIndex();
  }
  */

  // --- Rendering

  render() {
    // TODO: update separately instead of render??
    this.renderBox();
    //this.updatePosition();
    //this.renderSize();
    this.renderTransform();
    this.renderBackgroundPosition();
    //this.updateBackgroundPosition();
    this.renderZIndex();
  }

  renderBox() {
    this.cssBox.render(this.el.style);
    if (this.isPeeking) {
      var p = this.getPeekDimensions();
      this.el.style.width  = p.x + 'px';
      this.el.style.height = p.y + 'px';
    }
  }

  renderBackgroundPosition() {
    this.cssBackgroundImage.renderPosition(this.el.style);
  }

  /*
  updatePosition() {
    this.el.style.left = this.box.cssLeft;
    this.el.style.top  = this.box.cssTop;
  }

  updateSize(size) {
    this.el.style.width  = this.box.cssWidth;
    this.el.style.height = this.box.cssHeight;
  }
  */

  // TODO: standing in for any transform now... fix this!
  renderTransform() {
    /*
    var r = this.box.rotation, transforms = [];
    if (this.box.cssTranslationLeft || this.box.cssTranslationTop) {
      var tx = this.box.cssTranslationLeft || 0;
      var ty = this.box.cssTranslationTop || 0;
      transforms.push('translate('+ tx + ', '+ ty + ')');
    }
    transforms.push('rotateZ('+ r +'deg)');
    this.el.style.webkitTransform = transforms.join(' ');
    */
    this.el.style.transform = this.cssTransform;
  }

  /*
  updateBackgroundPosition() {
    if (this.backgroundImage.hasImage()) {
      this.el.style.backgroundPosition = this.backgroundImage.getPositionString();
    }
  }
  */

  renderZIndex() {
    this.el.style.zIndex = this.cssZIndex;
  }



  // --- Calculations

  /*
  getElementCoordsForPoint(point) {
    // Gets the coordinates relative to the element's
    // x/y internal coordinate system, which may be rotated.
    var dim = this.getAbsoluteDimensions();
    var corner = new Point(dim.left, dim.top);
    var rotation = this.transform.getRotation();

    if (rotation) {
      corner = this.box.getPositionForCoords(corner).add(this.getPositionOffset());
      return point.subtract(corner).rotate(-rotation);
    } else {
      return point.subtract(corner);
    }
  }

  getPositionOffset() {
    // The offset between the element's position and it's actual
    // rectangle's left/top coordinates, which can sometimes differ.
    return this.box.getPosition().subtract(
        new Point(this.box.left.px, this.box.top.px));
  }

  getPositionFromRotatedHandle(anchor) {
    var offsetX  = this.box.width / 2;
    var offsetY  = this.box.height / 2;
    var toCenter = anchor.offsetToCenter(offsetX, offsetY).rotate(this.transform.getRotation());
    var toCorner = new Point(-offsetX, -offsetY);
    return anchor.startPosition.add(toCenter).add(toCorner);
  }

  getHandleForSide(side) {
    var offset;
    switch(side) {
      case 'top':    offset = 0; break;
      case 'right':  offset = 1; break;
      case 'bottom': offset = 2; break;
      case 'left':   offset = 3; break;
    }
    // TODO: could this be nicer?
    return [this.handles.nw, this.handles.ne, this.handles.se, this.handles.sw][(this.transform.getRotation() / 90 | 0) + offset];
  }
  /*/

  /*
  getCenter() {
    return this.box.getCenter();
  }

  getAbsoluteCenter() {
    return this.getAbsoluteDimensions().getCenter();
  }
  */

  /*
  getViewportCenter() {
    var rect = this.el.getBoundingClientRect();
    var x = (rect.left + rect.right) / 2;
    var y = (rect.top + rect.bottom) / 2;
    return new Point(x, y);
  }

  getAbsoluteDimensions() {
    var rect = this.el.getBoundingClientRect();
    return new Rectangle(
      rect.top + this.el.offsetTop,
      rect.right + this.el.offsetLeft,
      rect.bottom + this.el.offsetTop,
      rect.left + this.el.offsetLeft
    );
  }
  */

  getEdgeValue(side) {
    var handle = this.getHandleForSide(side);
    return handle.getPosition()[this.getAxisForSide(side)];
 }

  /*
  resetDrag(evt) {
    this.handles.n.resetDrag(evt);
    this.handles.e.resetDrag(evt);
    this.handles.s.resetDrag(evt);
    this.handles.w.resetDrag(evt);
    this.handles.ne.resetDrag(evt);
    this.handles.se.resetDrag(evt);
    this.handles.sw.resetDrag(evt);
    this.handles.nw.resetDrag(evt);
    this.positionHandle.resetDrag(evt);
  }
  */

  /*
  getCenterAlignValue(type) {
    var center = this.getCenter();
    return type === 'vertical' ? center.x : center.y;
  }

  alignToSide(side, val) {
    // TODO ... can this be cleaned up? Do we really need "startPosition"?
    var axis   = this.getAxisForSide(side);
    var handle = this.getHandleForSide(side);
    var handlePosition = handle.getPosition();
    handlePosition[axis] = val;
    handle.startPosition = handlePosition;
    this.setPosition(this.getPositionFromRotatedHandle(handle));
    this.render();
  }

  alignToCenter(line, val) {
    var axis = line === 'vertical' ? 'x' : 'y';
    var center = this.getCenter().clone();
    var offsetX  = this.box.getWidth() / 2;
    var offsetY  = this.box.getHeight() / 2;
    var toCorner = new Point(-offsetX, -offsetY);
    center[axis] = val;
    this.setPosition(center.add(toCorner));
  }

  getAxisForSide(side) {
    return side === 'top' || side === 'bottom' ? 'y' : 'x';
  }

  */

  isPositioned() {
    return this.style.position !== 'static';
  }

  // --- Teardown

  destroy() {
    this.positionHandle.destroy();
    this.rotationHandle.destroy();
    this.handles.nw.destroy();
    this.handles.ne.destroy();
    this.handles.se.destroy();
    this.handles.sw.destroy();
    this.handles.n.destroy();
    this.handles.e.destroy();
    this.handles.s.destroy();
    this.handles.w.destroy();
    this.removeAllListeners();
  }

  getCSSDeclarations() {
    return this.getCSSDeclarationsForAttributes(
      this.cssBox,
      this.cssZIndex,
      this.cssBackgroundImage,
      this.cssTransform
    );
  }

  getChangedCSSDeclarations() {
    var firstState, firstDeclarations, currentDeclarations;

    // If there are no states, then nothing has chagned
    // so return an empty array.
    if (this.states.length === 0) {
      return [];
    }

    firstState = this.states[0];

    firstDeclarations = this.getCSSDeclarationsForAttributes(
      firstState.cssBox,
      firstState.cssZIndex,
      firstState.cssBackgroundImage,
      firstState.cssTransform
    );

    currentDeclarations = this.getCSSDeclarations();

    return currentDeclarations.filter((d, i) => {
      return d !== firstDeclarations[i];
    });
  }

  // --- Private

  getCSSDeclarationsForAttributes(cssBox, cssZIndex, cssBackgroundImage, cssTransform) {
    var declarations = [];
    cssBox.appendCSSDeclarations(declarations);
    cssZIndex.appendCSSDeclaration(declarations);
    cssBackgroundImage.appendCSSDeclaration(declarations);
    cssTransform.appendCSSDeclaration(declarations);
    return declarations;
  }

  isFixedPosition() {
    return window.getComputedStyle(this.el).position === 'fixed';
  }

}

/*-------------------------] OutputManager [--------------------------*/

class OutputManager {

  static get NULL_SELECTOR() { return '[element]'; }

  constructor(settings) {
    this.settings = settings;
  }

  // --- Selectors

  getSelector(element) {
    var type = this.settings.get(Settings.OUTPUT_SELECTOR), el = element.el;
    if (type === Settings.OUTPUT_SELECTOR_AUTO) {
      type = el.id ? Settings.OUTPUT_SELECTOR_ID : Settings.OUTPUT_SELECTOR_FIRST;
    }
    switch(type) {
      case Settings.OUTPUT_SELECTOR_NONE:    return '';
      case Settings.OUTPUT_SELECTOR_ID:      return '#' + el.id;
      case Settings.OUTPUT_SELECTOR_ALL:     return this.getAllClasses(el.classList);
      case Settings.OUTPUT_SELECTOR_TAG:     return this.getTagName(el);
      case Settings.OUTPUT_SELECTOR_TAG_NTH: return this.getTagNameWithNthIndex(el);
      case Settings.OUTPUT_SELECTOR_FIRST:   return this.getFirstClass(el.classList);
      case Settings.OUTPUT_SELECTOR_LONGEST: return this.getLongestClass(el.classList);
    }
  }

  getSelectorWithDefault(element) {
    return this.getSelector(element) || OutputManager.NULL_SELECTOR;
  }

  saveStyles(styles) {
    var link = document.createElement('a');
    link.href = 'data:text/css;base64,' + btoa(styles);
    link.download = this.settings.get(Settings.SAVE_FILENAME);
    link.click();
  }

  // --- Property Headers

  getPositionHeader(element) {
    return element.cssBox.getPositionHeader();
  }

  getDimensionsHeader(element) {
    return element.cssBox.getDimensionsHeader();
  }

  getZIndexHeader(element) {
    return element.cssZIndex.getHeader();
  }

  getTransformHeader(element) {
    return element.cssTransform.getHeader();
  }

  getBackgroundPositionHeader(element) {
    return element.cssBackgroundImage.getPositionHeader();
  }

  getStyles(elements) {
    var blocks, unique;

    blocks = elements.map(el => this.getElementDeclarationBlock(el));
    unique = this.settings.get(Settings.OUTPUT_UNIQUE_ONLY);

    if (unique) {
      blocks = this.getUniqueDeclarationBlocks(blocks);
    }

    blocks = blocks.filter(lines => lines.length);
    return blocks.map(lines => lines.join('\n')).join('\n\n');
  }

  // --- Private

  getElementDeclarationBlock(element) {
    var tab, selector, declarations, lines = [];

    tab = this.getTab();
    selector = this.getSelector(element);

    if (this.settings.get(Settings.OUTPUT_CHANGED_ONLY)) {
      declarations = element.getChangedCSSDeclarations();
    } else {
      declarations = element.getCSSDeclarations();
    }

    if (declarations.length === 0) {
      return [];
    }

    declarations = declarations.map(p => tab + p);

    if (selector) {
      lines.push(selector + ' {');
    }

    lines = lines.concat(declarations);

    if (selector) {
      lines.push('}');
    }

    return lines;
  }

  getUniqueDeclarationBlocks(blocks) {
    var commonMap;

    // If there is 1 or less elements, then all styles are
    // considered to be unique, so just return the blocks.
    if (blocks.length <= 1) {
      return blocks;
    }

    // Initialize a hash table of lines common to all blocks.
    commonMap = {};

    // Map the blocks to an array of objects containing the
    // details of each block including hash tables of used
    // lines, while populating the hash with all lines used.
    blocks = blocks.map(lines => {
      var map, firstLine, lastLine;

      map = {};

      firstLine = lines.shift();
      lastLine  = lines.pop();

      lines.forEach(line => {
        map[line] = true;
        commonMap[line] = true;
      });

      return {
        map: map,
        lastLine: lastLine,
        firstLine: firstLine,
        declarations: lines
      };
    });

    // Reduce the hash table to only lines used in all blocks
    // using hashIntersect.
    blocks.forEach(b => {
      commonMap = hashIntersect(commonMap, b.map);
    });

    // Map the blocks back to an array of lines containing
    // only declarations that are not common to all.
    blocks = blocks.map(b => {

      // Filter out any lines not common to the group.
      var lines = b.declarations.filter(line => !commonMap[line]);

      // Push the first and last lines back onto the array.
      lines.unshift(b.firstLine);
      lines.push(b.lastLine);

      return lines;
    });

    // Return only blocks that have declarations.
    return blocks.filter(b => b.length > 2);
  }

  getFirstClass(list) {
    var first = list[0];
    return first ? '.' + first : OutputManager.NULL_SELECTOR;
  }

  getTagName(el) {
    return el.tagName.toLowerCase();
  }

  getTagNameWithNthIndex(el) {
    var child = el, i = 1;
    while ((child = child.previousSibling) != null ) {
      // Count only element nodes.
      if (child.nodeType == 1) {
        i++;
      }
    }
    return el.tagName.toLowerCase() + ':nth-child(' + i + ')';
  }

  getLongestClass(list) {
    var classNames = Array.from(list);
    return '.' + classNames.reduce(function(a, b) {
      return a.length > b.length ? a : b;
    });
  }

  getAllClasses(list) {
    return '.' + Array.from(list).join('.');
  }

  /*
  getAllProperties(element) {
    var cssValues = [element.cssBox, element.cssZIndex, element.cssTransform];
    return cssValues.filter(cssValue => {
      return !cssValue.isNull();
    }).map(cssValue => {
      return cssValue.getHeader();
    });
  }

  getStyles(exclude) {
    var lines = [];

    // Set exclusion map;
    this.exclude = exclude;

    function add(l) {
      lines = lines.concat(l);
    }

    this.tabCharacter = this.getTabCharacter(settings.get(Settings.TABS));
    this.selector = this.getSelector();

    if (!this.zIndex.isNull()) {
      add(this.getStyleLines('z-index', this.zIndex));
    }
    add(this.getStyleLines('left', this.box.cssLeft));
    add(this.getStyleLines('top', this.box.cssTop));
    add(this.getStyleLines('width', this.box.cssWidth));
    add(this.getStyleLines('height', this.box.cssHeight));
    // TODO: backgroundImage needs better naming here than "isNull"
    if (!this.backgroundImage.isNull()) {
      add(this.getStyleLines('background-position', this.backgroundImage.getPositionString()));
    }
    if (!this.transform.isNull()) {
      add(this.getStyleLines('rotation', this.getRoundedRotation()));
    }

    // Clean exclusion map.
    this.exclude = null;

    if (this.selector && lines.length > 0) {
      lines.unshift('\n' + this.selector + ' {');
      return lines.join('\n' + this.tabCharacter) + '\n}';
    } else {
      return lines.join(' ');
    }
  }

  // TODO: fix
  getStyleLines(prop, val1, val2) {
    var isPx, lines = [], str = '';
    if (this.canIgnoreStyle(prop, val1, val2)) {
      return lines;
    }
    if (prop === 'rotation') {
      lines.push(this.concatStyle('-webkit-transform', 'rotateZ(' + val1 + 'deg)'));
      lines.push(this.concatStyle('-moz-transform', 'rotateZ(' + val1 + 'deg)'));
      lines.push(this.concatStyle('-ms-transform', 'rotateZ(' + val1 + 'deg)'));
      lines.push(this.concatStyle('transform', 'rotateZ(' + val1 + 'deg)'));
      return lines;
    }
    if (prop === 'left' ||
       prop === 'top' ||
       prop === 'width' ||
       prop === 'height' ||
       prop === 'background-position') {
      isPx = true;
    }
    str += val1;
    if (isPx) {
      str += 'px';
    }
    if (val2 !== undefined) {
      str += ' ' + val2;
      if (isPx) str += 'px';
    }
    lines.push(this.concatStyle(prop, str));
    return lines;
  }

  concatStyle(attr, value) {
    return attr + ': ' + value + ';';
  }

  canIgnoreStyle(prop, val1, val2) {
    var excluded = this.exclude && this.exclude[prop];
    if (settings.get(Settings.OUTPUT_CHANGED_ONLY) && this.propertyIsUnchanged(prop, val1, val2)) {
      return true;
    }
    if (excluded !== undefined) {
      if (excluded && prop === 'background-position') {
        return excluded.x === val1 && excluded.y === val2;
      } else {
        return excluded === val1;
      }
    }
    return false;
  }
  */

  /*
  propertyIsUnchanged(prop, val1, val2) {
    var state = this.states[0];
    if (!state) {
      return true;
    }
    switch(prop) {
      case 'z-index':
        return val1 === state.zIndex;
      case 'top':
        return val1 === state.box.top;
      case 'left':
        return val1 === state.box.left;
      case 'width':
        return val1 === state.box.width;
      case 'height':
        return val1 === state.box.height;
      case 'rotation':
        return val1 === state.transform.getRotation();
      case 'background-position':
        var bip = state.backgroundImage.getPosition();
        return val1 === bip.x && val2 === bip.y;
    }
    return false;
  }

  getExportedProperties() {
    return {
      'z-index': this.zIndex,
      'top': round(this.position.y),
      'left': round(this.position.x),
      'width': this.box.getWidth(true),
      'height': this.box.getHeight(true),
      'rotation': this.getRoundedRotation(),
      'background-position': this.backgroundImage.getPosition()
    }
  }
  */

  getTab() {
    switch(this.settings.get(Settings.TAB_STYLE)) {
      case Settings.TABS_TWO_SPACES:  return '  ';
      case Settings.TABS_FOUR_SPACES: return '    ';
      case Settings.TABS_TAB:         return '\u0009';
    }
  }

  /*
  getRoundedRotation() {
    var r = this.transform.getRotation();
    if (r % 1 !== 0.5) {
      r = round(r);
    }
    if (r === 360) r = 0;
    return r;
  }
  */

}

/*-------------------------] KeyManager [--------------------------*/

class KeyManager extends BrowserEventTarget {

  static get MODIFIER_NONE()    { return 1; }
  static get MODIFIER_COMMAND() { return 2; }

  static get SHIFT_KEY()   { return 'Shift'; }
  static get CTRL_KEY()    { return 'Control'; }
  static get ALT_KEY()     { return 'Alt'; }
  static get META_KEY()    { return 'Meta'; }

  static get UP_KEY()    { return 'ArrowUp';    }
  static get DOWN_KEY()  { return 'ArrowDown';  }
  static get LEFT_KEY()  { return 'ArrowLeft';  }
  static get RIGHT_KEY() { return 'ArrowRight'; }

  /*
  static get ENTER() { return 13; }
  */

  static get A_KEY() { return 'a'; }
  static get B_KEY() { return 'b'; }
  static get C_KEY() { return 'c'; }
  static get M_KEY() { return 'm'; }
  static get S_KEY() { return 's'; }
  static get R_KEY() { return 'r'; }
  static get Z_KEY() { return 'z'; }

  constructor(listener) {
    super(document.documentElement);
    this.listener = listener;

    this.handledKeys = {};
    this.setupEvents();
  }

  setupKey(key) {
    this.addKeyHandler(key, KeyManager.MODIFIER_NONE);
  }

  setupCommandKey(key) {
    this.addKeyHandler(key, KeyManager.MODIFIER_COMMAND);
  }

  // --- Private

  setupEvents() {
    this.bindEvent('keydown', this.onKeyDown);
    this.bindEvent('keyup',   this.onKeyUp);
  }

  addKeyHandler(key, modifier) {
    var current = this.handledKeys[key] || 0;
    this.handledKeys[key] = current + modifier;
  }

  onKeyDown(evt) {
    var mod = this.handledKeys[evt.key];
    if (mod === undefined) {
      return;
    }
    if (mod & KeyManager.MODIFIER_NONE && this.isSimpleKey(evt)) {
      evt.preventDefault();
      this.listener.onKeyDown(evt);
    } else if (mod & KeyManager.MODIFIER_COMMAND && this.isCommandKey(evt)) {
      evt.preventDefault();
      this.listener.onCommandKeyDown(evt);
    }
  }

  onKeyUp(evt) {
    if (this.handledKeys[evt.key]) {
      this.listener.onKeyUp(evt);
    }
  }

  isSimpleKey(evt) {
    return (!evt.metaKey  || evt.key === KeyManager.META_KEY) &&
           (!evt.ctrlKey  || evt.key === KeyManager.CTRL_KEY) &&
           (!evt.altKey   || evt.key === KeyManager.ALT_KEY);
  }

  isCommandKey(evt) {
    return evt.metaKey && !evt.shiftKey && !evt.ctrlKey && !evt.altKey;
  }

}

/*-------------------------] AlignmentManager [--------------------------*/

class AlignmentManager {

  align(elements, edge) {
    if (elements.length < 2) {
      return;
    }
    switch (edge) {
      case 'top':     this.alignEdge(elements, edge, false); break;
      case 'left':    this.alignEdge(elements, edge, false); break;
      case 'bottom':  this.alignEdge(elements, edge, true);  break;
      case 'right':   this.alignEdge(elements, edge, true);  break;
      case 'hcenter': this.alignCenter(elements, edge);      break;
      case 'vcenter': this.alignCenter(elements, edge);      break;
    }
  }

  distribute(elements, edge) {
    this.distributeElements(elements, edge);
  }

  // --- Private

  alignEdge(elements, edge, max) {
    var elementMoves, edgeVal;

    elementMoves = this.getElementMoves(elements, edge);

    if (max) {
      edgeVal = elementMoves.reduce((max, em) => Math.max(em.current, max), -Infinity);
    } else {
      edgeVal = elementMoves.reduce((min, em) => Math.min(em.current, min), Infinity);
    }

    elementMoves.forEach(em => em.target = edgeVal);

    this.executeElementMoves(elementMoves, edge);
  }

  alignCenter(elements, edge) {
    var elementMoves, min, max, average;

    elementMoves = this.getElementMoves(elements, edge);

    min = elementMoves.reduce((min, em) => Math.min(em.current, min), Infinity);
    max = elementMoves.reduce((max, em) => Math.max(em.current, max), -Infinity);
    average = Math.round((max - min) / 2 + min);

    elementMoves.forEach(em => em.target = average);

    this.executeElementMoves(elementMoves, edge);
  }

  distributeElements(elements, edge) {
    var elementMoves, minClose, maxClose, maxFar, totalSize, totalSpace,
        distributeAmount, first, last;

    if (elements.length < 3) {
      return;
    }

    minClose =  Infinity;
    maxClose = -Infinity;
    maxFar   = -Infinity;
    totalSize = 0;

    // Calculate the min top/left, max top/left, and max bottom/right
    // values as well as a total of the space being used by all elements.
    elementMoves = elements.map(element => {
      var rect, minEdge, maxEdge, size;

      rect = element.el.getBoundingClientRect();

      minEdge = rect[edge === 'hcenter' ? 'left' : 'top'];
      maxEdge = rect[edge === 'hcenter' ? 'right' : 'bottom'];
      size    = rect[edge === 'hcenter' ? 'width' : 'height'];

      minClose = Math.min(minEdge, minClose);
      maxClose = Math.max(minEdge, maxClose);
      maxFar   = Math.max(maxEdge, maxFar);

      totalSize += size;

      return {
        size: size,
        min: minEdge,
        max: maxEdge,
        element: element
      };
    });

    // Taking the simple approach of sorting elements by their top/left
    // positions. This will maintain order when there is enough space
    // to distribute, and also to align top/left edges when there is not.
    elementMoves.sort((a, b) => a.min - b.min);

    // The first element will never be moved, so remove it here.
    first = elementMoves.shift();
    last  = elementMoves[elementMoves.length - 1];

    if (first.max > last.max) {
      // If the first element is larger than all elements, then use the
      // full space to distribute, and don't remove the last element, as
      // it will need to be moved as well.
      maxClose = maxFar;
    } else {
      // Otherwise the last element can be considered the far anchor and
      // will also not be moved, so remove it here.
      elementMoves.pop();
    }

    if (totalSize < maxFar - minClose) {

      // If there is enough room to space all elements evenly, then
      // we can step through them and add the distribution amount, taking
      // the element dimensions into account.

      totalSpace = maxFar - minClose;

      distributeAmount = Math.round((totalSpace - totalSize) / (elementMoves.length + 1));

      elementMoves.reduce((pos, em) => {
        em.current = em.min;
        em.target = pos + distributeAmount;
        return em.target + em.size;
      }, minClose + first.size);

    } else {

      // If there is not enough room to space all elements evenly, then
      // expected behavior is indeterminate, so make a best effort by
      // simply aligning the top/left edges.

      totalSpace = maxClose - minClose;

      distributeAmount = Math.round(totalSpace / (elementMoves.length + 1));

      elementMoves.forEach((em, i) => {
        em.current = em.min;
        em.target  = minClose + distributeAmount * (i + 1);
      });

    }

    this.executeElementMoves(elementMoves, edge);
  }

  executeElementMoves(elementMoves, edge) {
    elementMoves.forEach(em => {
      if (em.target !== em.current) {
        em.element.pushState();
        if (this.isHorizontalEdge(edge)) {
          em.element.move(em.target - em.current, 0);
        } else {
          em.element.move(0, em.target - em.current);
        }
      }
    });
  }

  getElementMoves(elements, edge) {
    return elements.map(element => {
      return {
        element: element,
        current: this.getElementEdgeValue(element, edge)
      };
    });
  }

  getElementEdgeValue(element, edge) {
    var rect = element.el.getBoundingClientRect(), val;
    if (edge === 'hcenter') {
      val = rect.left + rect.width / 2;
    } else if (edge === 'vcenter') {
      val = rect.top + rect.height / 2;
    } else {
      val = rect[edge];
    }
    return Math.round(val);
  }

  isHorizontalEdge(edge) {
    return edge === 'left' || edge === 'right' || edge === 'hcenter';
  }

}

/*-------------------------] CopyManager [--------------------------*/

class CopyManager {

  constructor(listener) {
    window.addEventListener('copy', this.onCopyEvent.bind(this));
    this.listener = listener;
  }

  onCopyEvent(evt) {
    evt.preventDefault();
    this.listener.onCopyEvent(evt);
  }

  setCopyData(evt, str) {
    evt.clipboardData.clearData();
    evt.clipboardData.setData('text/plain', str);
  }

}

/*-------------------------] AppController [--------------------------*/

class AppController {

  static get HOST_CLASS_NAME() { return 'positionble-extension-ui'; }

  constructor(uiRoot) {

    this.settings = new Settings(this, localStorage, uiRoot);
    this.outputManager = new OutputManager(this.settings);
    this.alignmentManager = new AlignmentManager();

    this.body = new Element(document.body);

    this.copyManager = new CopyManager(this);
    this.copyAnimation = new CopyAnimation(uiRoot, this);
    //this.nudgeManager = new NudgeManager();
    //this.keyEventManager  = new KeyEventManager();

    this.cursorManager  = new CursorManager(ShadowDomInjector.BASE_PATH);

    // TODO: order here?
    this.elementManager = new PositionableElementManager(this);
    this.controlPanel   = new ControlPanel(uiRoot, this);
    this.nudgeManager   = new NudgeManager(this);

    this.setupKeyManager();

    new DragSelection(uiRoot, this);
    new LoadingAnimation(uiRoot, this).show();
  }

  setupKeyManager() {
    this.keyManager = new KeyManager(this);

    this.keyManager.setupKey(KeyManager.SHIFT_KEY);
    this.keyManager.setupKey(KeyManager.CTRL_KEY);
    this.keyManager.setupKey(KeyManager.ALT_KEY);

    this.keyManager.setupKey(KeyManager.A_KEY);
    this.keyManager.setupKey(KeyManager.B_KEY);
    this.keyManager.setupKey(KeyManager.M_KEY);
    this.keyManager.setupKey(KeyManager.S_KEY);
    this.keyManager.setupKey(KeyManager.R_KEY);
    this.keyManager.setupKey(KeyManager.Z_KEY);

    this.keyManager.setupKey(KeyManager.UP_KEY);
    this.keyManager.setupKey(KeyManager.LEFT_KEY);
    this.keyManager.setupKey(KeyManager.DOWN_KEY);
    this.keyManager.setupKey(KeyManager.RIGHT_KEY);

    this.keyManager.setupCommandKey(KeyManager.A_KEY);
    this.keyManager.setupCommandKey(KeyManager.S_KEY);
    this.keyManager.setupCommandKey(KeyManager.Z_KEY);
  }

  onFocusedElementsChanged() {
    var elements = this.elementManager.getFocusedElements();
    if (elements.length > 1) {
      this.renderAlignArea(elements);
      this.controlPanel.showAlignArea();
    } else if (elements.length === 1) {
      this.controlPanel.showElementArea();
      this.renderElementArea();
    } else {
      this.controlPanel.showDefaultArea();
    }
  }

  getStylesForFocusedElements() {
    return this.elementManager.getFocusedElements().map(element => {
      return this.settings.getStylesForElement(element);
    }).join(' ');
  }

  onGettingStartedSkip() {
    this.settings.setBoolean(Settings.SKIP_GETTING_STARTED, true);
    this.controlPanel.showDefaultArea();
  }

  onSettingsUpdated() {
    this.controlPanel.showDefaultArea();
  }

  onAlignButtonClicked(edge) {
    this.alignmentManager.align(this.elementManager.getFocusedElements(), edge);
  }

  onDistributeButtonClicked(edge) {
    this.alignmentManager.distribute(this.elementManager.getFocusedElements(), edge);
  }

  // --- Loading Animation Events

  onLoadingAnimationTaskReady() {
    this.elementManager.findElements(
      this.settings.get(Settings.INCLUDE_SELECTOR),
      this.settings.get(Settings.EXCLUDE_SELECTOR)
    );
    this.controlPanel.activate();
    if (this.settings.get(Settings.SKIP_GETTING_STARTED)) {
      this.controlPanel.showDefaultArea();
    } else {
      this.controlPanel.showGettingStartedArea();
    }
  }

  // --- Position Drag Events

  onPositionDragIntentStart() {
    console.info('POSITION DRAG INTENT START');
    this.cursorManager.setHoverCursor('move');
    this.controlPanel.setMode('position');
  }

  onPositionDragIntentStop() {
    console.info('POSITION DRAG INTENT STOP');
    this.cursorManager.clearHoverCursor();
    this.controlPanel.setMode(this.nudgeManager.getCurrentMode());
  }

  onPositionDragStart() {
    console.info('POSITION DRAG START');
    this.cursorManager.setDragCursor('move');
  }

  onPositionDragMove() {
    console.info('POSITION DRAG MOVE');
  }

  onPositionDragStop() {
    console.info('POSITION DRAG STOP');
    this.cursorManager.clearDragCursor();
  }

  // --- Resize Drag Events

  onResizeDragIntentStart(evt, handle, element) {
    console.info('RESIZE DRAG INTENT START');
    this.cursorManager.setHoverCursor(handle.getCursorForRotation(element.getRotation()));
    this.controlPanel.setMode('resize');
  }

  onResizeDragIntentStop() {
    console.info('RESIZE DRAG INTENT STOP');
    this.cursorManager.clearHoverCursor();
    this.controlPanel.setMode(this.nudgeManager.getCurrentMode());
  }

  onResizeDragStart(evt, handle, element) {
    console.info('RESIZE DRAG START');
    if (evt.ctrlKey) {
      this.cursorManager.setDragCursor('move');
    } else {
      this.isResizing = true;
      this.cursorManager.setDragCursor(handle.getCursorForRotation(element.getRotation()));
    }
  }

  onResizeDragMove() {
    console.info('RESIZE DRAG MOVE');
  }

  onResizeDragStop() {
    console.info('RESIZE DRAG STOP');
    this.cursorManager.clearDragCursor();
    this.isResizing = false;
  }

  // --- Rotation Drag Events

  onRotationDragIntentStart(evt, handle, element) {
    console.info('ROTATION DRAG INTENT START');
    this.cursorManager.setHoverCursor(handle.getCursorForRotation(element.getRotation()), true);
    this.controlPanel.setMode('rotate');
  }

  onRotationDragIntentStop() {
    console.info('ROTATION DRAG INTENT STOP');
    this.cursorManager.clearHoverCursor();
    this.controlPanel.setMode(this.nudgeManager.getCurrentMode());
  }

  onRotationDragStart(evt, handle, element) {
    console.info('ROTATION DRAG START');
    this.isRotating = true;
    this.setRotationCursor(handle.getCursorForRotation(element.getRotation()));
  }

  onRotationDragMove(evt, handle) {
    console.info('ROTATION DRAG MOVE');
    this.setRotationCursor(handle.getCursorForRotation(evt.rotation.abs));
  }

  onRotationDragStop() {
    console.info('ROTATION DRAG STOP');
    this.isRotating = false;
    this.cursorManager.clearDragCursor();
  }

  setRotationCursor(name) {
    this.cursorManager.setHoverCursor(name, true);
    this.cursorManager.setDragCursor(name, true);
  }

  // --- Background Image Events

  onBackgroundImageSnap() {
    this.renderFocusedPosition();
    this.renderFocusedDimensions();
    this.renderFocusedTransform();
    this.renderFocusedBackgroundPosition();
  }

  // --- Dimensions Updated Events

  onPositionUpdated() {
    this.renderFocusedPosition();
  }

  onDimensionsUpdated() {
    this.renderFocusedDimensions();
    this.renderFocusedTransform();
  }

  onBackgroundPositionUpdated() {
    this.renderFocusedBackgroundPosition();
  }

  onRotationUpdated() {
    this.renderFocusedTransform();
  }

  onZIndexUpdated() {
    this.renderFocusedZIndex();
  }

  // --- Key Events

  onKeyDown(evt) {

    // Note mode resetting is handled by DragTarget

    switch (evt.key) {

      // Meta Keys
      case KeyManager.SHIFT_KEY:
        this.nudgeManager.setMultiplier(true);
        break;
      case KeyManager.CTRL_KEY:
        this.cursorManager.setPriorityHoverCursor('move');
        break;
      case KeyManager.ALT_KEY:
        if (this.canPeek()) {
          this.elementManager.setPeekMode(true);
        }
        break;

      // Arrow Keys
      case KeyManager.UP_KEY:    this.nudgeManager.addDirection('up');    break;
      case KeyManager.DOWN_KEY:  this.nudgeManager.addDirection('down');  break;
      case KeyManager.LEFT_KEY:  this.nudgeManager.addDirection('left');  break;
      case KeyManager.RIGHT_KEY: this.nudgeManager.addDirection('right'); break;

      // Other Keys
      case KeyManager.M_KEY: this.nudgeManager.setPositionMode();      break;
      case KeyManager.S_KEY: this.nudgeManager.toggleResizeMode();     break;
      case KeyManager.R_KEY: this.nudgeManager.toggleRotateMode();     break;
      case KeyManager.Z_KEY: this.nudgeManager.toggleZIndexMode();     break;
      case KeyManager.B_KEY: this.nudgeManager.toggleBackgroundMode(); break;
    }
  }

  onKeyUp(evt) {

    switch (evt.key) {

      // Meta Keys
      case KeyManager.SHIFT_KEY:
        this.nudgeManager.setMultiplier(false);
        break;
      case KeyManager.CTRL_KEY:
        this.cursorManager.clearPriorityHoverCursor('move');
        break;
      case KeyManager.ALT_KEY:
        if (this.canPeek()) {
          this.elementManager.setPeekMode(false);
        }
        break;

      // Arrow Keys
      case KeyManager.UP_KEY:    this.nudgeManager.removeDirection('up');    break;
      case KeyManager.DOWN_KEY:  this.nudgeManager.removeDirection('down');  break;
      case KeyManager.LEFT_KEY:  this.nudgeManager.removeDirection('left');  break;
      case KeyManager.RIGHT_KEY: this.nudgeManager.removeDirection('right'); break;

    }
  }

  canPeek() {
    return !this.isResizing && !this.isRotating;
  }

  onCommandKeyDown(evt) {
    // Note that copying is handled by the copy event not key events.
    switch (evt.key) {
      case KeyManager.S_KEY:
        this.saveStyles();
        break;
      case KeyManager.A_KEY:
        this.elementManager.focusAll();
        break;
      case KeyManager.Z_KEY:
        this.elementManager.undo();
        this.renderElementArea();
        break;
    }
  }

  onCopyEvent(evt) {
    var styles = this.outputManager.getStyles(this.elementManager.getFocusedElements());
    this.copyManager.setCopyData(evt, styles);
    this.copyAnimation.show(!!styles);
  }

  saveStyles() {
    var styles = this.outputManager.getStyles(this.elementManager.getFocusedElements());
    if (styles) {
      this.outputManager.saveStyles(styles);
    } else {
      this.copyAnimation.show(false);
    }
  }

  /*
  onRotationChanged(rotation) {
    this.cursorManager.setRotate(rotation);
  }
  */

  // --- Nudge Events

  onNudgeStart() {
    this.elementManager.pushFocusedStates();
  }

  onNudgeMove(evt) {
    switch (evt.mode) {
      case NudgeManager.POSITION_MODE:
        this.elementManager.applyPositionNudge(evt.x, evt.y);
        break;
      case NudgeManager.RESIZE_SE_MODE:
      case NudgeManager.RESIZE_NW_MODE:
        this.elementManager.applyResizeNudge(evt.x, evt.y, evt.dir);
        break;
      case NudgeManager.BACKGROUND_MODE:
        this.elementManager.applyBackgroundNudge(evt.x, evt.y);
        break;

      // Flip the y value for single values
      case NudgeManager.ROTATE_MODE:
        this.elementManager.applyRotationNudge(-evt.y);
        break;
      case NudgeManager.Z_INDEX_MODE:
        this.elementManager.applyZIndexNudge(-evt.y);
        break;
    }
  }

  onNudgeStop() {
  }

  onNudgeModeChanged(mode) {
    this.controlPanel.setMode(mode);
  }

  // --- Control Panel Drag Events

  onControlPanelDragStart() {
    this.cursorManager.setDragCursor('move');
  }

  onControlPanelDragStop() {
    this.cursorManager.clearDragCursor();
  }

  // --- Drag Selection Events

  onDragSelectionStart() {
    this.cursorManager.setDragCursor('crosshair');
  }

  onDragSelectionMove(selection) {
    this.elementManager.setFocused(element => selection.contains(element.el));
  }

  onDragSelectionStop() {
    this.cursorManager.clearDragCursor();
  }

  onDragSelectionClear() {
    this.elementManager.unfocusAll();
  }

  // --- Control Panel Element Rendering

  renderElementArea() {
    this.renderFocusedSelector();
    this.renderFocusedPosition();
    this.renderFocusedDimensions();
    this.renderFocusedZIndex();
    this.renderFocusedTransform();
    this.renderFocusedBackgroundPosition();
  }

  renderFocusedSelector() {
    this.withSingleFocusedElement(el => {
      this.controlPanel.renderElementSelector(this.outputManager.getSelectorWithDefault(el));
    });
  }

  renderFocusedPosition() {
    this.withSingleFocusedElement(el => {
      this.controlPanel.renderElementPosition(this.outputManager.getPositionHeader(el));
    });
  }

  renderFocusedDimensions() {
    this.withSingleFocusedElement(el => {
      this.controlPanel.renderElementDimensions(this.outputManager.getDimensionsHeader(el));
    });
  }

  renderFocusedZIndex() {
    this.withSingleFocusedElement(el => {
      this.controlPanel.renderElementZIndex(this.outputManager.getZIndexHeader(el));
    });
  }

  renderFocusedTransform() {
    this.withSingleFocusedElement(el => {
      this.controlPanel.renderElementTransform(this.outputManager.getTransformHeader(el));
    });
  }

  renderFocusedBackgroundPosition() {
    this.withSingleFocusedElement(el => {
      this.controlPanel.renderElementBackgroundPosition(this.outputManager.getBackgroundPositionHeader(el));
    });
  }

  withSingleFocusedElement(fn) {
    var focusedElements = this.elementManager.getFocusedElements();
    if (focusedElements.length === 1) {
      fn(focusedElements[0]);
    }
  }

  // --- Control Panel Align Rendering

  // TODO: me!
  renderAlignArea(elements) {
    this.controlPanel.renderMultipleSelected(elements.length);
  }

  /*
  // TODO: can this just use listeners?
  bindEvents(uiRoot) {
    var els = uiRoot.querySelectorAll('[click]');
    for (let i = 0, el; el = els[i]; i++) {
      let action = el.getAttribute('click');
      el.addEventListener('click', (evt) => {
        evt.stopPropagation();
        console.info('TODO something about me');
        this[action]();
      });
    }
  }
  */
  destroy() {
    var els = document.querySelectorAll('.' + UI_HOST_CLASS_NAME);
    for (let i = 0, el; el = els[i]; i++) {
      el.remove();
    }
    this.elementManager.destroyAll();
  }

}

/*-------------------------] PositionableElementManager [--------------------------*/

class PositionableElementManager {

  constructor(listener) {

    this.listener = listener;

    this.elements = [];
    this.focusedElements = [];


    //this.setupEventDelegation();

    //this.copyAnimation = new CopyAnimation();

  }

  // --- Setup

  // TODO: wtf is this??
  /*
  build() {
    loadingAnimation.show(this.build.bind(this));
  }
  */

  // --- Focusing

  getFocusedElements() {
    return this.focusedElements;
  }

  focus(element) {
    if (!this.elementIsFocused(element)) {
      element.focus();
      this.focusedElements.push(element);
    }
  }

  unfocus(element) {
    if (this.elementIsFocused(element)) {
      element.unfocus();
      this.focusedElements = this.focusedElements.filter(function(el) {
        return el !== element;
      });
    }
  }

  /*
  toggleFocused(element) {
    if (this.focusedElements.includes(element)) {
      this.setFocused(this.focusedElements.filter(el => el !== element));
    } else {
      this.setFocused(this.focusedElements.concat(element));
    }
  }
  */

  lockPeekMode() {
    this.focusedElements.forEach(el => el.lockPeekMode());
  }

  setPeekMode(on) {
    this.focusedElements.forEach(el => el.setPeekMode(on));
  }

  pushFocusedStates() {
    this.focusedElements.forEach(el => el.pushState());
  }

  isFocused(element) {
    return this.focusedElements.some(el => el === element);
  }

  addFocused(element) {
    this.setFocused(this.focusedElements.concat(element));
  }

  removeFocused(element) {
    this.setFocused(this.focusedElements.filter(el => el !== element));
  }

  setFocused(arg) {
    var prev, next, incoming, outgoing;

    prev = this.getFocusedElements();

    if (typeof arg === 'function') {
      next = this.elements.filter(arg);
    } else if (Array.isArray(arg)) {
      next = arg;
    } else {
      next = [arg];
    }

    incoming = next.filter(el => !prev.includes(el));
    outgoing = prev.filter(el => !next.includes(el));

    if (incoming.length || outgoing.length) {
      outgoing.forEach(e => this.unfocus(e));
      incoming.forEach(e => this.focus(e));
      this.listener.onFocusedElementsChanged();
      this.focusedElements = next;
    }

  }

  focusAll() {
    this.setFocused(this.elements);
  }

  unfocusAll() {
    this.setFocused([]);
  }

  undo() {
    this.focusedElements.forEach(el => el.undo());
  }

  /*

  addAllFocused() {
    this.elements.forEach(function(el) {
      this.focus(el);
    }, this);
  }

  focusAll(toggle) {
    if (toggle && this.focusedElements.length === this.elements.length) {
      this.unfocusAll();
    } else {
      this.addAllFocused();
    }
    this.statusBar.update();
  }

  // TODO: move to focused?
  focus(element, toggle) {
    if (toggle) {
      this.toggleFocused(element);
    } else {
      this.focus(element);
    }
    this.statusBar.update();
  }
  */

  /*
  unfocusAll() {
    this.removeAllFocused();
    this.statusBar.update();
  }

  // TODO: not toggling!
  toggleFocused(element) {
    if (this.elementIsFocused(element)) {
      this.unfocus(element);
    } else {
      this.focus(element);
    }
  }

  setFocused(element, add) {
    if (!add) {
      this.focusedElements.filter(el => el !== element).forEach(el => el.unfocus());
      this.focusedElements = [];
    }
    this.focus(element);
  }


  callOnEveryFocused(name, args) {
    var el, i, len;
    for(i = 0, len = this.focusedElements.length; i < len; i++) {
      el = this.focusedElements[i];
      el[name].apply(el, args);
    }
  }
  */

  // --- Element Drag Events

  onElementMouseDown(evt, element) {
    if (evt.shiftKey) {
      this.removeOnClick = this.isFocused(element);
      this.addFocused(element);
    } else if (!this.isFocused(element)) {
      this.setFocused(element);
    }
  }

  onElementDragStart(evt, element) {
    this.setDraggingElements(evt, element);
  }

  onElementDragMove() {
    this.removeOnClick = false;
  }

  onElementDragStop() {
  }

  onElementClick(evt, element) {
    if (this.removeOnClick && this.focusedElements.length > 1) {
      this.removeFocused(element);
    }
  }

  // --- Position Drag Events

  onPositionDragIntentStart(evt, handle, element) {
    this.listener.onPositionDragIntentStart(evt, handle, element);
  }

  onPositionDragIntentStop(evt, handle, element) {
    this.listener.onPositionDragIntentStop(evt, handle, element);
  }

  onPositionDragStart(evt, handle, element) {
    this.pushFocusedStates();
    this.onElementDragStart(evt, element);
    this.listener.onPositionDragStart(evt, handle, element);
  }

  onPositionDragMove(evt, handle, element) {
    this.onElementDragMove(evt, element);
    this.applyPositionDrag(evt, evt.ctrlKey);
    this.listener.onPositionDragMove(evt, handle, element);
  }

  onPositionDragStop(evt, handle, element) {
    this.onElementDragStop(evt, element);
    this.listener.onPositionDragStop(evt, handle, element);
  }

  // --- Handle Events

  /*
  onRotationHandleIntentStart(evt, element) {
    console.info(evt);
    this.listener.onRotationHandleIntentStart(evt.rotation.abs);
  }

  onRotationHandleIntentStop(evt, element) {
    this.listener.onRotationHandleIntentStop(evt.rotation.abs);
  }

  onRotationStop(evt, element) {
  }


  onHandleIntentStart(evt) {
    //console.info('handle intent start pem');
    //this.listener.onHandleIntentStart(evt.rotation.abs);
  }

  onHandleIntentStop(evt) {
    //console.info('handle intent stop pem');
  }
  */

  // --- Resize Drag Events

  onResizeDragIntentStart(evt, handle, element) {
    this.listener.onResizeDragIntentStart(evt, handle, element);
  }

  onResizeDragIntentStop(evt, handle, element) {
    this.listener.onResizeDragIntentStop(evt, handle, element);
  }

  onResizeDragStart(evt, handle, element) {
    this.lockPeekMode();
    this.pushFocusedStates();
    this.onElementDragStart(evt, element);
    this.listener.onResizeDragStart(evt, handle, element);
  }

  onResizeDragMove(evt, handle, element) {
    this.onElementDragMove(evt, element);
    if (evt.ctrlKey) {
      this.applyPositionDrag(evt, true);
    } else {
      this.applyResizeDrag(evt, handle, element);
    }
    this.listener.onResizeDragMove(evt, handle, element);
  }

  onResizeDragStop(evt, handle, element) {
    this.onElementDragStop(evt, element);
    this.listener.onResizeDragStop(evt, handle, element);
  }

  // --- Rotation Drag Events

  onRotationDragIntentStart(evt, handle, element) {
    this.listener.onRotationDragIntentStart(evt, handle, element);
  }

  onRotationDragIntentStop(evt, handle, element) {
    this.listener.onRotationDragIntentStop(evt, handle, element);
  }

  onRotationDragStart(evt, handle, element) {
    this.pushFocusedStates();
    this.onElementDragStart(evt, element);
    this.listener.onRotationDragStart(evt, handle, element);
  }

  onRotationDragMove(evt, handle, element) {
    this.onElementDragMove(evt, element);
    this.applyRotationDrag(evt, element);
    this.listener.onRotationDragMove(evt, handle, element);
  }

  onRotationDragStop(evt, handle, element) {
    this.onElementDragStop(evt, element);
    this.listener.onRotationDragStop(evt, handle, element);
  }

  // --- Background Image Events

  onBackgroundImageSnap() {
    this.listener.onBackgroundImageSnap();
  }

  /*
  // TODO FIRST!
  // TODO: no need alternate?
  delegateToDragging(name, alternate) {
    // TODO: can this be cleaner?
    this[name] = function() {
      // TODO: test this case!
      if (this.draggingElement && this.draggingElement[name]) {
        this.draggingElement[name].apply(this.draggingElement, arguments);
      } else if (alternate) {
        alternate[name].apply(alternate, arguments);
      }
    }.bind(this);
  }
  */

  /*

  setupEventDelegation() {

    // Peeking
    this.delegateToFocused('peek');

    // State
    this.delegateToFocused('undo');
    this.delegateToFocused('pushState');
    this.delegateToFocused('toggleHandles');

    // Position
    this.delegateToFocused('positionDrag');
    this.delegateToFocused('backgroundDrag');

    // Nudging
    this.delegateToFocused('incrementPosition');
    this.delegateToFocused('incrementBackgroundPosition');
    this.delegateToFocused('incrementRotation');
    this.delegateToFocused('incrementZIndex');

    // Resizing
    this.delegateToFocused('resize');

    // Rotation
    this.delegateToFocused('rotate');

  }
  */

  findElements(includeSelector, excludeSelector) {
    var els;

    try {
      // The :not pseudo-selector cannot have multiple arguments,
      // so split the query by commas and append the host class here.
      let excludeSelectors = excludeSelector ? excludeSelector.split(',') : [];

      excludeSelectors.push('.' + UI_HOST_CLASS_NAME);
      excludeSelectors.push('script');
      excludeSelectors.push('style');
      excludeSelectors.push('link');
      excludeSelector = excludeSelectors.map(s => `:not(${s})`).join('');

      let query = `${includeSelector || '*'}${excludeSelector}`;

      els = document.body.querySelectorAll(query);

    } catch(e) {
      throwError(e.message, false);
    }

    for(let i = 0, el; el = els[i]; i++) {
      if (includeSelector || this.elementIsOutOfFlow(el)) {
        this.elements.push(new PositionableElement(el, this));
      }
    }

    // TODO: is this needed now?
    this.active = true;

  }

  refresh() {
    this.destroyElements();
    this.startBuild();
  }

  destroyElements() {
    this.elements.forEach(function(e) {
      e.destroy();
    }, this);
  }

  toggleActive() {
    if (this.active) {
      this.destroyElements();
      this.statusBar.deactivate();
      this.active = false;
    } else {
      this.startBuild();
    }
  }

  elementIsOutOfFlow(el) {
    var position = window.getComputedStyle(el).position;
    return position === 'absolute' || position === 'fixed';
  }

  /*
  elementIsIncluded(el, includeSelector, excludeSelector) {
    /*
    if (excludeSelector && el.webkitMatchesSelector(excludeSelector)) {
      // Don't include elements that are explicitly excluded.
      return false;
    } else if (getClassName(el).match(EXTENSION_CLASS_PREFIX)) {
      // Don't include elements that are part of the extension itself.
      return false;
    } else if (el.style && el.style.background.match(/positionable-extension/)) {
      // Don't include elements that are part of other chrome extensions.
      return false;
    } else if (includeSelector) {
      // If there is an explicit selector active, then always include.
      return true;
    }
    // Otherwise only include absolute or fixed position elements.
    var style = window.getComputedStyle(el);
    return style.position === 'absolute' || style.position === 'fixed';
  }

  delegateToFocused(name, disallowWhenDragging) {
    // TODO: can this be cleaner?
    this[name] = function() {
      // TODO: test this case!
      //if (disallowWhenDragging && this.draggingElement) return;
      this.callOnEveryFocused(name, arguments);
    }.bind(this);
  }
    */

  // --- Alignment

  /*
  alignTop() {
    this.alignElements('top', function(el, minTop) {
      el.box.setPosition(new Point(el.box.left, minTop));
    });
  }

  alignLeft() {
    this.alignElements('left', function(el, minLeft) {
      el.box.setPosition(new Point(minLeft, el.box.top));
    });
  }

  alignRight() {
    this.alignElements('right', function(el, maxRight) {
      el.box.setPosition(new Point(maxRight - el.box.width, el.box.top));
    });
  }

  alignBottom() {
    this.alignElements('bottom', function(el, maxBottom) {
      el.box.setPosition(new Point(el.box.left, maxBottom - el.box.height));
    });
  }

  alignHorizontal() {
    this.alignElements('hcenter', function(el, hcenter) {
      el.box.setPosition(new Point(hcenter - el.box.width / 2, el.box.top));
    });
  }

  alignVertical() {
    this.alignElements('vcenter', function(el, vcenter) {
      el.box.setPosition(new Point(el.box.left, vcenter - el.box.height / 2));
    });
  }

  alignElements(side, fn) {
    var amt = this.getAlignAmount(side);
    this.focusedElements.forEach(function(el) {
      el.pushState();
      fn(el, amt);
      el.updatePosition();
    });
  }

  getAlignAmount(side) {
    switch (side) {
      case 'left':    return this.getAlignMin(side);
      case 'top':     return this.getAlignMin(side);
      case 'right':   return this.getAlignMax(side);
      case 'bottom':  return this.getAlignMax(side);
      case 'hcenter': return this.getAlignAverage(side);
      case 'vcenter': return this.getAlignAverage(side);
    }
  };

  getAlignMin(side) {
    var min = Infinity;
    this.focusedElements.forEach(function(el) {
      min = Math.min(min, el.box[side]);
    });
    return min;
  }

  getAlignMax(side) {
    var max = -Infinity;
    this.focusedElements.forEach(function(el) {
      max = Math.max(max, el.box[side]);
    });
    return max;
  }

  getAlignAverage(side) {
    var sum = 0;
    this.focusedElements.forEach(function(el) {
      sum += el.box[side];
    });
    return sum / this.focusedElements.length;
  }

  // --- Distribution

  distributeLeft() {
    this.distributeElements('left', function(el, left) {
      el.box.setPosition(new Point(left, el.box.top));
    });
  }

  distributeTop() {
    this.distributeElements('top', function(el, top) {
      el.box.setPosition(new Point(el.box.left, top));
    });
  }

  distributeRight() {
    this.distributeElements('right', function(el, right) {
      el.box.setPosition(new Point(right - el.box.width, el.box.top));
    });
  }

  distributeBottom() {
    this.distributeElements('bottom', function(el, bottom) {
      el.box.setPosition(new Point(el.box.left, bottom - el.box.height));
    });
  }

  distributeHorizontal() {
    this.distributeElements('hcenter', function(el, hcenter) {
      el.box.setPosition(new Point(hcenter - el.box.width / 2, el.box.top));
    });
  }

  distributeVertical() {
    this.distributeElements('vcenter', function(el, vcenter) {
      el.box.setPosition(new Point(el.box.left, vcenter - el.box.height / 2));
    });
  }

  // The amount to distribute is equal to the span between the edges of the first and
  // last element divided by one less than the total number of elements. All elements
  // should be updated to preserve their undo state, as all elements should have been
  // operated on, even if they do not actually move.
  distributeElements(side, fn) {
    var sorted, len, min, max, amt;

    sorted = this.focusedElements.concat().sort(function(a, b) {
      return a.box[side] - b.box[side];
    });

    len = sorted.length - 1;
    min = sorted[0].box[side];
    max = sorted[len].box[side];
    amt = (max - min) / len;

    sorted.forEach(function(el, i) {
      el.pushState();
      fn(el, min + amt * i);
      el.updatePosition();
    });
  }
  */

  // --- Nudging

  applyPositionNudge(x, y) {
    this.focusedElements.forEach(el => el.move(x, y));
    this.listener.onPositionUpdated();
  }

  applyResizeNudge(x, y, dir) {
    this.focusedElements.forEach(el => {
      el.resize(x, y, dir);
    });
    this.listener.onDimensionsUpdated();
  }

  applyBackgroundNudge(x, y) {
    this.focusedElements.forEach(el => {
      el.moveBackground(x, y);
    });
    this.listener.onBackgroundPositionUpdated();
  }

  applyRotationNudge(val) {
    this.focusedElements.forEach(el => el.rotate(val));
    this.listener.onRotationUpdated();
  }

  applyZIndexNudge(val) {
    this.focusedElements.forEach(el => el.addZIndex(val));
    this.listener.onZIndexUpdated();
  }

  // --- Position Dragging

  applyPositionDrag(evt, isBackground) {
    this.draggingElements.forEach(el => {
      var x = el.isFixed ? evt.drag.clientX : evt.drag.pageX;
      var y = el.isFixed ? evt.drag.clientY : evt.drag.pageY;
      if (evt.ctrlKey) {
        el.moveBackground(x, y, evt.drag.constrained);
      } else {
        el.move(x, y, evt.drag.constrained);
      }
    });
    if (isBackground) {
      this.listener.onBackgroundPositionUpdated();
    } else {
      this.listener.onPositionUpdated();
    }
  }

  applyResizeDrag(evt, handle, element) {
    var vector, rotation;

    // When resizing, any rotation is relative to the current
    // dragging element, not each individual element, so if
    // you are dragging a rotated se handle away from its anchor,
    // all other boxes will resize in a uniform fashion. This
    // is why rotation needs to be compensated for here, not in
    // each element's resize method.
    vector   = new Point(evt.drag.x, evt.drag.y);
    rotation = element.getRotation();
    if (rotation) {
      vector = vector.rotate(-rotation);
    }

    this.draggingElements.forEach(el => {
      el.resize(vector.x, vector.y, handle.dir, evt.drag.constrained);
    });
    this.listener.onDimensionsUpdated();
  }

  applyRotationDrag(evt) {
    this.draggingElements.forEach(el => el.rotate(evt.rotation.offset, evt.shiftKey));
    this.listener.onRotationUpdated();
  }

  // --- Calculations

  elementIsFocused(element) {
    return this.focusedElements.some(el => el === element);
  }

  getFocusedSize() {
    return this.focusedElements.length;
  }

  getAllFocused() {
    return this.focusedElements;
  }

  getFirstFocused() {
    return this.focusedElements[0];
  }

  setDraggingElements(evt, element) {
    this.metaKeyActive = evt.metaKey;
    if (this.metaKeyActive) {
      this.draggingElements = [element];
    } else {
      this.draggingElements = this.focusedElements;
    }
  }

  /*
  temporarilyFocusDraggingElement() {
    //if (!this.draggingElement) return;
    this.previouslyFocusedElements = this.focusedElements;
    this.focusedElements = [this.getDraggingElement()];
  }

  releasedFocusedDraggingElement() {
    if (!this.previouslyFocusedElements) return;
    this.dragReset();
    this.focusedElements = this.previouslyFocusedElements;
    this.previouslyFocusedElements = null;
  }

  getDraggingElement() {
    // Currently dragging element may be a handle.
    var el = this.draggingElement;
    return el.target || el;
  }
  */

  // --- Output

  /*
  getFocusedElementStyles() {
    var elements = this.focusedElements, exclude = this.getExclusionMap(elements);
    var styles = elements.map(function(el) {
      return el.getStyles(exclude);
    });
    return styles.join('\n\n');
  }

  copy(evt) {
    var styles = this.getFocusedElementStyles();
    var hasStyles = styles.replace(/^\s+$/, '').length > 0;
    evt.preventDefault();
    evt.clipboardData.clearData();
    evt.clipboardData.setData('text/plain', styles);
    this.copyAnimation.animate(hasStyles);
  }

  save() {
    var styles = this.getFocusedElementStyles();
    var link = document.createElement('a');
    link.href = 'data:text/css;base64,' + btoa(styles);
    link.download = this.settings.get(Settings.SAVE_FILENAME);
    link.click();
  }

  getExclusionMap(elements) {
    if (elements.length < 2 || !this.settings.get(Settings.OUTPUT_UNIQUE_ONLY)) {
      return;
    }
    var map = elements[0].getExportedProperties();
    elements.slice(1).forEach(function(el) {
      map = hashIntersect(map, el.getExportedProperties());
    }, this);
    return map;
  }

  */

  destroyAll() {
    this.elements.forEach(el => el.destroy());
  }

}

/*-------------------------] DragSelection [--------------------------*/

// TODO: mouse coords are not aligning with box perfectly (looks like scrollbar issues)
class DragSelection extends DragTarget {

  constructor(root, listener) {
    super(document.documentElement);
    this.listener = listener;
    this.setupInterface(root);
  }

  setupInterface(root) {
    this.ui = new Element(root.getElementById('drag-selection'));
  }

  // --- Events

  onDragStart(evt) {
    super.onDragStart(evt);
    this.dragStartBox = CSSBox.fromPixelValues(evt.clientX, evt.clientY, 0, 0);
    this.ui.show();
    this.listener.onDragSelectionStart(this);
  }

  onDragMove(evt) {
    super.onDragMove(evt);

    this.cssBox = this.dragStartBox.clone();
    this.cssBox.moveEdges(evt.drag.x, evt.drag.y, 'se');
    this.render();
    // TODO: consolidate this listener model with other things that
    // are just binding an instances methods onto their own... which is better?
    this.listener.onDragSelectionMove(this);
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.listener.onDragSelectionStop(this);
    this.ui.hide();
  }

  onClick() {
    this.listener.onDragSelectionClear();
  }

  contains(el) {

    var center = this.getCenterForElement(el);
    var rect = this.ui.el.getBoundingClientRect();

    return rect.left   <= center.x &&
           rect.right  >= center.x &&
           rect.top    <= center.y &&
           rect.bottom >= center.y;

  }

  getCenterForElement(el) {
    var rect = el.getBoundingClientRect();
    return new Point(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  render() {
    this.cssBox.render(this.ui.el.style);
  }

  // --- Updating

  /*
  update(evt) {
    this.box.left   = evt.originX;
    this.box.top    = evt.originY;
    this.box.right  = evt.absX;
    this.box.bottom = evt.absY;
    this.render();
  }
  */

}

/*-------------------------] Panel [--------------------------*/

class ControlPanel extends DraggableElement {

  static get ACTIVE_CLASS() { return 'control-panel--active'; }

  static get TRANSFORM_ACTIVE_CLASS()  { return 'control-panel--element-transform-active'; }
  static get BACKGROUND_ACTIVE_CLASS() { return 'control-panel--element-background-active'; }

  static get LONG_SELECTOR_LENGTH() { return 30; }
  static get LONG_SELECTOR_CLASS()  { return 'element-area-selector--long'; }

  constructor(root, listener) {
    super(root.getElementById('control-panel'));
    this.disableEventsForInteractiveElements();

    this.listener = listener;

    this.defaultH = this.cssH;
    this.defaultV = this.cssV;

    this.setupAreas(root);
    this.setupUiEvents(root);
    this.setupRenderedElements(root);
    this.allowDoubleClick();
  }

  setupAreas(root) {
    this.helpArea           = new ControlPanelArea(root, 'help');
    this.alignArea          = new ControlPanelArea(root, 'align');
    this.defaultArea        = new ControlPanelArea(root, 'default');
    this.elementArea        = new ControlPanelArea(root, 'element');
    this.settingsArea       = new ControlPanelArea(root, 'settings');
    this.gettingStartedArea = new ControlPanelArea(root, 'getting-started');
  }

  setupUiEvents(root) {
    this.setupClickEvent(root, 'control-panel-settings-button', this.onControlPanelSettingsClick);
    this.setupClickEvent(root, 'settings-area-help-link', this.onSettingsAreaHelpLinkClick);
    this.setupClickEvent(root, 'getting-started-skip-link', this.onGettingStartedSkipLinkClick);
    this.setupClickEvent(root, 'align-top-button',          this.onAlignTopButtonClicked);
    this.setupClickEvent(root, 'align-hcenter-button',      this.onAlignHCenterButtonClicked);
    this.setupClickEvent(root, 'align-bottom-button',       this.onAlignBottomButtonClicked);
    this.setupClickEvent(root, 'align-left-button',         this.onAlignLeftButtonClicked);
    this.setupClickEvent(root, 'align-vcenter-button',      this.onAlignVCenterButtonClicked);
    this.setupClickEvent(root, 'align-right-button',        this.onAlignRightButtonClicked);
    this.setupClickEvent(root, 'distribute-hcenter-button', this.onDistributeHCenterButtonClicked);
    this.setupClickEvent(root, 'distribute-vcenter-button', this.onDistributeVCenterButtonClicked);
  }

  setupRenderedElements(root) {
    this.renderedElements = {
      'multiple':           new Element(root.getElementById('align-area-header')),
      'distributeButtons':  new Element(root.getElementById('distribute-buttons')),
      'modePosition':       new Element(root.getElementById('mode-position')),
      'modeResizeSe':       new Element(root.getElementById('mode-resize-se')),
      'modeResizeNw':       new Element(root.getElementById('mode-resize-nw')),
      'modeResize':         new Element(root.getElementById('mode-resize')),
      'modeRotate':         new Element(root.getElementById('mode-rotate')),
      'modeZIndex':         new Element(root.getElementById('mode-z-index')),
      'modeBackground':     new Element(root.getElementById('mode-background')),
      'selector':           new Element(root.getElementById('element-area-selector')),
      'position':           new Element(root.getElementById('element-area-position')),
      'dimensions':         new Element(root.getElementById('element-area-dimensions')),
      'zIndex':             new Element(root.getElementById('element-area-zindex')),
      'transform':          new Element(root.getElementById('element-area-transform')),
      'backgroundPosition': new Element(root.getElementById('element-area-background-position'))
    };
  }

  setMode(mode) {
    var el;
    switch (mode) {
      case 'position':   el = this.renderedElements.modePosition;   break;
      case 'resize-se':  el = this.renderedElements.modeResizeSe;   break;
      case 'resize-nw':  el = this.renderedElements.modeResizeNw;   break;
      case 'resize':     el = this.renderedElements.modeResize;     break;
      case 'rotate':     el = this.renderedElements.modeRotate;     break;
      case 'z-index':    el = this.renderedElements.modeZIndex;     break;
      case 'background': el = this.renderedElements.modeBackground; break;
    }
    if (el !== this.currentModeEl) {
      if (this.currentModeEl) {
        this.currentModeEl.hide();
      }
      el.show();
      this.currentModeEl = el;
    }
  }

  setupClickEvent(root, id, handler) {
    root.getElementById(id).addEventListener('click', evt => {
      evt.stopPropagation();
      handler.call(this, evt);
    });
  }

  onDoubleClick() {
    this.cssH = this.defaultH;
    this.cssV = this.defaultV;
    this.render();
  }

  activate() {
    this.show();
    this.addClass(ControlPanel.ACTIVE_CLASS);
    // TODO: necessary?
    this.active = true;
  }

  showHelpArea() {
    this.showArea(this.helpArea);
  }

  showElementArea() {
    this.showArea(this.elementArea);
  }

  showDefaultArea() {
    this.showArea(this.defaultArea);
  }

  showGettingStartedArea() {
    this.showArea(this.gettingStartedArea);
  }

  showSettingsArea() {
    this.showArea(this.settingsArea);
  }

  showAlignArea() {
    this.showArea(this.alignArea);
  }

  getAreaActiveClassName(area) {
    return 'control-panel--' + area.name + '-active';
  }

  showArea(area) {
    if (this.activeArea) {
      this.removeClass(this.getAreaActiveClassName(this.activeArea));
      this.activeArea.hide();
    }
    if (area !== this.elementArea) {
      this.removeClass(ControlPanel.TRANSFORM_ACTIVE_CLASS);
      this.removeClass(ControlPanel.BACKGROUND_ACTIVE_CLASS);
    }
    this.addClass(this.getAreaActiveClassName(area));
    area.show();
    this.activeArea = area;

    /*
     if (this.currentArea === area) return;
     this.areas.forEach(function(a) {
       var className = 'control-panel-' + a.name + '-active';
       if (a === area) {
         this.addClass(className);
         a.addClass('active-area');
       } else {
         this.removeClass(className);
         a.removeClass('active-area');
       }
     }, this);
     this.currentArea = area;
     if (area === this.elementArea) {
       this.defaultArea = this.elementArea;
     }
     if (area === this.settingsArea) {
       this.inputs[0].el.focus();
    // Forcing focus can make the scrolling go haywire,
    // so need to actively reset the scrolling here.
       this.resetScroll();
     } else {
       document.activeElement.blur();
     }
     */
  }

  // --- Rendering

  renderMultipleSelected(count) {
    this.renderedElements.multiple.text(count + ' elements selected');
    if (count > 2) {
      this.renderedElements.distributeButtons.unhide();
    } else {
      this.renderedElements.distributeButtons.hide();
    }
  }

  renderElementSelector(selector) {
    this.renderElementDetails(this.renderedElements.selector, selector);
    if (selector.length > ControlPanel.LONG_SELECTOR_LENGTH) {
      this.renderedElements.selector.addClass(ControlPanel.LONG_SELECTOR_CLASS);
    } else {
      this.renderedElements.selector.removeClass(ControlPanel.LONG_SELECTOR_CLASS);
    }
  }

  renderElementPosition(position) {
    this.renderElementDetails(this.renderedElements.position, position);
  }

  renderElementDimensions(dimensions) {
    this.renderElementDetails(this.renderedElements.dimensions, dimensions);
  }

  renderElementZIndex(zIndex) {
    if (zIndex) {
      zIndex += 'z';
    }
    this.renderElementDetails(this.renderedElements.zIndex, zIndex);
  }

  renderElementTransform(transform) {
    this.renderElementDetails(
      this.renderedElements.transform,
      transform,
      ControlPanel.TRANSFORM_ACTIVE_CLASS
    );
  }

  renderElementBackgroundPosition(backgroundPosition) {
    this.renderElementDetails(
      this.renderedElements.backgroundPosition,
      backgroundPosition,
      ControlPanel.BACKGROUND_ACTIVE_CLASS
    );
  }

  renderElementDetails(el, text, className) {
    if (this.activeArea !== this.elementArea) {
      return;
    }
    if (text) {
      el.text(text);
      if (className) {
        this.addClass(className);
      } else {
        el.unhide();
      }
    } else {
      if (className) {
        this.removeClass(className);
      } else {
        el.hide();
      }
    }
  }

  // --- Button Events

  onControlPanelSettingsClick() {
    this.showSettingsArea();
  }

  onSettingsAreaHelpLinkClick() {
    this.showHelpArea();
  }

  onGettingStartedSkipLinkClick() {
    this.listener.onGettingStartedSkip();
  }

  // --- Align Button Events

  onAlignTopButtonClicked() {
    this.listener.onAlignButtonClicked('top');
  }

  onAlignHCenterButtonClicked() {
    this.listener.onAlignButtonClicked('hcenter');
  }

  onAlignBottomButtonClicked() {
    this.listener.onAlignButtonClicked('bottom');
  }

  onAlignLeftButtonClicked() {
    this.listener.onAlignButtonClicked('left');
  }

  onAlignVCenterButtonClicked() {
    this.listener.onAlignButtonClicked('vcenter');
  }

  onAlignRightButtonClicked() {
    this.listener.onAlignButtonClicked('right');
  }

  onDistributeHCenterButtonClicked() {
    this.listener.onDistributeButtonClicked('hcenter');
  }

  onDistributeVCenterButtonClicked() {
    this.listener.onDistributeButtonClicked('vcenter');
  }

  // --- Drag Events

  onDragStart(evt) {
    super.onDragStart(evt);
    this.listener.onControlPanelDragStart(evt);
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.listener.onControlPanelDragStop(evt);
  }

}

class ControlPanelArea extends Element {

  static get ACTIVE_CLASS() { return 'control-panel-area--active'; }

  constructor(root, name) {
    super(root.getElementById(name + '-area'));
    this.name = name;
  }

  show() {
    this.addClass(ControlPanelArea.ACTIVE_CLASS);
  }

  hide() {
    this.removeClass(ControlPanelArea.ACTIVE_CLASS);
  }

}

/*-------------------------] ControlPanel [--------------------------*/

// class ControlPanel extends DraggableElement {
// 
//   static get FADE_DELAY() { return 200; }
// 
//   static get ALIGN_TOP_ICON()        { return 'align-top';     }
//   static get ALIGN_LEFT_ICON()       { return 'align-left';    }
//   static get ALIGN_RIGHT_ICON()      { return 'align-right';   }
//   static get ALIGN_BOTTOM_ICON()     { return 'align-bottom';  }
//   static get ALIGN_VERTICAL_ICON()   { return 'align-vcenter'; }
//   static get ALIGN_HORIZONTAL_ICON() { return 'align-hcenter'; }
// 
//   static get DISTRIBUTE_TOP_ICON()        { return 'distribute-top';     }
//   static get DISTRIBUTE_LEFT_ICON()       { return 'distribute-left';    }
//   static get DISTRIBUTE_RIGHT_ICON()      { return 'distribute-right';   }
//   static get DISTRIBUTE_BOTTOM_ICON()     { return 'distribute-bottom';  }
//   static get DISTRIBUTE_VERTICAL_ICON()   { return 'distribute-vcenter'; }
//   static get DISTRIBUTE_HORIZONTAL_ICON() { return 'distribute-hcenter'; }
// 
//   static get ARROW_KEY_ICON() { return 'arrow-key'; }
// 
//   static get SHIFT_CHAR()   { return '\u21e7'; }
//   static get CTRL_CHAR()    { return '\u2303'; }
//   static get OPTION_CHAR()  { return '\u2325'; }
//   static get COMMAND_CHAR() { return '\u2318'; }
// 
//   // TODO: does this make sense somewhere else?
//   static getCommandModifierKey() {
//     return navigator.platform.match(/Mac/) ? ControlPanel.COMMAND_CHAR : ControlPanel.CTRL_CHAR;
//   }
// 
//   constructor(settings) {
//     super(document.body, 'div', 'control-panel');
// 
//     this.settings = settings;
// 
//     this.build(settings);
//     this.currentArea = null;
// 
//     // TODO: is this required?
//     this.getPosition();
//   }
// 
//   build(settings) {
// 
//     this.areas = [];
//     this.inputs = [];
// 
//     //this.buildHelpArea();
//     this.buildDefaultArea();
//     this.buildGettingStartedArea();
//     //this.buildElementArea();
//     //this.buildQuickStartArea();
//     //this.buildSettingsArea(settings);
// 
//     //this.createState('position', 'Move', ControlPanel.POSITION_ICON);
//     //this.createState('resize', 'Resize', ControlPanel.RESIZE_ICON);
//     //this.createState('resize-nw', 'Resize', ControlPanel.RESIZE_NW_ICON);
//     //this.createState('resize-se', 'Resize', ControlPanel.RESIZE_SE_ICON);
//     //this.createState('background-position', 'Background', ControlPanel.BG_IMAGE_ICON);
//     //this.createState('z-index', 'Z-Index', ControlPanel.Z_INDEX_ICON);
//     //this.createState('rotate', 'Rotate', ControlPanel.ROTATE_ICON);
// 
//     //this.buildButton(ControlPanel.SETTINGS_ICON, this.settingsArea);
//     //this.bindEventListener('dblclick', this.resetPosition);
// 
//     //this.defaultArea = this.getStartArea();
//     //this.resetArea();
//     this.setArea(this.defaultArea);
//   }
// 
//   buildButton(iconId, area) {
//     var button = new IconElement(this.el, iconId, area.name + '-button');
//     button.addEventListener('click', this.toggleArea.bind(this, area));
//   }
// 
//   /*
//   buildArea(upper) {
//     var camel = upper.slice(0, 1).toLowerCase() + upper.slice(1);
//     var lower = upper.toLowerCase();
//     var area = new Element(this.el, 'div', 'area '+ lower +'-area');
//     area.name = lower;
//     this[camel + 'Area'] = area;
//     this.areas.push(area);
//     this['build' + upper + 'Area'](area);
//   }
//   */
// 
//   buildGettingStartedArea(area) {
// 
//     var area = new ControlPanelArea(this, 'getting-started');
// 
//     area.buildBlock('help', function(block) {
//       block.addIcon(ControlPanel.MOUSE_ICON);
//       block.addText('Use the mouse to drag, resize, and rotate elements.');
//       //new IconElement(area.el, ControlPanel.MOUSE_ICON, 'start-icon');
//       //new Element(area.el, 'div', 'start-help-text').html('Use the mouse to drag, resize, and rotate elements.');
//     });
// 
//     area.buildBlock('help', function(block) {
//       //var bKey = block.getKeyIconHtml('b');
//       //var sKey = block.getKeyIconHtml('s');
//       //var mKey = block.getKeyIconHtml('m');
//       //var bKey = this.buildInlineKeyIcon('b');
//       //var sKey = this.buildInlineKeyIcon('s');
//       //var mKey = this.buildInlineKeyIcon('m');
//       //var text = 'Arrow keys nudge elements.<br>'+ bKey + sKey + mKey +' change nudge modes.';
// 
//       block.addIcon(ControlPanel.KEYBOARD_ICON);
//       block.addTextWithKeyIcons('Arrow keys nudge elements.<br>:b :s :m change nudge modes.');
//       //block.addText(text);
// 
//     });
// 
//     area.buildBlock('help', function(block) {
//       block.addIcon(ControlPanel.BG_IMAGE_ICON);
//       block.addText('Double click on a background image to fit sprite dimensions.');
//     });
// 
//     area.buildBlock('help', function(block) {
// 
//       var cmd = ControlPanel.getCommandModifierKey();
//       //var cKey = this.buildInlineKeyIcon('c');
//       //var sKey = this.buildInlineKeyIcon('s');
//       //var text = cmdKey + cKey + ' Copy styles to clipboard<br>' + cmdKey + sKey +' Save styles to disk';
// 
//       block.addIcon(ControlPanel.DOWNLOAD_ICON);
//       block.addTextWithKeyIcons(`:${cmd} :c Copy styles to clipboard<br>:${cmd} :s Save styles to disk`, 'text-left');
//       //new Element(area.el, 'div', 'start-help-text start-help-text-left').html(text);
//     });
// 
//     area.addVisualElement('horizontal-line');
//     area.addVisualElement('vertical-line');
// 
//     area.addLinkAction("Don't Show", 'skip', 'skipStartArea');
// 
//     /*
//     var hide = new Element(this.startArea.el, 'span', 'start-hide-link').html("Don't Show");
//     hide.addEventListener('click', this.skipStartArea.bind(this));
//     */
// 
//     this.gettingStartedArea = area;
// 
//     /*
//     area.buildBlock('keyboard', function(area) {
//       var bKey = this.buildInlineKeyIcon('b');
//       var sKey = this.buildInlineKeyIcon('s');
//       var mKey = this.buildInlineKeyIcon('m');
//       var text = 'Arrow keys nudge elements.<br>'+ bKey + sKey + mKey +' change nudge modes.';
// 
//       new IconElement(area.el, ControlPanel.KEYBOARD_ICON, 'start-icon');
//       new Element(area.el, 'div', 'start-help-text').html(text);
// 
//     });
// 
//     area.buildBlock('sprites', function(area) {
//       new IconElement(area.el, ControlPanel.BG_IMAGE_ICON, 'start-icon');
//       new Element(area.el, 'div', 'start-help-text').html('Double click on a background image to fit sprite dimensions.');
//     });
// 
//     area.buildBlock('output', function(area) {
// 
//       var cmdKey = this.buildInlineKeyIcon(ControlPanel.getCommandModifierKey());
//       var cKey = this.buildInlineKeyIcon('c');
//       var sKey = this.buildInlineKeyIcon('s');
//       var text = cmdKey + cKey + ' Copy styles to clipboard<br>' + cmdKey + sKey +' Save styles to disk';
// 
//       new IconElement(area.el, ControlPanel.DOWNLOAD_ICON, 'start-icon');
//       new Element(area.el, 'div', 'start-help-text start-help-text-left').html(text);
//     });
// 
//     area.addElement('start-horizontal-line');
//     area.addElement('start-vertical-line');
// 
//     var hide = new Element(this.startArea.el, 'span', 'start-hide-link').html("Don't Show");
//     hide.addEventListener('click', this.skipStartArea.bind(this));
//     */
//   }
// 
// 
//   buildHelpArea(area) {
// 
//     this.buildArea('Help');
// 
//     // Keyboard help area
// 
//     var keyboardHelp = this.buildHelpBlock('keys', 'Keyboard');
// 
//     this.buildHelpBox(keyboardHelp.el, 'arrow', function(box, text) {
//       var box = new Element(box.el, 'div', 'key-icon');
//       new IconElement(box.el, ControlPanel.ARROW_KEY_ICON, 'arrow-key-icon');
//       text.html('Use the arrow keys to nudge the element.');
//     });
// 
//     this.buildHelpBox(keyboardHelp.el, 'shift', function(box, text) {
//       new Element(box.el, 'div', 'key-icon shift-key-icon').html(ControlPanel.SHIFT_CHAR);
//       text.html('Shift: Constrain dragging / nudge multiplier / select multiple.');
//     });
// 
//     this.buildHelpBox(keyboardHelp.el, 'ctrl', function(box, text) {
//       new Element(box.el, 'div', 'key-icon ctrl-key-icon').html(ControlPanel.CTRL_CHAR);
//       text.html('Ctrl: Move the background image when dragging.');
//     });
// 
//     this.buildHelpBox(keyboardHelp.el, 'alt', function(box, text) {
//       new Element(box.el, 'div', 'key-icon alt-key-icon').html(ControlPanel.OPTION_CHAR);
//       text.html('Option/Alt: Peek at the background image.');
//     });
// 
//     this.buildHelpBox(keyboardHelp.el, 'cmd', function(box, text) {
//       new Element(box.el, 'div', 'key-icon alt-key-icon').html(ControlPanel.COMMAND_CHAR);
//       text.html('Cmd/Win: While dragging, temporarily move a single element.');
//     });
// 
//     this.buildHelpBox(keyboardHelp.el, 'b', function(box, text) {
//       new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('b');
//       text.html('Toggle background image nudge.');
//     });
// 
//     this.buildHelpBox(keyboardHelp.el, 's', function(box, text) {
//       new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('s');
//       text.html('Toggle size nudge.');
//     });
// 
//     this.buildHelpBox(keyboardHelp.el, 'm', function(box, text) {
//       new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('m');
//       text.html('Toggle position (move) nudge.');
//     });
// 
//     this.buildHelpBox(keyboardHelp.el, 'r', function(box, text) {
//       new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('r');
//       text.html('Toggle rotation nudge.');
//     });
// 
//     this.buildHelpBox(keyboardHelp.el, 'z', function(box, text) {
//       new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('z');
//       text.html('Toggle z-index nudge.');
//     });
// 
// 
//     // Mouse help area
// 
//     var mouseHelp = this.buildHelpBlock('mouse', 'Mouse');
// 
//     this.buildHelpBox(mouseHelp.el, 'position', function(box, text) {
//       new Element(box.el, 'div', 'help-element');
//       new IconElement(box.el, ControlPanel.POSITION_ICON, 'help-icon position-help-icon');
//       text.html('Drag the middle of the element to move it around.');
//     });
//     this.buildHelpBox(mouseHelp.el, 'resize', function(box, text) {
//       new Element(box.el, 'div', 'help-element');
//       new Element(box.el, 'div', 'resize-help-icon resize-nw-help-icon');
//       new Element(box.el, 'div', 'resize-help-icon resize-n-help-icon');
//       new Element(box.el, 'div', 'resize-help-icon resize-ne-help-icon');
//       new Element(box.el, 'div', 'resize-help-icon resize-e-help-icon');
//       new Element(box.el, 'div', 'resize-help-icon resize-se-help-icon');
//       new Element(box.el, 'div', 'resize-help-icon resize-s-help-icon');
//       new Element(box.el, 'div', 'resize-help-icon resize-sw-help-icon');
//       new Element(box.el, 'div', 'resize-help-icon resize-w-help-icon');
//       text.html('Drag border handles to resize.');
//     });
// 
//     this.buildHelpBox(mouseHelp.el, 'rotate', function(box, text) {
//       new Element(box.el, 'div', 'help-element');
//       new Element(box.el, 'div', 'rotate-handle');
//       text.html('Drag the rotate handle to rotate the element.');
//     });
// 
//     this.buildHelpBox(mouseHelp.el, 'snapping', function(box, text) {
//       new Element(box.el, 'div', 'help-element');
//       new IconElement(box.el, ControlPanel.BG_IMAGE_ICON, 'help-icon snapping-help-icon');
//       new IconElement(box.el, ControlPanel.POINTER_ICON, 'help-icon snapping-help-pointer-icon');
//       text.html('Double click to snap element dimensions to a background sprite.');
//     });
// 
//     this.buildHelpBox(mouseHelp.el, 'aligning', function(box, text) {
//       new Element(box.el, 'div', 'help-element multiple-select-help');
//       new IconElement(box.el, ControlPanel.POINTER_ICON, 'help-icon aligning-pointer-icon');
//       new Element(box.el, 'div', 'icon help-icon aligning-box-one');
//       new Element(box.el, 'div', 'icon help-icon aligning-box-two');
//       text.html('Drag to select multiple elements.');
//     });
// 
// 
//     // Command help area
// 
//     var commandHelp = this.buildHelpBlock('command', 'Commands');
// 
//     this.buildHelpBox(commandHelp.el, 'undo', function(box, text) {
//       box.addClass('command-help-box');
//       new Element(box.el, 'div', 'key-icon alt-key-icon').html(ControlPanel.getCommandModifierKey());
//       new Element(box.el, 'span', 'key-plus').html('+');
//       new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('z');
//       text.html('Undo');
//     });
// 
//     this.buildHelpBox(commandHelp.el, 'select-all', function(box, text) {
//       box.addClass('command-help-box');
//       new Element(box.el, 'div', 'key-icon alt-key-icon').html(ControlPanel.getCommandModifierKey());
//       new Element(box.el, 'span', 'key-plus').html('+');
//       new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('a');
//       text.html('Select All');
//     });
// 
//     this.buildHelpBox(commandHelp.el, 'copy', function(box, text) {
//       box.addClass('command-help-box');
//       new Element(box.el, 'div', 'key-icon alt-key-icon').html(ControlPanel.getCommandModifierKey());
//       new Element(box.el, 'span', 'key-plus').html('+');
//       new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('c');
//       text.html('Copy Styles');
//     });
// 
//     this.buildHelpBox(commandHelp.el, 'save', function(box, text) {
//       box.addClass('command-help-box');
//       new Element(box.el, 'div', 'key-icon alt-key-icon').html(ControlPanel.getCommandModifierKey());
//       new Element(box.el, 'span', 'key-plus').html('+');
//       new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('s');
//       text.html('Save Styles');
//     });
// 
//   }
// 
//   buildHelpBox(el, name, fn) {
//     var help = new Element(el, 'div', 'help ' + name + '-help');
//     var box  = new Element(help.el, 'div', 'help-box ' + name + '-help-box');
//     var text = new Element(help.el, 'div', 'help-text ' + name + '-help-text');
//     fn.call(this, box, text);
//   }
// 
//   buildElementArea(area) {
//     this.buildArea('Element');
// 
//     this.singleElementArea = new Element(area.el, 'div', 'single-element-area');
//     this.elementHeader     = new Element(this.singleElementArea.el, 'h3', 'single-header');
// 
//     this.elementDetails  = new Element(this.singleElementArea.el, 'div', 'details');
//     this.detailsLeft     = new Element(this.elementDetails.el, 'span').title('Left');
//     this.detailsComma1   = new Element(this.elementDetails.el, 'span').html(', ');
//     this.detailsTop      = new Element(this.elementDetails.el, 'span').title('Top');
//     this.detailsComma2   = new Element(this.elementDetails.el, 'span').html(', ');
//     this.detailsZIndex   = new Element(this.elementDetails.el, 'span').title('Z-Index');
//     this.detailsDivider1 = new Element(this.elementDetails.el, 'span').html(' | ');
//     this.detailsWidth    = new Element(this.elementDetails.el, 'span').title('Width');
//     this.detailsComma3   = new Element(this.elementDetails.el, 'span').html(', ');
//     this.detailsHeight   = new Element(this.elementDetails.el, 'span').title('Height');
//     this.detailsDivider2 = new Element(this.elementDetails.el, 'span').html(' | ');
//     this.detailsRotation = new Element(this.elementDetails.el, 'span').title('Rotation (other transforms hidden)');
// 
//     this.multipleElementArea   = new Element(area.el, 'div', 'multiple-element-area');
//     this.multipleElementHeader = new Element(this.multipleElementArea.el, 'h3', 'multiple-header');
//     this.buildAlignActions(area);
// 
//     this.elementStates  = new Element(area.el, 'div', 'element-states');
//     this.stateIcons = [];
//   }
// 
//   buildAlignActions(area) {
//     this.elementActions = new Element(this.multipleElementArea.el, 'div', 'element-actions');
// 
//     this.alignLeft       = this.buildDelegated(ControlPanel.ALIGN_LEFT_ICON, 'Align Left');
//     this.alignHorizontal = this.buildDelegated(ControlPanel.ALIGN_HORIZONTAL_ICON, 'Align Horizontal');
//     this.alignRight      = this.buildDelegated(ControlPanel.ALIGN_RIGHT_ICON, 'Align Right');
//     this.alignTop        = this.buildDelegated(ControlPanel.ALIGN_TOP_ICON, 'Align Top');
//     this.alignVertical   = this.buildDelegated(ControlPanel.ALIGN_VERTICAL_ICON, 'Align Vertical');
//     this.alignBottom     = this.buildDelegated(ControlPanel.ALIGN_BOTTOM_ICON, 'Align Bottom');
// 
//     this.distributeLeft       = this.buildDelegated(ControlPanel.DISTRIBUTE_LEFT_ICON, 'Distribute Left');
//     this.distributeHorizontal = this.buildDelegated(ControlPanel.DISTRIBUTE_HORIZONTAL_ICON, 'Distribute Horizontal');
//     this.distributeRight      = this.buildDelegated(ControlPanel.DISTRIBUTE_RIGHT_ICON, 'Distribute Right');
//     this.distributeTop        = this.buildDelegated(ControlPanel.DISTRIBUTE_TOP_ICON, 'Distribute Top');
//     this.distributeVertical   = this.buildDelegated(ControlPanel.DISTRIBUTE_VERTICAL_ICON, 'Distribute Vertical');
//     this.distributeBottom     = this.buildDelegated(ControlPanel.DISTRIBUTE_BOTTOM_ICON, 'Distribute Bottom');
// 
//   }
// 
//   buildDelegated(iconId, action) {
//     var methodName = action.charAt(0).toLowerCase() + action.slice(1).replace(' ', '');
//     var icon       = new IconElement(this.elementActions.el, iconId, 'element-action');
//     icon.el.title = action;
//     icon.addEventListener('click', function() {
//       elementManager[methodName]();
//     });
//   }
// 
//   /*
//   buildElementAlign(type, iconId, title) {
//     var method = type === 'horizontal' || type === 'vertical' ? 'alignMiddle' : 'alignFocused';
//     var action = new IconElement(this.elementActions.el, iconId, 'element-action');
//     action.el.title = title;
//     action.addEventListener('click', this.delegateElementAction(method, type));
//   }
// 
//   buildElementDistribute(type, iconId, title) {
//     var action = new IconElement(this.elementActions.el, iconId, 'element-action');
//     action.el.title = title;
//     action.addEventListener('click', this.delegateElementAction('alignFocused', type, true));
//   }
//   */
// 
//   buildSettingsArea(settings) {
// 
//     this.buildArea('Settings');
// 
//     var header = new Element(this.settingsArea.el, 'h4', 'settings-header').html('Settings');
// 
//     this.buildTextField(area, Settings.DOWNLOAD_FILENAME, 'Filename when saving:', 'filename');
//     this.buildTextField(area, Settings.EXCLUDE_SELECTOR, 'Exclude elements matching:', 'CSS Selector');
//     this.buildTextField(area, Settings.INCLUDE_SELECTOR, 'Include elements matching:', 'CSS Selector');
// 
//     this.buildSelect(area, Settings.TABS, 'Tab style:', [
//       [Settings.TABS_TAB, 'Tab'],
//       [Settings.TABS_TWO_SPACES, 'Two Spaces'],
//       [Settings.TABS_FOUR_SPACES, 'Four Spaces']
//     ]);
// 
//     this.buildSelect(area, Settings.SELECTOR, 'Output Selector:', [
//       [Settings.SELECTOR_AUTO, 'Auto', 'Element id or first class will be used', '#id | .first { ... }'],
//       [Settings.SELECTOR_NONE, 'None', 'No selector used. Styles will be inline.', 'width: 200px; height: 200px;...'],
//       [Settings.SELECTOR_ID, 'Id', 'Element id will be used', '#id { ... }'],
//       [Settings.SELECTOR_FIRST, 'First Class', 'First class name found will be used', '.first { ... }'],
//       [Settings.SELECTOR_LONGEST, 'Longest Class', 'Longest class name found will be used', '.long-class-name { ... }'],
//       [Settings.SELECTOR_ALL, 'All Classes', 'All class names will be output together', '.one.two.three { ... }'],
//       [Settings.SELECTOR_TAG, 'Tag', 'Only the tag name will be output', 'section { ... }'],
//       [Settings.SELECTOR_TAG_NTH, 'Tag:nth-child', 'The tag name + tag\'s nth-child selector will be output', 'li:nth-child(3) { ... }'],
//     ]);
// 
//     this.buildCheckboxField(area, Settings.OUTPUT_CHANGED, 'Only output changed styles:');
//     this.buildCheckboxField(area, Settings.OUTPUT_UNIQUE, 'Exclude styles common to a group:');
// 
//     var save  = new Element(this.settingsArea.el, 'button', 'settings-save').html('Save');
//     var reset = new Element(this.settingsArea.el, 'button', 'settings-reset').html('Reset All');
//     var help  = new Element(header.el, 'span', 'settings-help-link').html('Help');
// 
//     reset.addEventListener('click', this.clearSettings.bind(this));
//     save.addEventListener('click', this.saveSettings.bind(this));
//     help.addEventListener('click', this.setArea.bind(this, this.helpArea));
// 
//     area.addEventListener('mousedown', this.filterClicks.bind(this));
//     area.addEventListener('mouseup', this.filterClicks.bind(this));
//     area.addEventListener('keydown', this.filterKeyboardInput.bind(this));
//   }
// 
//   buildTextField(area, name, label, placeholder) {
//     this.buildFormControl(area, name, label, function(block) {
//       var input = new Element(block.el, 'input', 'setting-input setting-text-input');
//       input.el.type = 'text';
//       input.el.placeholder = placeholder;
//       input.el.value = this.settings.get(name);
//       this.inputs.push(input);
//       return input;
//     });
//   }
// 
//   buildCheckboxField(area, name, label) {
//     this.buildFormControl(area, name, label, function(block) {
//       var input = new Element(block.el, 'input', 'setting-input setting-text-input');
//       input.el.type = 'checkbox';
//       input.el.checked = !!this.settings.get(name);
//       this.inputs.push(input);
//       return input;
//     });
//   }
// 
//   buildSelect(area, name, label, options) {
//     var select;
//     this.buildFormControl(area, name, label, function(block) {
//       select = new Element(block.el, 'select', 'setting-input');
//       if (options[0].length > 2) {
//         // Associated descriptions exist so create the elements
//         this[name + 'Description'] = new Element(block.el, 'div', 'setting-description');
//         this[name + 'Example'] = new Element(block.el, 'div', 'setting-example');
//       }
//       options.forEach(function(o) {
//         var option = new Element(select.el, 'option', 'setting-option');
//         option.el.value = o[0];
//         option.el.textContent = o[1];
//         if (o[2]) {
//           option.el.dataset.description = o[2];
//           option.el.dataset.example = o[3];
//         }
//         if (this.settings.get(name) === option.el.value) {
//           option.el.selected = true;
//         }
//       }, this);
//       return select;
//     });
//     this.checkLinkedDescription(select.el);
//   }
// 
//   buildFormControl(area, name, label, fn) {
//     var field = new Element(area.el, 'fieldset', 'setting-field');
//     var label = new Element(field.el, 'label', 'setting-label').html(label);
//     var block = new Element(field.el, 'div', 'setting-block');
//     var input = fn.call(this, block);
//     input.el.id = 'setting-' + name;
//     input.el.name = name;
//     label.el.htmlFor = input.el.id;
//     input.el.dataset.name = name;
//     input.addEventListener('change', this.inputChanged.bind(this));
//   }
// 
//   setFormControl(control) {
//     var el = control.el;
//     var value = this.settings.get(el.name);
//     if (el.type === 'checkbox') {
//       el.checked = value;
//     } else {
//       el.value = value;
//     }
//   }
// 
//   createState(name, text, iconId) {
//     var state = new Element(this.elementStates.el, 'div', 'element-state ' + name + '-state');
//     state.name = name;
//     new IconElement(state.el, iconId, 'element-state-icon');
//     new Element(state.el, 'p', 'element-state-text').html(text);
//     this.stateIcons.push(state);
//   }
// 
// 
//   // --- Events
// 
//   inputChanged(evt) {
//     var target = evt.target;
//     this.settings.set(target.dataset.name, target.value);
//     if (target.selectedIndex !== undefined) {
//       this.checkLinkedDescription(target);
//     }
//   }
// 
//   filterClicks(evt) {
//     evt.stopPropagation();
//   }
// 
//   filterKeyboardInput(evt) {
//     evt.stopPropagation();
//     if (evt.keyCode === KeyEventManager.ENTER) {
//       this.saveSettings();
//     }
//   }
// 
//   // --- Actions
// 
//   setState(name) {
//     this.stateIcons.forEach(function(i) {
//       if (i.name === name) {
//         i.addClass('element-active-state');
//       } else {
//         i.removeClass('element-active-state');
//       }
//     });
//   }
// 
//   checkLinkedDescription(select) {
//     var name = select.dataset.name;
//     var option = select.options[select.selectedIndex];
//     var description = this[name + 'Description'];
//     var example = this[name + 'Example'];
//     if (description && example) {
//       description.html(option.dataset.description);
//       example.html(option.dataset.example);
//     }
//   }
// 
//   setArea(area) {
//     /*
//     if (this.currentArea === area) return;
//     this.areas.forEach(function(a) {
//       var className = 'control-panel-' + a.name + '-active';
//       if (a === area) {
//         this.addClass(className);
//         a.addClass('active-area');
//       } else {
//         this.removeClass(className);
//         a.removeClass('active-area');
//       }
//     }, this);
//     this.currentArea = area;
//     if (area === this.elementArea) {
//       this.defaultArea = this.elementArea;
//     }
//     if (area === this.settingsArea) {
//       this.inputs[0].el.focus();
//       // Forcing focus can make the scrolling go haywire,
//       // so need to actively reset the scrolling here.
//       this.resetScroll();
//     } else {
//       document.activeElement.blur();
//     }
//     */
//   }
// 
//   /*
//   toggleArea(area) {
//     if (this.currentArea !== area) {
//       this.setArea(area);
//     } else {
//       this.resetArea();
//     }
//   }
// 
//   clearSettings() {
//     if (confirm('Really clear all settings?')) {
//       this.settings.clear();
//       this.inputs.forEach(this.setFormControl, this);
//       this.setArea(this.defaultArea);
//       this.checkSelectorUpdate();
//     }
//   }
// 
//   saveSettings() {
//     this.setArea(this.defaultArea);
//     this.checkSelectorUpdate();
//   }
// 
//   checkSelectorUpdate() {
//     if (this.selectorsChanged()) {
//       window.currentElementManager.refresh();
//       this.settings.update(Settings.INCLUDE_SELECTOR);
//       this.settings.update(Settings.EXCLUDE_SELECTOR);
//     }
//   }
//   */
// 
//   selectorsChanged() {
//     return this.settings.hasChanged(Settings.INCLUDE_SELECTOR) || this.settings.hasChanged(Settings.EXCLUDE_SELECTOR);
//   }
// 
//   /*
//   resetArea(area) {
//     this.setArea(this.defaultArea);
//   }
// 
//   getStartArea() {
//     if (this.settings.get(Settings.SHOW_GET)) {
//       return this.quickStartArea;
//     } else {
//       return this.startArea;
//     }
//   }
// 
//   showElementArea() {
//     this.setArea(this.elementArea);
//   }
// 
//   skipStartArea() {
//     this.settings.set(Settings.SKIP_QUICK_START, '1');
//     this.defaultArea = this.getStartArea();
//     this.resetArea();
//   }
//   */
// 
//   // TODO: clean this up
//   delegateElementAction(action) {
//     var args = Array.prototype.slice.call(arguments, 1);
//     return function () {
//       elementManager[action].apply(elementManager, args);
//     }
//   }
// 
//   deactivate() {
//     if (!this.active) return;
//     this.active = false;
//     this.removeClass(ControlPanel.ACTIVE_CLASS);
//     setTimeout(function() {
//       this.hide();
//     }.bind(this), ControlPanel.FADE_DELAY);
//   }
// 
//   // --- Transform
// 
//   resetPosition() {
//     this.position = this.defaultPostion;
//     this.updatePosition();
//   }
// 
//   setSelectorText(str) {
//     var html;
//     if (!str) {
//       str = '[Inline Selector]';
//       var className = EXTENSION_CLASS_PREFIX + 'inline-selector';
//       html = '<span class="'+ className +'">' + str + '</span>';
//     }
//     this.elementHeader.html(html || str);
//     this.elementHeader.el.title = str;
//   }
// 
//   setElementDetails(el) {
// 
//     this.detailsLeft.html(el.box.cssLeft);
//     this.detailsTop.html(el.box.cssTop);
//     this.detailsWidth.html(el.box.cssWidth);
//     this.detailsHeight.html(el.box.cssHeight);
// 
//     if (el.zIndex.isNull()) {
//       this.detailsZIndex.hide();
//       this.detailsComma2.hide();
//     } else {
//       this.detailsZIndex.html(el.zIndex);
//       this.detailsZIndex.show(false);
//       this.detailsComma2.show(false);
//     }
// 
//     //var rotation = el.getRoundedRotation();
//     if (el.transform.getRotation()) {
//       this.detailsRotation.html(el.transform.getRotationString());
//       this.detailsRotation.show(false);
//       this.detailsDivider2.show(false);
//     } else {
//       this.detailsRotation.hide();
//       this.detailsDivider2.hide();
//     }
// 
//   }
// 
//   setMultipleText(str) {
//     this.multipleElementHeader.html(str);
//   }
// 
//   update() {
//     var size = elementManager.getFocusedSize();
//     if (size === 0) {
//       this.setArea(this.quickStartArea);
//       return;
//     } else if (size === 1) {
//       this.setSingle(elementManager.getFirstFocused());
//     } else {
//       this.setMultiple(elementManager.getAllFocused());
//     }
//     this.setState(nudgeManager.mode);
//     this.showElementArea();
//   }
// 
//   setSingle(el) {
//     this.setSelectorText(el.getSelector());
//     this.setElementDetails(el);
//     this.singleElementArea.show();
//     this.multipleElementArea.hide();
//   }
// 
//   setMultiple(els) {
//     this.setMultipleText(els.length + ' elements selected');
//     this.singleElementArea.hide();
//     this.multipleElementArea.show();
//   }
// 
// 
//   // --- Events
// 
//   onDragStart(evt) {
//     this.lastPosition = this.position;
//   }
// 
//   onDragMove(evt) {
//     this.position = new Point(this.lastPosition.x + evt.dragOffset.x, this.lastPosition.y - evt.dragOffset.y);
//     this.updatePosition();
//   }
// 
//   // --- Compute
// 
//   getPosition() {
//     var style = window.getComputedStyle(this.el);
//     this.position = new Point(parseInt(style.left), parseInt(style.bottom));
//     this.defaultPostion = this.position;
//   }
// 
//   // --- Update
// 
//   updatePosition() {
//     this.el.style.left   = this.position.x + 'px';
//     this.el.style.bottom = this.position.y + 'px';
//   }
// 
// }

/*-------------------------] Control Panel Components [--------------------------*/

/*
class ControlPanelComponent extends Element {

  static get KEY_ICON_REG() { return /:(.)/g }

  constructor(parent, className) {
    super(parent, 'div', className);
  }

  addText(str, className) {
    var text = new Element(this.el, 'div', this.getClassName('text'));
    text.html(str);
    if (className) {
      text.addClass(className);
    }
  }

  addIcon(id) {
    var icon = new Element(this.el, 'img', this.getClassName('icon'));
    icon.el.src = chrome.extension.getURL('images/icons/' + id + '.svg');
  }

  addVisualElement(className) {
    new Element(this.el, 'div', this.getClassName(className));
  }

  addTextWithKeyIcons(str, className) {
    str = str.replace(ControlPanelComponent.KEY_ICON_REG, function(match, key) {
      return `<span class="${EXTENSION_CLASS_PREFIX}control-panel-key-icon">${key}</span>`;
    });
    this.addText(str, className);
  }

  addLinkAction(str, className, actionName) {
    var panel = this.getControlPanel();
    var link = new Element(this.el, 'a', this.getClassName(className));
    link.html(str);
    link.addEventListener('click', function(evt) {
      console.info('NEIN', evt, this);
      panel[actionName].call(panel);
    });
    //area.addLinkAction("Don't Show", 'skip', 'skipStartArea');
//this.
  }

}
*/

/*
class ControlPanelArea extends ControlPanelComponent {

  constructor(panel, name) {
    super(panel.el, 'control-panel-area');
    this.panel = panel;
    this.name  = name;
  }

  buildBlock(name, fn) {
    var block = new ControlPanelBlock(this, name);
    fn(block);

    /*
    area.buildBlock('mouse', function(block) {
      block.addIcon('start-icon', ControlPanel.MOUSE_ICON);
      block.addText('start-help-text', 'Use the mouse to drag, resize, and rotate elements.');
      //new IconElement(area.el, ControlPanel.MOUSE_ICON, 'start-icon');
      //new Element(area.el, 'div', 'start-help-text').html('Use the mouse to drag, resize, and rotate elements.');
    });
  }
    */

  /*
  buildStartBlock(type, fn) {
    var block = new Element(this.startArea.el, 'div', 'start-help');
    fn.call(this, block);
  }

  buildHelpBlock(name, header) {
    var block = new Element(this.helpArea.el, 'div', 'help-block '+ name +'-help-block');
    if (header) {
      new Element(block.el, 'h4', 'help-block-header').html(header);
    }
    return block;
  }
  getClassName(className) {
    return `${this.name}-area-${className}`;
  }

  getControlPanel() {
    return this.panel;
  }

}

class ControlPanelBlock extends ControlPanelComponent {

  constructor(area, name) {
    super(area.el, area.getClassName(name));
    this.area = area;
  }

  getClassName(className) {
    return this.area.getClassName(className);
  }

  getControlPanel() {
    return this.area.panel;
  }

}
  */

/*-------------------------] Settings [--------------------------*/

class Form extends BrowserEventTarget {

  constructor(el, listener) {
    super(el);
    this.listener = listener;
    this.bindEvent('keydown', this.stopEventPropagation);
    this.bindEvent('submit', this.onFormSubmit);
    this.bindEvent('reset', this.onFormReset);
  }

  onFormSubmit(evt) {
    evt.preventDefault();
    this.listener.onFormSubmit();
  }

  onFormReset(evt) {
    evt.preventDefault();
    this.listener.onFormReset();
  }


  forEachControl(fn) {
    var els = this.el.elements;
    for (var i = 0, control; control = els[i]; i++) {
      if (control.id) {
        fn(control);
      }
    }
  }

}

class Settings {

  static get TAB_STYLE()           { return 'tab-style';           }
  static get SAVE_FILENAME()       { return 'save-filename';       }
  static get INCLUDE_SELECTOR()    { return 'include-selector';    }
  static get EXCLUDE_SELECTOR()    { return 'exclude-selector';    }
  static get OUTPUT_SELECTOR()     { return 'output-selector';     }
  static get OUTPUT_CHANGED_ONLY() { return 'output-changed-only'; }
  static get OUTPUT_UNIQUE_ONLY()  { return 'output-unique-only';  }

  static get OUTPUT_SELECTOR_ID()      { return 'id';      }
  static get OUTPUT_SELECTOR_ALL()     { return 'all';     }
  static get OUTPUT_SELECTOR_TAG()     { return 'tag';     }
  static get OUTPUT_SELECTOR_TAG_NTH() { return 'tag-nth'; }
  static get OUTPUT_SELECTOR_AUTO()    { return 'auto';    }
  static get OUTPUT_SELECTOR_FIRST()   { return 'first';   }
  static get OUTPUT_SELECTOR_NONE()    { return 'inline';  }
  static get OUTPUT_SELECTOR_LONGEST() { return 'longest'; }

  static get TABS_TWO_SPACES()  { return 'two';  }
  static get TABS_FOUR_SPACES() { return 'four'; }
  static get TABS_TAB()         { return 'tab';  }

  static get SKIP_GETTING_STARTED() { return 'skip-getting-started'; }

  static get DEFAULTS() {
    return {
      [Settings.TAB_STYLE]: Settings.TABS_TWO_SPACES,
      [Settings.OUTPUT_SELECTOR]: Settings.OUTPUT_SELECTOR_AUTO,
      [Settings.SAVE_FILENAME]: 'styles.css'
    };
  }

  constructor(listener, storage, root) {
    this.form = new Form(root.getElementById('settings-form'), this);
    this.listener = listener;
    this.storage = storage;

    //this.form = new BrowserEventTarget(root.getElementById('settings-form'));
    this.setup(root);
    //this.form = new Form(root.getElementById('settings-form'));
    /*
    this.changed  = {};
    this.defaults = {};
    this.defaults[Settings.TABS]     = Settings.TABS_TWO_SPACES;
    this.defaults[Settings.SELECTOR] = Settings.SELECTOR_AUTO;
    this.defaults[Settings.OUTPUT_UNIQUE] = true;
    this.defaults[Settings.DOWNLOAD_FILENAME] = 'styles.css';
    this.setup(root);
    */
  }

  setup(root) {
    this.setFormControlsFromStorage();
    new LinkedSelect(root.getElementById('output-selector'));
  }

  onFormSubmit() {
    this.setStorageFromFormControls();
    this.listener.onSettingsUpdated();
  }

  onFormReset() {
    if (confirm('Really clear all settings?')) {
      this.storage.clear();
      this.setFormControlsFromStorage();
      // Set timeout to prevent jank after confirm here
      setTimeout(() => this.listener.onSettingsUpdated(), 0);
    }
  }

  get(name) {
    return this.storage.getItem(name) || Settings.DEFAULTS[name];
  }

  set(name, val) {
    if (val == null) {
      this.storage.removeItem(name);
    } else {
      this.storage.setItem(name, val);
    }
  }

  setBoolean(name, val) {
    this.set(name, val ? '1' : null);
  }

  // --- Private

  setFormControlsFromStorage() {
    this.form.forEachControl((control) => {
      switch (control.type) {
        case 'select-one':
          for (var i = 0, option; option = control.options[i]; i++) {
            if (option.value === this.get(control.id)) {
              option.selected = true;
            }
          }
          break;
        case 'text':
          control.value = this.get(control.id) || '';
          break;
        case 'checkbox':
          control.checked = !!this.get(control.id);
          break;
      }
    });
  }

  setStorageFromFormControls() {
    this.form.forEachControl((control) => {
      switch (control.type) {
        case 'select-one':
          this.set(control.id, control.selectedOptions[0].value);
          break;
        case 'text':
          this.set(control.id, control.value);
          break;
        case 'checkbox':
          this.setBoolean(control.id, control.checked);
          break;
      }
    });
  }

}

class LinkedSelect extends BrowserEventTarget {

  static get AREA_ACTIVE_CLASS() { return 'select-linked-area--active'; }

  constructor(el) {
    super(el);
    this.setup();
  }

  setup() {
    this.linked = {};
    var els = this.el.parentNode.querySelectorAll('[data-linked-option]');
    for (var i = 0, el; el = els[i]; i++) {
      this.linked[el.dataset.linkedOption] = new Element(el);
    }
    this.bindEvent('change', this.onChange);
    this.setCurrentAreaActive();
  }

  getCurrentValue() {
    return this.el.selectedOptions[0].value;
  }

  getLinkedAreaByValue(value) {
    return this.linked[value];
  }

  onChange() {
    this.hideLinkedArea(this.activeLinkedArea);
    this.setCurrentAreaActive();
  }

  setCurrentAreaActive() {
    var area = this.getLinkedAreaByValue(this.getCurrentValue());
    this.showLinkedArea(area);
    this.activeLinkedArea = area;
  }

  showLinkedArea(area) {
    area.addClass(LinkedSelect.AREA_ACTIVE_CLASS);
  }

  hideLinkedArea(area) {
    area.removeClass(LinkedSelect.AREA_ACTIVE_CLASS);
  }

}

/*-------------------------] Animation [--------------------------*/

class Animation {

  static get NO_TRANSITION_CLASS() { return 'animation--no-transition'; }

  constructor(el, activeClass, listener, expectedTransitionEvents) {
    this.target      = new BrowserEventTarget(el);
    this.activeClass = activeClass;
    this.listener    = listener;
    this.expectedTransitionEvents = expectedTransitionEvents || 1;
  }

  defer(fn) {
    // Allow 1 frame to allow styling to be applied before
    // adding transition classes. For some reason RAF won't work here.
    this.timer = setTimeout(fn, 16);
  }

  show() {

    // Reset all transitions, states, and timeouts.
    clearTimeout(this.timer);
    this.target.removeAllListeners();
    this.target.removeClass(this.activeClass);
    this.target.addClass(Animation.NO_TRANSITION_CLASS);

    this.target.show();

    this.defer(() => {
      this.target.removeClass(Animation.NO_TRANSITION_CLASS);
      this.target.addClass(this.activeClass);
    });
    this.awaitTransitionEnd(this.onAnimationEnter);
  }

  hide() {
    // If hide is called in the same tick as show, then transitionend will
    // continue firing, so need to defer it here.
    this.defer(() => {
      this.target.removeClass(this.activeClass);
      this.awaitTransitionEnd(this.onAnimationExit);
    });
  }

  onAnimationExit() {
    this.target.hide();
  }

  awaitTransitionEnd(fn) {
    var transitionEvents = 0;
    this.target.addEventListener('transitionend', () => {
      transitionEvents += 1;
      if (transitionEvents >= this.expectedTransitionEvents) {
        // This very naively does a count on the transitionend events and
        // compares it to the number expected, which is passed in the constructor.
        this.target.removeAllListeners();
        fn.call(this);
      }
    });
  }

}

/*-------------------------] LoadingAnimation [--------------------------*/

class LoadingAnimation extends Animation {

  static get ID()           { return 'loading-animation'; }
  static get ACTIVE_CLASS() { return 'loading-animation--active'; }

  constructor(uiRoot, listener) {
    super(uiRoot.getElementById(LoadingAnimation.ID), LoadingAnimation.ACTIVE_CLASS, listener);
  }

  onAnimationEnter() {
    this.listener.onLoadingAnimationTaskReady();
    this.hide();
  }

}

/*-------------------------] CopyAnimation [--------------------------*/

class CopyAnimation extends Animation {

  static get ID()           { return 'copy-animation';         }
  static get ACTIVE_CLASS() { return 'copy-animation--active'; }

  static get COPIED_ID()    { return 'copy-animation-copied';    }
  static get NO_STYLES_ID() { return 'copy-animation-no-styles'; }

  constructor(uiRoot, listener) {
    super(uiRoot.getElementById(CopyAnimation.ID), CopyAnimation.ACTIVE_CLASS, listener, 2);
    this.copied   = new Element(uiRoot.getElementById(CopyAnimation.COPIED_ID));
    this.noStyles = new Element(uiRoot.getElementById(CopyAnimation.NO_STYLES_ID));
  }

  onAnimationEnter() {
    this.hide();
  }

  show(hasStyles) {
    if (hasStyles) {
      this.copied.show();
      this.noStyles.hide();
    } else {
      this.copied.hide();
      this.noStyles.show();
    }
    super.show();
  }

}

/*-------------------------] SpriteRecognizer [--------------------------*/

class SpriteRecognizer {

  constructor(img) {
    this.img = img;
    this.img.addEventListener('load', this.onImageLoaded.bind(this));
  }

  getSpriteBoundsForCoordinate(coord) {
    var pixel = coord.round(), alpha, bounds, queue;

    // Bail if the pixel is not within image bounds.
    if (!this.isValidPixel(pixel)) {
      return;
    }

    // Detect alpha under current pixel.
    alpha = this.getAlphaForPixel(pixel);
    if (!alpha) {
      // No sprite detected
      return;
    }

    // Try to use existing sprite bounds.
    bounds = this.getBounds(pixel);
    if (bounds) {
      return bounds;
    }

    // Test adjacent pixels and cache.
    queue = [];
    bounds = new Rectangle(pixel.y, pixel.x, pixel.y, pixel.x);
    do {
      this.testAdjacentPixels(pixel, bounds, queue);
    } while(pixel = queue.shift());

    // Bounds are zero indexed, so to
    // include the last pixel push out by 1.
    bounds.right  += 1;
    bounds.bottom += 1;

    return bounds;
  }

  // --- Private

  onImageLoaded() {
    var img = this.img, canvas, context;
    canvas = document.createElement('canvas');
    canvas.setAttribute('width', img.width);
    canvas.setAttribute('height', img.height);
    context = canvas.getContext('2d');
    context.drawImage(img, 0, 0);
    this.pixelData = context.getImageData(0, 0, img.width, img.height).data;
    this.width  = img.width;
    this.height = img.height;
    this.map = new Array(this.width * this.height);
  }

  testAdjacentPixels(pixel, bounds, queue) {
    this.testPixel(new Point(pixel.x, pixel.y - 1), bounds, queue); // Top
    this.testPixel(new Point(pixel.x + 1, pixel.y), bounds, queue); // Right
    this.testPixel(new Point(pixel.x, pixel.y + 1), bounds, queue); // Bottom
    this.testPixel(new Point(pixel.x - 1, pixel.y), bounds, queue); // Left
  }

  testPixel(pixel, bounds, queue) {
    if (!this.isValidPixel(pixel) || this.pixelHasBeenTested(pixel)) {
      return;
    }
    // If we have a non-transparent pixel, then expand the bounds and
    // queue it to test adjacent pixels.
    if (this.getAlphaForPixel(pixel)) {
      bounds.top    = Math.min(bounds.top,    pixel.y);
      bounds.left   = Math.min(bounds.left,   pixel.x);
      bounds.right  = Math.max(bounds.right,  pixel.x);
      bounds.bottom = Math.max(bounds.bottom, pixel.y);
      queue.push(pixel);
      this.setBounds(pixel, bounds);
    }
  }

  isValidPixel(pixel) {
    return pixel.x >= 0 && pixel.x < this.width &&
           pixel.y >= 0 && pixel.y < this.height;
  }

  getAlphaForPixel(pixel) {
    return this.pixelData[(this.width * pixel.y + pixel.x) * 4 + 3];
  }

  // --- Pixel Map

  getBounds(pixel) {
    return this.map[this.getPixelIndex(pixel)];
  }

  setBounds(pixel, bounds) {
    this.map[this.getPixelIndex(pixel)] = bounds;
  }

  pixelHasBeenTested(pixel) {
    return this.map.hasOwnProperty(this.getPixelIndex(pixel));
  }

  getPixelIndex(pixel) {
    return this.width * pixel.y + pixel.x;
  }

}

/*-------------------------] Point [--------------------------*/

const TAU  = Math.PI * 2;
const DEG  = 360;
const GRAD = 400;

class Point {

  static degToRad(deg, normalize) {
    return this.check(deg, normalize) / DEG * TAU;
  }

  static radToDeg(rad, normalize) {
    return this.check(rad / TAU * DEG, normalize);
  }

  static degToGrad(deg, normalize) {
    return this.check(deg, normalize) / DEG * GRAD;
  }

  static gradToDeg(grad, normalize) {
    return this.check(grad / GRAD * DEG, normalize);
  }

  // This method ensures that 360 will always be
  // returned as 0, and optionally that the angle
  // will always be within 0 and 360.
  static check(deg, normalize) {
    var mult;
    if (normalize) {
      mult = deg / DEG;
      if (mult < 0 || mult >= 1) {
        deg -= Math.floor(mult) * DEG;
      }
    }
    return deg;
  }

  constructor(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  }

/*
  static vector(deg, len) {

  }
  */

  add(p) {
    return new Point(this.x + p.x, this.y + p.y);
  }

  subtract(p) {
    return new Point(this.x - p.x, this.y - p.y);
  }

  multiply(arg) {
    if (typeof arg === 'number') {
      return new Point(this.x * arg, this.y * arg);
    } else {
      return new Point(this.x * arg.x, this.y * arg.y);
    }
  }

  getAngle(convert) {
    return Point.radToDeg(Math.atan2(this.y, this.x), convert);
  }

/*
  getRotated(deg) {
    var rad = Point.degToRad(deg);


  setAngle(deg) {
    return Point.vector(deg, this.getLength());
  }
  */

  rotate(deg) {
    if (deg === 0) {
      return new Point(this.x, this.y);
    }
    var rad = Point.degToRad(deg);
    var x = this.x * Math.cos(rad) - this.y * Math.sin(rad);
    var y = this.x * Math.sin(rad) + this.y * Math.cos(rad);
    return new Point(x, y);
  }

  getLength() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }

  clone() {
    return new Point(this.x, this.y);
  }

  round() {
    return new Point(Math.round(this.x), Math.round(this.y));
  }

  getRatio() {
    return this.y === 0 ? 0 : Math.abs(this.x) / Math.abs(this.y);
  }

/*
  Point.vectorOLD(deg, len) {
    var rad = Point.degToRad(deg);
    return new Point(Math.cos(rad) * len, Math.sin(rad) * len);
  }

  getAngleOLD() {
    return Point.radToDeg(Math.atan2(this.y, this.x));
  }

  setAngleOLD(deg) {
    return Point.vectorOLD(deg, this.getLengthOLD());
  }

  getRotatedOLD(deg) {
    return this.setAngleOLD(this.getAngleOLD() + deg);
  }

  getLengthOLD() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }
  */

}

/*-------------------------] Rectangle [--------------------------*/

// TODO: can't this be merged with CSSBOX somehow?
// TODO: remove rotation!
class Rectangle {

  constructor(top, right, bottom, left) {
    this.top      = top    || 0;
    this.right    = right  || 0;
    this.bottom   = bottom || 0;
    this.left     = left   || 0;
  }

  getWidth(r) {
    var w = this.right - this.left;
    return r ? Math.round(w) : w;
  }

  getHeight(r) {
    var h = this.bottom - this.top;
    return r ? Math.round(h) : h;
  }

  setPosition(point) {
    var offset = point.subtract(new Point(this.left, this.top));
    this.left   += offset.x;
    this.top    += offset.y;
    this.bottom += offset.y;
    this.right  += offset.x;
  }

  add(prop, amount) {
    if (!prop) return;
    amount = this.constrainProperty(prop, this[prop] + amount);
    this[prop] = amount;
  }

  constrainProperty(prop, amount) {
    switch(prop) {
      case 'left':   return Math.min(amount, this.right - 1);
      case 'right':  return Math.max(amount, this.left + 1);
      case 'top':    return Math.min(amount, this.bottom - 1);
      case 'bottom': return Math.max(amount, this.top + 1);
    }
  }

  /*
  getCenter() {
    return new Point(this.left + (this.getWidth() / 2), this.top + (this.getHeight() / 2));
  }

  getRatio() {
    return this.getWidth() / this.getHeight();
  }

  // The rotated position for a given un-rotated coordinate.
  getPositionForCoords(coord) {
    if (!this.rotation) {
      return coord;
    }
    var center = this.getCenter();
    return coord.subtract(center).rotate(this.rotation).add(center);
  }

  // The un-rotated coords for a given rotated position.
  // TODO: consolidate this with CSSBox
  getCoordsForPosition(position) {
    if (!this.rotation) return position;
    var center = this.getCenter();
    return position.subtract(center).rotate(-this.rotation).add(center);
  }
  */

  clone() {
    return new Rectangle(this.top, this.right, this.bottom, this.left);
  }

}

/*-------------------------] CSSPoint [--------------------------*/

/*
class CSSPoint {

  constructor(cssX, cssY) {
    this.cssX = cssX || new CSSValue(null);
    this.cssY = cssY || new CSSValue(null);
  }

  /*
  isNull() {
    return this.cssLeft.isNull() && this.cssTop.isNull();
  }

  getPosition() {
    return new Point(this.cssLeft.px, this.cssTop.px);
  }

  setPosition(p) {
    this.cssLeft.px = p.x;
    this.cssTop.px = p.y;
  }

  toString() {
    return [this.cssLeft, this.cssTop].join(' ');
  }
  addOffset(x, y) {
    return new CSSPoint(this.cssX.addOffset(x), this.cssY.addOffset(y));
  }

  clone() {
    return new CSSPoint(this.cssX.clone(), this.cssY.clone());
  }

}
  */

/*-------------------------] CSSPositioningProperty [--------------------------*/

class CSSPositioningProperty {

  static horizontalFromMatcher(matcher) {
    return this.chooseEdge(matcher, 'left', 'right');
  }

  static verticalFromMatcher(matcher) {
    return this.chooseEdge(matcher, 'top', 'bottom');
  }

  static chooseEdge(matcher, edge1, edge2) {
    var prop1, prop2, prop, cssValue;

    prop1 = matcher.getProperty(edge1);
    prop2 = matcher.getProperty(edge2);

    // Default to the first edge unless it is initial
    // and the second edge is set.
    if (prop1.isInitial() && !prop2.isInitial()) {
      prop = prop2;
    } else {
      prop = prop1;
    }

    cssValue = CSSValue.parse(prop.getValue(), prop, matcher.el);
    return new CSSPositioningProperty(cssValue, prop.name);
  }

  constructor(cssValue, prop) {
    this.cssValue = cssValue;
    this.prop     = prop;
  }

  clone() {
    return new CSSPositioningProperty(this.cssValue.clone(), this.prop);
  }

  render(style) {
    style[this.prop] = this.cssValue.isInitial() ? 'auto': this.cssValue;
  }

  add(px) {
    this.px += this.isInverted() ? -px : px;
  }

  toString() {
    return this.cssValue.toString();
  }

  // --- Accessors

  get px() {
    return this.cssValue.px;
  }

  set px(px) {
    this.cssValue.px = px;
  }

  // --- Accessors

  isInverted() {
    return this.prop === 'right' || this.prop === 'bottom';
  }

  // --- CSS Declarations

  appendCSSDeclaration(declarations) {
    return this.cssValue.appendCSSDeclaration(this.prop, declarations);
  }

}

/*
class CSSPosition {

  static fromElement(el) {
    return CSSPosition.fromMatcher(new CSSRuleMatcher(el));
  }

  static fromMatcher(matcher) {
    var [cssH, hProp] = this.getAxisFromMatcher(matcher, 'left', 'right');
    var [cssV, vProp] = this.getAxisFromMatcher(matcher, 'top', 'bottom');
    return new CSSPosition(cssH, cssV, hProp, vProp);
  }

  static getAxisFromMatcher(matcher, prop1, prop2) {
    var prop, val;
    if (val = this.getPositioningValue(matcher, prop1)) {
      return [val, prop1];
    } else if (val = this.getPositioningValue(matcher, prop2)) {
      return [val, prop2];
    } else {
      throw new Error('CSSPosition requires either a ' + prop1 + ' or ' + prop2 + ' property.');
    }
  }

  static getPositioningValue(matcher, prop) {
    var cssValue = matcher.getMatchedCSSValue(prop);
    return cssValue.val === 'auto' ? null : cssValue;
  }

  constructor(cssH, cssV, hProp, vProp) {
    this.cssH = cssH;
    this.cssV = cssV;
    this.hProp = hProp;
    this.vProp = vProp;
  }

  addXY(x, y) {
    this.cssH.px += this.getPixelValueForXY(x, 'h');
    this.cssV.px += this.getPixelValueForXY(y, 'v');
  }

  hasInvertedAxis(axis) {
    switch (axis) {
      case 'h': return this.hProp === 'right';
      case 'v': return this.vProp === 'bottom';
    }
  }

  hasInvertedProperty(prop) {
  }

  isInvertedProperty() {
  }

  render(style) {
    style[this.hProp] = this.cssH;
    style[this.vProp] = this.cssV;
  }

  // --- Accessors

  get h() {
    return this.cssH.px;
  }

  get v() {
    return this.cssV.px;
  }

  set h(px) {
    this.cssH.px = px;
  }

  set v(px) {
    this.cssV.px = px;
  }

  // --- Private

  getPixelValueForXY(px, axis) {
    return this.hasInvertedAxis(axis) ? -px : px;
  }

}
*/


/*-------------------------] CSSBox [--------------------------*/

// TODO: can this supersede rectangle?
class CSSBox {

  static fromPixelValues(left, top, width, height) {
    return new CSSBox(
      new CSSPositioningProperty(new CSSPixelValue(left), 'left'),
      new CSSPositioningProperty(new CSSPixelValue(top),  'top'),
      new CSSPixelValue(width),
      new CSSPixelValue(height)
    );
  }

  static fromMatcher(matcher) {
    var cssH      = CSSPositioningProperty.horizontalFromMatcher(matcher);
    var cssV      = CSSPositioningProperty.verticalFromMatcher(matcher);
    var cssWidth  = this.getDimension(matcher, 'width');
    var cssHeight = this.getDimension(matcher, 'height');
    return new CSSBox(cssH, cssV, cssWidth, cssHeight);
  }

  static getDimension(matcher, name) {
    var prop = matcher.getProperty(name);
    return CSSValue.parse(prop.getValue(), prop, matcher.el);
  }

  /*

  static fromElement(el) {
    return CSSBox.fromMatcher(new CSSRuleMatcher(el));
  }

  static fromMatcher(matcher) {
    var cssH = CSSPositioningProperty.horizontalFromMatcher(matcher);
    var cssV = CSSPositioningProperty.verticalFromMatcher(matcher);
    var cssWidth  = matcher.getCSSValue('width');
    var cssHeight = matcher.getCSSValue('height');
    return new CSSBox(cssH, cssV, cssWidth, cssHeight);
  }
  */

  constructor(cssH, cssV, cssWidth, cssHeight) {
    this.cssH      = cssH;
    this.cssV      = cssV;
    this.cssWidth  = cssWidth;
    this.cssHeight = cssHeight;
  }

  moveEdges(x, y, dir) {
    this.moveEdge(x, this.cssH, this.cssWidth,  this.getEdgeForDir(dir, 'h'));
    this.moveEdge(y, this.cssV, this.cssHeight, this.getEdgeForDir(dir, 'v'));
  }

  getDirectionVector() {
    // A normalized vector describing the directions into which the
    // box expands. If the box has inverted axes, then it will expand
    // into a negative direction, otherwise positive.
    return new Point(
      this.hasInvertedAxis('h') ? -1 : 1,
      this.hasInvertedAxis('v') ? -1 : 1
    );
  }

  getXYOffset() {
    // A vector that represents the offset into x/y space that the box
    // expands into. A normal box will not affect this as it expands
    // down/right. However an inverted box will move into x/y space.
    return new Point(
      this.hasInvertedAxis('h') ? this.cssWidth.px  : 0,
      this.hasInvertedAxis('v') ? this.cssHeight.px : 0
    );
  }

  moveEdge(offset, cssPos, cssDim, edge) {
    var ppx, dpx;

    if (!offset || !edge) {
      return;
    }

    // If the positioning property is inverted (ie. "right" or "bottom"),
    // then we need to flip the offset, as it is always x/y.
    if (this.isInvertedEdge(cssPos.prop)) {
      offset = -offset;
    }

    if (edge === cssPos.prop) {
      // If the edge is the same as the positioning property, then
      // we are moving the positioning edge (ie. the left edge for
      // a left positioned property or the right edge for a right
      // positioned property). This means that as the edge gains a
      // positive value, the dimensions shrink by an equivalent amount.
      ppx = cssPos.px + offset;
      dpx = cssDim.px - offset;
    } else {
      // If the edge is opposite the positioning property, then we
      // are moving the opposite edge. In this case we simply update
      // the dimensions and the position remains the same.
      ppx = cssPos.px;
      dpx = cssDim.px + offset;
    }

    cssPos.px = ppx;
    cssDim.px = dpx;
  }

  getEdgeForDir(dir, axis) {
    if (axis === 'h') {
      switch(dir.slice(-1)) {
        case 'w': return 'left';
        case 'e': return 'right';
      }
    } else {
      switch(dir.charAt(0)) {
        case 'n': return 'top';
        case 's': return 'bottom';
      }
    }
  }

  constrain(newRatio, dir) {
    var oldRatio, px;

    var hEdge = this.getEdgeForDir(dir, 'h');
    var vEdge = this.getEdgeForDir(dir, 'v');

    if (!hEdge || !vEdge) {
      // Both edges are required to allow constraining,
      // so abort if either is not passed.
      return;
    }

    oldRatio = this.getRatio();

    if (oldRatio === 0 || newRatio === 0) {
      // If either the old ratio or the new ratio are zero, then
      // the entire box must have no dimensions, as both setting
      // to and multiplying by zero result in 0, so just set both
      // dimensions here.
      this.cssWidth.px  = 0;
      this.cssHeight.px = 0;
    } else if (oldRatio < newRatio) {
      if (this.isInvertedEdge(vEdge)) {
        px = this.cssWidth.px / newRatio - this.cssHeight.px;
      } else {
        px = this.cssHeight.px - this.cssWidth.px / newRatio;
      }
      this.moveEdge(px, this.cssV, this.cssHeight, vEdge);
    } else {
      if (this.isInvertedEdge(hEdge)) {
        px = this.cssHeight.px * newRatio - this.cssWidth.px;
      } else {
        px = this.cssWidth.px - this.cssHeight.px * newRatio;
      }
      this.moveEdge(px, this.cssH, this.cssWidth, hEdge);
    }
  }

  /*
  getCenter() {
    // Note that the center position may have inverted properties,
    // and cannot be used in calculations relative to the viewport/page.
    return new Point(this.cssH.px + this.cssWidth.px / 2, this.cssV.px + this.cssHeight.px / 2);
  }
  */

  hasInvertedAxis(axis) {
    var cssPos = axis === 'h' ? this.cssH : this.cssV;
    return cssPos.isInverted();
  }

  getOffsetPosition() {
    return new Point(this.cssH.px, this.cssV.px);
  }

  addOffsetPosition(x, y) {
    this.cssH.add(x);
    this.cssV.add(y);
  }

  getDimensions() {
    return new Point(this.cssWidth.px, this.cssHeight.px);
  }

  setDimensions(x, y) {
    this.cssWidth.px  = x;
    this.cssHeight.px = y;
  }

  /*
  getCenterOffsetForDir(dir) {
    var w = cssBox.cssWidth.px  / 2;
    var h = cssBox.cssHeight.px / 2;
    switch (dir) {
      case 's':  return new Point(0, -h);
      case 'n':  return new Point(0,  h);
      case 'w':  return new Point(w,  0);
      case 'e':  return new Point(-w, 0);
      case 'sw': return new Point(w,  -h);
      case 'nw': return new Point(w,   h);
      case 'ne': return new Point(-w,  h);
      case 'se': return new Point(-w, -h);
    }
  }
  */

  getRatio() {
    return new Point(this.cssWidth.px, this.cssHeight.px).getRatio();
  }

  clone() {
    return new CSSBox(this.cssH.clone(),
                      this.cssV.clone(),
                      this.cssWidth.clone(),
                      this.cssHeight.clone());
  }

  render(style) {
    this.renderAxis(style, this.cssH, this.cssWidth,  'width');
    this.renderAxis(style, this.cssV, this.cssHeight, 'height');
  }

  renderAxis(style, cssPos, cssDim, dimProp) {
    if (cssDim.px < 0) {
      cssDim.px = -cssDim.px;
      cssPos.px -= cssDim.px;
    }
    cssPos.render(style);
    style[dimProp] = cssDim.isInitial() ? 'auto' : cssDim;
  }

  isInvertedEdge(prop) {
    return prop === 'right' || prop === 'bottom';
  }

  // --- Headers

  getPositionHeader() {
    return [this.cssH, this.cssV].join(', ');
  }

  getDimensionsHeader() {
    return [this.cssWidth, this.cssHeight].join(', ');
  }

  // --- CSS Declarations

  appendCSSDeclarations(declarations) {
    this.cssV.appendCSSDeclaration(declarations);
    this.cssH.appendCSSDeclaration(declarations);
    this.cssWidth.appendCSSDeclaration('width', declarations);
    this.cssHeight.appendCSSDeclaration('height', declarations);
  }

  /*
  getDimensionForAxis(axis) {
    return axis === 'h' ? this.cssWidth : this.cssHeight;
  }

  get top() {
    return this.getSide('v', false);
  }

  get left() {
    return this.getSide('h', false);
  }

  get bottom() {
    return this.getSide('v', true);
  }

  get right() {
    return this.getSide('h', true);
  }

  set top(px) {
    this.setSide(px, 'v', false);
    //this.cssHeight.px += this.cssY.px - px;
    //this.cssY.px = px;
  }

  set left(px) {
    this.setSide(px, 'h', false);
    //this.cssWidth.px += this.cssX.px - px;
    //this.cssX.px = px;
  }

  set bottom(px) {
    this.setSide(px, 'v', true);
  }

  set right(px) {
    this.setSide(px, 'h', true);
  }

  getSide(axis, inverted) {
    var px  = this.cssPosition[axis];
    var dim = this.getDimensionForAxis(axis);
    if (inverted != this.cssPosition.hasInvertedAxis(axis)) {
      px += dim.px;
    }
    return px;
  }

  setSide(px, axis, inverted) {
    var dim = this.getDimensionForAxis(axis);
    if (this.isOppositeSide(axis, inverted)) {
      // If we are setting the opposite side of the
      // box's origin, then simply update the dimensions.
      dim.px = px - this.cssPosition[axis];
    } else {
      // If we are setting the same side as the box's
      // origin, then update the position first, then
      // calculate the dimension from the difference;
      //console.info('hermmm', axis, this.cssPosition[axis], this.cssPosition.getPixelValueForXY(px, axis), px);
//
      //this.cssPosition.addXYAxis(px, axis);
      ////this.cssPosition[axis] = px;
      //dim.px = this.cssPosition[axis] - this.cssPosition.getPixelValueForXY(px, axis);
      //console.info('now', dim.px);
    }
  }
  */

  /*
  constructor(cssX, cssY, cssWidth, cssHeight) {
    this.cssX   = cssX;
    this.cssY    = cssY;
    this.cssWidth  = cssWidth;
    this.cssHeight = cssHeight;
  }

  // Property accessors

  get width () {
    return this.cssWidth.px;
  }

  set width (px) {
    this.cssWidth.px = px;
  }

  get height () {
    return this.cssHeight.px;
  }

  set height (px) {
    this.cssHeight.px = px;
  }

  // Computed accessors

  get right() {
    return this.left + this.width;
  }

  set right(px) {
    this.width = px - this.left;
  }

  get bottom() {
    return this.top + this.height;
  }

  set bottom(px) {
    this.height = px - this.top;
  }

  get hcenter() {
    return this.left + this.width / 2;
  }

  get vcenter() {
    return this.top + this.height / 2;
  }

  ensureValidBox() {
    if (this.width < 0) {
      this.cssX.px += this.cssWidth.px;
      this.cssWidth.px = -this.cssWidth.px;
    }
    if (this.height < 0) {
      this.cssY.px += this.cssHeight.px;
      this.cssHeight.px = -this.cssHeight.px;
    }
  }

  // TODO: cleanup
  render(style) {
    this.ensureValidBox();
    style.left   = this.cssX;
    style.top    = this.cssY;
    style.width  = this.cssWidth;
    style.height = this.cssHeight;
  }

  getPosition() {
    return new Point(this.left, this.top);
  }

  setPosition(vector) {
    this.cssX.px = vector.x;
    this.cssY.px  = vector.y;
  }

  addPosition(vector) {
    this.cssX.add(vector.x);
    this.cssY.add(vector.y);
  }

  getCoords(p, rotation) {
    var center;

    p = p.subtract(this.getPosition());

    if (rotation) {
      center = this.getCenter();
      p = p.subtract(center).rotate(-potation).add(center);
    }

    return p;
  }

  getCenterCoords() {
    return new Point(this.width / 2, this.height / 2);
  }

  getCenterPosition() {
    return new Point(this.left + (this.width / 2), this.top + (this.height / 2));
  }

  // TODO: vague
  getCenter() {
    return new Point(this.left + (this.width / 2), this.top + (this.height / 2));
  }

  /*
  // TODO: rename??
  calculateRotationOffset() {
    if (!this.rotation) {
      return;
    }

    var pos = this.getPosition();
    var center = new Point(this.width / 2, this.height / 2);
    var rotatedCoords = center.rotate(this.rotation);
    var rotatedPos = pos.subtract(rotatedCoords.subtract(center));
    this.setPosition(rotatedPos);

    var offsetX  = this.box.width / 2;
    var offsetY  = this.box.height / 2;
    var toCenter = anchor.offsetToCenter(offsetX, offsetY).rotate(this.box.rotation);
    var toCorner = new Point(-offsetX, -offsetY);
    return anchor.startPosition.add(toCenter).add(toCorner);
  }
  */

  /*
  // Returns coordinates in the box's XY coordinate
  // frame for a given non-rotated XY position.
  getCoordsForPosition(pos) {
    if (!this.rotation) return pos;
    var center = this.getCenter();
    return pos.subtract(center).rotate(this.rotation).add(center);
  }

  getRatio() {
    return this.width / this.height;
  }

  // TODO: better name for this?
  /*
  adjustSide(prop, amount) {
    if (!prop || !amount) {
      return;
    }

    amount = this.constrainProperty(prop, this[prop] + amount);

    // If the side is "left" or "top", then
    if (prop === 'left') {
    }

    this[prop] = amount;
  }

  constrainProperty(prop, amount) {
    switch(prop) {
      case 'left':   return Math.min(amount, this.right - 1);
      case 'right':  return Math.max(amount, this.left + 1);
      case 'top':    return Math.min(amount, this.bottom - 1);
      case 'bottom': return Math.max(amount, this.top + 1);
    }
  }

  clone() {
    return new CSSBox(
      this.cssX.clone(),
      this.cssY.clone(),
      this.cssWidth.clone(),
      this.cssHeight.clone()
    );
  }
  */

}

/*-------------------------] CSSRuleMatcher [--------------------------*/

class CSSRuleMatcher {

  constructor(el) {
    this.el = el;
    this.computedStyles = window.getComputedStyle(el);
    this.matchedRules = this.getMatchedRules(el);
  }

  getProperty(name) {
    var matchedValue  = this.getMatchedValue(name);
    var computedValue = this.getComputedValue(name);
    return new CSSProperty(name, matchedValue, computedValue);
  }

  getValue(name) {
    return this.getProperty(name).getValue();
  }

  // --- Private

  getMatchedRules(el) {
    // Note: This API is deprecated and may be removed.
    try {
      return window.getMatchedCSSRules(el);
    } catch (e) {
      return null;
    }
  }

  getMatchedValue(name) {
    var val = '';

    // Inline styles have highest priority, so attempt to use them first, then
    // fall back to matched CSS properties in reverse order to maintain priority.
    if (this.el.style[name]) {
      val = this.el.style[name];
    } else if (this.matchedRules) {
      for (var rules = this.matchedRules, i = rules.length - 1, rule; rule = rules[i]; i--) {
        val = rule.style[name];
        if (val) {
          break;
        }
      }
    }

    return val;
  }

  getComputedValue(name) {
    return this.computedStyles[name];
  }

}

/*-------------------------] CSSProperty [--------------------------*/

class CSSProperty {

  static get TOP()    { return 'top';    }
  static get LEFT()   { return 'left';   }
  static get WIDTH()  { return 'width';  }
  static get RIGHT()  { return 'right';  }
  static get HEIGHT() { return 'height'; }
  static get BOTTOM() { return 'bottom'; }
  static get CENTER() { return 'center'; }

  static get NONE()    { return 'none';    }
  static get AUTO()    { return 'auto';    }
  static get INITIAL() { return 'initial'; }

  static get TRANSFORM()           { return 'transform';          }
  static get TRANSFORM_ORIGIN()    { return 'transformOrigin';    }
  static get BACKGROUND_IMAGE()    { return 'backgroundImage';    }
  static get BACKGROUND_POSITION() { return 'backgroundPosition'; }

  static get VAR_REG()             { return /var\(.+\)/; }

  constructor(name, matchedValue, computedValue) {
    this.name          = name;
    this.matchedValue  = matchedValue;
    this.computedValue = computedValue;

    this.normalize();
  }

  getValue() {
    return this.matchedValue || this.computedValue;
  }

  isInitial() {
    return !this.matchedValue;
  }

  isVertical() {
    return this.name === CSSProperty.TOP ||
           this.name === CSSProperty.BOTTOM ||
           this.name === CSSProperty.HEIGHT;
  }

  // --- Private

  normalize() {
    // We need to normalize values here so that they can all be tested.
    // Force all "auto", "none", and "initial" values to empty strings,
    // then remove matched CSS variables as they are unusable. Set
    // matched background images to their computed value, as they don't
    // contain the domain, which we need to detect cross domain images.
    // Finally handle positioning keywords like "top left" by replacing
    // with percentages and removing the computed value.
    this.coerceInitialValues();
    this.coerceCSSVariable();
    this.coerceBackgroundImageValue();
    this.coercePositionKeywordPairs();
  }

  // --- Initial Values

  coerceInitialValues() {
    this.matchedValue  = this.coerceInitialValue(this.matchedValue);
    this.computedValue = this.coerceInitialValue(this.computedValue);
  }

  coerceInitialValue(val) {
    return this.isInitialValue(val) ? '' : val;
  }

  isInitialValue(val) {
    return val === CSSProperty.AUTO ||
           val === CSSProperty.NONE ||
           val === CSSProperty.INITIAL;
  }

  // --- CSS Variables

  coerceCSSVariable() {
    if (CSSProperty.VAR_REG.test(this.matchedValue)) {
      this.matchedValue = this.computedValue;
    }
  }

  // --- Background Image

  coerceBackgroundImageValue() {
    if (this.name === CSSProperty.BACKGROUND_IMAGE) {
      this.matchedValue = this.computedValue;
    }
  }

  // --- CSS Positioning Keywords

  coercePositionKeywordPairs() {
    if (this.isPositioningPair()) {
      this.matchedValue = this.replacePositionKeywords(this.matchedValue);
      this.computedValue = '';
    }
  }

  isPositioningPair() {
    return this.name === CSSProperty.TRANSFORM_ORIGIN ||
           this.name === CSSProperty.BACKGROUND_POSITION;
  }

  replacePositionKeywords(str) {
    var split;

    if (!str) {
      return str;
    }

    split = str.split(' ');

    // If there is only one value, then the other should be 50%.
    if (split.length === 1) {
      split.push('50%');
    }

    // Positions like "top left" are inverted, so flip them.
    if (this.hasInvertedKeywords(split[0], split[1])) {
      split.push(split.shift());
    }

    return split.map(val => {
      switch (val) {
        case CSSProperty.TOP:    return '0%';
        case CSSProperty.LEFT:   return '0%';
        case CSSProperty.RIGHT:  return '100%';
        case CSSProperty.BOTTOM: return '100%';
        case CSSProperty.CENTER: return '50%';
        default:                 return val;
      }
    }).join(' ');
  }

  hasInvertedKeywords(first, second) {
    return this.isVerticalKeyword(first) || this.isHorizontalKeyword(second);
  }

  isVerticalKeyword(str) {
    return str === CSSProperty.TOP || str === CSSProperty.BOTTOM;
  }

  isHorizontalKeyword(str) {
    return str === CSSProperty.LEFT || str === CSSProperty.RIGHT;
  }

}

/*-------------------------] CSSTransform [--------------------------*/

class CSSTransform {

  static get PARSE_REG() { return /(\w+)\((.+?)\)/g; }

  static fromMatcher(matcher) {
    var prop, str, reg, match, cssTransformOrigin, functions = [];

    prop = matcher.getProperty('transform');

    if (!prop.isInitial()) {
      str = prop.getValue();
      reg = CSSTransform.PARSE_REG;
      while (match = reg.exec(str)) {
        functions.push(CSSTransformFunction.create(match[1], match[2], prop, matcher.el));
      }
    }

    cssTransformOrigin = CSSTransformOrigin.fromMatcher(matcher);

    return new CSSTransform(functions, cssTransformOrigin);
  }

  constructor(functions, cssTransformOrigin) {
    this.functions = functions || [];
    this.cssTransformOrigin = cssTransformOrigin;
  }

  getOrigin() {
    return new Point(
      this.cssTransformOrigin.cssX.px,
      this.cssTransformOrigin.cssY.px
    );
  }

  getRotation() {
    var func = this.getRotationFunction();
    return func ? func.values[0].deg : 0;
  }

  setRotation(deg) {
    var func = this.getRotationFunction();
    if (func) {
      func.values[0].deg = deg;
    } else {
      func = new CSSTransformFunction(CSSTransformFunction.ROTATE, [new CSSDegreeValue(deg)], true);
      this.functions.push(func);
    }
  }

  addRotation(deg) {
    this.setRotation(this.getRotation() + deg);
  }

  getTranslation() {
    var func = this.getPreceedingTranslationFunction();
    if (func) {
      return new Point(func.values[0].px, func.values[1].px);
    } else {
      return new Point(0, 0);
    }
  }

  setTranslation(p) {
    var func = this.getPreceedingTranslationFunction();
    if (func) {
      func.values[0].px = p.x;
      func.values[1].px = p.y;
    } else {
      var cssX = new CSSPixelValue(p.x, false, true);
      var cssY = new CSSPixelValue(p.y, false, true);
      func = new CSSTransformFunction(CSSTransformFunction.TRANSLATE, [cssX, cssY], true);
      // Ensure that translate comes before rotation, otherwise anchors will not work.
      this.functions.unshift(func);
    }
  }

  addTranslation(v) {
    this.setTranslation(this.getTranslation().add(v));
  }

  update() {
    this.updateOrigin();
    this.updateTranslation();
  }

  hasPercentTranslation() {
    var func = this.getPreceedingTranslationFunction();
    return !!func && func.hasPercentTranslation();
  }

  getHeader() {
    return this.functions.map(f => f.getHeader()).join(' | ');
  }

  toString() {
    return this.functions.join(' ');
  }

  appendCSSDeclaration(declarations) {
    var str = this.toString();
    if (str) {
      declarations.push(`transform: ${str};`);
    }
  }

  clone() {
    var functions = this.functions.map(f => f.clone());
    return new CSSTransform(functions, this.cssTransformOrigin.clone());
  }

  // --- Private

  getRotationFunction() {
    return this.functions.find(f => f.isZRotate());
  }

  getPreceedingTranslationFunction() {
    for (let i = 0, func; func = this.functions[i]; i++) {
      if (func.isTranslate()) {
        return func;
      } else if (func.isZRotate()) {
        return;
      }
    }
  }

  updateOrigin() {
    this.cssTransformOrigin.update();
  }

  updateTranslation() {
    var func = this.getPreceedingTranslationFunction();
    if (func) {
      func.values.forEach(v => v.update());
    }
  }

}

/*-------------------------] CSSTransformFunction [--------------------------*/

class CSSTransformFunction {

  static get ROTATE()       { return 'rotate';      }
  static get ROTATE_Z()     { return 'rotateZ';     }
  static get TRANSLATE()    { return 'translate';   }
  static get TRANSLATE_3D() { return 'translate3d'; }
  static get MATRIX()       { return 'matrix';      }
  static get MATRIX_3D()    { return 'matrix3d';    }

  static create(name, values, prop, el) {

    var isVertical  = this.isVertical(name);
    var isTranslate = this.isTranslate(name);
    var isZRotate   = this.isZRotate(name);
    var canMutate   = isTranslate || isZRotate;

    values = values.split(/,\s*/).map((str, i) => {
      if (canMutate) {
        return CSSValue.parse(str, prop, el, isVertical || i === 1);
      } else {
        return str;
      }
    });

    // Handle single values in translate
    if (isTranslate && values.length === 1) {
      values.push(new CSSPixelValue(0, false, true));
    }

    return new CSSTransformFunction(name, values, canMutate);
  }

  static isVertical(name) {
    return name.slice(-1) === 'Y';
  }

  static isTranslate(name) {
    return name === CSSTransformFunction.TRANSLATE ||
           name === CSSTransformFunction.TRANSLATE_3D;
  }

  static isZRotate(name) {
    return name === CSSTransformFunction.ROTATE ||
           name === CSSTransformFunction.ROTATE_Z;
  }

  static isMatrix(name) {
    return name === CSSTransformFunction.MATRIX ||
           name === CSSTransformFunction.MATRIX_3D;
  }

  constructor(name, values, canMutate) {
    this.name      = name;
    this.values    = values;
    this.canMutate = canMutate;
  }

  getHeader() {
    return this.getAbbreviatedHeader() + ': ' + this.values.join(this.getHeaderJoin());
  }

  toString() {
    return this.name + '(' + this.values.join(', ') + ')';
  }

  isTranslate() {
    return CSSTransformFunction.isTranslate(this.name);
  }

  isZRotate() {
    return CSSTransformFunction.isZRotate(this.name);
  }

  isMatrix() {
    return CSSTransformFunction.isMatrix(this.name);
  }

  hasPercentTranslation() {
    return this.isTranslate() && this.values.some(v => v.isPercent());
  }

  clone() {
    var values = this.values;
    if (this.canMutate) {
      values = this.values.map(v => v.clone());
    }
    return new CSSTransformFunction(this.name, values, this.canMutate);
  }

  // --- Private

  getHeaderJoin() {
    return this.isMatrix() ? ',' : ', ';
  }

  getAbbreviatedHeader() {
    switch (this.name) {
      case CSSTransformFunction.ROTATE:    return 'r';
      case CSSTransformFunction.TRANSLATE: return 't';
      default:                             return this.name;
    }
  }

}


/*-------------------------] CSSTransformOrigin [--------------------------*/

class CSSTransformOrigin {

  static fromMatcher(matcher) {
    var prop, el, cssX, cssY, split;

    prop = matcher.getProperty('transformOrigin');
    el   = matcher.el;

    if (prop.isInitial()) {
      cssX = CSSPercentValue.create(50, true, prop, el, false);
      cssY = CSSPercentValue.create(50, true, prop, el, true);
    } else {
      split = prop.getValue().split(' ');
      cssX = CSSValue.parse(split[0], prop, el, false);
      cssY = CSSValue.parse(split[1], prop, el, true);
    }

    return new CSSTransformOrigin(cssX, cssY);
  }

  constructor(cssX, cssY) {
    this.cssX = cssX;
    this.cssY = cssY;
  }

  update() {
    this.cssX.update();
    this.cssY.update();
  }

  clone() {
    return new CSSTransformOrigin(this.cssX.clone(), this.cssY.clone());
  }

}

/*-------------------------] CSSValue [--------------------------*/

class CSSValue {

  static get SUBPIXEL_PRECISION() { return 2; }

  static parse(str, prop, el, isVertical, img) {

    var initial = prop.isInitial();

    if (isVertical === undefined) {
      isVertical = prop.isVertical();
    }

    var match = str.match(/([-\d.]+)(px|%|em|deg|g?rad|turn|v(?:w|h|min|max))?$/);
    var val   = parseFloat(match[1]);
    var unit  = match[2] || '';

    switch (unit) {

      case '%':  return CSSPercentValue.create(val, initial, prop, el, isVertical, img);
      case 'px': return CSSPixelValue.create(val, initial, prop);
      case 'em': return CSSEmValue.create(val, initial, el);

      case 'vw':
      case 'vh':
      case 'vmin':
      case 'vmax':
        return new CSSViewportValue(val, initial, unit);

      case 'deg':  return new CSSDegreeValue(val, initial);
      case 'rad':  return new CSSRadianValue(val, initial);
      case 'grad': return new CSSGradianValue(val, initial);
      case 'turn': return new CSSTurnValue(val, initial);
      case '':     return new CSSIntegerValue(val, initial);

      default:
        throwError('UHOHOHOHHO', val, unit);
    }
  }

  constructor(value, initial, unit, subpixel) {
    this.value    = value;
    this.unit     = unit;
    this.initial  = initial;
    this.subpixel = subpixel;
  }

  get val() {
    return this.value;
  }

  set val(value) {
    this.initial = false;
    this.value = value;
  }

  // Note that this method is intended to be overridden by child
  // css values that require an update, such as CSSPercentValue.
  update() {}

  isInitial() {
    return this.initial;
  }

  isPercent() {
    return this.unit === '%';
  }

  appendCSSDeclaration(prop, declarations) {
    if (!this.isInitial()) {
      declarations.push(`${prop}: ${this};`);
    }
  }

  getHeader() {
    return this.toString();
  }

  toString() {
    var precision;

    // CSSIntegerValue does not have a unit
    if (!this.unit) {
      return this.value.toString();
    }

    precision = this.subpixel ? CSSValue.SUBPIXEL_PRECISION : 0;

    return roundWithPrecision(this.val, precision).toString() + this.unit;
  }

}

/*-------------------------] CSSPixelValue [--------------------------*/

class CSSPixelValue extends CSSValue {

  static create(val, initial, prop) {
    var subpixel = prop.name === CSSProperty.TRANSFORM;
    return new CSSPixelValue(val, initial, subpixel);
  }

  constructor(val, initial, subpixel) {
    super(val, initial, 'px', subpixel);
  }

  get px() {
    return this.val;
  }

  set px(val) {
    this.val = val;
  }

  clone() {
    return new CSSPixelValue(this.val, this.initial, this.subpixel);
  }

}

/*-------------------------] CSSEmValue [--------------------------*/

class CSSEmValue extends CSSValue {

  static create(val, initial, el) {
    var fontSize = parseFloat(window.getComputedStyle(el).fontSize);
    return new CSSEmValue(val, initial, fontSize);
  }

  constructor(val, initial, fontSize) {
    super(val, initial, 'em', true);
    this.fontSize = fontSize;
  }

  get px() {
    return (this.val || 0) * this.fontSize;
  }

  set px(px) {
    this.val = px / this.fontSize;
  }

  clone() {
    return new CSSEmValue(this.val, this.initial, this.fontSize);
  }

}

/*-------------------------] CSSDegreeValue [--------------------------*/

class CSSDegreeValue extends CSSValue {

  constructor(val, initial) {
    super(val, initial, 'deg', true);
  }

  get deg() {
    return this.val;
  }

  set deg(val) {
    this.val = val;
  }

  clone() {
    return new CSSDegreeValue(this.val, this.initial);
  }

}

/*-------------------------] CSSRadianValue [--------------------------*/

class CSSRadianValue extends CSSValue {

  constructor(val, initial) {
    super(val, initial, 'rad', true);
  }

  get deg() {
    return Point.radToDeg(this.val);
  }

  set deg(val) {
    this.val = Point.degToRad(val);
  }

  clone() {
    return new CSSRadianValue(this.val, this.initial);
  }

}

/*-------------------------] CSSGradianValue [--------------------------*/

class CSSGradianValue extends CSSValue {

  constructor(val, initial) {
    super(val, initial, 'grad', false);
  }

  get deg() {
    return Point.gradToDeg(this.val);
  }

  set deg(val) {
    this.val = Point.degToGrad(val);
  }

  clone() {
    return new CSSGradianValue(this.val, this.initial);
  }

}

/*-------------------------] CSSTurnValue [--------------------------*/

class CSSTurnValue extends CSSValue {

  constructor(val, initial) {
    super(val, initial, 'turn', true);
  }

  get deg() {
    return this.val * 360;
  }

  set deg(val) {
    this.val = val / 360;
  }

  clone() {
    return new CSSTurnValue(this.val, this.initial);
  }

}

/*-------------------------] CSSIntegerValue [--------------------------*/

class CSSIntegerValue extends CSSValue {

  constructor(val, initial) {
    super(val, initial, '');
  }

  clone() {
    return new CSSIntegerValue(this.val, this.initial);
  }

}

/*-------------------------] CSSPercentValue [--------------------------*/

class CSSPercentValue extends CSSValue {

  static create(val, initial, prop, el, isVertical, img) {

    var offsetElement = this.isElementRelative(prop) ? el : el.offsetParent;
    var isFixed       = this.isFixed(offsetElement);

    return new CSSPercentValue(val, initial, offsetElement, img, isVertical, isFixed);
  }

  static isElementRelative(prop) {
    return prop.name === CSSProperty.TRANSFORM ||
           prop.name === CSSProperty.TRANSFORM_ORIGIN ||
           prop.name === CSSProperty.BACKGROUND_POSITION;
  }

  // It seems that CSS/CSSOM has a bug/quirk where absolute elements are relative
  // to the viewport if the HTML and BODY are not positioned, however offsetParent
  // is still reported as the BODY, so check for this case.
  static isFixed(el) {
    return !el ||
      (el === document.body &&
       this.isStaticPosition(document.body) &&
       this.isStaticPosition(document.documentElement));
  }

  static isStaticPosition(el) {
    return window.getComputedStyle(el).position === 'static';
  }

  constructor(val, initial, offsetElement, img, isVertical, isFixed, size) {
    super(val, initial, '%', true);
    this.offsetElement = offsetElement;
    this.isVertical    = isVertical;
    this.isFixed       = isFixed;
    this.img           = img;
    this.size          = size;

    this.initialize();
  }

  update() {
    this.size = this.getTotalSize();
  }

  get px() {
    if (this.size === 0) {
      return 0;
    } else {
      return (this.val || 0) / 100 * this.size;
    }
  }

  set px(px) {
    if (this.size === 0) {
      this.val = 0;
    } else {
      this.val = px / this.size * 100;
    }
  }

  clone() {
    return new CSSPercentValue(
      this.val,
      this.initial,
      this.offsetElement,
      this.img,
      this.isVertical,
      this.isFixed,
      this.size);
  }

  // --- Private

  initialize() {
    if (this.size === undefined) {
      this.update();
    }
  }

  getTotalSize() {
    return this.getElementSize() - this.getImageSize();
  }

  getElementSize() {
    return this.isVertical ?
      this.isFixed ? window.innerHeight : this.offsetElement.offsetHeight :
      this.isFixed ? window.innerWidth  : this.offsetElement.offsetWidth;
  }

  getImageSize() {
    if (this.img) {
      return this.isVertical ? this.img.height : this.img.width;
    } else {
      return 0;
    }
  }

}

/*-------------------------] CSSViewportValue [--------------------------*/

class CSSViewportValue extends CSSValue {

  constructor(val, initial, unit) {
    super(val, initial, unit, true);
  }

  get px() {
    return this.val * this.getViewportValue() / 100;
  }

  set px(px) {
    this.val = px / this.getViewportValue() * 100;
  }

  getViewportValue() {
    switch (this.unit) {
      case 'vw':   return window.innerWidth;
      case 'vh':   return window.innerHeight;
      case 'vmin': return Math.min(window.innerWidth, window.innerHeight);
      case 'vmax': return Math.max(window.innerWidth, window.innerHeight);
    }
  }

  clone() {
    return new CSSViewportValue(this.val, this.initial, this.unit);
  }

}

/*-------------------------] CSSZIndex [--------------------------*/

class CSSZIndex {

  static fromMatcher(matcher) {
    var prop, cssValue;

    prop = matcher.getProperty('zIndex');

    if (prop.isInitial()) {
      cssValue = new CSSIntegerValue(0, true);
    } else {
      cssValue = CSSValue.parse(prop.getValue(), prop, matcher.el);
    }
    return new CSSZIndex(cssValue);
  }

  constructor(cssValue) {
    this.cssValue = cssValue;
  }

  add(val) {
    this.cssValue.val += val;
  }

  getHeader() {
    return this.toString();
  }

  appendCSSDeclaration(declarations) {
    if (!this.cssValue.isInitial()) {
      declarations.push(`z-index: ${this.cssValue};`);
    }
  }

  toString() {
    return this.cssValue.isInitial() ? '' : this.cssValue.toString();
  }

  clone() {
    return new CSSZIndex(this.cssValue.clone());
  }

}

/*-------------------------] CSSBackgroundImage [--------------------------*/

// TODO: MOVE
class CSSBackgroundImage {

  static get SAME_DOMAIN_REG() { return new RegExp('^' + location.origin.replace(/([/.])/g, '\\$1')); }
  static get DATA_URI_REG()    { return /^data:/; }
  static get URL_REG()         { return /url\(["']?(.+?)["']?\)/i; }

  // Note that everything in this method will happen synchronously
  // when testing with mocks, so the order of promises and load
  // events matter here.
  static fromMatcher(matcher) {
    var img, spriteRecognizer, cssLeft, cssTop, backgroundImage;

    [img, spriteRecognizer] = this.getImageAndRecognizer(matcher);
    [cssLeft, cssTop]       = this.getPosition(matcher, img);

    backgroundImage = new CSSBackgroundImage(img, cssLeft, cssTop, spriteRecognizer);

    if (img) {
      img.addEventListener('load', () => backgroundImage.update());
    }

    return backgroundImage;
  }

  static getImageAndRecognizer(matcher) {
    var url, img, spriteRecognizer;

    url = matcher.getValue('backgroundImage');

    if (url) {
      img = new Image();
      url = url.match(CSSBackgroundImage.URL_REG)[1];
      this.fetchDomainSafeUrl(url).then(url => {
        img.src = url;
      });
      spriteRecognizer = new SpriteRecognizer(img);
    }

    return [img, spriteRecognizer];
  }

  static getPosition(matcher, img) {
    var prop, cssLeft, cssTop, values;

    prop = matcher.getProperty('backgroundPosition');

    if (prop.isInitial()) {
      cssLeft = new CSSPixelValue(0, true);
      cssTop  = new CSSPixelValue(0, true);
    } else {
      // To prevent errors on multiple background images,
      // just take the first position in the list.
      values  = prop.getValue().split(',')[0].split(' ');
      cssLeft = CSSValue.parse(values[0], prop, matcher.el, false, img);
      cssTop  = CSSValue.parse(values[1], prop, matcher.el, true, img);
    }

    return [cssLeft, cssTop];
  }

  static fetchDomainSafeUrl(url) {
    if (this.isDomainSafeUrl(url)) {
      // URL is domain safe, so return immediately.
      return Promise.resolve(url);
    } else {
      return new Promise((resolve, reject) => {
        // The background tab is the only context in which pixel data from X-Domain
        // images can be loaded, so send a message requesting a conversion to a data URI.
        var message = { message: 'convert_image_url_to_data_url', url: url };
        chrome.runtime.sendMessage(message, response => {
          if (response.success) {
            resolve(response.data);
          } else {
            reject(response.url);
          }
        });
      });
    }
  }

  static isDomainSafeUrl(url) {
    return this.SAME_DOMAIN_REG.test(url) || this.DATA_URI_REG.test(url);
  }

  constructor(img, cssLeft, cssTop, spriteRecognizer) {
    this.img              = img;
    this.cssLeft          = cssLeft;
    this.cssTop           = cssTop;
    this.spriteRecognizer = spriteRecognizer;
  }

  hasImage() {
    return !!this.img;
  }

  update() {
    this.cssLeft.update();
    this.cssTop.update();
  }

  // --- Actions

  getSpriteBounds(coord) {
    // The coordinate in the image's xy coordinate system,
    // minus any positioning offset.
    var imgCoord = coord.subtract(this.getPosition());
    return this.spriteRecognizer.getSpriteBoundsForCoordinate(imgCoord);
  }

  getPositionHeader() {
    return this.getPositionString(', ');
  }

  renderPosition(style) {
    style.backgroundPosition = this.getPositionString();
  }

  // --- Positioning

  move(x, y) {
    this.cssLeft.px += x;
    this.cssTop.px  += y;
  }

  getPositionString(join) {
    if (this.cssLeft.isInitial() && this.cssTop.isInitial()) {
      return '';
    } else {
      return [this.cssLeft, this.cssTop].join(join || ' ');
    }
  }

  getPosition() {
    return new Point(this.cssLeft.px, this.cssTop.px);
  }

  setPosition(x, y) {
    this.cssLeft.px = x;
    this.cssTop.px  = y;
  }

  appendCSSDeclaration(declarations) {
    var str = this.getPositionString();
    if (str) {
      declarations.push(`background-position: ${str};`);
    }
  }

  clone() {
    // The background image data itself is never assumed to be changed,
    // so there's no need to clone the image or sprite recognizer when cloning.
    return new CSSBackgroundImage(this.img, this.cssLeft.clone(), this.cssTop.clone(), this.spriteRecognizer);
  }

}

window.AppController = AppController;
