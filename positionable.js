/*
 *  Positionable Chrome Extension
 *
 *  Freely distributable and licensed under the MIT-style license.
 *  Copyright (c) 2017 Andrew Plummer
 *
 * ---------------------------- */

// TODO: test with:
// - scrolling
// - initial state
// - undo for everything
// - unsupported transforms
// - both degrees and radians!
// - double check precisions!
// - rotate before translate??
// - rotation with a different origin?
// - try different rotation configurations (negative, over 360?)
// - resizing with rotated box and pre-existing translation
// - pre-existing translationX or Y? how to handle?
// - constraining from all directions
// - weird bug when going crazy with mouse... div scrolling??
// - different background positions... top right, percentages
// - bug: go to zindex nudging and unfocus window, then focus back, move is rendered
// - test "auto" values? what should happen here?
// - test background-image: none
// - resize while flipping between sizing modes (jumps?)
// - position drag then hit ctrl to background drag (jumps?)
// - make sure static elements are changed to absolute
// - test command key on windows
// - test element comes to foreground when focused
// - test undefined top/left/width/height values
// - test element gains focus on all handle drags
// - test dragging does not follow links
// - test nested scrolling elements
// - test same domain / cross domain image
// - test z-index on overlapping elements when dragging
// - test on elements with transitions
// - should it work on absolute elements with no left/right/top/bottom properties?
// - should it work on static elements and force them to absolute positioning?
// - should it unintentionally work on elements that are part of other extensions?
// - what if they hit the extension button twice?

// TODO: allow bottom/right position properties??
// TODO: not sure if I'm liking the accessors... they're too mysterious
// TODO: do we really need to round anything that toFixed can't handle?
// TODO: distribute should be greyed out if less than 3 elements
// TODO: why are there 2 copy animations??
// TODO: validate query selectors! and also re-get elements on query selector change


const UI_HOST_CLASS_NAME = 'positionable-extension-ui';

// TODO: remove??
const EXTENSION_CLASS_PREFIX = 'positionable-extension-';
const EXTENSION_ORIGIN_REG   = new RegExp('^' + location.origin.replace(/([\/.])/g, '\\$1'));

/*-------------------------] Utilities [--------------------------*/

function getClassName(el) {
  // SVG className attributes are of type "SVGAnimatedString"
  return typeof el.className.baseVal === 'string' ? el.className.baseVal : el.className;
}

function round(n, precision) {
  if (precision) {
    var mult = Math.pow(10, precision);
    return Math.round(n * mult) / mult;
  }
  return Math.round(n);
}

function getObjectSize(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
}

function isObject(obj) {
  return typeof obj === 'object';
}

function camelize(str) {
  return str.replace(/-(\w)/g, function(match, letter) {
    return letter.toUpperCase();
  });
}

function hashIntersect(obj1, obj2) {
  var result = {}, prop, val1, val2, tmp;
  if (isObject(obj1) && isObject(obj2)) {
    for (prop in obj1) {
      if (!obj1.hasOwnProperty(prop)) continue;
      val1 = obj1[prop];
      val2 = obj2[prop];
      if (isObject(val1)) {
         tmp = hashIntersect(val1, val2);
         if (tmp) {
           result[prop] = tmp;
         }
      } else if (val1 === val2) {
        result[prop] = val1;
      }
    }
  }
  if (getObjectSize(result) > 0) {
    return result;
  }
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

  static get DELAY_TO_SLOW() { return 250;  };
  static get DELAY_TO_MID()  { return 1500; };
  static get DELAY_TO_FAST() { return 3000; };

  static get REPEAT_SLOW()   { return 20; };
  static get REPEAT_MID ()   { return 10; };
  static get REPEAT_FAST()   { return 5;  };

  static get SHIFT_MULTIPLIER() { return 5; }

  static get POSITION_MODE()    { return 'position';            }
  static get ROTATE_MODE()      { return 'rotate';              }
  static get RESIZE_NW_MODE()   { return 'resize-nw';           }
  static get RESIZE_SE_MODE()   { return 'resize-se';           }
  static get BG_POSITION_MODE() { return 'background-position'; }
  static get Z_INDEX_MODE()     { return 'z-index';             }

  constructor() {
    this.resetNudges();
    this.resetTimeout();
    this.setMode(NudgeManager.POSITION_MODE);
    this.checkNextNudge = this.checkNextNudge.bind(this);
  }

  // --- Init

  resetNudges() {
    this.nudges = {};
  }

  resetTimeout() {
    this.timer = clearTimeout(this.timer);
  }

  // --- Modes

  setMode(mode) {
    this.mode = mode;
  }

  toggleMode(mode) {
    if (this.mode === mode) {
      // Resize SE -> Resize NW
      // Resize NW -> Resize SE
      // All other modes toggle back to position mode.
      if (mode === NudgeManager.RESIZE_SE_MODE) {
        this.mode = NudgeManager.RESIZE_NW_MODE;
      } else if (mode === NudgeManager.RESIZE_NW_MODE) {
        this.mode = NudgeManager.RESIZE_SE_MODE;
      } else {
        this.mode = NudgeManager.POSITION_MODE;
      }
    } else {
      this.mode = mode;
    }
  }

  isMode(mode) {
    return this.mode === mode;
  }

  // --- Multiplier

  setMultiplier(on) {
    this.multiplier = on;
  }

  getMultiplier() {
    return this.multiplier ? NudgeManager.SHIFT_MULTIPLIER : 1;
  }

  // --- States

  isNudging() {
    var nudges = this.nudges;
    return !!(nudges.up || nudges.down || nudges.left || nudges.right);
  }

  // --- Actions

  dispatchNudge(vector) {
    if (this.isMode(NudgeManager.RESIZE_NW_MODE)) {
      this.resizeOffset = this.resizeOffset.add(vector);
      elementManager.resize(this.resizeOffset, 'nw');
    } else if (this.isMode(NudgeManager.RESIZE_SE_MODE)) {
      this.resizeOffset = this.resizeOffset.add(vector);
      elementManager.resize(this.resizeOffset, 'se');
    } else if (this.isMode(NudgeManager.BG_POSITION_MODE)) {
      elementManager.incrementBackgroundPosition(vector);
    } else if (this.isMode(NudgeManager.Z_INDEX_MODE)) {
      elementManager.incrementZIndex(vector);
    } else if (this.isMode(NudgeManager.ROTATE_MODE)) {
      elementManager.incrementRotation(vector);
    } else {
      elementManager.incrementPosition(vector);
    }
    statusBar.update();
  }

  addDirection(dir) {
    if (!this.isNudging()) {
      this.start();
    }
    this.nudges[dir] = true;
    this.next();
  }

  removeDirection(dir) {
    this.nudges[dir] = false;
    if (!this.isNudging()) {
      this.resetTimeout();
    }
  }

  start() {
    this.startTime = new Date();
    this.resizeOffset = new Point(0, 0);
    elementManager.pushState();
  }

  next() {
    if (this.timer) return;
    var nudges, nudgeX, nudgeY, mult;

    nudges = this.nudges;
    nudgeX = 0;
    nudgeY = 0;
    mult = this.getMultiplier();

    if (nudges.up) {
      nudgeY = -1;
    } else if (nudges.down) {
      nudgeY = 1;
    }
    if (nudges.left) {
      nudgeX = -1;
    } else if (nudges.right) {
      nudgeX = 1;
    }
    this.dispatchNudge(new Point(nudgeX * mult, nudgeY * mult));
    this.timer = setTimeout(this.checkNextNudge, this.getDelay());
  }

  checkNextNudge() {
    this.timer = null;
    if (this.isNudging()) {
      this.next();
    }
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

}

/*-------------------------] KeyEventManager [--------------------------*/

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

  /*
  delegateEventToElementManager(name, target) {
    var evtName = name.slice(2).toLowerCase();
    this.setupHandler(evtName, function(evt) {
      elementManager[name](evt);
    }, target);
  }
  */

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
    this.isShadow = this.isShadowElement(el);
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
    // TODO: remove this methods if all ui elements are in a shadowDOM... can't because:
    // - PositionableElementManager needs a body class for the rotation cursor XXXXXXXXX
    //return (this.isShadow ? '' : EXTENSION_CLASS_PREFIX) + name;
    return name;
  }

  isShadowElement(el) {
    return el.getRootNode() !== document;
  }

  // TODO: clean this up
  afterTransition(fn) {
    this.el.addEventListener('transitionend', function t(evt) {
      fn();
      this.el.removeEventListener('transitionend', t);
    }.bind(this));
    /*
    var self = this, el = this.el;
    function finished() {
      // TODO: change to transitionend?
      el.removeEventListener('transitionend', finished);
      // TODO: not use self?
      fn.call(self);
    }
    el.addEventListener('transitionend', finished);
    */
  }

  resetScroll() {
    this.el.scrollTop = 0;
    this.el.scrollLeft = 0;
  }

  show(on) {
    this.el.style.display = on === false ? '' : 'block';
  }

  hide() {
    this.el.style.display = 'none';
  }

  html(html) {
    this.el.innerHTML = html;
    return this;
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

  getCenter() {
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
    var root = container.createShadowRoot();

    // Relative extension paths don't seem to be supported in HTML template
    // files, so manually swap out these tokens for the extension path.
    root.innerHTML = templateHtml.replace(ShadowDomInjector.EXTENSION_RELATIVE_PATH_REG, ShadowDomInjector.BASE_PATH);
    this.parent.appendChild(container);

    return root;
  }

}

/*-------------------------] CursorManager [--------------------------*/

class CursorManager {

  static get MOVE_CURSOR()     { return 'move'; }

  constructor(basePath) {
    this.basePath = basePath;
    this.rotationNames = ['se','s','sw','w','nw','n','ne','e'];
    this.resizeNames   = ['nwse','ns','nesw','ew','nwse','ns','nesw','ew'];
    this.injectStylesheet();
  }

  // --- Drag Cursors

  setRotateDragCursor(rotation) {
    this.setDragCursor(this.getRotateCursor(rotation));
  }

  setResizeDragCursor(name, rotation) {
    this.setDragCursor(this.getResizeCursor(name, rotation));
  }

  setDragCursor(cursor) {
    this.setCursor('drag', cursor);
  }

  clearDragCursor() {
    this.setCursor('drag', '');
  }

  // --- Hover Cursors

  setRotateHoverCursor(rotation) {
    this.setHoverCursor(this.getRotateCursor(rotation));
  }

  setResizeHoverCursor(name, rotation) {
    this.setHoverCursor(this.getResizeCursor(name, rotation));
  }

  setHoverCursor(cursor) {
    this.setCursor('hover', cursor);
  }

  clearHoverCursor() {
    this.setCursor('hover', '');
  }

  // --- Private

  setCursor(type, cursor) {
    this[type + 'Cursor'] = cursor;
    this.render();
  }

  render() {
    this.style.cursor = this.dragCursor || this.hoverCursor || '';
  }

  getResizeCursor(name, rotation) {
    var index = this.rotationNames.indexOf(name);
    return this.getCursorForRotation(this.resizeNames, rotation, index) + '-resize';
  }

  getRotateCursor(rotation) {
    var name = this.getCursorForRotation(this.rotationNames, rotation);
    // Note that a fallback must be provided for image
    // cursors or the style will be considered invalid.
    return `url(${this.basePath}images/cursors/rotate-${name}.png) 13 13, pointer`;
  }

  getCursorForRotation(arr, rotation, addIndex) {
    rotation = rotation || 0;
    addIndex = addIndex || 0;
    return arr[(((rotation + 22.5) / 45 | 0) + addIndex) % 8];
  }

  injectStylesheet() {
    var el = document.createElement('style');
    document.head.appendChild(el);
    el.sheet.insertRule('html, html * {}');
    this.style = el.sheet.rules[0].style;
  }

}

/*-------------------------] IconElement [--------------------------*/

class IconElement extends Element {

  constructor(parent, id, className) {
    super(parent, 'img', className);
    this.el.src = chrome.extension.getURL('images/icons/' + id + '.svg');
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
    };
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

  static get INTERACTIVE_ELEMENTS_SELECTOR() { return 'h1,h2,h3,h4,h5,h6,p,a,input,label,select,code,pre,span'; }

  constructor(el, allowInteraction) {
    super(el, allowInteraction);
    this.setupDragEvents();
    this.dragging = false;
    this.hovering = false;

    if (allowInteraction) {
      this.disableDraggingOnInteractiveElements();
    }
  }

  // --- Setup

  // TODO: use a flag here instead to use intents or not?
  setupDragIntents() {
    this.bindEvent('mouseover', this.onMouseOver);
    this.bindEvent('mouseout', this.onMouseOut);
  }

  setupDragEvents() {
    this.bindEvent('mousedown', this.onMouseDown);
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

  suppressLinkClicks() {
    if (this.el.href) {
      this.preventDefault('click');
    }
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

    this.resetTarget = null;

    document.documentElement.addEventListener('mousemove', this.onMouseMove);
    document.documentElement.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('scroll', this.onScroll);
  }

  onMouseMove(evt) {
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

    this.lastMouseEvent = evt;

    if (!this.dragging) {
      this.onDragStart(evt);
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
      shiftKey: this.lastMouseEvent.shiftKey
    });
  }

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

  getScrollOffset() {
  }

  // --- Overrides

  onDragStart(evt) {
    this.disableUserSelect();
  }

  onDragMove(evt)  {
    this.setEventDrag(evt);
  }

  onDragStop(evt)  {
    this.clearUserSelect();
    this.checkDragIntentStopped();
  }

  onDragIntentStart(evt) {}
  onDragIntentStop(evt)  {}
  onClick(evt) {}

  // --- Private

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

  disableDraggingOnInteractiveElements() {
    var els = this.el.querySelectorAll(DragTarget.INTERACTIVE_ELEMENTS_SELECTOR);
    els.forEach(el => {
      el.addEventListener('mousedown', function(evt) {
        evt.stopPropagation();
      });
    });
  }

  // TODO: can this be removed?
  dragReset(evt) {
    this.resetTarget = this.el;
  }

}

/*-------------------------] DraggableElement [--------------------------*/

class DraggableElement extends DragTarget {

  //static get DRAGGABLE_CLASS()       { return 'draggable-element'; }
  //static get DRAGGING_ACTIVE_CLASS() { return 'draggable-element--active'; }

  constructor(el, allowInteraction) {
    super(el, allowInteraction);
    this.setupDragIntents();
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

/*-------------------------] Event [--------------------------*/

class Event {

  constructor() {
    this.data = {};
  }

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
    this.listener = listener;
    this.setupDragIntents();
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

}

/*-------------------------] ResizeHandle [--------------------------*/

class ResizeHandle extends DragTarget {

  // TODO: arg order?
  constructor(root, name, listener) {
    super(root.getElementById('resize-handle-' + name));
    this.name = name;
    this.listener = listener;
    this.setupDragIntents();

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

  static get OFFSET() { return 45; };

  constructor(root, listener, rotation, origin, originFixed) {
    super(root.getElementById('rotation-handle'));
    this.listener    = listener;
    this.rotation    = rotation    || 0;
    this.origin      = origin      || new Point(0, 0);
    this.originFixed = originFixed || false;
    this.setupDragIntents();
  }

  onDragIntentStart(evt) {
    this.listener.onRotationHandleDragIntentStart(evt, this);
  }

  onDragIntentStop(evt) {
    this.listener.onRotationHandleDragIntentStop(evt, this);
  }

  onDragStart(evt) {
    super.onDragStart(evt);
    this.startRotation = this.rotation;
    this.listener.onRotationHandleDragStart(evt, this);
  }

  onDragMove(evt) {
    super.onDragMove(evt);
    this.rotation = this.getRotationForEvent(evt);
    this.setEventRotation(evt);
    this.listener.onRotationHandleDragMove(evt, this);

    /*
    this.rotation = this.getAngleForMouseEvent(evt, this.origin);

    evt.rotation = this.rotation;
    evt.offsetRotation = this.rotation - this.startRotation;

    this.listener.onRotationHandleDragMove(evt);
    */

    /*
    var r = this.getAngleForMouseEvent(evt, this.origin) - this.startAngle;
    if (evt.isConstrained()) {
      r = round(r / RotationHandle.SNAPPING) * RotationHandle.SNAPPING;
    }
    evt.rotation = r;
    */
    //this.listener.onRotationHandleDragMove(evt);
    //elementManager.rotate(r);
    //statusBar.update();
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.startRotation = null;
    this.listener.onRotationHandleDragStop(evt, this);
    //this.listener.onRotationHandleDragMove(this.addRotationEventData(evt));
    //this.listener.onRotationHandleDragStart(this.addRotationEventData(evt));
    //this.listener.onRotationHandleDragStop(this.addRotationEventData(evt));
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
  // --- Private

  setEventRotation(evt) {
    evt.rotation = {
      abs: this.rotation,
      offset: this.rotation - this.startRotation
    };
  }

  getRotationForEvent(evt) {
    var x = this.originFixed ? evt.clientX : evt.pageX;
    var y = this.originFixed ? evt.clientY : evt.pageY;
    return new Point(x, y).subtract(this.origin).getAngle() - RotationHandle.OFFSET;
  }

}

/*-------------------------] PositionableElement [--------------------------*/

class PositionableElement extends BrowserEventTarget {

  // --- Constants

  static get UI_FOCUSED_CLASS() { return 'ui--focused' };

  static get PEEKING_DIMENSIONS()   { return 500 };
  static get DOUBLE_CLICK_TIMEOUT() { return 500 };

  static get ROTATION_SNAPPING() { return 22.5 };

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
    this.setupPositionedParents();
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
    this.bindEvent('dblclick', this.onDoubleClick);
    this.bindEvent('mousedown', this.onMouseDown);
    this.bindEvent('contextmenu', this.onContextMenu);
  }

  setupInitialState() {
    var el = this.el, matcher = new CSSRuleMatcher(el);

    // TODO: make sure this property is exported as well!
    if (matcher.getProperty('position') === 'static') {
      this.el.style.position = 'absolute';
    }

    this.cssBox = CSSBox.fromMatcher(matcher);

    /*
    this.box = new CSSBox(
      matcher.getCSSValue('left'),
      matcher.getCSSValue('top'),
      matcher.getCSSValue('width'),
      matcher.getCSSValue('height')
    );
    */

    this.cssZIndex = matcher.getZIndex();
    this.cssTransform = matcher.getTransform(el);
    this.backgroundImage = matcher.getBackgroundImage(el);
  }

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
      nw: new ResizeHandle(root, 'nw', this),
    };
    this.positionHandle = new PositionHandle(root, this);

    // TODO: different origins?
    this.rotationHandle = new RotationHandle(root, this,
                                                   this.getRotation(),
                                                   this.getCenter(),
                                                   this.isFixed);
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


  updateRotationOrigin() {
    this.rotationHandle.origin = this.getCenter();
  }

  // --- Mouse Events

  onMouseDown(evt) {
    evt.stopPropagation();
    this.listener.onElementMouseDown(evt, this);
  }

  // --- Position Handle Drag Events

  onPositionHandleDragIntentStart(evt, handle) {
    this.listener.onPositionHandleDragIntentStart(evt, this);
  }

  onPositionHandleDragIntentStop(evt, handle) {
    this.listener.onPositionHandleDragIntentStop(evt, this);
  }

  onPositionHandleDragStart(evt) {
    this.listener.onPositionHandleDragStart(evt, this);
  }

  onPositionHandleDragMove(evt) {
    this.listener.onPositionHandleDragMove(evt, this);
  }

  onPositionHandleDragStop(evt) {
    this.listener.onPositionHandleDragStop(evt, this);
  }

  // --- Resize Handle Drag Events

  onResizeHandleDragIntentStart(evt, handle) {
    this.listener.onResizeHandleDragIntentStart(evt, handle);
  }

  onResizeHandleDragIntentStop(evt, handle) {
    this.listener.onResizeHandleDragIntentStop(evt, handle);
  }

  onResizeHandleDragStart(evt, handle) {
    this.listener.onResizeHandleDragStart(evt, handle);
  }

  onResizeHandleDragMove(evt, handle) {
    this.listener.onResizeHandleDragMove(evt, handle);
  }

  onResizeHandleDragStop(evt, handle) {
    this.listener.onResizeHandleDragStop(evt, handle);
  }

  // --- Rotation Handle Drag Events

  onRotationHandleDragIntentStart(evt, handle) {
    this.listener.onRotationHandleDragIntentStart(evt, handle);
  }

  onRotationHandleDragIntentStop(evt, handle) {
    this.listener.onRotationHandleDragIntentStop(evt, handle);
  }

  onRotationHandleDragStart(evt, handle) {
    this.listener.onRotationHandleDragStart(evt, handle);
  }

  onRotationHandleDragMove(evt, handle) {
    this.listener.onRotationHandleDragMove(evt, handle);
  }

  onRotationHandleDragStop(evt, handle) {
    this.listener.onRotationHandleDragStop(evt, handle);
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

  onDoubleClick(evt) {

    if (!this.backgroundImage.hasImage()) {
      return;
    }

    var x = evt.clientX + window.scrollX;
    var y = evt.clientY + window.scrollY;
    var p = new Point(x, y).subtract(this.box.getPosition());
    //var coords = this.box.getCoords(point, this.transform.getRotation()).subtract(this.backgroundImage.getPosition());
    var sprite = this.backgroundImage.getSpriteBounds(p);
    console.info('SPRITE:', sprite);

    if (sprite) {
      this.pushState();
      this.setBackgroundPosition(new Point(-sprite.left, -sprite.top));
      this.box.right  = this.box.left + sprite.getWidth();
      // TODO: don't have target!
      this.box.bottom = this.box.top  + sprite.getHeight();
      this.render();
      statusBar.update();
    }
  }

  onContextMenu(evt) {
    if (evt.ctrlKey) {
      evt.preventDefault();
      this.handleCtrlDoubleClick(evt);
    }
  }

  // TODO: what is this?
  handleCtrlDoubleClick(evt) {
    if (this.doubleClickTimer) {
      this.onDoubleClick(evt)
    }
    this.doubleClickTimer = setTimeout(function() {
      this.doubleClickTimer = null;
    }.bind(this), PositionableElement.DOUBLE_CLICK_TIMEOUT);
  }

  // --- Focusing

  focus() {
    this.ui.addClass(PositionableElement.UI_FOCUSED_CLASS);
    /*
    this.addClass('positioned-element-focused');
     TODO: test this!
    this.positionedParents.forEach(function(el) {
      el.addClass('positioned-parent-focused');
    });
    */
  }

  unfocus() {
    this.ui.removeClass(PositionableElement.UI_FOCUSED_CLASS);
    /*
    this.removeClass('positioned-element-focused');
    this.positionedParents.forEach(function(el) {
      el.removeClass('positioned-parent-focused');
    });
    */
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

  resize(x, y, dir, constrain, isAbsolute) {
    var lastState, lastBox, nextBox, ratio, rotation, vector;

    lastState = this.getLastState();
    lastBox   = lastState.cssBox;
    nextBox   = lastBox.clone();
    ratio     = lastBox.getRatio();
    //var lastRatio = lastBox.getRatio();
    rotation = this.cssTransform.getRotation();
    vector = new Point(x, y);
    //var handle = this.getHandle(handleName);

    if (rotation) {
      vector = vector.rotate(-rotation);
    }

    nextBox.moveEdges(vector.x, vector.y, dir);

    if (constrain) {
      nextBox.constrain(ratio, dir);
    }

    if (rotation) {
      var a1 = this.getAnchorPosition(dir, lastBox, rotation);
      var a2 = this.getAnchorPosition(dir, nextBox, rotation);
      // TODO: move into function?
      //var a1 = anchor.getPosition(lastBox, rotation);
      //var a2 = anchor.getPosition(nextBox, rotation);
      var pos = lastState.cssTransform.getTranslation().add(a1.subtract(a2))
      this.cssTransform.setTranslation(pos);
      this.renderTransform();
    }

    this.cssBox = nextBox;
    this.cssBox.render(this.el.style);
  }

  getAnchorPosition(dir, cssBox, rotation) {
    var offset = this.getAnchorCenterOffset(dir, cssBox);
    return cssBox.getCenter().add(offset.rotate(rotation));
  }

  getAnchorCenterOffset(dir, cssBox) {
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
  */

  toggleHandles(on) {
    if (on) {
      this.removeClass('handles-hidden');
    } else {
      this.addClass('handles-hidden');
    }
  }

  // --- Rotation

  rotate(offset, constrained) {
    var r;
    if (constrained) {
      offset = round(offset / PositionableElement.ROTATION_SNAPPING) * PositionableElement.ROTATION_SNAPPING;
    }
    r = this.getLastRotation() + offset;
    this.cssTransform.setRotation(r);
    this.renderTransform();
    this.rotationHandle.rotation = r;
  }

  /*
  setRotation(deg) {
    this.transform.rotation = this.getLastRotation() + deg;
    this.renderTransform();
  }
  */

  // TODO: can this be removed somehow?
  getLastRotation() {
    return this.getLastState().cssTransform.getRotation();
  }

  // --- Position

  move(x, y, constrain) {
    var p = this.getConstrainedMovePosition(x, y, constrain);
    this.cssBox = this.getLastState().cssBox.clone();
    this.cssBox.move(p.x, p.y);
    this.renderBox();
    this.updateRotationOrigin();
  }

  getConstrainedMovePosition(x, y, constrain) {
    var absX, absY;
    if (constrain) {
      absX = Math.abs(x);
      absY = Math.abs(y);
      if (absX < absY) {
        x = 0;
      } else {
        y = 0;
      }
    }
    return new Point(x, y);
  }

  renderBox() {
    this.cssBox.render(this.el.style);
  }

  moveBackground(x, y, constrain) {
    var lastPosition, rotation, pos;

    lastPosition = this.getLastState().backgroundImage.getPosition();
    rotation = this.transform.getRotation();

    /*
    if (rotation) {
      last = last.rotate(rotation);
    }
    */

    pos = this.getDraggedPosition(x, y, constrain, lastPosition);

    /*
    if (rotation) {
      offset = offset.rotate(-rotation);
    }
    */

    this.setBackgroundPosition(pos);
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
      cssBox: this.cssBox.clone(),
      cssZIndex: this.cssZIndex.clone(),
      cssTransform: this.cssTransform.clone(),
      backgroundImage: this.backgroundImage.clone()
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
    //this.position = state.position;
    this.backgroundImage = state.backgroundImage;
    this.render();
  }



  // --- Peeking

  peek(on) {
    if (on && !this.backgroundImage.hasImage()) {
      this.el.style.width  = PositionableElement.PEEKING_DIMENSIONS + 'px';
      this.el.style.height = PositionableElement.PEEKING_DIMENSIONS + 'px';
    } else {
      this.renderSize();
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

  setBackgroundPosition(p) {
    this.backgroundImage.setPosition(p);
    this.updateBackgroundPosition();
  }

  // TODO: remove?
  /*
  setPosition(point) {
    // TODO: Remove all direct this. properties
    this.position = point;
    this.box.setPosition(point);
    this.updatePosition();
  }
  */

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

  // --- Rendering

  render() {
    // TODO: update separately instead of render??
    this.updatePosition();
    this.renderSize();
    this.renderTransform();
    this.updateBackgroundPosition();
    this.renderZIndex();
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

  updateBackgroundPosition() {
    if (this.backgroundImage.hasImage()) {
      this.el.style.backgroundPosition = this.backgroundImage.getPositionString();
    }
  }

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

  // --- Output

  getSelector() {
    var type = settings.get(Settings.OUTPUT_SELECTOR);
    if (type === Settings.OUTPUT_SELECTOR_AUTO) {
      type = this.el.id ? Settings.OUTPUT_SELECTOR_ID : Settings.OUTPUT_SELECTOR_FIRST;
    }
    switch(type) {
      case Settings.OUTPUT_SELECTOR_NONE:    return '';
      case Settings.OUTPUT_SELECTOR_ID:      return '#' + this.el.id;
      case Settings.OUTPUT_SELECTOR_ALL:     return this.getAllClasses(this.el.classList);
      case Settings.OUTPUT_SELECTOR_TAG:     return this.getTagName(this.el);
      case Settings.OUTPUT_SELECTOR_TAG_NTH: return this.getTagNameWithNthIndex(this.el);
      case Settings.OUTPUT_SELECTOR_FIRST:   return this.getFirstClass(this.el.classList);
      case Settings.OUTPUT_SELECTOR_LONGEST: return this.getLongestClass(this.el.classList);
    }
  }

  getAllClasses(list) {
    return '.' + this.getFilteredClasses(list).join('.');
  }

  getFirstClass(list) {
    var first = this.getFilteredClasses(list)[0];
    return first ? '.' + first : '[undefined element]';
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
    return '.' + this.getFilteredClasses(list).reduce(function(a, b) {
      return a.length > b.length ? a : b;
    });
  }

  getFilteredClasses(list) {
    var filtered = [], i = 0;
    while(name = list[i++]) {
      if (!name.match(EXTENSION_CLASS_PREFIX)) {
        filtered.push(name);
      }
    }
    return filtered;
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

  getTabCharacter(name) {
    switch(name) {
      case Settings.TABS_TWO_SPACES:  return '  ';
      case Settings.TABS_FOUR_SPACES: return '    ';
      case Settings.TABS_TAB:         return '\u0009';
    }
  }

  getRoundedRotation() {
    var r = this.transform.getRotation();
    if (r % 1 !== 0.5) {
      r = round(r);
    }
    if (r === 360) r = 0;
    return r;
  }

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
    super.destroy();
  }

  // --- Private

  isFixedPosition() {
    return window.getComputedStyle(this.el).position === 'fixed';
  }

}

/*-------------------------] AppController [--------------------------*/

class AppController {

  static get HOST_CLASS_NAME() { return 'positionble-extension-ui'; }

  constructor(uiRoot) {

    this.settings = new Settings(this, localStorage, uiRoot);

    this.body = new Element(document.body);

    //this.copyAnimation = new CopyAnimation();
    //this.nudgeManager = new NudgeManager();
    //this.keyEventManager  = new KeyEventManager();

    this.cursorManager  = new CursorManager(ShadowDomInjector.BASE_PATH);

    // TODO: order here?
    this.elementManager = new PositionableElementManager(this);
    this.controlPanel   = new ControlPanel(uiRoot, this);

    this.bindEvents(uiRoot);

    new DragSelection(uiRoot, this);
    new LoadingAnimation(uiRoot, this).show();
  }

  onFocusedElementsChanged() {
    this.controlPanel.updateElements(this.elementManager.getFocusedElements());
  }

  /*
  onLoadingAnimationComplete() {
  }
  */

  skipGettingStarted() {
    this.settings.setBoolean(Settings.SKIP_GETTING_STARTED, true);
    this.controlPanel.showDefaultArea();
  }

  onSettingsSaved() {
    this.controlPanel.showDefaultArea();
  }

  showSettings() {
    this.controlPanel.showSettingsArea();
  }

  showHelp() {
    this.controlPanel.showHelpArea();
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

  // --- Position Handle Drag Events

  onPositionHandleDragIntentStart(evt, element) {
    console.info('POSITION HANDLE DRAG INTENT START');
    this.cursorManager.setHoverCursor('move');
  }

  onPositionHandleDragIntentStop(evt, element) {
    console.info('POSITION HANDLE DRAG INTENT STOP');
    this.cursorManager.clearHoverCursor();
  }

  onPositionHandleDragStart(evt, element) {
    console.info('POSITION HANDLE DRAG START');
    this.cursorManager.setDragCursor('move');
  }

  onPositionHandleDragStop(evt, element) {
    console.info('POSITION HANDLE DRAG STOP');
    this.cursorManager.clearDragCursor();
  }

  // --- Resize Handle Drag Events

  onResizeHandleDragIntentStart(evt, handle) {
    console.info('RESIZE HANDLE DRAG INTENT START');
    this.cursorManager.setResizeHoverCursor(handle.name, 0);
  }

  onResizeHandleDragIntentStop(evt, handle) {
    console.info('RESIZE HANDLE DRAG INTENT STOP');
    this.cursorManager.clearHoverCursor();
  }

  onResizeHandleDragStart(evt, handle) {
    console.info('RESIZE HANDLE DRAG START');
    this.cursorManager.setResizeDragCursor(handle.name, 0);
  }

  onResizeHandleDragStop(evt, handle) {
    console.info('RESIZE HANDLE DRAG STOP');
    this.cursorManager.clearDragCursor();
  }

  // --- Rotation Handle Drag Events

  onRotationHandleDragIntentStart(evt, handle) {
    console.info('ROTATION HANDLE DRAG INTENT START');
    this.cursorManager.setRotateHoverCursor(handle.rotation);
  }

  onRotationHandleDragIntentStop(evt, handle) {
    console.info('ROTATION HANDLE DRAG INTENT STOP');
    this.cursorManager.clearHoverCursor();
  }

  onRotationHandleDragMove(evt, handle) {
    console.info('ROTATION HANDLE DRAG MOVE');
    this.cursorManager.setRotateDragCursor(handle.rotation);
  }

  onRotationHandleDragStart(evt, handle) {
    console.info('ROTATION HANDLE DRAG START');
    this.cursorManager.setRotateDragCursor(handle.name, 0);
  }

  onRotationHandleDragStop(evt, handle) {
    console.info('ROTATION HANDLE DRAG STOP');
    this.cursorManager.clearDragCursor();
  }

  /*
  onRotationChanged(rotation) {
    this.cursorManager.setRotate(rotation);
  }
  */


  // --- Control Panel Drag Events

  onControlPanelDragStart(evt, element) {
    this.cursorManager.setDragCursor('move');
  }

  onControlPanelDragStop(evt, element) {
    this.cursorManager.clearDragCursor();
  }

  // --- Drag Selection Events

  onDragSelectionMove(selection) {
    this.elementManager.focusContainedElements(selection);
  }

  onDragSelectionStop() {
  }

  onDragSelectionClear() {
    this.elementManager.unfocusAll();
  }

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

  getFocusedElements() {
    return this.focusedElements;
  }

  // --- Setup

  // TODO: wtf is this??
  /*
  build() {
    loadingAnimation.show(this.build.bind(this));
  }
  */

  // --- Element Drag Events

  onElementMouseDown(evt, element) {
    this.swapFocused(evt, element);
  }

  // --- Position Handle Drag Events

  onPositionHandleDragIntentStart(evt, element) {
    this.listener.onPositionHandleDragIntentStart(evt, element);
  }

  onPositionHandleDragIntentStop(evt, element) {
    this.listener.onPositionHandleDragIntentStop(evt, element);
  }

  onPositionHandleDragStart(evt, element) {
    this.pushFocusedStates();
    this.listener.onPositionHandleDragStart(evt, element);
  }

  onPositionHandleDragMove(evt, element) {
    this.focusedElements.forEach(el => {
      var x = el.isFixed ? evt.drag.clientX : evt.drag.pageX;
      var y = el.isFixed ? evt.drag.clientY : evt.drag.pageY;
      var constrain = evt.drag.constrain;
      if (evt.ctrlKey) {
        el.moveBackground(x, y, constrain)
      } else {
        el.move(x, y, constrain)
      }
    });
  }

  onPositionHandleDragStop(evt, element) {
    this.listener.onPositionHandleDragStop(evt, element);
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

  // --- Resize Handle Drag Events

  onResizeHandleDragIntentStart(evt, handle) {
    this.listener.onResizeHandleDragIntentStart(evt, handle);
  }

  onResizeHandleDragIntentStop(evt, handle) {
    this.listener.onResizeHandleDragIntentStop(evt, handle);
  }

  onResizeHandleDragStart(evt, handle) {
    this.pushFocusedStates();
  }

  onResizeHandleDragMove(evt, handle) {
    this.focusedElements.forEach(el => {
      el.resize(evt.drag.x, evt.drag.y, handle.name, evt.shiftKey);
    });
  }

  onResizeHandleDragStop(evt, handle) {
  }

  // --- Rotation Handle Drag Events

  onRotationHandleDragIntentStart(evt, handle) {
    this.listener.onRotationHandleDragIntentStart(evt, handle);
  }

  onRotationHandleDragIntentStop(evt, handle) {
    this.listener.onRotationHandleDragIntentStop(evt, handle);
  }

  onRotationHandleDragStart(evt, handle) {
    this.pushFocusedStates();
    this.listener.onRotationHandleDragStart(evt, handle);
  }

  onRotationHandleDragMove(evt, handle) {
    this.focusedElements.forEach(el => el.rotate(evt.rotation.offset, evt.shiftKey));
    this.listener.onRotationHandleDragMove(evt, handle);
  }

  onRotationHandleDragStop(evt, handle) {
    this.listener.onRotationHandleDragStop(evt, handle);
  }

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
      let hostClassName = '.' + UI_HOST_CLASS_NAME;
      let excludeSelectors = excludeSelector ? excludeSelector.split(',') : [];

      excludeSelectors.push(hostClassName);
      excludeSelector = excludeSelectors.map(s => `:not(${s})`).join('')

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

  pushFocusedStates() {
    // TODO: change to focused!
    this.elements.forEach(el => el.pushState());
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
    */

  delegateToFocused(name, disallowWhenDragging) {
    // TODO: can this be cleaner?
    this[name] = function() {
      // TODO: test this case!
      //if (disallowWhenDragging && this.draggingElement) return;
      this.callOnEveryFocused(name, arguments);
    }.bind(this);
  }

  // --- Actions

  // TODO: move to focused?
  focus(element, toggle) {
    if (toggle) {
      this.toggleFocused(element);
    } else {
      this.addFocused(element);
    }
    this.statusBar.update();
  }

  focusContainedElements(selection) {
    var prev = this.getFocusedElements();
    var next = this.elements.filter(el => selection.contains(el.getCenter()));
    prev.forEach(e => this.removeFocused(e));
    next.forEach(e => this.addFocused(e));
    if (this.focusedElementsChanged(prev, next)) {
      this.listener.onFocusedElementsChanged();
    }
    this.focusedElements = next;
  }

  focusedElementsChanged(arr1, arr2) {
    return arr1.length !== arr2.length || arr1.some((el, i) => arr1[el] !== arr2[el]);
  }

  focusAll(toggle) {
    if (toggle && this.focusedElements.length === this.elements.length) {
      this.unfocusAll();
    } else {
      this.addAllFocused();
    }
    this.statusBar.update();
  }

  /*
  unfocusAll() {
    this.removeAllFocused();
    this.statusBar.update();
  }
  */

  // TODO: not toggling!
  toggleFocused(element) {
    if (this.elementIsFocused(element)) {
      this.removeFocused(element);
    } else {
      this.addFocused(element);
    }
  }

  addFocused(element) {
    if (!this.elementIsFocused(element)) {
      element.focus();
      this.focusedElements.push(element);
    }
  }

  setFocused(element, add) {
    if (!add) {
      this.focusedElements.filter(el => el !== element).forEach(el => el.unfocus());
      this.focusedElements = [];
    }
    this.addFocused(element);
  }

  swapFocused(evt, element) {
    if (!evt.shiftKey && this.focusedElements.length === 1) {
      this.unfocusAll();
    }
    this.addFocused(element);
  }

  removeFocused(element) {
    if (this.elementIsFocused(element)) {
      element.unfocus();
      this.focusedElements = this.focusedElements.filter(function(el) {
        return el !== element;
      });
    }
  }

  addAllFocused() {
    this.elements.forEach(function(el) {
      this.addFocused(el);
    }, this);
  }

  unfocusAll() {
    this.focusedElements.forEach(el => el.unfocus());
    this.focusedElements = [];
  }

  callOnEveryFocused(name, args) {
    var el, i, len;
    for(i = 0, len = this.focusedElements.length; i < len; i++) {
      el = this.focusedElements[i];
      el[name].apply(el, args);
    }
  }

  // --- Alignment

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

  // --- Output

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

  destroyAll() {
    this.elements.forEach(el => el.destroy());
  }

}

/*-------------------------] DragSelection [--------------------------*/

// TODO: mouse coords are not aligning with box perfectly (looks like scrollbar issues)
class DragSelection extends DragTarget {

  static get ACTIVE_CLASS() { return 'drag-selection--active'; }

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
    this.ui.addClass(DragSelection.ACTIVE_CLASS);
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
    this.ui.removeClass(DragSelection.ACTIVE_CLASS);
    this.listener.onDragSelectionStop(this);
  }

  onClick() {
    this.listener.onDragSelectionClear();
  }

  contains(p) {
    var rect = this.ui.el.getBoundingClientRect();

    return rect.left   <= p.x &&
           rect.right  >= p.x &&
           rect.top    <= p.y &&
           rect.bottom >= p.y;

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

  constructor(root, listener) {
    super(root.getElementById('control-panel'), true);
    this.listener = listener;

    this.setup(root);
    this.setupDoubleClick();
  }

  setup(root) {
    this.helpArea           = new ControlPanelArea(root, 'help');
    this.defaultArea        = new ControlPanelArea(root, 'default');
    this.elementArea        = new ControlPanelArea(root, 'element');
    this.settingsArea       = new ControlPanelArea(root, 'settings');
    this.gettingStartedArea = new ControlPanelArea(root, 'getting-started');
  }

  setupDoubleClick() {
    this.defaultH = this.cssH;
    this.defaultV = this.cssV;
    this.bindEvent('dblclick', this.onDoubleClick);
  }

  onDoubleClick() {
    this.cssH = this.defaultH;
    this.cssV = this.defaultV;
    this.render();
  }

  updateElements(elements) {
    console.info('would update control panel here');
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

  getAreaActiveClassName(area) {
    return 'control-panel--' + area.name + '-active';
  }

  showArea(area) {
    if (this.activeArea) {
      this.removeClass(this.getAreaActiveClassName(this.activeArea));
      this.activeArea.hide();
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

class Form extends Element {

  constructor(el) {
    super(el);
    this.data = {};
    this.addEventListener('submit', this.onFormSubmit);
  }

  onFormSubmit() {
    console.info('whoa', this);
  }


}

class Settings extends BrowserEventTarget {

  static get TAB_STYLE()           { return 'tab-style';         }
  static get SAVE_FILENAME()       { return 'save-filename';     }
  static get INCLUDE_SELECTOR()    { return 'include-selector';  }
  static get EXCLUDE_SELECTOR()    { return 'exclude-selector';  }
  static get OUTPUT_SELECTOR()     { return 'output-selector';   }
  static get OUTPUT_CHANGED_ONLY() { return 'changed-only';      }
  static get OUTPUT_UNIQUE_ONLY()  { return 'unique-only';       }

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
    super(root.getElementById('settings-form'));
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
    this.bindEvent('submit', this.onFormSubmit);
    this.bindEvent('reset', this.onFormReset);
    this.setFormControlsFromStorage();
    new LinkedSelect(root.getElementById('output-selector'));
  }

  setFormControlsFromStorage() {
    this.forEachFormControl((control) => {
      this.setFormControlFromStorage(control);
    });
  }

  setFormControlFromStorage(control) {
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
        control.checked = this.getBoolean(control.id);
        break;
    }
  }

  setStorageFromFormControls() {
    this.forEachFormControl((control) => {
      this.setStorageFromFormControl(control);
    });
  }

  setStorageFromFormControl(control) {
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
  }

  forEachFormControl(fn) {
    for (var i = 0, control; control = this.el.elements[i]; i++) {
      if (control.id) {
        fn.call(this, control);
      }
    }
  }

  onFormSubmit(evt) {
    evt.preventDefault();
    this.setStorageFromFormControls();
    this.listener.onSettingsSaved();
  }

  onFormReset(evt) {
    evt.preventDefault();
    if (confirm('Really clear all settings?')) {
      this.storage.clear();
      this.setFormControlsFromStorage();
      // Set timeout to prevent jank after confirm here
      setTimeout(() => this.listener.onSettingsSaved(), 0);
    }
    this.listener.onSettingsReset();
  }

  get(name) {
    return this.storage.getItem(name) || Settings.DEFAULTS[name];
  }

  set(name, value) {
    if (value == null) {
      this.storage.removeItem(name);
    } else {
      this.storage.setItem(name, value);
    }
  }

  getBoolean(name) {
    return !!this.get(name);
  }

  setBoolean(name, val) {
    this.set(name, val ? '1' : null);
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

  onChange(evt) {
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

  constructor(el, activeClass) {
    this.target      = new BrowserEventTarget(el);
    this.activeClass = activeClass;
  }

  defer(fn) {
    // Allow 1 frame to allow styling to be applied before
    // adding transition classes. For some reason RAF won't work here.
    setTimeout(fn.bind(this), 16);
  }

  show() {
    this.target.show();
    this.defer(function() {
      this.target.addClass(this.activeClass);
    });
    this.awaitTransitionEnd(this.onAnimationEnter);
  }

  hide() {
    // If hide is called in the same tick as show, then transitionend will
    // continue firing, so need to defer it here.
    this.defer(function() {
      this.target.removeClass(this.activeClass);
      this.awaitTransitionEnd(this.onAnimationExit);
    });
  }

  onAnimationEnter() {
  }

  onAnimationExit() {
    this.target.hide();
  }

  awaitTransitionEnd(fn) {
    this.target.addEventListener('transitionend', (evt) => {
      // This does a very naive listening for the first transitionend event
      // and then immediately removes the listener, which means it will end
      // on any property or inner element that has a transition on it. This
      // means that all transitions are assumed to be syncrhonized.
      this.target.removeAllListeners();
      fn.call(this);
    });
  }

}

/*-------------------------] LoadingAnimation [--------------------------*/

class LoadingAnimation extends Animation {

  static get ID()           { return 'loading-animation'; };
  static get ACTIVE_CLASS() { return 'loading-animation--active'; };

  constructor(uiRoot, listener) {
    super(uiRoot.getElementById(LoadingAnimation.ID), LoadingAnimation.ACTIVE_CLASS);
    this.listener = listener;
  }

  onAnimationEnter() {
    this.listener.onLoadingAnimationTaskReady();
    this.hide();
  }

}

/*-------------------------] CopyAnimation [--------------------------*/

class CopyAnimation extends Animation {

  static get COPIED_TEXT()     { return 'Copied!';   }
  static get NOT_COPIED_TEXT() { return 'No Styles'; }

  static get IN_CLASS()      { return 'copy-animation-in'; }
  static get TEXT_IN_CLASS() { return 'copy-animation-text-in'; }

  constructor() {
    super();
    this.build();
  }

  // --- Setup

  build() {
    this.box  = new Element(document.body, 'div', 'copy-animation');
    this.text = new Element(this.box.el, 'div', 'copy-animation-text');
  }

  // --- Actions

  setText(text) {
    this.text.html(text);
  }

  animate(copied) {

    this.setText(copied ? CopyAnimation.COPIED_TEXT : CopyAnimation.NOT_COPIED_TEXT);
    this.reset();
    this.box.show();

    this.defer(function() {

      this.box.addClass(CopyAnimation.IN_CLASS);
      this.text.addClass(CopyAnimation.TEXT_IN_CLASS);

      // TODO: cleaner??
      this.finished = function() {
        this.box.el.removeEventListener('webkitAnimationEnd', this.finished);
        this.reset();
      }.bind(this);
      this.box.addEventListener('webkitAnimationEnd', this.finished);
    });
  }

  reset() {
    this.box.show(false);
    this.box.removeClass(CopyAnimation.IN_CLASS);
    this.text.removeClass(CopyAnimation.TEXT_IN_CLASS);
  }

}

/*-------------------------] SpriteRecognizer [--------------------------*/

const SR_ORIGIN_REG = new RegExp('^' + location.origin.replace(/([\/.])/g, '\\$1'));
const SR_EXTENSION_REG = /^chrome-extension:\/\//;

class SpriteRecognizer {

  static get ORIGIN_REG()    { return SR_ORIGIN_REG; }
  static get EXTENSION_REG() { return SR_EXTENSION_REG; }

  constructor(img) {
    this.img = img;
    this.map = {};
    this.loadPixelData(img);
  }

  loadPixelData(img) {
    var canvas, context;
    canvas = document.createElement('canvas');
    canvas.setAttribute('width', img.width);
    canvas.setAttribute('height', img.height);
    context = canvas.getContext('2d');
    context.drawImage(img, 0, 0);
    this.pixelData = context.getImageData(0, 0, img.width, img.height).data;
  }

  getSpriteForCoordinate(coord) {
    var pixel = coord.round(), alpha, bounds, queue;

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

    return bounds;
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
    } else {
      this.setBounds(pixel, null);
    }
  }

  isValidPixel(pixel) {
    return pixel.x >= 0 && pixel.x <= this.img.width &&
           pixel.y >= 0 && pixel.y <= this.img.height;
  }

  getAlphaForPixel(pixel) {
    return this.pixelData[((this.img.width * pixel.y) + pixel.x) * 4 + 3];
  }

  // --- Pixel data map

  getBounds(pixel) {
    var key = this.getPixelKey(pixel);
    return this.map[key];
  }

  setBounds(pixel, bounds) {
    var key = this.getPixelKey(pixel);
    this.map[key] = bounds;
  }

  pixelHasBeenTested(pixel) {
    return this.map.hasOwnProperty(this.getPixelKey(pixel));
  }

  getPixelKey(pixel) {
    return pixel.x + ',' + pixel.y;
  }

}

/*-------------------------] Point [--------------------------*/

class Point {

  static get DEGREES_IN_RADIANS() { return 180 / Math.PI; }

  static degToRad(deg) {
    return deg / Point.DEGREES_IN_RADIANS;
  }

  static radToDeg(rad) {
    var deg = rad * Point.DEGREES_IN_RADIANS;
    while(deg < 0) deg += 360;
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

  multiply(n) {
    // TODO: does this work and do we even need it??
    return new Point(this.x * n, this.y * n);
    //return Point.vector(this.getAngle(), this.getLength() * n);
  }

  getAngle() {
    return Point.radToDeg(Math.atan2(this.y, this.x));
  }

/*
  getRotated(deg) {
    var rad = Point.degToRad(deg);


  setAngle(deg) {
    return Point.vector(deg, this.getLength());
  }
  */

  rotate(deg) {
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
    return new Point(round(this.x), round(this.y));
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

  constructor(top, right, bottom, left, rotation) {
    this.top      = top    || 0;
    this.right    = right  || 0;
    this.bottom   = bottom || 0;
    this.left     = left   || 0;
    this.rotation = rotation || 0;
  }

  getWidth(r) {
    var w = this.right - this.left;
    return r ? round(w) : w;
  }

  getHeight(r) {
    var h = this.bottom - this.top;
    return r ? round(h) : h;
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
    return new Rectangle(this.top, this.right, this.bottom, this.left, this.rotation);
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
    return this.fromMatcherWithFallback(matcher, 'left', 'right');
  }

  static verticalFromMatcher(matcher) {
    return this.fromMatcherWithFallback(matcher, 'top', 'bottom');
  }

  static fromMatcherWithFallback(matcher, prop1, prop2) {
    var cssValue;
    if (cssValue = this.getCSSValue(matcher, prop1)) {
      return new CSSPositioningProperty(cssValue, prop1);
    } else if (cssValue = this.getCSSValue(matcher, prop2)) {
      return new CSSPositioningProperty(cssValue, prop2);
    } else {
      throw new Error('Element requires either a ' + prop1 + ' or ' + prop2 + ' property.');
    }
  }

  static getCSSValue(matcher, prop) {
    var cssValue = matcher.getMatchedCSSValue(prop);
    return cssValue && cssValue.val === 'auto' ? null : cssValue;
  }

  constructor(cssValue, prop) {
    this.cssValue = cssValue;
    this.prop     = prop;
  }

  clone() {
    return new CSSPositioningProperty(this.cssValue.clone(), this.prop);
  }

  render(style) {
    style[this.prop] = this.cssValue;
  }

  add(px) {
    this.px += this.isInverted() ? -px : px;
  }

  // --- Accessors

  get px() {
    return this.cssValue.px;
  }

  set px(px) {
    this.cssValue.px = px;
  }

  // --- Accessors

  isInverted(prop) {
    return this.prop === 'right' || this.prop === 'bottom';
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

  static fromElement(el) {
    return CSSBox.fromMatcher(new CSSRuleMatcher(el));
  }

  static fromMatcher(matcher) {
    var cssH = CSSPositioningProperty.horizontalFromMatcher(matcher);
    var cssV = CSSPositioningProperty.verticalFromMatcher(matcher);
    var cssWidth  = matcher.getMatchedCSSValue('width');
    var cssHeight = matcher.getMatchedCSSValue('height');
    return new CSSBox(cssH, cssV, cssWidth, cssHeight);
  }

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

  moveEdge(offset, cssPos, cssDim, edge) {
    var ppx, dpx, edge;

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

  move(x, y) {
    this.cssH.add(x);
    this.cssV.add(y);
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

  getCenter() {
    // Note that this only returns the center of the box itself
    // and cannot be used in relation to coordinates relative
    // to the viewport/page as the box may be reflected or have
    // inverted properties.
    return new Point(this.cssWidth.px / 2, this.cssHeight.px / 2);
  }

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
    style[dimProp] = cssDim;
  }

  isInvertedEdge(prop) {
    return prop === 'right' || prop === 'bottom';
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

  getMatchedRules(el) {
    // Note: This API is deprecated and may be removed.
    try {
      return window.getMatchedCSSRules(el);
    } catch (e) {
      return null;
    }
  }

  getPosition(prop) {
    var val = this.getCSSValue(prop.toLowerCase());
    return val;

    /*
     * TODO: check this is necessary?
    if (!val.isAuto()) {
      // If the element is already explictly positioned, then
      // trust those values first as they are the ones that will
      // be directly manipulated.
      return val;
    }

    var px = this.el['offset' + prop] -
             CSSValue.parseValue(style['margin' + prop]) -
             CSSValue.parseValue(style['padding' + prop]) -
             CSSValue.parseValue(style['border' + prop + 'Width']);

    return new CSSValue(px);
    */
  }

  getCSSValue(prop) {
    return CSSValue.parse(this.getProperty(prop), prop, this.el.parentNode);

    /* TODO: handle these
    if (str === 'auto' || str === '') {
      // TODO: test "auto"
      return new CSSValue(null);
    } else if (str === 'center') {
      // TODO: other values??
      return new CSSValue(50, '%', percentTarget, percentComponent);
    }
    */

    // Normal percentages are relative to their parent nodes.
    /*
    var str = this.getProperty(prop);
    var val = CSSValue.parseValue(str);
    var unit = CSSValue.parseUnit(str);
    */

  }

  getMatchedCSSValue(prop) {
    return CSSValue.parse(this.getMatchedProperty(prop), prop, this.el.parentNode);
  }

  getZIndex() {
    // TODO: shouldn't this be getMatchedProperty?
    return CSSValue.parseZIndex(this.getProperty('zIndex'));
  }

  getTransform(el) {
    var str = this.getProperty('transform');
    if (!str || str === 'none') {
      return new CSSCompositeTransform();
    } else if (str.match(/matrix/)) {
      return CSSMatrixTransform.parse(str);
    } else {
      return CSSCompositeTransform.parse(str, el);
    }
  }

  getBackgroundImage(el) {
    // Must use computed styles here,
    // otherwise the url may not include the host.
    var backgroundImage = this.computedStyles['backgroundImage'];
    var backgroundPosition = this.getProperty('backgroundPosition');
    return BackgroundImage.fromStyles(backgroundImage, backgroundPosition, el);
  }

  getMatchedProperty(prop) {
    // Inline styles have highest priority, so attempt to use them first, then
    // fall back to matched CSS properties in reverse order to maintain priority.
    if (this.el.style[prop]) {
      return this.el.style[prop];
    }
    if (this.matchedRules) {
      for (var rules = this.matchedRules, i = rules.length - 1, rule, val; rule = rules[i]; i--) {
        val = rule.style[prop];
        if (val) {
          return val;
        }
      }
    }
  }

  getComputedProperty(prop) {
    return this.computedStyles[prop];
  }

  getProperty(prop) {
    // Attempt to get the property value. Use computed styles
    // as a last resort, as they do not preserve the unit.
    return this.getMatchedProperty(prop) || this.getComputedProperty(prop);
  }

}

/*-------------------------] CSSCompositeTransform [--------------------------*/

class CSSCompositeTransform {

  static get PARSE_REG() { return /(\w+)\((.+?)\)/g; };
  static get PRECISION() { return 2; }

  constructor(functions) {
    this.functions = functions || [];
  }

  static parse(str, el) {
    var reg = CSSCompositeTransform.PARSE_REG, functions = [], match;
    while (match = reg.exec(str)) {
      functions.push(CSSCompositeTransformFunction.fromNameAndValues(match[1], match[2]));
    }
    return new CSSCompositeTransform(functions);
  }

  getRotation() {
    return this.findOrAppendRotationFunction().values[0].deg || 0;
  }

  setRotation(deg) {
    this.findOrAppendRotationFunction().values[0].deg = deg;
  }

  addRotation(amt) {
    this.setRotation(this.getRotation() + amt);
  }

  getTranslation () {
    var func = this.getTranslationFunction();
    if (func) {
      return new Point(func.values[0].px, func.values[1].px);
    }
    return new Point(0, 0);
  }

  setTranslation (p) {
    var func = this.getTranslationFunction();
    if (func) {
      func.values[0].px = p.x;
      func.values[1].px = p.y;
    } else {
      // Translation respects subpixel values, so override precision here.
      // TODO: standardize precision for translation and make sure it works when one exists already
      var xVal = new CSSPixelValue(p.x, true);
      var yVal = new CSSPixelValue(p.y, true);
      // Ensure that translate comes first, otherwise anchors will not work.
      this.functions.unshift(new CSSCompositeTransformFunction('translate', [xVal, yVal]));
    }
  }

  findOrAppendRotationFunction() {
    return this.findTransformFunction(CSSCompositeTransformFunction.ROTATE) ||
           this.appendRotationFunction();
  }

  findTransformFunction(type) {
    return this.functions.find(f => f.name === type);
  }

  appendRotationFunction() {
    var func = new CSSCompositeTransformFunction('rotate', [new CSSDegreeValue()]);
    this.functions.push(func);
    return func;
  }

  getTranslationFunction() {
    return this.functions.find(function(f) {
      return f.name === CSSCompositeTransformFunction.TRANSLATE;
    });
  }

  isNull() {
    return this.functions.length === 0;
  }

  toString() {
    return this.functions.join(' ');
  }

  getRotationString() {
    var func = this.getRotationFunction();
    return func ? func.values[0].toString() : '';
  }

  clone() {
    var functions = this.functions.map(function(f) {
      if (f.canMutate()) {
        return f.clone();
      }
      return f;
    });
    return new CSSCompositeTransform(functions);
  }

}
/*-------------------------] CSSCompositeTransformFunction [--------------------------*/

  /*
  var match = transform && transform.match(/rotateZ\(([\d.]+)\s*(deg|rad|turn)\)?/i);
  if (match) {
    var val  = parseFloat(match[1]);
    var unit = parseFloat(match[2]);
    if (unit === 'rad') {
      val = Point.radToDeg(val);
    } else if (unit === 'turn') {
      val *= 360;
    }
    return val;
  }
  return 0;
  */

class CSSCompositeTransformFunction {

  static get ROTATE()             { return 'rotate' };
  static get TRANSLATE()          { return 'translate' };
  static get ALLOWED_NAMES_REG()  { return /^rotate|(translate|scale|skew)[XY]?$/ };

  static fromNameAndValues(name, values) {
    var match, name, values;

    if (!CSSCompositeTransformFunction.ALLOWED_NAMES_REG.test(name)) {
      throwError('Transform ' + name + ' is not allowed. Only 2d transforms are supported.');
    }

    values = values.split(',').map(function(str) {
      var val = CSSValue.parse(str, name, true);
      if (val.unit === '%') {
        // Won't support percentages here as they would have to take scale
        // operations into account as well, which is too complex to handle.
        throwError('Percent values are not allowed in translate operarations.');
      }
      return val;
    });

    return new CSSCompositeTransformFunction(name, values);
  }

  constructor(name, values) {
    this.name = name;
    this.values = values;
  }

  // transform: matrix(1.0, 2.0, 3.0, 4.0, 5.0, 6.0);
  // transform: translate(12px, 50%);
  // transform: translateX(2em);
  // transform: translateY(3in);
  // transform: scale(2, 0.5);
  // transform: scaleX(2);
  // transform: scaleY(0.5);
  // transform: rotate(0.5turn);
  // transform: skew(30deg, 20deg);
  // transform: skewX(30deg);
  // transform: skewY(1.07rad);

  toString() {
    return this.name + '(' + this.values.join(',') + ')';
  }

  canMutate() {
    return this.name === 'rotate' ||
           this.name === 'translate' ||
           this.name === 'translateX' ||
           this.name === 'translateY';
  }

  clone() {
    var values = this.values.map(function(v) {
      return v.clone();
    });
    return new CSSCompositeTransformFunction(this.name, values);
  }

}


/*-------------------------] CSSMatrixTransform [--------------------------*/

class CSSMatrixTransform {

  static parse() {
    // TODO: this
    var match = matrix.match(/[-.\d]+/g);
    if (match) {
      a = parseFloat(match[0]);
      b = parseFloat(match[1]);
      return new Point(a, b).getAngle();
    }
    return 0;
  }

  clone() {
    // TODO: this
  }

}

/*-------------------------] CSSValue [--------------------------*/

class CSSValue {

  constructor(val, unit, precision) {
    this.val       = val;
    this.unit      = unit;
    this.precision = precision || 0;
  }

  static parse(str, prop, percentTarget, subpixel) {

    if (!str) {
      return null;
    }

    // TODO: test these on different properties!
    if (str === 'auto') {
      return new CSSValue('auto');
    }

    var val   = parseFloat(str) || 0;
    var match = str.match(/px|%|deg|rad|turn|v(w|h|min|max)$/);
    var unit  = match ? match[0] : null;

    // TODO: START: put this somewhere
    switch (unit) {

      case '%':
        return CSSPercentValue.fromProperty(prop, val, percentTarget);

      case 'vw':
      case 'vh':
      case 'vmin':
      case 'vmax':
        return new CSSViewportValue(val, unit);

      case 'deg':  return new CSSDegreeValue(val);
      case 'rad':  return new CSSRadianValue(val);
      case 'turn': return new CSSTurnValue(val);
      case 'px':   return new CSSPixelValue(val, subpixel);

      default:
        console.info('gotch');
        throwError('UHOHOHOHHO', val, unit);
    }
  }

  // TODO: more unitless props?
  static parseZIndex (str) {
    if (str === 'auto') {
      return new CSSValue();
    }
    return new CSSValue(parseInt(str, 10));
  }

  /* TODO: ADD functions should not mutate, so this method either
   * needs to be changed or should go away
  add(amt) {
    if (this.isNull()) {
      this.val = 0;
    }
    this.val += amt;
  }
  */

  isNull() {
    return this.val == null;
  }

  isAuto() {
    return this.val === 'auto';
  }

  clone() {
    return new CSSValue(this.val, this.unit, this.precision);
  }

  toString() {

    if (this.isAuto()) {
      return 'auto';
    }

    if (this.isNull()) {
      return '';
    }

    // z-index values do not have a unit
    if (!this.unit) {
      return this.val;
    }

    return this.val.toFixed(this.precision) + this.unit;
  }
}

/*-------------------------] CSSPixelValue [--------------------------*/

class CSSPixelValue extends CSSValue {

  constructor(val, subpixel) {
    super(val, 'px', subpixel ? 2 : 0);
  }

  get px() {
    return this.isAuto() ? 0 : this.val;
  }

  set px(val) {
    this.val = val;
  }

  clone() {
    return new CSSPixelValue(this.val);
  }

}

/*-------------------------] CSSDegreeValue [--------------------------*/

class CSSDegreeValue extends CSSValue {

  constructor(val) {
    super(val, 'deg');
  }

  get deg() {
    return this.val;
  }

  set deg(val) {
    this.val = val;
  }

  clone() {
    return new CSSDegreeValue(this.val);
  }

}

/*-------------------------] CSSRadianValue [--------------------------*/

class CSSRadianValue extends CSSValue {

  constructor(val) {
    super(val, 'rad', 2);
  }

  get deg() {
    return Point.radToDeg(this.val);
  }

  set deg(val) {
    this.val = Point.degToRad(val);
  }

  clone() {
    return new CSSRadianValue(this.val);
  }

}

/*-------------------------] CSSTurnValue [--------------------------*/

class CSSTurnValue extends CSSValue {

  constructor(val) {
    super(val, 'turn', 2);
  }

  get deg() {
    return this.val * 360;
  }

  set deg(val) {
    this.val = val / 360;
  }

  clone() {
    return new CSSTurnValue(this.val);
  }

}

/*-------------------------] CSSPercentValue [--------------------------*/

class CSSPercentValue extends CSSValue {

  static fromProperty(prop, val, percentTarget) {
    if (CSSPercentValue.isBackgroundProperty(prop)) {
      return new CSSBackgroundPercentValue(val, prop, percentTarget);
    } else {
      return new CSSPercentValue(val, prop, percentTarget);
    }
  }

  static isBackgroundProperty(prop) {
    return prop === 'backgroundLeft' || prop === 'backgroundTop';
  }

  constructor(val, prop, target) {
    super(val, '%', 2);
    this.prop   = prop;
    this.target = target;
  }

  get px() {
    return this.val / 100 * this.getTargetValue();
  }

  set px(px) {
    this.val = px / this.getTargetValue() * 100;
  }

  // TODO: rename?
  getTargetValue() {
    switch (this.prop) {
      case 'left':
      case 'right':
      case 'width':
        return this.target.clientWidth;
      case 'top':
      case 'bottom':
      case 'height':
        return this.target.clientHeight;
    }
  }

  clone() {
    return new CSSPercentValue(this.val, this.prop, this.target);
  }

}

/*-------------------------] CSSBackgroundPercentValue [--------------------------*/

class CSSBackgroundPercentValue extends CSSPercentValue {

  constructor(val, prop, target, img) {
    super(prop, val, target);
    this.img = img;
  }

  setImage(img) {
    this.img = img;
  }

  getTargetValue() {
    switch (this.prop) {
      case 'backgroundTop': return this.target.clientHeight - this.img.height;
      case 'backgroundLeft': return this.target.clientWidth - this.img.width;
    }
  }

  clone() {
    return new CSSBackgroundPercentValue(this.val, this.prop, this.target, this.img);
  }

}

/*-------------------------] CSSViewportValue [--------------------------*/

class CSSViewportValue extends CSSValue {

  constructor(val, unit) {
    super(val, unit, 2);
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
    return new CSSViewportValue(this.val, this.unit);
  }

}

/*-------------------------] CSSBackground [--------------------------*/

// TODO: MOVE
class BackgroundImage {

  static get ORIGIN_REG() { return EXTENSION_ORIGIN_REG; };
  static get URL_REG() { return /url\(["']?(.+?)["']?\)/i };

  static fromStyles(backgroundImage, backgroundPosition, el) {
    var cssLeft, cssTop, pos, urlMatch, url;

    urlMatch = backgroundImage.match(BackgroundImage.URL_REG);

    if (urlMatch) {
      url = urlMatch[1];
    }

    if (backgroundPosition === 'initial') {
      cssLeft = new CSSPixelValue(0);
      cssTop  = new CSSPixelValue(0);
    } else {
      if (backgroundPosition.split(',').length > 1) {
        throwError('Only one background image allowed per element');
      }
      pos = backgroundPosition.split(' ');
      cssLeft = CSSValue.parse(pos[0], 'backgroundLeft', el);
      cssTop  = CSSValue.parse(pos[1], 'backgroundTop', el);
    }

    return new BackgroundImage(url, cssLeft, cssTop);
    //x = CSSValue.parse(xy[0], el, 'width');
    //y = CSSValue.parse(xy[1], el, 'height');

    // Background percentages are relative to the element itself.
    // TODO: this won't work with percentages unless we have the
    // size of the element AND the image to work with... this is
    // getting silly, so let's move the work that CSSValue is
    // doing into somewhere else and have CSSValue call out to
    // it when it needs it instead.
    //return new CSSPoint(x, y);
  }

  constructor(url, cssLeft, cssTop) {
    this.url     = url;
    this.cssLeft = cssLeft;
    this.cssTop  = cssTop;
    this.loadImage(url);
  }

  // --- Setup

  loadImage(url) {
    if (url) {
      if (BackgroundImage.ORIGIN_REG.test(url)) {
        this.loadSameDomainImage(url);
      } else {
        this.loadXDomainImage(url);
      }
    }
  }

  /*
  loadPixelData(url) {
    var xDomain = !SpriteRecognizer.ORIGIN_REG.test(url);
  }

  loadImage(obj) {
    if (obj.error) {
      throwError('Positionable: "' + obj.url + '" could not be loaded!');
    }
    var url = obj;
    var img = new Image();
    img.addEventListener('load', this.handleImageLoaded.bind(this));
    img.src = url;
  }
  */

  loadSameDomainImage(url) {
    var img = new Image();
    img.addEventListener('load', this.onImageLoaded.bind(this));
    img.src = url;
  }

  loadXDomainImage(url) {
    // The background page is the only context in which pixel data from X-Domain
    // images can be loaded so call out to it and tell it to load the data for this url.
    var message = { message: 'convert_image_url_to_data_url', url: url };
    chrome.runtime.sendMessage(message, this.onImageLoaded.bind(this));
  }

  onImageLoaded(evt) {
    var img = evt.target;
    this.spriteRecognizer = new SpriteRecognizer(img);
    this.checkPercentageDimension(this.cssLeft, img);
    this.checkPercentageDimension(this.cssTop,  img);
  }

  checkPercentageDimension(cssDimension, img) {
    if (cssDimension instanceof CSSBackgroundPercentValue) {
      cssDimension.setImage(img);
    }
  }

  hasImage() {
    return !!this.url;
  }

  // --- Actions

  getSpriteBounds(coord) {
    // The coordinate in the image's xy coordinate system,
    // minus any positioning offset.
    var imgCoord = coord.subtract(this.getPosition());
    return this.spriteRecognizer.getSpriteForCoordinate(imgCoord);
  }

  // --- Positioning

  getPosition() {
    return new Point(this.cssLeft.px, this.cssTop.px);
  }

  setPosition(p) {
    this.cssLeft.px = p.x;
    this.cssTop.px  = p.y;
  }

  getPositionString() {
    return [this.cssLeft, this.cssTop].join(' ');
  }

  clone() {
    return new BackgroundImage(this.img, this.cssLeft.clone(), this.cssTop.clone());
  }

}

