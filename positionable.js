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

// TODO: not sure if I'm liking the accessors... they're too mysterious

(function() {

  var EXTENSION_CLASS_PREFIX = 'positionable-extension-';

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

      this.delegateEventToElementManager('mouseDown');
      this.delegateEventToElementManager('mouseMove');
      this.delegateEventToElementManager('mouseUp');
      this.delegateEventToElementManager('scroll', window);
      this.delegateEventToElementManager('copy', window);

      this.setupHandler('keydown', this.handleKeyDown);
      this.setupHandler('keyup', this.handleKeyUp);

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

    setupHandler(name, handler, target) {
      if (!handler) return;
      target = target || document.documentElement;
      target.addEventListener(name, handler.bind(this));
    }

    delegateEventToElementManager(name, target) {
      this.setupHandler(name.toLowerCase(), function(evt) {
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

    handleKeyDown(evt) {
      this.checkKeyEvent('KeyDown', evt);
    }

    handleKeyUp(evt) {
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
      return evt.ctrlKey || evt.metaKey;
    }

    // --- Events

    shiftKeyDown() {
      nudgeManager.setMultiplier(true);
    }

    shiftKeyUp() {
      nudgeManager.setMultiplier(false);
    }

    ctrlKeyDown() {
      elementManager.toggleSizingHandles(false);
      elementManager.dragReset();
    }

    ctrlKeyUp() {
      elementManager.toggleSizingHandles(true);
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
        elementManager.focusAll();
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

  class Element {

    constructor(el, tag, className) {
      this.listeners = [];
      if (tag) {
        this.el = this.createAndAppend(el, tag, className);
      } else {
        this.el = el;
      }
    }

    createAndAppend(parent, tag, className) {
      this.el = document.createElement(tag);
      if (className) {
        className.split(' ').forEach(function(name) {
          this.addClass(name);
        }, this);
      }
      parent.appendChild(this.el);
      return this.el;
    }

    addClass(name) {
      this.el.classList.add(EXTENSION_CLASS_PREFIX + name);
      return this;
    }

    removeClass(name) {
      this.el.classList.remove(EXTENSION_CLASS_PREFIX + name);
      return this;
    }

    addEventListener(type, handler) {
      this.el.addEventListener(type, handler);
      this.listeners.push({
        type: type,
        handler: handler
      });
    }

    afterTransition(fn) {
      var self = this, el = this.el;
      function finished() {
        // TODO: change to transitionend?
        el.removeEventListener('webkitTransitionEnd', finished);
        fn.call(self);
      }
      el.addEventListener('webkitTransitionEnd', finished);
    }

    removeAllListeners() {
      this.listeners.forEach(function(l) {
        this.el.removeEventListener(l.type, l.handler);
      }, this);
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

    remove(html) {
      this.el.remove();
    }

  }

  /*-------------------------] IconElement [--------------------------*/

  class IconElement extends Element {

    constructor(parent, id, className) {
      super(parent, 'img', className);
      this.el.src = chrome.extension.getURL('images/icons/' + id + '.svg');
    }

  }

  /*-------------------------] DraggableElement [--------------------------*/

  class DraggableElement extends Element {

    constructor(el, tag, className) {
      super(el, tag, className);
      this.setupDragging();
    }

    // TODO: Object.create or extend?

    //DraggableElement.prototype = Object.create(Element.prototype);
    /*
    DraggableElement.prototype.hide               = Element.prototype.hide;
    DraggableElement.prototype.show               = Element.prototype.show;
    DraggableElement.prototype.remove             = Element.prototype.remove;
    DraggableElement.prototype.addClass           = Element.prototype.addClass;
    DraggableElement.prototype.removeClass        = Element.prototype.removeClass;
    DraggableElement.prototype.resetScroll        = Element.prototype.resetScroll;
    DraggableElement.prototype.addEventListener   = Element.prototype.addEventListener;
    DraggableElement.prototype.removeAllListeners = Element.prototype.removeAllListeners;
    */

    setupDragging() {
      this.addEventListener('click', this.click.bind(this));
      this.addEventListener('mousedown', this.mouseDown.bind(this));

      // These two events are actually on the document,
      // so being called in manually.
      this.mouseUp   = this.mouseUp.bind(this);
      this.mouseMove = this.mouseMove.bind(this);
    }

    // --- Events

    click(evt) {
      if (evt.target.href) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    }

    mouseDown(evt) {
      if (evt.button !== 0) return;
      if (this.draggingStarted) {
        // There are certain areas (over the dev tools) that do not
        // trigger mouseup events so if the element is still in the
        // middle of draggin when another mousedown is detected, then
        // call mouseUp, and then call the whole thing off.
        this.mouseUp(evt);
        return;
      }
      this.dragStartX = evt.clientX + window.scrollX;
      this.dragStartY = evt.clientY + window.scrollY;
      elementManager.draggingElement = this;
      this.draggingStarted = false;
      this.resetTarget = null;
      evt.preventDefault();
      evt.stopPropagation();
      this.currentMouseX = evt.clientX;
      this.currentMouseY = evt.clientY;
    }

    mouseMove(evt) {
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
        this.mouseUp(evt);
        this.mouseDown(evt);
      }
      var x = evt.clientX + window.scrollX;
      var y = evt.clientY + window.scrollY;
      evt.dragOffset = new Point(x - this.dragStartX, y - this.dragStartY);
      if (!this.draggingStarted) {
        this.fireEvent('dragStart', evt);
        this.draggingStarted = true;
      }
      this.fireEvent('drag', evt);
      this.currentMouseX = evt.clientX;
      this.currentMouseY = evt.clientY;
    }

    mouseUp(evt) {
      if (!this.draggingStarted) {
        this.fireEvent('click', evt);
      } else {
        this.fireEvent('dragStop', evt);
      }
      this.draggingStarted = false;
      elementManager.draggingElement = null;
    }

    scroll() {
      var evt = new Event('mousemove');
      evt.clientX = this.currentMouseX;
      evt.clientY = this.currentMouseY;
      this.mouseMove(evt);
    }

    fireEvent(name, evt) {
      if (elementManager[name]) {
        elementManager[name](evt);
      }
    }

    dragReset(evt) {
      this.resetTarget = this.el;
    }

  }

  /*-------------------------] Handle [--------------------------*/

  class Handle extends DraggableElement {

    constructor(target, name) {
      super(target.el, 'div', 'handle handle-' + name);
      this.name = name;
      this.target = target;
    }

    dragStart(evt) {
      elementManager.setFocused(this.target);
    }

    setHover(name) {
      this.addEventListener('mouseover', function(evt) {
        evt.stopPropagation();
        if (!this.target.draggingStarted) {
          statusBar.setState(name);
        }
      }.bind(this));
      this.addEventListener('mouseout', function(evt) {
        evt.stopPropagation();
        if (!this.target.draggingStarted) {
          statusBar.setState(nudgeManager.mode);
        }
      }.bind(this));
    }

    isConstrained(evt) {
      return evt.shiftKey;
    }

  }

  /*-------------------------] RotationHandle [--------------------------*/

  class RotationHandle extends Handle {

    static get SNAPPING() { return 22.5 };

    constructor(target) {
      super(target, 'rotate');
      //this.setup(target, 'rotate');
      this.setHover('rotate');
    }

    dragStart(evt) {
      Handle.prototype.dragStart.apply(this, arguments);
      this.startAngle = this.getAngleForMouseEvent(evt);
      elementManager.pushState();
    }

    drag(evt) {
      var r = this.getAngleForMouseEvent(evt) - this.startAngle;
      if (this.isConstrained(evt)) {
        r = round(r / RotationHandle.SNAPPING) * RotationHandle.SNAPPING;
      }
      elementManager.rotate(r);
      statusBar.update();
    }

    getAngleForMouseEvent(evt) {
      // TODO: don't have target?
      var origin = this.target.getRotationOrigin();
      return new Point(evt.clientX, evt.clientY).subtract(origin).getAngle();
    }

  }


  /*-------------------------] SizingHandle [--------------------------*/

  class SizingHandle extends Handle {

    constructor(target, name, xProp, yProp) {
      super(target, name);

      //this.setup(target, name);
      this.setHover('resize');
      this.addClass('sizing-handle');
      this.handle = new Element(target.el, 'div', 'handle-border handle-' + name + '-border');
      this.xProp = xProp;
      this.yProp = yProp;
      this.xDir  = !xProp ? 0 : xProp === 'left' ? -1 : 1;
      this.yDir  = !yProp ? 0 : yProp === 'top'  ? -1 : 1;
    }

    // --- Setup

    setAnchor(anchor) {
      this.anchor = anchor;
    }

    destroy() {
      this.handle.remove();
      this.remove();
    }

    // --- Events

    dragStart(evt) {
      Handle.prototype.dragStart.apply(this, arguments);
      elementManager.pushState();
    }

    drag(evt) {
      elementManager.resize(evt.dragOffset, this.name, this.isConstrained(evt), true);
    }

    // --- State

    isConstrained(evt) {
      return Handle.prototype.isConstrained.call(this, evt) && this.isCorner();
    }

    isCorner() {
      return !!this.xProp && !!this.yProp;
    }


    // --- Actions

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
        coords = coords.subtract(center).getRotated(rotation).add(center);
      }
      return coords;
    }
    */

    getPosition(box, rotation) {
      var coords = new Point(this.getX(box), this.getY(box));
      if (rotation) {
        var center = box.getCenterCoords();
        coords = coords.subtract(center).getRotated(rotation).add(center);
      }
      return coords.add(box.getPosition());
    }

    /*
     * TODO: remove?
    getCoords() {
      var coords, center, d;

      coords = new Point(this.getX(), this.getY());
      d = this.target.box;

      if (d.rotation) {
        center = new Point(d.width / 2, d.height / 2);
        coords = center.add(coords.subtract(center).getRotated(d.rotation));
      }

      return coords;
    }

    getPosition() {
      return this.target.box.getPosition().add(this.getCoords());
    }
    */

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

  }

  /*-------------------------] PositionableElement [--------------------------*/

  class PositionableElement extends DraggableElement {

    // --- Constants

    //PositionableElement.BACKGROUND_POSITION_MATCH = /([-\d]+)(px|%).+?([-\d]+)(px|%)/;

    static get PEEKING_DIMENSIONS() { return 500 };
    static get DBLCLICK_TIMEOUT()   { return 500 };

    constructor(el) {
      super(el);

      this.states = [];
      this.setupElement(el);
      this.setupEvents();
      // TODO: rename?
      this.setupAttributes();
      this.setupParents();
      this.createHandles();
    }

    // --- Setup

    setupElement(el) {
      //this.el = el;
      this.addClass('positioned-element');
      //this.setupDragging();
    }

    destroy() {
      this.unfocus();
      this.removeClass('positioned-element');
      this.removeAllListeners();
      // TODO: why is one remove and the other destroy??
      this.handles.rotate.remove();
      this.handles.nw.destroy();
      this.handles.ne.destroy();
      this.handles.se.destroy();
      this.handles.sw.destroy();
      this.handles.n.destroy();
      this.handles.e.destroy();
      this.handles.s.destroy();
      this.handles.w.destroy();
    }

    setupParents() {
      var el = this.el, style;
      this.positionedParents = [];
      while(el = el.offsetParent) {
        style = window.getComputedStyle(el);
        if (style.position !== 'static') {
          this.positionedParents.push(new Element(el));
        }
      }
    }

    ensurePositioned() {
      var style = this.getComputedStyle();
      if (style.position === 'static') {
        this.el.style.position = 'absolute';
      }
    }

    setupEvents() {
      this.addEventListener('dblclick', this.dblclick.bind(this));
      this.addEventListener('mouseover', this.mouseover.bind(this));
      this.addEventListener('contextmenu', this.contextmenu.bind(this));
    }

    setupAttributes() {
      //var rules, style;
      var el, matcher;

      el = this.el;
      matcher = new CSSRuleMatcher(el);

      this.box = new CSSBox(
        matcher.getPosition('Left', el),
        matcher.getPosition('Top', el),
        matcher.getCSSValue('width', el),
        matcher.getCSSValue('height', el)
      );

      this.zIndex = matcher.getZIndex();
      this.transform = matcher.getTransform(el);

      this.backgroundImage = matcher.getBackgroundImage(el);
      //var image = matcher.getBackgroundImage();

      //if (image.url) {
        // TODO: move the recognizer into the background class!
        //this.spriteRecognizer = new SpriteRecognizer(image.url);
      //}

      //this.backgroundPosition = matcher.getBackgroundPosition(el);

      // Get background recognizer
      //match = style.backgroundImage.match(PositionableElement.BACKGROUND_IMAGE_MATCH);
      ////this.spriteRecognizer = new SpriteRecognizer(match[1]);

      /*
        this.getInitialPosition(rules, style, 'Left'),
        this.getInitialPosition(rules, style, 'Top'),
        this.getCSSValue(rules, style, 'width', 'px'),
        this.getCSSValue(rules, style, 'height', 'px'),
        // not "length"?
        this.getCSSValue(rules, style, 'zIndex'),
        this.getTransform(rules, style)
        */

      // Ensure positioning first to make sure the rules are up to date.
      // TODO: is this required? can't use one computed style for all here?
      //this.ensurePositioned();

      // TODO: remove reference to allow garbage collection
      //style = this.getComputedStyle();
      //rules = this.getCSSRules();

      //this.getDimensions(rules, style);

      //if (style.backgroundImage !== 'none') {
        //this.getBackgroundAttributes(style);
      //}
    }

    getDimensions(rules, style) {
      //this.position = new CSSPoint(left, top);
      //this.zIndex = style.zIndex === 'auto' ? null : parseInt(style.zIndex);
    }

    /*
    getNumericValue(val) {
      val = parseFloat(val);
      return isNaN(val) ? 0 : val;
    }

    getBackgroundPosition() {
      var match, style = this.style;

      // Get background recognizer
      match = style.backgroundImage.match(PositionableElement.BACKGROUND_IMAGE_MATCH);
      this.spriteRecognizer = new SpriteRecognizer(match[1]);

      // Get background position
      match = style.backgroundPosition.match(PositionableElement.BACKGROUND_POSITION_MATCH);
      if (match) {
        this.backgroundPosition = new Point(parseInt(match[1]), parseInt(match[3]));
      } else {
        this.backgroundPosition = new Point(0, 0);
      }
    }
    */

    createHandles() {
      this.handles = {};
      this.createSizingHandles();
      this.handles.rotate = new RotationHandle(this);
    }

    createSizingHandles() {
      this.handles.nw = new SizingHandle(this, 'nw', 'left',  'top');
      this.handles.ne = new SizingHandle(this, 'ne', 'right', 'top');
      this.handles.se = new SizingHandle(this, 'se', 'right', 'bottom');
      this.handles.sw = new SizingHandle(this, 'sw', 'left',  'bottom');
      this.handles.n  = new SizingHandle(this, 'n', null,  'top');
      this.handles.e  = new SizingHandle(this, 'e', 'right', null);
      this.handles.s  = new SizingHandle(this, 's', null,  'bottom');
      this.handles.w  = new SizingHandle(this, 'w', 'left', null);
    }


    // --- Events

    mouseDown(evt) {
      DraggableElement.prototype.mouseDown.call(this, evt);
    }

    mouseUp(evt) {
      if (!this.draggingStarted && evt.shiftKey) {
        elementManager.addFocused(this);
      } else if (!this.draggingStarted) {
        elementManager.setFocused(this, true);
      }
      DraggableElement.prototype.mouseUp.call(this, evt);
    }

    mouseover(evt) {
      statusBar.setState('position');
    }

    dblclick(evt) {

      if (!this.spriteRecognizer) {
        return;
      }

      var point  = new Point(evt.clientX + window.scrollX, evt.clientY + window.scrollY);
      var coords = this.box.getCoords(point, this.transform.getRotation()).subtract(this.backgroundImage.getPosition());
      var sprite = this.spriteRecognizer.getSpriteBoundsForCoordinate(coords);

      if (sprite) {
        this.pushState();
        this.setBackgroundPosition(new Point(-sprite.left, -sprite.top));
        this.box.right  = this.box.left + sprite.setWidth();
        // TODO: don't have target!
        this.box.bottom = this.box.top  + sprite.getHeight();
        this.render();
        statusBar.update();
      }
    }

    contextmenu(evt) {
      if (evt.ctrlKey) {
        this.handleCtrlDoubleClick(evt);
        evt.preventDefault();
      }
    }

    handleCtrlDoubleClick(evt) {
      if (this.dblClickTimer) {
        this.dblclick(evt)
      }
      this.dblClickTimer = setTimeout(function() {
        this.dblClickTimer = null;
      }.bind(this), PositionableElement.DBLCLICK_TIMEOUT);
    }

    isBackgroundDrag(evt) {
      return evt.ctrlKey;
    }

    focus() {
      this.addClass('positioned-element-focused');
      this.positionedParents.forEach(function(el) {
        el.addClass('positioned-parent-focused');
      });
    }

    unfocus() {
      this.removeClass('positioned-element-focused');
      this.positionedParents.forEach(function(el) {
        el.removeClass('positioned-parent-focused');
      });
    }



    // --- Dragging

    dragStart(evt) {
      elementManager.setFocused(this);
      elementManager.pushState();
    }

    drag(evt) {
      if (this.isBackgroundDrag(evt)) {
        elementManager.backgroundDrag(evt);
      } else {
        elementManager.positionDrag(evt);
      }
    }

    isConstrained(evt) {
      return evt.shiftKey;
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

    resize(vector, handleName, constrained, isAbsolute) {

      var lastState = this.getLastState();
      var lastBox = this.getLastState().box;
      var lastRatio = lastBox.getRatio();
      var rotation = this.transform.getRotation();
      var handle = this.getHandle(handleName);

      if (isAbsolute && rotation) {
        vector = vector.getRotated(-rotation);
      }

      this.box[handle.xProp] = lastBox[handle.xProp] + vector.x;
      this.box[handle.yProp] = lastBox[handle.yProp] + vector.y;

      if (constrained) {
        this.constrainRatio(lastBox, handle);
      }

      //box.calculateRotationOffset();

      if (rotation) {
        var anchor = this.getHandleAnchor(handleName);
        // TODO: move into function?
        var a1 = anchor.getPosition(lastBox, rotation);
        var a2 = anchor.getPosition(this.box, rotation);
        this.transform.setTranslation(lastState.transform.getTranslation().add(a1.subtract(a2)));
      }

      // TODO: render only bits?
      this.render();
      statusBar.update();
    }

    constrainRatio(lastBox, handle) {
      var box      = this.box;
      var anchor   = this.getHandleAnchor(handle.name);
      var oldRatio = lastBox.getRatio();
      var newRatio = this.box.getRatio();

      if (newRatio < oldRatio) {
        box[handle.yProp] = box[anchor.yProp] + box.width / oldRatio * handle.yDir;
      } else if (newRatio > oldRatio) {
        box[handle.xProp] = box[anchor.xProp] + box.height * oldRatio * handle.xDir;
      }
    }


    toggleSizingHandles(on) {
      if (on) {
        this.removeClass('resize-handles-hidden');
      } else {
        this.addClass('resize-handles-hidden');
      }
    }


    // --- Rotation

    rotate(offset) {
      var r = this.getLastRotation() + offset;
      this.transform.setRotation(r);
      this.updateTransform();
    }

    /*
    setRotation(deg) {
      this.transform.rotation = this.getLastRotation() + deg;
      this.updateTransform();
    }
    */

    // TODO: can this be removed somehow?
    getLastRotation() {
      return this.getLastState().transform.getRotation();
    }

    // TODO: different origins?
    getRotationOrigin() {
      return this.box.getCenterPosition();
    }

    // --- Position

    backgroundDrag(evt) {
      var lastPosition, rotation, pos;

      lastPosition = this.getLastState().backgroundImage.getPosition();
      rotation = this.transform.getRotation();

      /*
      if (rotation) {
        last = last.getRotated(rotation);
      }
      */

      pos = this.getDraggedPosition(evt, lastPosition);

      /*
      if (rotation) {
        offset = offset.getRotated(-rotation);
      }
      */

      this.setBackgroundPosition(pos);
    }

    positionDrag(evt) {
      var pos = this.getDraggedPosition(evt, this.getLastState().box.getPosition());
      this.box.setPosition(pos);
      this.updatePosition();
      statusBar.update();
    }

    // TODO: rename?
    getDraggedPosition(evt, lastPosition) {
      var drag, pos, absX, absY;

      drag = evt.dragOffset;
      pos  = lastPosition.add(drag);

      if (this.isConstrained(evt)) {
        absX = Math.abs(drag.x);
        absY = Math.abs(drag.y);
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
        box: this.box.clone(),
        zIndex: this.zIndex.clone(),
        transform: this.transform.clone(),
        backgroundImage: this.backgroundImage.clone()
      });
    }

    getLastState() {
      return this.states[this.states.length - 1];
    }

    undo() {
      var state = this.states.pop();
      if (!state) return;
      this.box = state.box;
      this.zIndex = state.zIndex;
      this.transform = state.transform;
      //this.position = state.position;
      this.backgroundImage = state.backgroundImage;
      this.render();
    }



    // --- Peeking

    peek(on) {
      if (on && !this.backgroundImage.isNull()) {
        this.el.style.width  = PositionableElement.PEEKING_DIMENSIONS + 'px';
        this.el.style.height = PositionableElement.PEEKING_DIMENSIONS + 'px';
      } else {
        this.updateSize();
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
      if (this.backgroundImage.isNull()) {
        return;
      }
      var rotation = this.transform.getRotation();
      if (rotation) {
        vector = vector.getRotated(-rotation);
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
      this.updateTransform();
    }

    incrementZIndex(vector) {
      // Positive Y is actually down, so decrement here.
      this.zIndex.add(vector.y);
      this.updateZIndex();
    }

    // --- Rendering

    render() {
      // TODO: update separately instead of render??
      this.updatePosition();
      this.updateSize();
      this.updateTransform();
      this.updateBackgroundPosition();
      this.updateZIndex();
    }

    updatePosition() {
      this.el.style.left = this.box.cssLeft;
      this.el.style.top  = this.box.cssTop;
    }

    updateSize(size) {
      this.el.style.width  = this.box.cssWidth;
      this.el.style.height = this.box.cssHeight;
    }

    // TODO: standing in for any transform now... fix this!
    updateTransform() {
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
      this.el.style.transform = this.transform;
    }

    updateBackgroundPosition() {
      if (!this.backgroundImage.isNull()) {
        this.el.style.backgroundPosition = this.backgroundImage.getPositionString();
      }
    }

    updateZIndex() {
      this.el.style.zIndex = this.zIndex;
    }



    // --- Calculations

    getElementCoordsForPoint(point) {
      // Gets the coordinates relative to the element's
      // x/y internal coordinate system, which may be rotated.
      var dim = this.getAbsoluteDimensions();
      var corner = new Point(dim.left, dim.top);
      var rotation = this.transform.getRotation();

      if (rotation) {
        corner = this.box.getPositionForCoords(corner).add(this.getPositionOffset());
        return point.subtract(corner).getRotated(-rotation);
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
      var toCenter = anchor.offsetToCenter(offsetX, offsetY).getRotated(this.transform.getRotation());
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

    getCenter() {
      return this.box.getCenter();
    }

    getAbsoluteCenter() {
      return this.getAbsoluteDimensions().getCenter();
    }

    getAbsoluteDimensions() {
      var rect = this.el.getBoundingClientRect();
      return new Rectangle(
        rect.top + window.scrollY,
        rect.right,
        rect.bottom,
        rect.left + window.scrollX
      );
    }

    getEdgeValue(side) {
      var handle = this.getHandleForSide(side);
      return handle.getPosition()[this.getAxisForSide(side)];
    }

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


    // --- Output

    getSelector() {
      var type = settings.get(Settings.SELECTOR), classes;
      if (type === Settings.SELECTOR_AUTO) {
        type = this.el.id ? Settings.SELECTOR_ID : Settings.SELECTOR_FIRST;
      }
      switch(type) {
        case Settings.SELECTOR_NONE:    return '';
        case Settings.SELECTOR_ID:      return '#' + this.el.id;
        case Settings.SELECTOR_ALL:     return this.getAllClasses(this.el.classList);
        case Settings.SELECTOR_TAG:     return this.getTagName(this.el);
        case Settings.SELECTOR_TAG_NTH: return this.getTagNameWithNthIndex(this.el);
        case Settings.SELECTOR_FIRST:   return this.getFirstClass(this.el.classList);
        case Settings.SELECTOR_LONGEST: return this.getLongestClass(this.el.classList);
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
      if (settings.get(Settings.OUTPUT_CHANGED) && this.propertyIsUnchanged(prop, val1, val2)) {
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

  }

  /*-------------------------] PositionableElementManager [--------------------------*/

  class PositionableElementManager {

    constructor() {

      this.focusedElements = [];

      this.draggingElement = null;

      this.delegateToDragging('mouseDown', dragSelection);
      this.delegateToDragging('mouseMove', dragSelection);
      this.delegateToDragging('mouseUp',   dragSelection);

      // Scrolling
      this.delegateToDragging('scroll');

      this.delegateToDragging('drag');
      this.delegateToDragging('dragStart');
      this.delegateToDragging('dragStop');
      this.delegateToDragging('dragReset');

      // Peeking
      this.delegateToFocused('peek');

      // State
      this.delegateToFocused('undo');
      this.delegateToFocused('pushState');
      this.delegateToFocused('toggleSizingHandles');

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

    // --- Setup

    startBuild() {
      loadingAnimation.show(this.build.bind(this));
    }

    build(fn) {

      var els = [];
      this.elements = [];

      this.includeSelector = settings.get(Settings.INCLUDE_ELEMENTS);
      this.excludeSelector = settings.get(Settings.EXCLUDE_ELEMENTS);

      try {
        var query = this.includeSelector || '*';
        query += ':not([class*="'+ EXTENSION_CLASS_PREFIX +'"])';
        els = document.body.querySelectorAll(query);
      } catch(e) {
        throwError(e.message, false);
      }

      for(var i = 0, el; el = els[i]; i++) {
        if (this.elementIsIncluded(el)) {
          //try {
            this.elements.push(new PositionableElement(el));
          //} catch(e) {
            // Errors can be thrown here due to cross-origin restrictions.
          //}
        }
      }
      loadingAnimation.hide(this.finishBuild.bind(this));
    }

    finishBuild() {
      statusBar.activate();
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
        statusBar.deactivate();
        this.active = false;
      } else {
        this.startBuild();
      }
    }

    elementIsIncluded(el) {
      if (this.excludeSelector && el.webkitMatchesSelector(this.excludeSelector)) {
        // Don't include elements that are explicitly excluded.
        return false;
      } else if (getClassName(el).match(EXTENSION_CLASS_PREFIX)) {
        // Don't include elements that are part of the extension itself.
        return false;
      } else if (el.style && el.style.background.match(/positionable-extension/)) {
        // Don't include elements that are part of other chrome extensions.
        return false;
      } else if (this.includeSelector) {
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
        if (disallowWhenDragging && this.draggingElement) return;
        this.callOnEveryFocused(name, arguments);
      }.bind(this);
    }

    delegateToDragging(name, alternate) {
      // TODO: can this be cleaner?
      this[name] = function() {
        if (this.draggingElement && this.draggingElement[name]) {
          this.draggingElement[name].apply(this.draggingElement, arguments);
        } else if (alternate) {
          alternate[name].apply(alternate, arguments);
        }
      }.bind(this);
    }

    // --- Actions

    setFocused(element, force) {
      var elements;
      if (typeof element === 'function') {
        elements = this.elements.filter(element);
      } else if (force || !this.elementIsFocused(element)) {
        elements = [element];
      }
      if (elements) {
        this.unfocusAll();
        elements.forEach(this.addFocused, this);
      }
      statusBar.update();
    }

    addFocused(element) {
      if (!this.elementIsFocused(element)) {
        element.focus();
        this.focusedElements.push(element);
      }
      statusBar.update();
    }

    unfocusAll() {
      this.focusedElements.forEach(function(el) {
        el.unfocus();
      }, this);
      this.focusedElements = [];
    }

    focusAll() {
      this.elements.forEach(function(el) {
        this.addFocused(el);
      }, this);
    }

    callOnEveryFocused(name, args) {
      var el, i, len;
      for(i = 0, len = this.focusedElements.length; i < len; i++) {
        el = this.focusedElements[i];
        el[name].apply(el, args);
      }
    }

    alignFocused(line, distribute) {
      var elementsLines, alignmentLine, opposingLine, distributedOffset, isCenter, isMax;

      isCenter = line === 'vertical' || line === 'horizontal';
      isMax    = line === 'right' || line === 'bottom';

      elementsLines = this.getElementsLines(line, isCenter);

      alignmentLine = elementsLines[0].line;
      opposingLine  = elementsLines[elementsLines.length - 1].line;

      if (isMax && !distribute) {
        // If the line is on the bottom or right, then we actually need to get the opposing line.
        alignmentLine = opposingLine;
      }

      if (distribute) {

        // THe distributed offset (amount to distribute each element evenly by) is equal
        // to the total span between the edges of the first and last element, divided by
        // one less than the total number of elements. In other words if there are 3 elements,
        // the first stays at the leftmost edge, the last stays at the rightmost edge,
        // and the middle one is positioned to the entire span divided by 2. Likewise,
        // any subsequent "middle" elements are positioned to the entire span divided by
        // total elements - 1, multiplied by their "number" as a middle element (1 for the
        // first middle element -- or second element in the array, etc).
        distributedOffset = (opposingLine - alignmentLine) / (elementsLines.length - 1);
      }

      this.pushState();

      elementsLines.forEach(function(e, i) {
        var value = alignmentLine;
        if (distribute) {
          value += (distributedOffset * i);
        }
        if (isCenter) {
          e.el.alignToCenter(line, value);
        } else {
          e.el.alignToSide(line, value);
        }
      }, this);
    }

    alignMiddle(line) {
      var minLines, maxLines;
      if (line === 'vertical') {
        minLines = this.getElementsLines('left', false);
        maxLines = this.getElementsLines('right', false);
      } else {
        minLines = this.getElementsLines('top', false);
        maxLines = this.getElementsLines('bottom', false);
      }
      var minLine = minLines[0].line;
      var maxLine = maxLines[maxLines.length - 1].line;
      var average = (minLine + maxLine) / 2;

      this.pushState();

      minLines.forEach(function(e, i) {
        e.el.alignToCenter(line, average);
      }, this);
    }

    getElementsLines(line, center) {
      // Get the elements alongside their associated "line" values,
      // which may be an edge or in the center.
      var elementsLines = this.focusedElements.map(function(el) {
        var obj = { el: el }
        obj.line = center ? el.getCenterAlignValue(line) : el.getEdgeValue(line);
        return obj;
      });
      // Need to sort the elements here by their edges,
      // otherwise the order of focusing will take precedence.
      elementsLines.sort(function(a, b) {
        return a.line - b.line;
      });

      return elementsLines;
    }



    // --- Calculations

    elementIsFocused(element) {
      return this.focusedElements.some(function(e) {
        return e === element;
      });
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
      if (!this.draggingElement) return;
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
      copyAnimation.animate(hasStyles);
    }

    save() {
      var styles = this.getFocusedElementStyles();
      var link = document.createElement('a');
      link.href = 'data:text/css;base64,' + btoa(styles);
      link.download = settings.get(Settings.DOWNLOAD_FILENAME);
      link.click();
    }

    getExclusionMap(elements) {
      if (elements.length < 2 || !settings.get(Settings.OUTPUT_UNIQUE)) {
        return;
      }
      var map = elements[0].getExportedProperties();
      elements.slice(1).forEach(function(el) {
        map = hashIntersect(map, el.getExportedProperties());
      }, this);
      return map;
    }

  }

  /*-------------------------] DragSelection [--------------------------*/

  class DragSelection extends DraggableElement {

    constructor() {
      super(document.body, 'div', 'drag-selection');
      this.buildSides();
      this.box = new Rectangle();
    }

    buildSides() {
      new Element(this.el, 'div', 'drag-selection-border drag-selection-top');
      new Element(this.el, 'div', 'drag-selection-border drag-selection-bottom');
      new Element(this.el, 'div', 'drag-selection-border drag-selection-left');
      new Element(this.el, 'div', 'drag-selection-border drag-selection-right');
    }

    // --- Events

    dragStart(evt) {
      this.from = new Point(evt.clientX, evt.clientY);
      this.to   = this.from;
      this.addClass('drag-selection-active');
      this.render();
    }

    drag(evt) {
      this.to = new Point(evt.clientX, evt.clientY);
      this.render();
    }

    mouseUp(evt) {
      this.removeClass('drag-selection-active');
      this.getFocused();
      DraggableElement.prototype.mouseUp.call(this, evt);
      this.min = this.max = null;
    }


    mouseMove(evt) {
      if (elementManager.draggingElement !== this) return;
      DraggableElement.prototype.mouseMove.call(this, evt);
    }

    // --- Actions

    getFocused() {
      elementManager.setFocused(function(el) {
        return this.contains(el.getAbsoluteCenter());
      }.bind(this));
    }

    // --- Calculation


    calculateBox() {
      this.min = new Point(Math.min(this.from.x, this.to.x) + window.scrollX, Math.min(this.from.y, this.to.y) + window.scrollY);
      this.max = new Point(Math.max(this.from.x, this.to.x) + window.scrollX, Math.max(this.from.y, this.to.y) + window.scrollY);
    }

    contains(point) {
      if (!this.min || !this.max) {
        return false;
      }
      return point.x >= this.min.x && point.x <= this.max.x && point.y >= this.min.y && point.y <= this.max.y;
    }

    // --- Rendering

    render() {
      this.calculateBox();
      var xMin = this.min.x - window.scrollX;
      var yMin = this.min.y - window.scrollY;
      var xMax = this.max.x - window.scrollX;
      var yMax = this.max.y - window.scrollY;
      this.el.style.left   = xMin + 'px';
      this.el.style.top    = yMin + 'px';
      this.el.style.right  = (window.innerWidth - xMax) + 'px';
      this.el.style.bottom = (window.innerHeight - yMax) + 'px';
    }

  }

  /*-------------------------] StatusBar [--------------------------*/

  class StatusBar extends DraggableElement {

    static get FADE_DELAY() { return 200; }

    static get POSITION_ICON()  { return 'position';   }
    static get RESIZE_ICON()    { return 'resize';     }
    static get ROTATE_ICON()    { return 'rotate';     }
    static get RESIZE_NW_ICON() { return 'resize-nw';  }
    static get RESIZE_SE_ICON() { return 'resize-se';  }
    static get SETTINGS_ICON()  { return 'settings';   }
    static get BG_IMAGE_ICON()  { return 'background'; }
    static get Z_INDEX_ICON()   { return 'layer';      }
    static get MOUSE_ICON()     { return 'mouse';      }
    static get KEYBOARD_ICON()  { return 'keyboard';   }
    static get POINTER_ICON()   { return 'pointer';    }
    static get DOWNLOAD_ICON()  { return 'download';   }

    static get ALIGN_TOP_ICON()        { return 'align-top';     }
    static get ALIGN_LEFT_ICON()       { return 'align-left';    }
    static get ALIGN_RIGHT_ICON()      { return 'align-right';   }
    static get ALIGN_BOTTOM_ICON()     { return 'align-bottom';  }
    static get ALIGN_VERTICAL_ICON()   { return 'align-vcenter'; }
    static get ALIGN_HORIZONTAL_ICON() { return 'align-hcenter'; }

    static get DISTRIBUTE_TOP_ICON()        { return 'distribute-top';     }
    static get DISTRIBUTE_LEFT_ICON()       { return 'distribute-left';    }
    static get DISTRIBUTE_RIGHT_ICON()      { return 'distribute-right';   }
    static get DISTRIBUTE_BOTTOM_ICON()     { return 'distribute-bottom';  }
    static get DISTRIBUTE_VERTICAL_ICON()   { return 'distribute-vcenter'; }
    static get DISTRIBUTE_HORIZONTAL_ICON() { return 'distribute-hcenter'; }

    static get ARROW_KEY_ICON() { return 'arrow-key'; }

    static get SHIFT_CHAR()   { return '\u21e7'; }
    static get CTRL_CHAR()    { return '\u2303'; }
    static get OPTION_CHAR()  { return '\u2325'; }
    static get COMMAND_CHAR() { return '\u2318'; }

    constructor() {
      super(document.body, 'div', 'status-bar');
      this.build();
      this.getPosition();
    }

    build() {

      this.areas = [];
      this.inputs = [];

      this.buildArea('Help');
      this.buildArea('Start');
      this.buildArea('Element');
      this.buildArea('Settings');
      this.buildArea('QuickStart');

      this.createState('position', 'Move', StatusBar.POSITION_ICON);
      this.createState('resize', 'Resize', StatusBar.RESIZE_ICON);
      this.createState('resize-nw', 'Resize', StatusBar.RESIZE_NW_ICON);
      this.createState('resize-se', 'Resize', StatusBar.RESIZE_SE_ICON);
      this.createState('background-position', 'Background', StatusBar.BG_IMAGE_ICON);
      this.createState('z-index', 'Z-Index', StatusBar.Z_INDEX_ICON);
      this.createState('rotate', 'Rotate', StatusBar.ROTATE_ICON);

      this.buildButton(StatusBar.SETTINGS_ICON, this.settingsArea);
      this.addEventListener('dblclick', this.resetPosition.bind(this));

      this.defaultArea = this.getStartArea();
      this.resetArea();
    }

    buildButton(iconId, area) {
      var button = new IconElement(this.el, iconId, area.name + '-button');
      button.addEventListener('click', this.toggleArea.bind(this, area));
    }

    buildArea(upper) {
      var camel = upper.slice(0, 1).toLowerCase() + upper.slice(1);
      var lower = upper.toLowerCase();
      var area = new Element(this.el, 'div', 'area '+ lower +'-area');
      area.name = lower;
      this[camel + 'Area'] = area;
      this.areas.push(area);
      this['build' + upper + 'Area'](area);
    }

    buildStartArea(area) {
      this.buildStartBlock('mouse', function(block) {
        new IconElement(block.el, StatusBar.MOUSE_ICON, 'start-icon');
        new Element(block.el, 'div', 'start-help-text').html('Use the mouse to drag, resize, and rotate elements.');
      });

      this.buildStartBlock('keyboard', function(block) {
        var bKey = this.buildInlineKeyIcon('b');
        var sKey = this.buildInlineKeyIcon('s');
        var mKey = this.buildInlineKeyIcon('m');
        var text = 'Arrow keys nudge elements.<br>'+ bKey + sKey + mKey +' change nudge modes.';

        new IconElement(block.el, StatusBar.KEYBOARD_ICON, 'start-icon');
        new Element(block.el, 'div', 'start-help-text').html(text);

      });

      this.buildStartBlock('sprites', function(block) {
        new IconElement(block.el, StatusBar.BG_IMAGE_ICON, 'start-icon');
        new Element(block.el, 'div', 'start-help-text').html('Double click on a background image to fit sprite dimensions.');
      });

      this.buildStartBlock('output', function(block) {

        var cmdKey = this.buildInlineKeyIcon(this.getCommandKey());
        var cKey = this.buildInlineKeyIcon('c');
        var sKey = this.buildInlineKeyIcon('s');
        var text = cmdKey + cKey + ' Copy styles to clipboard<br>' + cmdKey + sKey +' Save styles to disk';

        new IconElement(block.el, StatusBar.DOWNLOAD_ICON, 'start-icon');
        new Element(block.el, 'div', 'start-help-text start-help-text-left').html(text);
      });

      new Element(this.startArea.el, 'div', 'start-horizontal-line');
      new Element(this.startArea.el, 'div', 'start-vertical-line');

      var hide = new Element(this.startArea.el, 'span', 'start-hide-link').html("Don't Show");
      hide.addEventListener('click', this.skipStartArea.bind(this));
    }

    buildStartBlock(type, fn) {
      var block = new Element(this.startArea.el, 'div', 'start-help');
      fn.call(this, block);
    }

    buildInlineKeyIcon(key) {
      var classes = ['', 'icon', 'key-icon', 'letter-key-icon', 'inline-key-icon'];
      return '<span class="' + classes.join(' ' + EXTENSION_CLASS_PREFIX) + '">'+ key +'</span>';
    }

    buildQuickStartArea(area) {
      new IconElement(area.el, StatusBar.POINTER_ICON, 'quickstart-icon');
      new Element(area.el, 'div', 'quickstart-text').html('Select Element');
    }

    buildHelpArea(area) {


      // Keyboard help area

      var keyboardHelp = this.buildHelpBlock('keys', 'Keyboard');

      this.buildHelpBox(keyboardHelp.el, 'arrow', function(box, text) {
        var box = new Element(box.el, 'div', 'key-icon');
        new IconElement(box.el, StatusBar.ARROW_KEY_ICON, 'arrow-key-icon');
        text.html('Use the arrow keys to nudge the element.');
      });

      this.buildHelpBox(keyboardHelp.el, 'shift', function(box, text) {
        new Element(box.el, 'div', 'key-icon shift-key-icon').html(StatusBar.SHIFT_CHAR);
        text.html('Shift: Constrain dragging / nudge multiplier / select multiple.');
      });

      this.buildHelpBox(keyboardHelp.el, 'ctrl', function(box, text) {
        new Element(box.el, 'div', 'key-icon ctrl-key-icon').html(StatusBar.CTRL_CHAR);
        text.html('Ctrl: Move the background image when dragging.');
      });

      this.buildHelpBox(keyboardHelp.el, 'alt', function(box, text) {
        new Element(box.el, 'div', 'key-icon alt-key-icon').html(StatusBar.OPTION_CHAR);
        text.html('Option/Alt: Peek at the background image.');
      });

      this.buildHelpBox(keyboardHelp.el, 'cmd', function(box, text) {
        new Element(box.el, 'div', 'key-icon alt-key-icon').html(StatusBar.COMMAND_CHAR);
        text.html('Cmd/Win: While dragging, temporarily move a single element.');
      });

      this.buildHelpBox(keyboardHelp.el, 'b', function(box, text) {
        new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('b');
        text.html('Toggle background image nudge.');
      });

      this.buildHelpBox(keyboardHelp.el, 's', function(box, text) {
        new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('s');
        text.html('Toggle size nudge.');
      });

      this.buildHelpBox(keyboardHelp.el, 'm', function(box, text) {
        new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('m');
        text.html('Toggle position (move) nudge.');
      });

      this.buildHelpBox(keyboardHelp.el, 'r', function(box, text) {
        new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('r');
        text.html('Toggle rotation nudge.');
      });

      this.buildHelpBox(keyboardHelp.el, 'z', function(box, text) {
        new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('z');
        text.html('Toggle z-index nudge.');
      });


      // Mouse help area

      var mouseHelp = this.buildHelpBlock('mouse', 'Mouse');

      this.buildHelpBox(mouseHelp.el, 'position', function(box, text) {
        new Element(box.el, 'div', 'help-element');
        new IconElement(box.el, StatusBar.POSITION_ICON, 'help-icon position-help-icon');
        text.html('Drag the middle of the element to move it around.');
      });
      this.buildHelpBox(mouseHelp.el, 'resize', function(box, text) {
        new Element(box.el, 'div', 'help-element');
        new Element(box.el, 'div', 'resize-help-icon resize-nw-help-icon');
        new Element(box.el, 'div', 'resize-help-icon resize-n-help-icon');
        new Element(box.el, 'div', 'resize-help-icon resize-ne-help-icon');
        new Element(box.el, 'div', 'resize-help-icon resize-e-help-icon');
        new Element(box.el, 'div', 'resize-help-icon resize-se-help-icon');
        new Element(box.el, 'div', 'resize-help-icon resize-s-help-icon');
        new Element(box.el, 'div', 'resize-help-icon resize-sw-help-icon');
        new Element(box.el, 'div', 'resize-help-icon resize-w-help-icon');
        text.html('Drag border handles to resize.');
      });

      this.buildHelpBox(mouseHelp.el, 'rotate', function(box, text) {
        new Element(box.el, 'div', 'help-element');
        new Element(box.el, 'div', 'rotate-handle');
        text.html('Drag the rotate handle to rotate the element.');
      });

      this.buildHelpBox(mouseHelp.el, 'snapping', function(box, text) {
        new Element(box.el, 'div', 'help-element');
        new IconElement(box.el, StatusBar.BG_IMAGE_ICON, 'help-icon snapping-help-icon');
        new IconElement(box.el, StatusBar.POINTER_ICON, 'help-icon snapping-help-pointer-icon');
        text.html('Double click to snap element dimensions to a background sprite.');
      });

      this.buildHelpBox(mouseHelp.el, 'aligning', function(box, text) {
        new Element(box.el, 'div', 'help-element multiple-select-help');
        new IconElement(box.el, StatusBar.POINTER_ICON, 'help-icon aligning-pointer-icon');
        new Element(box.el, 'div', 'icon help-icon aligning-box-one');
        new Element(box.el, 'div', 'icon help-icon aligning-box-two');
        text.html('Drag to select multiple elements.');
      });


      // Command help area

      var commandHelp = this.buildHelpBlock('command', 'Commands');

      this.buildHelpBox(commandHelp.el, 'undo', function(box, text) {
        box.addClass('command-help-box');
        new Element(box.el, 'div', 'key-icon alt-key-icon').html(this.getCommandKey());
        new Element(box.el, 'span', 'key-plus').html('+');
        new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('z');
        text.html('Undo');
      });

      this.buildHelpBox(commandHelp.el, 'select-all', function(box, text) {
        box.addClass('command-help-box');
        new Element(box.el, 'div', 'key-icon alt-key-icon').html(this.getCommandKey());
        new Element(box.el, 'span', 'key-plus').html('+');
        new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('a');
        text.html('Select All');
      });

      this.buildHelpBox(commandHelp.el, 'copy', function(box, text) {
        box.addClass('command-help-box');
        new Element(box.el, 'div', 'key-icon alt-key-icon').html(this.getCommandKey());
        new Element(box.el, 'span', 'key-plus').html('+');
        new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('c');
        text.html('Copy Styles');
      });

      this.buildHelpBox(commandHelp.el, 'save', function(box, text) {
        box.addClass('command-help-box');
        new Element(box.el, 'div', 'key-icon alt-key-icon').html(this.getCommandKey());
        new Element(box.el, 'span', 'key-plus').html('+');
        new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('s');
        text.html('Save Styles');
      });

    }

    buildHelpBlock(name, header) {
      var block = new Element(this.helpArea.el, 'div', 'help-block '+ name +'-help-block');
      if (header) {
        new Element(block.el, 'h4', 'help-block-header').html(header);
      }
      return block;
    }

    buildHelpBox(el, name, fn) {
      var help = new Element(el, 'div', 'help ' + name + '-help');
      var box  = new Element(help.el, 'div', 'help-box ' + name + '-help-box');
      var text = new Element(help.el, 'div', 'help-text ' + name + '-help-text');
      fn.call(this, box, text);
    }

    buildElementArea(area) {

      this.singleElementArea = new Element(area.el, 'div', 'single-element-area');
      this.elementHeader     = new Element(this.singleElementArea.el, 'h3', 'single-header');

      this.elementDetails  = new Element(this.singleElementArea.el, 'div', 'details');
      this.detailsLeft     = new Element(this.elementDetails.el, 'span').title('Left');
      this.detailsComma1   = new Element(this.elementDetails.el, 'span').html(', ');
      this.detailsTop      = new Element(this.elementDetails.el, 'span').title('Top');
      this.detailsComma2   = new Element(this.elementDetails.el, 'span').html(', ');
      this.detailsZIndex   = new Element(this.elementDetails.el, 'span').title('Z-Index');
      this.detailsDivider1 = new Element(this.elementDetails.el, 'span').html(' | ');
      this.detailsWidth    = new Element(this.elementDetails.el, 'span').title('Width');
      this.detailsComma3   = new Element(this.elementDetails.el, 'span').html(', ');
      this.detailsHeight   = new Element(this.elementDetails.el, 'span').title('Height');
      this.detailsDivider2 = new Element(this.elementDetails.el, 'span').html(' | ');
      this.detailsRotation = new Element(this.elementDetails.el, 'span').title('Rotation (other transforms hidden)');

      this.multipleElementArea   = new Element(area.el, 'div', 'multiple-element-area');
      this.multipleElementHeader = new Element(this.multipleElementArea.el, 'h3', 'multiple-header');
      this.buildAlignActions(area);

      this.elementStates  = new Element(area.el, 'div', 'element-states');
      this.stateIcons = [];
    }

    buildAlignActions(area) {
      this.elementActions = new Element(this.multipleElementArea.el, 'div', 'element-actions');

      this.alignTop        = this.buildElementAlign('top', StatusBar.ALIGN_TOP_ICON, 'Align top edge');
      this.alignHorizontal = this.buildElementAlign('horizontal', StatusBar.ALIGN_HORIZONTAL_ICON, 'Align horizontal center');
      this.alignBottom     = this.buildElementAlign('bottom', StatusBar.ALIGN_BOTTOM_ICON, 'Align bottom edge');
      this.alignLeft       = this.buildElementAlign('left', StatusBar.ALIGN_LEFT_ICON, 'Align left edge');
      this.alignVertical   = this.buildElementAlign('vertical', StatusBar.ALIGN_VERTICAL_ICON, 'Align vertical center');
      this.alignRight      = this.buildElementAlign('right', StatusBar.ALIGN_RIGHT_ICON, 'Align right edge');

      this.distributeTop        = this.buildElementDistribute('top', StatusBar.DISTRIBUTE_TOP_ICON, 'Distribute top edge');
      this.distributeHorizontal = this.buildElementDistribute('horizontal', StatusBar.DISTRIBUTE_HORIZONTAL_ICON, 'Distribute horizontal center');
      this.distributeBottom     = this.buildElementDistribute('bottom', StatusBar.DISTRIBUTE_BOTTOM_ICON, 'Distribute bottom edge');
      this.distributeLeft       = this.buildElementDistribute('left', StatusBar.DISTRIBUTE_LEFT_ICON, 'Distribute left edge');
      this.distributeVertical   = this.buildElementDistribute('vertical', StatusBar.DISTRIBUTE_VERTICAL_ICON, 'Distribute vertical center');
      this.distributeRight      = this.buildElementDistribute('right', StatusBar.DISTRIBUTE_RIGHT_ICON, 'Distribute right edge');

    }

    buildElementAlign(type, iconId, title) {
      var method = type === 'horizontal' || type === 'vertical' ? 'alignMiddle' : 'alignFocused';
      var action = new IconElement(this.elementActions.el, iconId, 'element-action');
      action.el.title = title;
      action.addEventListener('click', this.delegateElementAction(method, type));
    }

    buildElementDistribute(type, iconId, title) {
      var action = new IconElement(this.elementActions.el, iconId, 'element-action');
      action.el.title = title;
      action.addEventListener('click', this.delegateElementAction('alignFocused', type, true));
    }

    buildSettingsArea(area) {

      var header = new Element(this.settingsArea.el, 'h4', 'settings-header').html('Settings');

      this.buildTextField(area, Settings.DOWNLOAD_FILENAME, 'Filename when saving:', 'filename');
      this.buildTextField(area, Settings.EXCLUDE_ELEMENTS, 'Exclude elements matching:', 'CSS Selector');
      this.buildTextField(area, Settings.INCLUDE_ELEMENTS, 'Include elements matching:', 'CSS Selector');

      this.buildSelect(area, Settings.TABS, 'Tab style:', [
        [Settings.TABS_TAB, 'Tab'],
        [Settings.TABS_TWO_SPACES, 'Two Spaces'],
        [Settings.TABS_FOUR_SPACES, 'Four Spaces']
      ]);

      this.buildSelect(area, Settings.SELECTOR, 'Output Selector:', [
        [Settings.SELECTOR_AUTO, 'Auto', 'Element id or first class will be used', '#id | .first { ... }'],
        [Settings.SELECTOR_NONE, 'None', 'No selector used. Styles will be inline.', 'width: 200px; height: 200px;...'],
        [Settings.SELECTOR_ID, 'Id', 'Element id will be used', '#id { ... }'],
        [Settings.SELECTOR_FIRST, 'First Class', 'First class name found will be used', '.first { ... }'],
        [Settings.SELECTOR_LONGEST, 'Longest Class', 'Longest class name found will be used', '.long-class-name { ... }'],
        [Settings.SELECTOR_ALL, 'All Classes', 'All class names will be output together', '.one.two.three { ... }'],
        [Settings.SELECTOR_TAG, 'Tag', 'Only the tag name will be output', 'section { ... }'],
        [Settings.SELECTOR_TAG_NTH, 'Tag:nth-child', 'The tag name + tag\'s nth-child selector will be output', 'li:nth-child(3) { ... }'],
      ]);

      this.buildCheckboxField(area, Settings.OUTPUT_CHANGED, 'Only output changed styles:');
      this.buildCheckboxField(area, Settings.OUTPUT_UNIQUE, 'Exclude styles common to a group:');

      var save  = new Element(this.settingsArea.el, 'button', 'settings-save').html('Save');
      var reset = new Element(this.settingsArea.el, 'button', 'settings-reset').html('Clear All');
      var help  = new Element(header.el, 'span', 'settings-help-link').html('Help');

      reset.addEventListener('click', this.clearSettings.bind(this));
      save.addEventListener('click', this.saveSettings.bind(this));
      help.addEventListener('click', this.setArea.bind(this, this.helpArea));

      area.addEventListener('mousedown', this.filterClicks.bind(this));
      area.addEventListener('mouseup', this.filterClicks.bind(this));
      area.addEventListener('keydown', this.filterKeyboardInput.bind(this));
    }

    buildTextField(area, name, label, placeholder) {
      this.buildFormControl(area, name, label, function(block) {
        var input = new Element(block.el, 'input', 'setting-input setting-text-input');
        input.el.type = 'text';
        input.el.placeholder = placeholder;
        input.el.value = settings.get(name);
        this.inputs.push(input);
        return input;
      });
    }

    buildCheckboxField(area, name, label) {
      this.buildFormControl(area, name, label, function(block) {
        var input = new Element(block.el, 'input', 'setting-input setting-text-input');
        input.el.type = 'checkbox';
        input.el.checked = !!settings.get(name);
        this.inputs.push(input);
        return input;
      });
    }

    buildSelect(area, name, label, options) {
      var select;
      this.buildFormControl(area, name, label, function(block) {
        select = new Element(block.el, 'select', 'setting-input');
        if (options[0].length > 2) {
          // Associated descriptions exist so create the elements
          this[name + 'Description'] = new Element(block.el, 'div', 'setting-description');
          this[name + 'Example'] = new Element(block.el, 'div', 'setting-example');
        }
        options.forEach(function(o) {
          var option = new Element(select.el, 'option', 'setting-option');
          option.el.value = o[0];
          option.el.textContent = o[1];
          if (o[2]) {
            option.el.dataset.description = o[2];
            option.el.dataset.example = o[3];
          }
          if (settings.get(name) === option.el.value) {
            option.el.selected = true;
          }
        });
        return select;
      });
      this.checkLinkedDescription(select.el);
    }

    buildFormControl(area, name, label, fn) {
      var field = new Element(area.el, 'fieldset', 'setting-field');
      var label = new Element(field.el, 'label', 'setting-label').html(label);
      var block = new Element(field.el, 'div', 'setting-block');
      var input = fn.call(this, block);
      input.el.id = 'setting-' + name;
      input.el.name = name;
      label.el.htmlFor = input.el.id;
      input.el.dataset.name = name;
      input.addEventListener('change', this.inputChanged.bind(this));
    }

    setFormControl(control) {
      var el = control.el;
      var value = settings.get(el.name);
      if (el.type === 'checkbox') {
        el.checked = value;
      } else {
        el.value = value;
      }
    }

    createState(name, text, iconId) {
      var state = new Element(this.elementStates.el, 'div', 'element-state ' + name + '-state');
      state.name = name;
      new IconElement(state.el, iconId, 'element-state-icon');
      new Element(state.el, 'p', 'element-state-text').html(text);
      this.stateIcons.push(state);
    }


    // --- Util

    getCommandKey() {
      return navigator.platform.match(/Mac/) ? StatusBar.COMMAND : StatusBar.CTRL;
    }

    // --- Events

    inputChanged(evt) {
      var target = evt.target;
      settings.set(target.dataset.name, target.value);
      if (target.selectedIndex !== undefined) {
        this.checkLinkedDescription(target);
      }
    }

    filterClicks(evt) {
      evt.stopPropagation();
    }

    filterKeyboardInput(evt) {
      evt.stopPropagation();
      if (evt.keyCode === KeyEventManager.ENTER) {
        this.saveSettings();
      }
    }

    // --- Actions

    setState(name) {
      this.stateIcons.forEach(function(i) {
        if (i.name === name) {
          i.addClass('element-active-state');
        } else {
          i.removeClass('element-active-state');
        }
      });
    }

    checkLinkedDescription(select) {
      var name = select.dataset.name;
      var option = select.options[select.selectedIndex];
      var description = this[name + 'Description'];
      var example = this[name + 'Example'];
      if (description && example) {
        description.html(option.dataset.description);
        example.html(option.dataset.example);
      }
    }

    setArea(area) {
      if (this.currentArea === area) return;
      this.areas.forEach(function(a) {
        var className = 'status-bar-' + a.name + '-active';
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
    }

    toggleArea(area) {
      if (this.currentArea !== area) {
        this.setArea(area);
      } else {
        this.resetArea();
      }
    }

    clearSettings() {
      if (confirm('Really clear all settings?')) {
        settings.clear();
        this.inputs.forEach(this.setFormControl, this);
        this.setArea(this.defaultArea);
        this.checkSelectorUpdate();
      }
    }

    saveSettings() {
      this.setArea(this.defaultArea);
      this.checkSelectorUpdate();
    }

    checkSelectorUpdate() {
      if (this.selectorsChanged()) {
        window.currentElementManager.refresh();
        settings.update(Settings.INCLUDE_ELEMENTS);
        settings.update(Settings.EXCLUDE_ELEMENTS);
      }
    }

    selectorsChanged() {
      return settings.hasChanged(Settings.INCLUDE_ELEMENTS) || settings.hasChanged(Settings.EXCLUDE_ELEMENTS);
    }

    resetArea(area) {
      this.setArea(this.defaultArea);
    }

    getStartArea() {
      if (settings.get(Settings.SHOW_QUICK_START)) {
        return this.quickStartArea;
      } else {
        return this.startArea;
      }
    }

    showElementArea() {
      this.setArea(this.elementArea);
    }

    skipStartArea() {
      settings.set(Settings.SHOW_QUICK_START, '1');
      this.defaultArea = this.getStartArea();
      this.resetArea();
    }

    delegateElementAction(action) {
      var args = Array.prototype.slice.call(arguments, 1);
      return function () {
        elementManager[action].apply(elementManager, args);
      }
    }

    activate() {
      if (this.active) return;
      this.show();
      this.addClass('status-bar-active');
      this.active = true;
    }

    deactivate() {
      if (!this.active) return;
      this.active = false;
      this.removeClass('status-bar-active');
      setTimeout(function() {
        this.hide();
      }.bind(this), StatusBar.FADE_DELAY);
    }

    // --- Transform

    resetPosition() {
      this.position = this.defaultPostion;
      this.updatePosition();
    }

    setSelectorText(str) {
      var html;
      if (!str) {
        str = '[Inline Selector]';
        var className = EXTENSION_CLASS_PREFIX + 'inline-selector';
        html = '<span class="'+ className +'">' + str + '</span>';
      }
      this.elementHeader.html(html || str);
      this.elementHeader.el.title = str;
    }

    setElementDetails(el) {
      this.detailsLeft.html(el.box.cssLeft);
      this.detailsTop.html(el.box.cssTop);

      if (el.zIndex.isNull()) {
        this.detailsZIndex.hide();
        this.detailsComma2.hide();
      } else {
        this.detailsZIndex.html(el.zIndex);
        this.detailsZIndex.show(false);
        this.detailsComma2.show(false);
      }

      this.detailsWidth.html(el.box.cssWidth);
      this.detailsHeight.html(el.box.cssHeight);

      //var rotation = el.getRoundedRotation();
      if (el.transform.getRotation()) {
        this.detailsRotation.html(el.transform.getRotationString());
        this.detailsRotation.show(false);
        this.detailsDivider2.show(false);
      } else {
        this.detailsRotation.hide();
        this.detailsDivider2.hide();
      }

    }

    setMultipleText(str) {
      this.multipleElementHeader.html(str);
    }

    update() {
      var size = elementManager.getFocusedSize();
      if (size === 0) {
        this.setArea(this.quickStartArea);
        return;
      } else if (size === 1) {
        this.setSingle(elementManager.getFirstFocused());
      } else {
        this.setMultiple(elementManager.getAllFocused());
      }
      this.setState(nudgeManager.mode);
      this.showElementArea();
    }

    setSingle(el) {
      this.setSelectorText(el.getSelector());
      this.setElementDetails(el);
      this.singleElementArea.show();
      this.multipleElementArea.hide();
    }

    setMultiple(els) {
      this.setMultipleText(els.length + ' elements selected');
      this.singleElementArea.hide();
      this.multipleElementArea.show();
    }


    // --- Events

    dragStart(evt) {
      this.lastPosition = this.position;
    }

    drag(evt) {
      this.position = new Point(this.lastPosition.x + evt.dragOffset.x, this.lastPosition.y - evt.dragOffset.y);
      this.updatePosition();
    }

    // --- Compute

    getPosition() {
      var style = window.getComputedStyle(this.el);
      this.position = new Point(parseInt(style.left), parseInt(style.bottom));
      this.defaultPostion = this.position;
    }

    // --- Update

    updatePosition() {
      this.el.style.left   = this.position.x + 'px';
      this.el.style.bottom = this.position.y + 'px';
    }

  }

  /*-------------------------] Settings [--------------------------*/

  class Settings {

    static get TABS()              { return 'tabs';              }
    static get OUTPUT()            { return 'output';            }
    static get SELECTOR()          { return 'selector';          }
    static get INCLUDE_ELEMENTS()  { return 'include-elements';  }
    static get EXCLUDE_ELEMENTS()  { return 'exclude-elements';  }
    static get DOWNLOAD_FILENAME() { return 'download-filename'; }

    static get SELECTOR_ID()      { return 'id';      }
    static get SELECTOR_ALL()     { return 'all';     }
    static get SELECTOR_TAG()     { return 'tag';     }
    static get SELECTOR_TAG_NTH() { return 'tag-nth'; }
    static get SELECTOR_AUTO()    { return 'auto';    }
    static get SELECTOR_FIRST()   { return 'first';   }
    static get SELECTOR_NONE()    { return 'inline';  }
    static get SELECTOR_LONGEST() { return 'longest'; }

    static get OUTPUT_UNIQUE()  { return 'unique';  }
    static get OUTPUT_CHANGED() { return 'changed'; }

    static get TABS_TWO_SPACES()  { return 'two';  }
    static get TABS_FOUR_SPACES() { return 'four'; }
    static get TABS_TAB()         { return 'tab';  }

    constructor() {
      this.changed  = {};
      this.defaults = {};
      this.defaults[Settings.TABS]     = Settings.TABS_TWO_SPACES;
      this.defaults[Settings.SELECTOR] = Settings.SELECTOR_AUTO;
      this.defaults[Settings.OUTPUT_UNIQUE] = true;
      this.defaults[Settings.DOWNLOAD_FILENAME] = 'styles.css';
    }

    get(name) {
      return localStorage[name] || this.defaults[name] || '';
    }

    set(name, value) {
      if (value !== this.get(name)) {
        this.changed[name] = true;
      }
      localStorage[name] = value;
    }

    hasChanged(name) {
      return !!this.changed[name];
    }

    update(name) {
      this.changed[name] = false;
    }

    clear() {
      for (key in localStorage) {
        if (localStorage[key]) {
          this.changed[key] = true;
        }
      }
      localStorage.clear();
    }

  }

  /*-------------------------] Animation [--------------------------*/

  class Animation {

    defer(fn) {
      setTimeout(fn.bind(this), 0);
    }

  }

  /*-------------------------] LoadingAnimation [--------------------------*/

  class LoadingAnimation extends Animation {

    static get VISIBLE_DELAY() { return 250; }

    constructor() {
      super();
      this.build();
    }

    // --- Setup

    build() {

      this.box   = new Element(document.body, 'div', 'loading'),
      this.shade = new Element(document.body, 'div', 'loading-shade');
      this.spin  = new Element(this.box.el, 'div', 'loading-spin');

      for(var i = 1; i <= 12; i++) {
        new Element(this.spin.el, 'div', 'loading-bar loading-bar-' + i);
      }
    }

    // --- Actions

    show(fn) {
      this.box.show();
      this.shade.show();
      this.defer(function() {
        this.box.afterTransition(fn);
        this.box.addClass('loading-active');
        this.shade.addClass('loading-shade-active');
      });
    }

    hide(fn) {
      this.defer(function() {
        var box = this.box, shade = this.shade;
        box.afterTransition(function() {
          box.hide();
          shade.hide();
          fn();
        });
        box.removeClass('loading-active');
        shade.removeClass('loading-shade-active');
      });
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

  class SpriteRecognizer {

    static get ORIGIN_REG()    { return new RegExp('^' + window.location.origin.replace(/([\/.])/g, '\\$1')); }
    static get EXTENSION_REG() { return /^chrome-extension:\/\//; }

    constructor(url) {
      this.map = {};
      this.loadPixelData(url);
    }

    loadPixelData(url) {
      var xDomain = !SpriteRecognizer.ORIGIN_REG.test(url);
      var extension = SpriteRecognizer.EXTENSION_REG.test(url);
      if (extension) {
        return;
      }
      if (xDomain) {
        this.loadXDomainImage(url);
      } else {
        this.loadImage(url);
      }
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

    loadXDomainImage(url) {
      // The background page is the only context in which pixel data from X-Domain
      // images can be loaded so call out to it and tell it to load the data for this url.
      var message = { message: 'convert_image_url_to_data_url', url: url };
      chrome.runtime.sendMessage(message, this.loadImage.bind(this));
    }

    handleImageLoaded(evt) {
      var img = evt.target, canvas, context;
      canvas = document.createElement('canvas');
      canvas.setAttribute('width', img.width);
      canvas.setAttribute('height', img.height);
      context = canvas.getContext('2d');
      context.drawImage(img, 0, 0);
      this.pixelData = context.getImageData(0, 0, img.width, img.height).data;
      this.width = img.width;
      this.height = img.height;
    }

    getSpriteBoundsForCoordinate(pixel) {
      pixel = pixel.round();
      var cached, alpha = this.getAlphaForPixel(pixel);
      // No sprite detected
      if (!alpha) {
        return;
      }
      cached = this.map[this.getKey(pixel)];
      if (cached) {
        return cached;
      }
      this.queue = [];
      this.rect = new Rectangle(pixel.y, pixel.x, pixel.y, pixel.x);
      do {
        this.testAdjacentPixels(pixel);
      } while(pixel = this.queue.shift());
      return this.rect;
    }

    testAdjacentPixels(pixel) {
      this.testPixel(new Point(pixel.x, pixel.y - 1)); // Top
      this.testPixel(new Point(pixel.x + 1, pixel.y)); // Right
      this.testPixel(new Point(pixel.x, pixel.y + 1)); // Bottom
      this.testPixel(new Point(pixel.x - 1, pixel.y)); // Left
    }

    testPixel(pixel) {
      var key = this.getKey(pixel);
      if (this.map[key] === undefined) {
        // If we have a pixel, then move on and test the adjacent ones.
        if (this.getAlphaForPixel(pixel)) {
          this.rect.top    = Math.min(this.rect.top, pixel.y);
          this.rect.left   = Math.min(this.rect.left, pixel.x);
          this.rect.right  = Math.max(this.rect.right, pixel.x);
          this.rect.bottom = Math.max(this.rect.bottom, pixel.y);
          this.queue.push(pixel);
          this.map[key] = this.rect;
        } else {
          this.map[key] = null;
        }
      }
    }

    getKey(pixel) {
      return pixel.x + ',' + pixel.y;
    }

    getAlphaForPixel(pixel) {
      return !!this.pixelData[((this.width * pixel.y) + pixel.x) * 4 + 3];
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
      return Point.vector(this.getAngle(), this.getLength() * n);
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

    getRotated(deg) {
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
      return coord.subtract(center).getRotated(this.rotation).add(center);
    }

    // The un-rotated coords for a given rotated position.
    // TODO: consolidate this with CSSBox
    getCoordsForPosition(position) {
      if (!this.rotation) return position;
      var center = this.getCenter();
      return position.subtract(center).getRotated(-this.rotation).add(center);
    }

    clone() {
      return new Rectangle(this.top, this.right, this.bottom, this.left, this.rotation);
    }

  }

  /*-------------------------] CSSPoint [--------------------------*/

  class CSSPoint {

    constructor(cssLeft, cssTop) {
      this.cssLeft = cssLeft || new CSSValue(null);
      this.cssTop  = cssTop || new CSSValue(null);
    }

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

    clone() {
      return new CSSPoint(this.cssLeft.clone(), this.cssTop.clone());
    }

  }

  /*-------------------------] CSSBox [--------------------------*/

  // TODO: can this supersede rectangle?
  class CSSBox {

    constructor(cssLeft, cssTop, cssWidth, cssHeight) {
      this.cssLeft   = cssLeft;
      this.cssTop    = cssTop;
      this.cssWidth  = cssWidth;
      this.cssHeight = cssHeight;
    }

  /*
    function setupCSSAccessors(klass, props) {
      props.forEach(function(prop) {
        var cssProp = 'css' + prop.charAt(0).toUpperCase() + prop.slice(1);
        Object.defineProperty(klass, prop, {

          get: function() {
            return this[cssProp].px;
          },

          set: function(val) {
            this[cssProp].px = val;
          }

        });
      });
    }
    */

    //setupCSSAccessors(CSSBox, ['left', 'top', 'width', 'height', 'zIndex', 'rotation']);

    // Basic dimensions

    get left () {
      return this.cssLeft.px;
    }

    set left (val) {
      var px = Math.min(val, this.right - 1)
      this.cssWidth.px += this.cssLeft.px - px;
      this.cssLeft.px = px;
    }

    get top () {
      return this.cssTop.px;
    }

    set top (val) {
      var px = Math.min(val, this.bottom - 1)
      this.cssHeight.px += this.cssTop.px - px;
      this.cssTop.px = px;
    }

    get width () {
      return this.cssWidth.px;
    }

    set width (val) {
      this.cssWidth.px = Math.max(val, 1);
    }

    get height () {
      return this.cssHeight.px;
    }

    set height (val) {
      this.cssHeight.px = Math.max(val, 1);
    }

    // Translation TODO: accessors or "get"? it's confusing
    // TODO: move this into CSSTranform or something

    /*
    setTranslation(vector) {
      if (!this.cssTranslationLeft) {
        this.cssTranslationLeft = new CSSValue(0, 'px');
      }
      if (!this.cssTranslationTop) {
        this.cssTranslationTop = new CSSValue(0, 'px');
      }
      this.cssTranslationLeft.setValue(vector.x);
      this.cssTranslationTop.setValue(vector.y);
    }
    */

    // Basic rotation accessors

    /*
    get rotation () {
      return this.cssTransform.rotation.getValue();
    }

    set rotation (val) {
      return this.cssTransform.rotation.setValue(val);
    }
    */

    // Computed dimensions

    get right () {
      return this.cssLeft.px + this.cssWidth.px;
    }

    set right (val) {
      this.cssWidth.px = Math.max(1, val - this.cssLeft.px);
    }

    get bottom () {
      return this.cssTop.px + this.cssHeight.px;
    }

    set bottom (val) {
      this.cssHeight.px = Math.max(1, val - this.cssTop.px);
    }

    getPosition() {
      return new Point(this.left, this.top);
    }

    setPosition(vector) {
      this.cssLeft.px = vector.x;
      this.cssTop.px  = vector.y;
    }

    addPosition(vector) {
      this.cssLeft.add(vector.x);
      this.cssTop.add(vector.y);
    }

    getCoords(p, rotation) {
      var center;

      p = p.subtract(this.getPosition());

      if (rotation) {
        center = this.getCenter();
        p = p.subtract(center).getRotated(-potation).add(center);
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
      var rotatedCoords = center.getRotated(this.rotation);
      var rotatedPos = pos.subtract(rotatedCoords.subtract(center));
      this.setPosition(rotatedPos);

      var offsetX  = this.box.width / 2;
      var offsetY  = this.box.height / 2;
      var toCenter = anchor.offsetToCenter(offsetX, offsetY).getRotated(this.box.rotation);
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
      return pos.subtract(center).getRotated(this.rotation).add(center);
    }
    */

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
    */

    clone() {
      return new CSSBox(
        this.cssLeft.clone(),
        this.cssTop.clone(),
        this.cssWidth.clone(),
        this.cssHeight.clone()
      );
    }

  }

  /*-------------------------] CSSRuleMatcher [--------------------------*/

  class CSSRuleMatcher {

    constructor(el) {
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

    getPosition(prop, el) {
      var val = this.getCSSValue(prop.toLowerCase(), el);
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

    getCSSValue(prop, el) {
      return CSSValue.parse(this.getProperty(prop), prop, el.parentNode);

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
      console.info('umm', str, val, prop);
      */

    }

    getZIndex() {
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

    getBackgroundPosition(el) {
    }


    getProperty(prop) {
      var str;

      // Attempt to get value from matched rules.
      if (this.matchedRules) {
        for (var rules = this.matchedRules, i = rules.length - 1, rule; rule = rules[i]; i--) {
          str = rule.style[prop];
          if (str) {
            break;
          }
        }
      }

      // Fall back to computed values.
      if (!str) {
        str = this.computedStyles[prop];
      }

      return str;
    }

  }

  /*-------------------------] CSSCompositeTransform [--------------------------*/

  class CSSCompositeTransform {

    constructor(functions) {
      this.functions = functions || [];
    }

    static parse(str, el) {
      var functions = str.split(' ').map(function(f) {
        return CSSCompositeTransformFunction.parse(f, el);
      });
      return new CSSCompositeTransform(functions);
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
        var values = [new CSSDegreeValue(deg)];
        this.functions.push(new CSSCompositeTransformFunction('rotate', values));
      }
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
        var values = [new CSSPixelValue(p.x), new CSSPixelValue(p.y)];
        // Ensure that translate comes first, otherwise anchors will not work.
        this.functions.unshift(new CSSCompositeTransformFunction('translate', values));
      }
    }

    getRotationFunction() {
      return this.functions.find(function(f) {
        return f.name === CSSCompositeTransformFunction.ROTATE;
      });
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

    static parse(str, el) {
      var match, name, values;

      // TODO: needs toLowerCase??
      match = str.match(CSSCompositeTransformFunction.COMPOSITE_FUNCTION_REG);

      if (!match) {
        throwError('Value not allowed: "'+ str +'". Only 2d transforms are supported.');
      }

      name   = match[1];
      // TODO: needs space after comma?
      values = match[2].split(',').map(function(s) {
        // Percentages in translate functions are relative to the element itself.
        var val = CSSValue.parse(s, name, el);
        if (val.unit === '%') {
          // Won't support percentages here as they would have to take scale
          // operations into account as well, which is too complex to handle.
          throwError('Percent values are not allowed in translate operarations.');
        }
        return val;
      });

      return new CSSCompositeTransformFunction(name, values);
    }

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

  CSSCompositeTransformFunction.ROTATE = 'rotate';
  CSSCompositeTransformFunction.TRANSLATE = 'translate';
  CSSCompositeTransformFunction.COMPOSITE_FUNCTION_REG = /^(rotate|(?:translate|scale|skew)[XY]?)\((.+)\)$/;


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

    static parse (str, prop, percentTarget) {

      if (str === 'auto') {
        return new CSSValue();
      }

      var val   = parseFloat(str) || 0;
      var match = str.match(/px|%|deg|rad|turn|v(w|h|min|max)$/);
      var unit  = match ? match[0] : null;

      // START: put this somewhere
      switch (unit) {
        case '%':    return CSSPercentValue.fromProperty(prop, val, percentTarget);
        case 'vw':   return new CSSViewportValue(val, unit);
        case 'vh':   return new CSSViewportValue(val, unit);
        case 'vmin': return new CSSViewportValue(val, unit);
        case 'vmax': return new CSSViewportValue(val, unit);
        case 'deg':  return new CSSDegreeValue(val);
        case 'rad':  return new CSSRadianValue(val);
        case 'turn': return new CSSTurnValue(val);
        case 'px':   return new CSSPixelValue(val);
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

    add(amt) {
      if (this.isNull()) {
        this.val = 0;
      }
      this.val += amt;
    }

    isNull() {
      return this.val == null;
    }

    clone() {
      return new CSSValue(this.val, this.unit, this.precision);
    }

    toString() {
      if (this.isNull()) {
        return '';
      }
      // z-index values do not have a unit
      if (!this.unit) {
        return this.val;
      }
      return round(this.val, this.precision) + this.unit;
    }
  }

  /*-------------------------] CSSPixelValue [--------------------------*/

  class CSSPixelValue extends CSSValue {

    constructor(val) {
      super(val, 'px');
    }

    get px() {
      return this.val;
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

    static fromProperty(prop, val, el) {
      switch (prop) {
        case 'left':
        case 'width':
          return new CSSPercentValue(val, el.parentNode, 'width');
        case 'top':
        case 'height':
          return new CSSPercentValue(val, el.parentNode, 'height');
        case 'backgroundLeft':
          return new CSSBackgroundPercentValue(val, el, 'width');
        case 'backgroundTop':
          return new CSSBackgroundPercentValue(val, el, 'height');
        default:
          // TODO: ok to remove?
          throwError('NOOO');
      }
    }

    constructor(val, target, mode) {
      super(val, '%', 2);
      this.target = target;
      this.mode   = mode;
    }

    get px() {
      return this.val / 100 * this.getTargetValue();
    }

    set px(px) {
      this.val = px / this.getTargetValue() * 100;
    }

    getTargetValue() {
      return this.mode === 'width' ?
        this.target.clientWidth :
        this.target.clientHeight;
    }

    clone() {
      return new CSSPercentValue(this.val, this.target, this.mode);
    }

  }

  /*-------------------------] CSSBackgroundPercentValue [--------------------------*/

  class CSSBackgroundPercentValue extends CSSPercentValue {

    constructor(val, target, mode, img) {
      super(val, target, mode);
      this.img = img;
    }

    setImage(img) {
      this.img = img;
    }

    getTargetValue() {
      return this.mode === 'width' ?
        this.target.clientWidth - this.img.width :
        this.target.clientHeight - this.img.height;
    }

    clone() {
      return new CSSBackgroundPercentValue(this.val, this.target, this.mode, this.img);
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

    static get URL_REG() { return /url\(["']?(.+?)["']?\)/i };

    static fromStyles(backgroundImage, backgroundPosition, el) {
      var cssLeft, cssTop, positions, components, urlMatch, img;

      urlMatch = backgroundImage.match(BackgroundImage.URL_REG);
      if (urlMatch) {
        img = new Image();
        img.src = urlMatch[1];
      }

      if (backgroundPosition === 'initial') {
        cssLeft = new CSSValue();
        cssTop  = new CSSValue();
      }

      positions = backgroundPosition.split(',');

      if (positions.length > 1) {
        throwError('Only one background image allowed per element');
      }

      components = backgroundPosition.split(' ');

      cssLeft = this.getPositionComponent(components[0], 'backgroundLeft', el, img);
      cssTop  = this.getPositionComponent(components[1], 'backgroundTop', el, img);

      return new BackgroundImage(img, cssLeft, cssTop);
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

    static getPositionComponent(str, prop, el, img) {
      var val = CSSValue.parse(str, prop, el);
      if (val instanceof CSSBackgroundPercentValue) {
        val.setImage(img);
      }
      return val;
    }

    constructor(img, cssLeft, cssTop) {
      this.img     = img;
      this.cssLeft = cssLeft;
      this.cssTop  = cssTop;
    }

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

    isNull() {
      return !this.img;
    }

    clone() {
      return new BackgroundImage(this.img, this.cssLeft.clone(), this.cssTop.clone());
    }

  }

  /*-------------------------] Init [--------------------------*/

  if (window.currentElementManager) {
    window.currentElementManager.toggleActive();
    return;
  }

  var settings         = new Settings();
  var statusBar        = new StatusBar();
  var dragSelection    = new DragSelection();
  var elementManager   = new PositionableElementManager();
  var nudgeManager     = new NudgeManager();
  var keyEventManager  = new KeyEventManager();
  var copyAnimation    = new CopyAnimation();
  var loadingAnimation = new LoadingAnimation();

  elementManager.startBuild();
  window.currentElementManager = elementManager;

})();

