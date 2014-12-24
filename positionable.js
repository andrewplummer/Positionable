/*
 *  Chrome Extension
 *
 *  Freely distributable and licensed under the MIT-style license.
 *  Copyright (c) 2013 Andrew Plummer
 *
 * ---------------------------- */

(function() {


  var EXTENSION_CLASS_PREFIX = 'positionable-extension-';

  /*-------------------------] NudgeManager [--------------------------*/


  function NudgeManager () {
    this.reset();
    this.setPositionMode();
    this.checkNextNudge = this.checkNextNudge.bind(this);
  };

  NudgeManager.SHIFT_MULTIPLIER = 5;
  NudgeManager.INITIAL_DELAY    = 250;
  NudgeManager.SLOW_REPEAT      = 20;
  NudgeManager.MED_REPEAT       = 10;
  NudgeManager.FAST_REPEAT      = 5;

  NudgeManager.POSITION_MODE    = 'position';
  NudgeManager.RESIZE_NW_MODE   = 'resize-nw';
  NudgeManager.RESIZE_SE_MODE   = 'resize-se';
  NudgeManager.BG_POSITION_MODE = 'background-position';
  NudgeManager.Z_INDEX_MODE     = 'z-index';

  // --- Modes

  NudgeManager.prototype.setPositionMode = function() {
    this.mode = NudgeManager.POSITION_MODE;
  };

  NudgeManager.prototype.toggleResizeMode = function(on) {
    this.mode = this.mode === NudgeManager.RESIZE_SE_MODE ? NudgeManager.RESIZE_NW_MODE : NudgeManager.RESIZE_SE_MODE;
  };

  NudgeManager.prototype.toggleBackgroundMode = function() {
    if(this.mode === NudgeManager.BG_POSITION_MODE) {
      this.setPositionMode();
    } else {
      this.mode = NudgeManager.BG_POSITION_MODE;
    }
  };

  NudgeManager.prototype.toggleZIndexMode = function(on) {
    if(this.mode === NudgeManager.Z_INDEX_MODE) {
      this.setPositionMode();
    } else {
      this.mode = NudgeManager.Z_INDEX_MODE;
    }
  };

  NudgeManager.prototype.isBackgroundMode = function() {
    return this.mode === NudgeManager.BG_POSITION_MODE;
  };

  NudgeManager.prototype.isResizeMode = function() {
    return this.mode === NudgeManager.RESIZE_NW_MODE || this.mode === NudgeManager.RESIZE_SE_MODE;
  };

  NudgeManager.prototype.isZIndexMode = function() {
    return this.mode === NudgeManager.Z_INDEX_MODE;
  };

  // --- Actions

  NudgeManager.prototype.begin = function() {
    this.resizeOffset = new Point(0, 0);
    elementManager.pushState();
    if(this.isResizeMode()) {
      elementManager.resizeStart(this.getSizingHandle());
    }
  };

  NudgeManager.prototype.dispatchNudge = function(vector) {
    if(this.isBackgroundMode()) {
      elementManager.moveBackgroundPosition(vector);
    } else if(this.isResizeMode()) {
      this.resizeOffset = this.resizeOffset.add(vector);
      elementManager.resize(this.resizeOffset, this.getSizingHandle());
    } else if(this.isZIndexMode()) {
      elementManager.moveZIndex(vector);
    } else {
      elementManager.movePosition(vector);
    }
  };

  NudgeManager.prototype.addDirection = function(dir) {
    if(!this.isNudging()) {
      this.begin();
    }
    this[dir] = true;
    this.next();
  };

  NudgeManager.prototype.removeDirection = function(dir) {
    this[dir] = false;
    if(!this.isNudging()) {
      this.reset();
    }
  };

  NudgeManager.prototype.next = function() {
    if(this.timer) return;
    var nudgeX = 0, nudgeY = 0, mult = this.getMultiplier();
    if(this.up) {
      nudgeY = -1;
    } else if(this.down) {
      nudgeY = 1;
    }
    if(this.left) {
      nudgeX = -1;
    } else if(this.right) {
      nudgeX = 1;
    }
    this.dispatchNudge(new Point(nudgeX * mult, nudgeY * mult));
    this.count++;
    this.timer = setTimeout(this.checkNextNudge, this.getDelay());
  };

  NudgeManager.prototype.checkNextNudge = function() {
    this.timer = null;
    if(this.isNudging()) {
      this.next();
    }
  };

  NudgeManager.prototype.reset = function() {
    this.count = 0;
    this.timer = clearTimeout(this.timer);
  };

  NudgeManager.prototype.getDelay = function() {
    if(this.count <= 1 && !this.multiplier) {
      return NudgeManager.INITIAL_DELAY;
    } else if(this.count > 200) {
      return NudgeManager.FAST_REPEAT;
    } else if(this.count > 50) {
      return NudgeManager.MED_REPEAT;
    } else {
      return NudgeManager.SLOW_REPEAT;
    }
  };

  // --- States

  NudgeManager.prototype.getSizingHandle = function() {
    return this.mode === NudgeManager.RESIZE_NW_MODE ? 'nw' : 'se';
  };

  NudgeManager.prototype.isNudging = function() {
    return this.up || this.down || this.left || this.right;
  };

  // --- Multiplier

  NudgeManager.prototype.toggleMultiplier = function(on) {
    this.multiplier = on;
  };

  NudgeManager.prototype.getMultiplier = function() {
    return this.multiplier ? NudgeManager.SHIFT_MULTIPLIER : 1;
  };



  /*-------------------------] EventManager [--------------------------*/


  function EventManager () {
    this.handledKeyCodes = [];
    this.handledKeyNames = [];
    this.setupHandlers();
  };

  EventManager.LEFT  = 37;
  EventManager.UP    = 38;
  EventManager.RIGHT = 39;
  EventManager.DOWN  = 40;
  EventManager.SHIFT = 16;
  EventManager.CTRL  = 17;
  EventManager.ALT   = 18;
  EventManager.CMD   = 91;
  EventManager.ENTER = 13;
  EventManager.A     = 65;
  EventManager.B     = 66;
  EventManager.M     = 77;
  EventManager.S     = 83;
  EventManager.Z     = 90;

  EventManager.prototype.setupHandlers = function() {

    this.delegateEventToElementManager('mouseDown');
    this.delegateEventToElementManager('mouseMove');
    this.delegateEventToElementManager('mouseUp');
    this.delegateEventToElementManager('scroll', window);
    this.delegateEventToElementManager('copy', window);

    this.setupHandler('keydown', this.handleKeyDown);
    this.setupHandler('keyup', this.handleKeyUp);

    this.setupKey('b');
    this.setupKey('m');
    this.setupKey('s');
    this.setupKey('z');
    this.setupKey('a');

    this.setupKey('left');
    this.setupKey('up');
    this.setupKey('right');
    this.setupKey('down');

    this.setupKey('shift');
    this.setupKey('ctrl');
    this.setupKey('cmd');
    this.setupKey('alt');

  };

  EventManager.prototype.setupHandler = function(name, handler, target) {
    if(!handler) return;
    target = target || document.documentElement;
    target.addEventListener(name, handler.bind(this));
  };

  EventManager.prototype.delegateEventToElementManager = function(name, target) {
    this.setupHandler(name.toLowerCase(), function(evt) {
      elementManager[name](evt);
    }.bind(this), target);
  };

  EventManager.prototype.setupKey = function(name) {
    this.handledKeyNames.push(name);
    this.handledKeyCodes.push(EventManager[name.toUpperCase()]);
  };

  EventManager.prototype.handleKeyDown = function(evt) {
    this.checkKeyEvent('KeyDown', evt);
  };

  EventManager.prototype.handleKeyUp = function(evt) {
    this.checkKeyEvent('KeyUp', evt);
  };

  EventManager.prototype.checkKeyEvent = function(type, evt) {
    var code = evt.keyCode, index = this.handledKeyCodes.indexOf(code), name, fn;
    if(index !== -1) {
      name = this.isArrowKey(code) ? 'arrow' : this.handledKeyNames[index];
      fn = this[name + type];
      if(fn) {
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        this[name + type].call(this, evt);
      }
    }
  };

  EventManager.prototype.isArrowKey = function(code) {
    return code === EventManager.UP ||
           code === EventManager.RIGHT ||
           code === EventManager.DOWN ||
           code === EventManager.LEFT;
  };

  EventManager.prototype.withCommandKey = function(evt, prevent) {
    var usingCommandKey = evt.ctrlKey || evt.metaKey;
    if(usingCommandKey && prevent) {
      evt.preventDefault();
    }
    return usingCommandKey;
  };


  // --- Events

  EventManager.prototype.shiftKeyDown = function() {
    nudgeManager.toggleMultiplier(true);
  };

  EventManager.prototype.shiftKeyUp = function() {
    nudgeManager.toggleMultiplier(false);
  };

  EventManager.prototype.ctrlKeyDown = function() {
    elementManager.toggleSizingHandles(false);
    elementManager.dragReset();
  };

  EventManager.prototype.ctrlKeyUp = function(evt) {
    elementManager.toggleSizingHandles(true);
    nudgeManager.setPositionMode();
    elementManager.dragReset();
    statusBar.update();
  };

  EventManager.prototype.cmdKeyDown = function() {
    elementManager.temporarilyFocusDraggingElement();
  };

  EventManager.prototype.cmdKeyUp = function() {
    elementManager.releasedFocusedDraggingElement();
  };

  EventManager.prototype.altKeyDown = function() {
    elementManager.peek(true);
  };

  EventManager.prototype.altKeyUp = function() {
    elementManager.peek(false);
  };

  EventManager.prototype.bKeyDown = function() {
    nudgeManager.toggleBackgroundMode();
    statusBar.update();
  };

  EventManager.prototype.mKeyDown = function() {
    nudgeManager.setPositionMode();
    statusBar.update();
  };

  EventManager.prototype.sKeyDown = function(evt) {
    if(this.withCommandKey(evt, true)) {
      elementManager.save(evt);
    } else {
      nudgeManager.toggleResizeMode();
      statusBar.update();
    }
  };

  EventManager.prototype.zKeyDown = function(evt) {
    if(this.withCommandKey(evt, true)) {
      elementManager.undo();
    } else {
      nudgeManager.toggleZIndexMode();
      statusBar.update();
    }
  };

  EventManager.prototype.aKeyDown = function(evt) {
    if(this.withCommandKey(evt, true)) {
      elementManager.focusAll();
    }
  };

  EventManager.prototype.arrowKeyDown = function(evt) {
    nudgeManager.addDirection(this.getArrowName(evt.keyCode));
    statusBar.update();
  };

  EventManager.prototype.arrowKeyUp = function(evt) {
    nudgeManager.removeDirection(this.getArrowName(evt.keyCode));
  };

  EventManager.prototype.getArrowName = function(code) {
    switch(code) {
      case EventManager.LEFT:  return 'left';
      case EventManager.UP:    return 'up';
      case EventManager.RIGHT: return 'right';
      case EventManager.DOWN:  return 'down';
    }
  };

  /*-------------------------] Element [--------------------------*/


  function Element (el, tag, className) {
    this.listeners = [];
    if(!tag) {
      this.el = el;
    } else {
      var parent = el;
      this.el = document.createElement(tag);
      if(className) {
        className.split(' ').forEach(function(n) {
          this.addClass(n);
        }, this);
      }
      parent.appendChild(this.el);
    }
  };

  Element.prototype.addClass = function(name) {
    this.el.classList.add(EXTENSION_CLASS_PREFIX + name);
    return this;
  };

  Element.prototype.removeClass = function(name) {
    this.el.classList.remove(EXTENSION_CLASS_PREFIX + name);
    return this;
  };

  Element.prototype.addEventListener = function(type, handler) {
    this.el.addEventListener(type, handler);
    this.listeners.push({
      type: type,
      handler: handler
    });
  };

  Element.prototype.removeAllListeners = function() {
    this.listeners.forEach(function(l) {
      this.el.removeEventListener(l.type, l.handler);
    }, this);
  };

  Element.prototype.show = function(on) {
    this.el.style.display = on === false ? '' : 'block';
  };

  Element.prototype.hide = function() {
    this.el.style.display = 'none';
  };

  Element.prototype.id = function(id) {
    this.el.id = EXTENSION_CLASS_PREFIX + id;
    return this;
  };

  Element.prototype.html = function(html) {
    this.el.innerHTML = html;
    return this;
  };

  Element.prototype.remove = function(html) {
    this.el.remove();
  };


  /*-------------------------] DraggableElement [--------------------------*/


  function DraggableElement () {
    this.listeners = [];
  };

  DraggableElement.prototype.hide               = Element.prototype.hide;
  DraggableElement.prototype.show               = Element.prototype.show;
  DraggableElement.prototype.remove             = Element.prototype.remove;
  DraggableElement.prototype.addClass           = Element.prototype.addClass;
  DraggableElement.prototype.removeClass        = Element.prototype.removeClass;
  DraggableElement.prototype.addEventListener   = Element.prototype.addEventListener;
  DraggableElement.prototype.removeAllListeners = Element.prototype.removeAllListeners;

  DraggableElement.prototype.setupDragging = function() {
    this.addEventListener('click', this.click.bind(this));
    this.addEventListener('mousedown', this.mouseDown.bind(this));

    // These two events are actually on the document,
    // so being called in manually.
    this.mouseUp   = this.mouseUp.bind(this);
    this.mouseMove = this.mouseMove.bind(this);
  };

  // --- Events

  DraggableElement.prototype.click = function(evt) {
    if(evt.target.href) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  };

  DraggableElement.prototype.mouseDown = function(evt) {
    if(evt.button !== 0) return;
    if(this.draggingStarted) {
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
  };

  DraggableElement.prototype.mouseMove = function(evt) {
    if(this.resetTarget) {
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
    if(!this.draggingStarted) {
      this.fireEvent('dragStart', evt);
      this.draggingStarted = true;
    }
    this.fireEvent('drag', evt);
    this.currentMouseX = evt.clientX;
    this.currentMouseY = evt.clientY;
  };

  DraggableElement.prototype.mouseUp = function(evt) {
    if(!this.draggingStarted) {
      this.fireEvent('click', evt);
    } else {
      this.fireEvent('dragStop', evt);
    }
    this.draggingStarted = false;
    elementManager.draggingElement = null;
  };

  DraggableElement.prototype.scroll = function() {
    var evt = new Event('mousemove');
    evt.clientX = this.currentMouseX;
    evt.clientY = this.currentMouseY;
    this.mouseMove(evt);
  };

  DraggableElement.prototype.fireEvent = function(name, evt) {
    if(elementManager[name]) {
      elementManager[name](evt);
    }
  };

  DraggableElement.prototype.dragReset = function(evt) {
    this.resetTarget = this.el;
  };



  /*-------------------------] Handle [--------------------------*/


  function Handle () {};

  Handle.prototype = new DraggableElement;

  Handle.prototype.setup = function(target, type) {
    this.target = target;
    this.type   = type;
    this.el     = new Element(target.el, 'div', 'handle handle-' + type).el;
    this.setupDragging();
  };

  Handle.prototype.dragStart = function(evt) {
    elementManager.setFocused(this.target);
  };

  Handle.prototype.setHover = function(type) {
    this.addEventListener('mouseover', function(evt) {
      evt.stopPropagation();
      if(!this.target.draggingStarted) {
        statusBar.setState(type);
      }
    }.bind(this));
    this.addEventListener('mouseout', function(evt) {
      evt.stopPropagation();
      if(!this.target.draggingStarted) {
        statusBar.setState(nudgeManager.mode);
      }
    }.bind(this));
  };

  Handle.prototype.isConstrained = function(evt) {
    return evt.shiftKey;
  };

  /*-------------------------] RotationHandle [--------------------------*/


  function RotationHandle (target) {
    this.setup(target, 'rotate');
    this.setHover('rotate');
  };

  RotationHandle.SNAPPING = 22.5;

  // --- Inheritance

  RotationHandle.prototype = new Handle();

  RotationHandle.prototype.dragStart = function(evt) {
    Handle.prototype.dragStart.apply(this, arguments);
    elementManager.pushState();
  };

  RotationHandle.prototype.drag = function(evt) {
    var dim = this.target.getAbsoluteDimensions();
    var w = this.target.dimensions.getWidth() / 2;
    var h = this.target.dimensions.getHeight() / 2;
    var deltaX = (evt.clientX + window.scrollX) - (dim.left + w);
    var deltaY = (evt.clientY + window.scrollY) - (dim.top + h);
    var deg    = new Point(deltaX, deltaY).getAngle() - new Point(w, h).getAngle();
    if(deg < 0) deg += 360;
    if(this.isConstrained(evt)) {
      deg = Math.round(deg / RotationHandle.SNAPPING) * RotationHandle.SNAPPING;
    }
    elementManager.setRotation(deg - this.target.getLastRotation());
    statusBar.update();
  };


  /*-------------------------] SizingHandle [--------------------------*/

  function SizingHandle (target, type, xProp, yProp) {
    this.setup(target, type);
    this.setHover('resize');
    this.addClass('sizing-handle');
    this.handle = new Element(target.el, 'div', 'handle-border handle-' + this.type + '-border');
    this.xProp = xProp;
    this.yProp = yProp;
  };

  // --- Inheritance

  SizingHandle.prototype = new Handle();

  // --- Setup

  SizingHandle.prototype.setAnchor = function(anchor) {
    this.anchor = anchor;
  };

  SizingHandle.prototype.destroy = function() {
    this.handle.remove();
    this.remove();
  }

  // --- Events

  SizingHandle.prototype.dragStart = function(evt) {
    Handle.prototype.dragStart.apply(this, arguments);
    elementManager.pushState();
    elementManager.resizeStart(this.type);
  };

  SizingHandle.prototype.drag = function(evt) {
    elementManager.resize(evt.dragOffset, this.type, this.isConstrained(evt));
  };

  // --- State

  SizingHandle.prototype.isConstrained = function(evt) {
    return Handle.prototype.isConstrained.call(this, evt) && this.isCorner();
  };

  SizingHandle.prototype.isCorner = function() {
    return !!this.xProp && !!this.yProp;
  }


  // --- Actions

  SizingHandle.prototype.applyConstraint = function(dimensions, ratio) {
    var w, h, xMult, yMult, type, min;
    w = dimensions.getWidth();
    h = dimensions.getHeight();
    xMult = 1 * (ratio || 1);
    yMult = 1;
    type = this.type;
    min = Math.min(w, h);
    if(type === 'nw' || type === 'sw') {
      xMult = -1;
    }
    if(type === 'nw' || type === 'ne') {
      yMult = -1;
    }
    dimensions[this.xProp] = dimensions[this.anchor.xProp] + (min * xMult);
    dimensions[this.yProp] = dimensions[this.anchor.yProp] + (min * yMult);
  };


  // --- Calculations

  SizingHandle.prototype.getCoords = function() {
    return new Point(this.target.dimensions[this.xProp], this.target.dimensions[this.yProp]);
  };

  SizingHandle.prototype.getPosition = function() {
    return this.target.dimensions.getPositionForCoords(this.getCoords()).add(this.target.getPositionOffset());
  };

  SizingHandle.prototype.offsetToCenter = function(x, y) {
    if(this.xProp === 'right')  x *= -1;
    if(this.yProp === 'bottom') y *= -1;
    return new Point(x, y);
  };



  /*-------------------------] PositionableElement [--------------------------*/


  function PositionableElement (el) {
    this.states = [];
    this.setupElement(el);
    this.setupEvents();
    this.getAttributes();
    this.getPositionedParents();
    this.createHandles();
  };

  // --- Inheritance

  PositionableElement.prototype = new DraggableElement;

  // --- Constants

  PositionableElement.BACKGROUND_IMAGE_MATCH = /url\([\u0027\u0022]?(.+?)[\u0022\u0027]?\)/i;
  PositionableElement.BACKGROUND_POSITION_MATCH = /([-\d]+)(px|%).+?([-\d]+)(px|%)/;

  PositionableElement.PEEKING_DIMENSIONS = 500;
  PositionableElement.DBLCLICK_TIMEOUT   = 500;

  // --- Setup

  PositionableElement.prototype.setupElement = function(el) {
    this.el = el;
    this.addClass('positioned-element');
    this.setupDragging();
  };

  PositionableElement.prototype.destroy = function() {
    this.unfocus();
    this.removeClass('positioned-element');
    this.removeAllListeners();
    this.rotate.remove();
    this.nw.destroy();
    this.ne.destroy();
    this.se.destroy();
    this.sw.destroy();
    this.n.destroy();
    this.e.destroy();
    this.s.destroy();
    this.w.destroy();
  };

  PositionableElement.prototype.getPositionedParents = function() {
    var el = this.el, style;
    this.positionedParents = [];
    while(el = el.offsetParent) {
      style = window.getComputedStyle(el);
      if(style.position !== 'static') {
        this.positionedParents.push(new Element(el));
      }
    }
  };

  PositionableElement.prototype.setupEvents = function() {
    this.addEventListener('dblclick', this.dblclick.bind(this));
    this.addEventListener('mouseover', this.mouseover.bind(this));
    this.addEventListener('contextmenu', this.contextmenu.bind(this));
  };

  PositionableElement.prototype.getAttributes = function() {
    this.style = window.getComputedStyle(this.el);
    this.getDimensions(this.style);
    if(this.style.backgroundImage !== 'none') {
      this.getBackgroundAttributes(this.style);
    }
  };

  PositionableElement.prototype.getDimensions = function(style) {
    var left   = this.el.offsetLeft;
    var top    = this.el.offsetTop;
    var width  = this.getDimension(style.width);
    var height = this.getDimension(style.height);
    this.position = new Point(left, top);
    this.dimensions = new Rectangle(
      top,
      left + width,
      top + height,
      left,
      this.getRotation(style)
    );
    this.zIndex = parseInt(style.zIndex);
  };

  PositionableElement.prototype.getDimension = function(val) {
    val = parseFloat(val);
    return isNaN(val) ? 0 : val;
  };

  PositionableElement.prototype.getRotation = function(style) {
    var matrix, match, a, b;
    matrix = style.webkitTransform || style.transform;
    match  = matrix.match(/[-.\d]+/g);
    if(match) {
      a = parseFloat(match[0]);
      b = parseFloat(match[1]);
      return new Point(a, b).getAngle();
    }
    return 0;
  };

  PositionableElement.prototype.getBackgroundAttributes = function(style) {
    var match;

    // Get background recognizer
    match = style.backgroundImage.match(PositionableElement.BACKGROUND_IMAGE_MATCH);
    this.recognizer = new SpriteRecognizer(match[1]);

    // Get background position
    match = style.backgroundPosition.match(PositionableElement.BACKGROUND_POSITION_MATCH);
    if(match) {
      this.backgroundPosition = new Point(parseInt(match[1]), parseInt(match[3]));
    } else {
      this.backgroundPosition = new Point(0, 0);
    }
  };

  PositionableElement.prototype.createHandles = function() {
    this.rotate = new RotationHandle(this);
    this.createSizingHandles();
  };

  PositionableElement.prototype.createSizingHandles = function() {
    this.nw = new SizingHandle(this, 'nw', 'left',  'top');
    this.ne = new SizingHandle(this, 'ne', 'right', 'top');
    this.se = new SizingHandle(this, 'se', 'right', 'bottom');
    this.sw = new SizingHandle(this, 'sw', 'left',  'bottom');
    this.n  = new SizingHandle(this, 'n', null,  'top');
    this.e  = new SizingHandle(this, 'e', 'right', null);
    this.s  = new SizingHandle(this, 's', null,  'bottom');
    this.w  = new SizingHandle(this, 'w', 'left', null);
    this.nw.setAnchor(this.se);
    this.ne.setAnchor(this.sw);
    this.se.setAnchor(this.nw);
    this.sw.setAnchor(this.ne);
    this.n.setAnchor(this.sw);
    this.e.setAnchor(this.nw);
    this.s.setAnchor(this.nw);
    this.w.setAnchor(this.ne);
  };



  // --- Events

  PositionableElement.prototype.mouseDown = function(evt) {
    DraggableElement.prototype.mouseDown.call(this, evt);
  };

  PositionableElement.prototype.mouseUp = function(evt) {
    if(!this.draggingStarted && evt.shiftKey) {
      elementManager.addFocused(this);
    } else if(!this.draggingStarted) {
      elementManager.setFocused(this, true);
    }
    DraggableElement.prototype.mouseUp.call(this, evt);
  };

  PositionableElement.prototype.mouseover = function(evt) {
    statusBar.setState('position');
  };

  PositionableElement.prototype.dblclick = function(evt) {
    if(!this.backgroundPosition) return;
    var point  = new Point(evt.clientX + window.scrollX, evt.clientY + window.scrollY);
    var coords = this.getElementCoordsForPoint(point).subtract(this.backgroundPosition);
    var style = window.getComputedStyle(this.el);
    var sprite = this.recognizer.getSpriteBoundsForCoordinate(coords);
    if(sprite) {
      this.pushState();
      this.setBackgroundPosition(new Point(-sprite.left, -sprite.top));
      this.dimensions.right  = this.dimensions.left + sprite.getWidth();
      this.dimensions.bottom = this.dimensions.top  + sprite.getHeight();
      this.render();
      statusBar.update();
    }
  };

  PositionableElement.prototype.contextmenu = function(evt) {
    if(evt.ctrlKey) {
      this.handleCtrlDoubleClick(evt);
      evt.preventDefault();
    }
  };

  PositionableElement.prototype.handleCtrlDoubleClick = function(evt) {
    if(this.dblClickTimer) {
      this.dblclick(evt)
    }
    this.dblClickTimer = setTimeout(function() {
      this.dblClickTimer = null;
    }.bind(this), PositionableElement.DBLCLICK_TIMEOUT);
  };

  PositionableElement.prototype.isBackgroundDrag = function(evt) {
    return evt.ctrlKey;
  };

  PositionableElement.prototype.focus = function() {
    this.addClass('positioned-element-focused');
    this.positionedParents.forEach(function(el) {
      el.addClass('positioned-parent-focused');
    });
  };

  PositionableElement.prototype.unfocus = function() {
    this.removeClass('positioned-element-focused');
    this.positionedParents.forEach(function(el) {
      el.removeClass('positioned-parent-focused');
    });
  };



  // --- Dragging

  PositionableElement.prototype.dragStart = function(evt) {
    elementManager.setFocused(this);
    elementManager.pushState();
  };

  PositionableElement.prototype.drag = function(evt) {
    if(this.isBackgroundDrag(evt)) {
      elementManager.backgroundDrag(evt);
    } else {
      elementManager.positionDrag(evt);
    }
  };

  PositionableElement.prototype.isConstrained = function(evt) {
    return evt.shiftKey;
  };


  // --- Resizing

  PositionableElement.prototype.resizeStart = function(handleType) {
    var handle = this[handleType];
    handle.anchor.startPosition = handle.anchor.getPosition();
  };

  PositionableElement.prototype.resize = function(vector, handleType, constrained) {
    var dimensions = this.getLastState().dimensions.clone(), min;
    var lastAspectRatio = dimensions.getAspectRatio();
    var handle = this[handleType];
    if(this.dimensions.rotation) {
      vector = vector.rotate(-this.dimensions.rotation);
    }
    dimensions.add(handle.xProp, vector.x);
    dimensions.add(handle.yProp, vector.y);
    if(constrained) {
      handle.applyConstraint(dimensions, lastAspectRatio);
    }
    this.dimensions = dimensions;

    if(this.dimensions.rotation) {
      this.position = this.getPositionFromRotatedHandle(handle.anchor);
    } else {
      this.position = new Point(this.dimensions.left, this.dimensions.top);
    }

    this.render();
    statusBar.update();
  };

  PositionableElement.prototype.toggleSizingHandles = function(on) {
    if(on) {
      this.removeClass('resize-handles-hidden');
    } else {
      this.addClass('resize-handles-hidden');
    }
  };


  // --- Rotation

  PositionableElement.prototype.setRotation = function(deg) {
    this.dimensions.rotation = this.getLastRotation() + deg;
    this.updateRotation();
  };

  PositionableElement.prototype.getLastRotation = function() {
    return this.getLastState().dimensions.rotation || 0;
  };


  // --- Position

  PositionableElement.prototype.backgroundDrag = function(evt) {
    var last = this.getLastState().backgroundPosition, rotation = this.dimensions.rotation, offset;
    if(!last) return;
    if(rotation) last = last.rotate(rotation);
    offset = this.applyPositionDrag(evt, last);
    if(rotation) offset = offset.rotate(-rotation);
    this.setBackgroundPosition(offset);
  };

  PositionableElement.prototype.positionDrag = function(evt) {
    this.setPosition(this.applyPositionDrag(evt, this.getLastState().position));
    statusBar.update();
  };

  PositionableElement.prototype.applyPositionDrag = function(evt, point) {
    var delta  = evt.dragOffset, offset = point.add(delta), absX, absY;
    if(this.isConstrained(evt)) {
      absX = Math.abs(delta.x);
      absY = Math.abs(delta.y);
      if(absX < absY) {
        offset.x = point.x;
      } else {
        offset.y = point.y;
      }
    }
    return offset;
  };


  // --- History & State

  PositionableElement.prototype.pushState = function() {
    this.states.push({
      position: this.position.clone(),
      dimensions: this.dimensions.clone(),
      backgroundPosition: this.backgroundPosition ? this.backgroundPosition.clone() : null
    });
  };

  PositionableElement.prototype.getLastState = function() {
    return this.states[this.states.length - 1];
  };

  PositionableElement.prototype.undo = function() {
    var state = this.states.pop();
    if(!state) return;
    this.position = state.position;
    this.dimensions = state.dimensions;
    this.backgroundPosition = state.backgroundPosition;
    this.render();
  };



  // --- Peeking

  PositionableElement.prototype.peek = function(on) {
    if(on && this.backgroundPosition) {
      this.el.style.width  = PositionableElement.PEEKING_DIMENSIONS + 'px';
      this.el.style.height = PositionableElement.PEEKING_DIMENSIONS + 'px';
    } else {
      this.updateSize();
    }
  };



  // --- Scrolling

  PositionableElement.prototype.checkScrollBounds = function() {
    var dim = this.getAbsoluteDimensions(), boundary;
    if(dim.top < window.scrollY) {
      window.scrollTo(window.scrollX, dim.top);
    }
    if(dim.left < window.scrollX) {
      window.scrollTo(dim.left, window.scrollY);
    }
    boundary = window.scrollX + window.innerWidth;
    if(dim.right > boundary) {
      window.scrollTo(window.scrollX + (dim.right - boundary), window.scrollY);
    }
    boundary = window.scrollY + window.innerHeight;
    if(dim.bottom > boundary) {
      window.scrollTo(window.scrollX, window.scrollY + (dim.bottom - boundary));
    }
  };




  // --- Transform

  PositionableElement.prototype.setBackgroundPosition = function(point) {
    this.backgroundPosition = point;
    this.updateBackgroundPosition();
  };

  PositionableElement.prototype.setPosition = function(point) {
    this.position = point;
    this.dimensions.setPosition(point);
    this.updatePosition();
  };

  PositionableElement.prototype.moveBackgroundPosition = function(vector) {
    if(!this.backgroundPosition) return;
    if(this.dimensions.rotation) {
      vector = vector.rotate(-this.dimensions.rotation);
    }
    this.setBackgroundPosition(this.backgroundPosition.add(vector));
  };

  PositionableElement.prototype.movePosition = function(vector) {
    this.setPosition(this.position.add(vector));
    this.checkScrollBounds();
  };

  PositionableElement.prototype.moveZIndex = function(vector) {
    // Positive Y is actually down, so decrement here.
    if(vector.x > 0 || vector.y < 0) {
      this.zIndex++;
    } else if(vector.x < 0 || vector.y > 0) {
      this.zIndex--;
    }
    this.updateZIndex();
  };

  // --- Rendering

  PositionableElement.prototype.render = function() {
    this.updatePosition();
    this.updateSize();
    this.updateRotation();
    this.updateBackgroundPosition();
    this.updateZIndex();
  };

  PositionableElement.prototype.updatePosition = function() {
    this.el.style.left = this.position.x + 'px';
    this.el.style.top  = this.position.y + 'px';
  };

  PositionableElement.prototype.updateSize = function(size) {
    this.el.style.width  = this.dimensions.getWidth() + 'px';
    this.el.style.height = this.dimensions.getHeight() + 'px';
  };

  PositionableElement.prototype.updateRotation = function() {
    var r = this.dimensions.rotation;
    var style = 'rotateZ('+ r +'deg)';
    this.el.style.webkitTransform = style;
    this.el.style.transform = style;
  };

  PositionableElement.prototype.updateBackgroundPosition = function() {
    if(!this.backgroundPosition) return;
    var css = this.backgroundPosition.x + 'px ' + this.backgroundPosition.y + 'px'
    this.el.style.backgroundPosition = css;
  };

  PositionableElement.prototype.updateZIndex = function() {
    this.el.style.zIndex = this.zIndex;
  };



  // --- Calculations

  PositionableElement.prototype.getElementCoordsForPoint = function(point) {
    // Gets the coordinates relative to the element's
    // x/y internal coordinate system, which may be rotated.
    var dim = this.getAbsoluteDimensions();
    var corner = new Point(dim.left, dim.top);
    if(this.dimensions.rotation) {
      corner = this.dimensions.getPositionForCoords(corner).add(this.getPositionOffset());
      return point.subtract(corner).rotate(-this.dimensions.rotation);
    } else {
      return point.subtract(corner);
    }
  };

  PositionableElement.prototype.getPositionOffset = function() {
    // The offset between the element's position and it's actual
    // rectangle's left/top coordinates, which can sometimes differ.
    return this.position.subtract(new Point(this.dimensions.left, this.dimensions.top));
  };

  PositionableElement.prototype.getPositionFromRotatedHandle = function(anchor) {
    var offsetX  = this.dimensions.getWidth() / 2;
    var offsetY  = this.dimensions.getHeight() / 2;
    var toCenter = anchor.offsetToCenter(offsetX, offsetY).rotate(this.dimensions.rotation);
    var toCorner = new Point(-offsetX, -offsetY);
    return anchor.startPosition.add(toCenter).add(toCorner);
  };

  PositionableElement.prototype.getHandleForSide = function(side) {
    var offset;
    switch(side) {
      case 'top':    offset = 0; break;
      case 'right':  offset = 1; break;
      case 'bottom': offset = 2; break;
      case 'left':   offset = 3; break;
    }
    return [this.nw, this.ne, this.se, this.sw][(this.rotation / 90 | 0) + offset];
  };

  PositionableElement.prototype.getCenter = function() {
    return this.dimensions.getCenter();
  };

  PositionableElement.prototype.getAbsoluteCenter = function() {
    return this.getAbsoluteDimensions().getCenter();
  };

  PositionableElement.prototype.getAbsoluteDimensions = function() {
    var el = this.el;
    var dim = this.dimensions.clone();
    while(el = el.offsetParent) {
      dim.top += el.offsetTop;
      dim.left += el.offsetLeft;
    }
    dim.bottom += dim.top - this.dimensions.top;
    dim.right += dim.left - this.dimensions.left;
    return dim;
  };

  PositionableElement.prototype.getEdgeValue = function(side) {
    var handle = this.getHandleForSide(side);
    return handle.getPosition()[this.getAxisForSide(side)];
  };

  PositionableElement.prototype.getCenterAlignValue = function(type) {
    var center = this.getCenter();
    return type === 'vertical' ? center.x : center.y;
  };

  PositionableElement.prototype.alignToSide = function(side, val) {
    // TODO ... can this be cleaned up? Do we really need "startPosition"?
    var axis   = this.getAxisForSide(side);
    var handle = this.getHandleForSide(side);
    var handlePosition = handle.getPosition();
    handlePosition[axis] = val;
    handle.startPosition = handlePosition;
    this.setPosition(this.getPositionFromRotatedHandle(handle));
    this.render();
  };

  PositionableElement.prototype.alignToCenter = function(line, val) {
    var axis = line === 'vertical' ? 'x' : 'y';
    var center = this.getCenter().clone();
    var offsetX  = this.dimensions.getWidth() / 2;
    var offsetY  = this.dimensions.getHeight() / 2;
    var toCorner = new Point(-offsetX, -offsetY);
    center[axis] = val;
    this.setPosition(center.add(toCorner));
  };

  PositionableElement.prototype.getAxisForSide = function(side) {
    return side === 'top' || side === 'bottom' ? 'y' : 'x';
  };


  // --- Output

  PositionableElement.prototype.getSelector = function() {
    var type = settings.get(Settings.SELECTOR), classes;
    if(type === Settings.SELECTOR_AUTO) {
      type = this.el.id ? Settings.SELECTOR_ID : Settings.SELECTOR_FIRST;
    }
    switch(type) {
      case Settings.SELECTOR_ID:      return '#' + this.el.id;
      case Settings.SELECTOR_ALL:     return this.getAllClasses(this.el.classList);
      case Settings.SELECTOR_TAG:     return this.getTagName(this.el);
      case Settings.SELECTOR_FIRST:   return this.getFirstClass(this.el.classList);
      case Settings.SELECTOR_LONGEST: return this.getLongestClass(this.el.classList);
      case Settings.SELECTOR_INLINE:  return '';
    }
  };

  PositionableElement.prototype.getAllClasses = function(list) {
    return '.' + this.getFilteredClasses(list).join('.');
  };

  PositionableElement.prototype.getFirstClass = function(list) {
    var first = this.getFilteredClasses(list)[0];
    return first ? '.' + first : '[undefined element]';
  };

  PositionableElement.prototype.getTagName = function(el) {
    return el.tagName.toLowerCase();
  };

  PositionableElement.prototype.getLongestClass = function(list) {
    return '.' + this.getFilteredClasses(list).reduce(function(a, b) {
      return a.length > b.length ? a : b;
    });
  };

  PositionableElement.prototype.getFilteredClasses = function(list) {
    var filtered = [], i = 0;
    while(name = list[i++]) {
      if(!name.match(EXTENSION_CLASS_PREFIX)) {
        filtered.push(name);
      }
    }
    return filtered;
  };

  PositionableElement.prototype.getStyles = function() {
    var css = '';
    var selector = this.getSelector();
    var openingBrace = selector ? ' {\n' : '';
    var closingBrace = selector ? '}\n' : '';
    this.tabCharacter = this.getTabCharacter(settings.get(Settings.TABS));
    css += this.getSelector() + openingBrace;
    if(this.isPositioned()) {
      if(this.zIndex !== 0) {
        css += this.getNewStyleLine('z-index', this.zIndex);
      }
      css += this.getNewStyleLine('left', this.position.x);
      css += this.getNewStyleLine('top', this.position.y);
    }
    css += this.getNewStyleLine('width', this.dimensions.getWidth());
    css += this.getNewStyleLine('height', this.dimensions.getHeight());
    if(this.backgroundPosition) {
      css += this.getNewStyleLine('background-position', this.backgroundPosition.x, this.backgroundPosition.y);
    }
    if(this.dimensions.rotation) {
      css += this.getRotationStyles();
    }
    css += closingBrace;
    if (!selector) {
      css = css.replace(/\s/gm, '');
    }
    return css;
  };

  PositionableElement.prototype.getNewStyleLine = function(prop, val1, val2) {
    var isPx, css = '';
    if(prop === 'left' ||
       prop === 'top' ||
       prop === 'width' ||
       prop === 'height' ||
       prop === 'background-position') {
      isPx = true;
      val1 = Math.round(val1);
    }
    css = this.tabCharacter + prop + ': ' + val1;
    if(isPx) {
      css += 'px';
    }
    if(val2 !== undefined) {
      if(isPx) val2 = Math.round(val2);
      css += ' ' + val2;
      if(isPx) css += 'px';
    }
    css += ';\n'
    return css;
  };

  PositionableElement.prototype.getRotationStyles = function() {
    var css = '', deg = this.getRoundedRotation();
    css += this.getNewStyleLine('-ms-transform', 'rotateZ(' + deg + 'deg)');
    css += this.getNewStyleLine('-webkit-transform', 'rotateZ(' + deg + 'deg)');
    css += this.getNewStyleLine('transform', 'rotateZ(' + deg + 'deg)');
    return css;
  };

  PositionableElement.prototype.getTabCharacter = function(name) {
    switch(name) {
      case Settings.TABS_TWO_SPACES:  return '  ';
      case Settings.TABS_FOUR_SPACES: return '    ';
      case Settings.TABS_TAB:         return '\u0009';
    }
  };

  PositionableElement.prototype.getRoundedRotation = function() {
    var r = this.dimensions.rotation;
    if(r % 1 !== 0.5) {
      r = Math.round(r);
    }
    if(r === 360) r = 0;
    return r;
  };

  PositionableElement.prototype.isPositioned = function() {
    return this.style.position !== 'static';
  };

  PositionableElement.prototype.getData = function() {
    var text = '', rotation = this.getRoundedRotation();
    text += Math.round(this.position.x) + 'px, ' + Math.round(this.position.y) + 'px';
    if(this.zIndex !== 0) {
      text += ', ' + this.zIndex + 'z';
    }
    text += ' | ';
    text += Math.round(this.dimensions.getWidth()) + 'w, ' + Math.round(this.dimensions.getHeight()) + 'h';
    if(rotation) {
      text += ' | ';
      text += rotation + 'deg';
    }
    return text;
  };


  /*-------------------------] PositionableElementManager [--------------------------*/



  function PositionableElementManager () {

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
    this.delegateToFocused('movePosition');
    this.delegateToFocused('moveBackgroundPosition');
    this.delegateToFocused('moveZIndex');

    // Resizing
    this.delegateToFocused('resize');
    this.delegateToFocused('resizeStart');

    // Rotation
    this.delegateToFocused('setRotation');

  };

  // --- Setup

  PositionableElementManager.prototype.startBuild = function() {
    loadingAnimation.show(this.build.bind(this));
  };

  PositionableElementManager.prototype.build = function(fn) {
    this.elements = [];

    this.includeSelector = settings.get(Settings.INCLUDE_ELEMENTS);
    this.excludeSelector = settings.get(Settings.EXCLUDE_ELEMENTS);

    var els = document.body.querySelectorAll(this.includeSelector || '*');

    for(var i = 0, el; el = els[i]; i++) {
      if(this.elementIsIncluded(el)) {
        try {
          this.elements.push(new PositionableElement(el));
        } catch(e) {
          // Errors can often be thrown here due to cross-origin restrictions.
        }
      }
    }
    loadingAnimation.hide(this.finishBuild.bind(this));
  };

  PositionableElementManager.prototype.finishBuild = function() {
    statusBar.activate();
    this.active = true;
  };

  PositionableElementManager.prototype.refresh = function() {
    this.destroyElements();
    this.startBuild();
  };

  PositionableElementManager.prototype.destroyElements = function() {
    this.elements.forEach(function(e) {
      e.destroy();
    }, this);
  };

  PositionableElementManager.prototype.toggleActive = function() {
    if(this.active) {
      this.destroyElements();
      statusBar.deactivate();
      this.active = false;
    } else {
      this.startBuild();
    }
  };

  PositionableElementManager.prototype.elementIsIncluded = function(el) {
    if(this.excludeSelector && el.webkitMatchesSelector(this.excludeSelector)) {
      // Don't include elements that are explicitly excluded.
      return false;
    } else if(el.className.match(EXTENSION_CLASS_PREFIX)) {
      // Don't include elements that are part of the extension itself.
      return false;
    } else if(el.style.background.match(/positionable-extension/)) {
      // Don't include elements that are part of other chrome extensions.
      return false;
    } else if(this.includeSelector) {
      // If there is an explicit selector active, then always include.
      return true;
    }
    // Otherwise only include absolute or fixed position elements.
    var style = window.getComputedStyle(el);
    return style.position === 'absolute' || style.position === 'fixed';
  };

  PositionableElementManager.prototype.delegateToFocused = function(name, disallowWhenDragging) {
    this[name] = function() {
      if(disallowWhenDragging && this.draggingElement) return;
      this.callOnEveryFocused(name, arguments);
    }.bind(this);
  };

  PositionableElementManager.prototype.delegateToDragging = function(name, alternate) {
    this[name] = function() {
      if(this.draggingElement && this.draggingElement[name]) {
        this.draggingElement[name].apply(this.draggingElement, arguments);
      } else if(alternate) {
        alternate[name].apply(alternate, arguments);
      }
    }.bind(this);
  };

  // --- Actions

  PositionableElementManager.prototype.setFocused = function(element, force) {
    var elements;
    if(typeof element === 'function') {
      elements = this.elements.filter(element);
    } else if(force || !this.elementIsFocused(element)) {
      elements = [element];
    }
    if(elements) {
      this.unfocusAll();
      elements.forEach(this.addFocused, this);
    }
    statusBar.update();
  };

  PositionableElementManager.prototype.addFocused = function(element) {
    if(!this.elementIsFocused(element)) {
      element.focus();
      this.focusedElements.push(element);
    }
    statusBar.update();
  };

  PositionableElementManager.prototype.unfocusAll = function() {
    this.focusedElements.forEach(function(el) {
      el.unfocus();
    }, this);
    this.focusedElements = [];
  };

  PositionableElementManager.prototype.focusAll = function() {
    this.elements.forEach(function(el) {
      this.addFocused(el);
    }, this);
  };

  PositionableElementManager.prototype.callOnEveryFocused = function(name, args) {
    var el, i, len;
    for(i = 0, len = this.focusedElements.length; i < len; i++) {
      el = this.focusedElements[i];
      el[name].apply(el, args);
    }
  };

  PositionableElementManager.prototype.alignFocused = function(line, distribute) {
    var elementsLines, alignmentLine, opposingLine, distributedOffset, isCenter, isMax;

    isCenter = line === 'vertical' || line === 'horizontal';
    isMax    = line === 'right' || line === 'bottom';

    elementsLines = this.getElementsLines(line, isCenter);

    alignmentLine = elementsLines[0].line;
    opposingLine  = elementsLines[elementsLines.length - 1].line;

    if(isMax && !distribute) {
      // If the line is on the bottom or right, then we actually need to get the opposing line.
      alignmentLine = opposingLine;
    }

    if(distribute) {

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
      if(distribute) {
        value += (distributedOffset * i);
      }
      if(isCenter) {
        e.el.alignToCenter(line, value);
      } else {
        e.el.alignToSide(line, value);
      }
    }, this);
  };

  PositionableElementManager.prototype.alignMiddle = function(line) {
    var minLines, maxLines;
    if(line === 'vertical') {
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
  };

  PositionableElementManager.prototype.getElementsLines = function(line, center) {
    // Get the elements alongside their associated "line" values,
    // which may be an edge or in the center.
    var elementsLines = this.focusedElements.map(function(el) {
      var obj = { el: el };
      obj.line = center ? el.getCenterAlignValue(line) : el.getEdgeValue(line);
      return obj;
    });
    // Need to sort the elements here by their edges,
    // otherwise the order of focusing will take precedence.
    elementsLines.sort(function(a, b) {
      return a.line - b.line;
    });

    return elementsLines;
  };



  // --- Calculations

  PositionableElementManager.prototype.elementIsFocused = function(element) {
    return this.focusedElements.some(function(e) {
      return e === element;
    });
  };

  PositionableElementManager.prototype.getFocusedSize = function() {
    return this.focusedElements.length;
  };

  PositionableElementManager.prototype.getAllFocused = function() {
    return this.focusedElements;
  };

  PositionableElementManager.prototype.getFirstFocused = function() {
    return this.focusedElements[0];
  };

  PositionableElementManager.prototype.temporarilyFocusDraggingElement = function() {
    if(!this.draggingElement) return;
    this.previouslyFocusedElements = this.focusedElements;
    this.focusedElements = [this.getDraggingElement()];
  };

  PositionableElementManager.prototype.releasedFocusedDraggingElement = function() {
    if(!this.previouslyFocusedElements) return;
    this.dragReset();
    this.focusedElements = this.previouslyFocusedElements;
    this.previouslyFocusedElements = null;
  };

  PositionableElementManager.prototype.getDraggingElement = function() {
    // Currently dragging element may be a handle.
    var el = this.draggingElement;
    return el.target || el;
  };

  // --- Output

  PositionableElementManager.prototype.getAllElementStyles = function() {
    var styles = this.elements.map(function(el) {
      return el.getStyles();
    });
    return styles.join('\n\n');
  };

  PositionableElementManager.prototype.getFocusedElementStyles = function() {
    var styles = this.focusedElements.map(function(el) {
      return el.getStyles();
    });
    return styles.join('\n\n');
  };

  PositionableElementManager.prototype.copy = function(evt) {
    var styles = this.getFocusedElementStyles();
    if(!styles) return;
    evt.preventDefault();
    evt.clipboardData.clearData();
    evt.clipboardData.setData('text/plain', styles);
    copyAnimation.animate();
  };

  PositionableElementManager.prototype.save = function(evt) {
    var styles = this.getAllElementStyles();
    if(!styles) return;
    var link = document.createElement('a');
    link.href = 'data:text/css;base64,' + btoa(styles);
    link.download = settings.get(Settings.DOWNLOAD_FILENAME);
    link.click();
  };


  /*-------------------------] StatusBar [--------------------------*/


  function DragSelection () {
    this.build();
    this.setupDragging();
    this.dimensions = new Rectangle();
  };


  DragSelection.prototype = new DraggableElement;

  DragSelection.prototype.build = function() {
    this.box = new Element(document.body, 'div', 'drag-selection');
    this.boxTop = new Element(this.box.el, 'div', 'drag-selection-border drag-selection-top');
    this.boxBottom = new Element(this.box.el, 'div', 'drag-selection-border drag-selection-bottom');
    this.boxLeft = new Element(this.box.el, 'div', 'drag-selection-border drag-selection-left');
    this.boxRight = new Element(this.box.el, 'div', 'drag-selection-border drag-selection-right');
    this.el = this.box.el;
  };

  // --- Events

  DragSelection.prototype.dragStart = function(evt) {
    this.from = new Point(evt.clientX, evt.clientY);
    this.to   = this.from;
    this.box.addClass('drag-selection-active');
    this.render();
  };

  DragSelection.prototype.drag = function(evt) {
    this.to = new Point(evt.clientX, evt.clientY);
    this.render();
  };

  DragSelection.prototype.mouseUp = function(evt) {
    this.box.removeClass('drag-selection-active');
    this.getFocused();
    DraggableElement.prototype.mouseUp.call(this, evt);
    this.min = this.max = null;
  };


  DragSelection.prototype.mouseMove = function(evt) {
    if(elementManager.draggingElement !== this) return;
    DraggableElement.prototype.mouseMove.call(this, evt);
  };

  // --- Actions

  DragSelection.prototype.getFocused = function() {
    elementManager.setFocused(function(el) {
      return this.contains(el.getAbsoluteCenter());
    }.bind(this));
  };

  // --- Calculation


  DragSelection.prototype.calculateBox = function() {
    this.min = new Point(Math.min(this.from.x, this.to.x) + window.scrollX, Math.min(this.from.y, this.to.y) + window.scrollY);
    this.max = new Point(Math.max(this.from.x, this.to.x) + window.scrollX, Math.max(this.from.y, this.to.y) + window.scrollY);
  };

  DragSelection.prototype.contains = function(point) {
    if(!this.min || !this.max) {
      return false;
    }
    return point.x >= this.min.x && point.x <= this.max.x && point.y >= this.min.y && point.y <= this.max.y;
  };

  // --- Rendering

  DragSelection.prototype.render = function() {
    this.calculateBox();
    var xMin = this.min.x - window.scrollX;
    var yMin = this.min.y - window.scrollY;
    var xMax = this.max.x - window.scrollX;
    var yMax = this.max.y - window.scrollY;
    this.el.style.left   = xMin + 'px';
    this.el.style.top    = yMin + 'px';
    this.el.style.right  = (window.innerWidth - xMax) + 'px';
    this.el.style.bottom = (window.innerHeight - yMax) + 'px';
  };



  /*-------------------------] StatusBar [--------------------------*/



  function StatusBar () {
    this.build();
    this.setupDragging();
    this.getPosition();
  };

  // --- Constants

  StatusBar.FADE_DELAY = 200;

  StatusBar.POSITION_ICON  = '&#xe001;';
  StatusBar.RESIZE_ICON    = '&#xe002;';
  StatusBar.ROTATE_ICON    = '&#xe004;';
  StatusBar.RESIZE_NW_ICON = '&#xe005;';
  StatusBar.RESIZE_SE_ICON = '&#xe006;';
  StatusBar.SETTINGS_ICON  = '&#xf013;';
  StatusBar.BG_IMAGE_ICON  = '&#xe00b;';
  StatusBar.Z_INDEX_ICON   = '&#xe096;';
  StatusBar.MOUSE_ICON     = '&#xe013;';
  StatusBar.KEYBOARD_ICON  = '&#xe012;';
  StatusBar.POINTER_ICON   = '&#xe014;';
  StatusBar.DOWNLOAD_ICON  = '&#xe015;';

  StatusBar.ALIGN_TOP_ICON        = '&#xe018;';
  StatusBar.ALIGN_HORIZONTAL_ICON = '&#xe016;';
  StatusBar.ALIGN_BOTTOM_ICON     = '&#xe01a;';
  StatusBar.ALIGN_LEFT_ICON       = '&#xe019;';
  StatusBar.ALIGN_VERTICAL_ICON   = '&#xe011;';
  StatusBar.ALIGN_RIGHT_ICON      = '&#xe017;';

  StatusBar.DISTRIBUTE_TOP_ICON        = '&#xe00c;';
  StatusBar.DISTRIBUTE_HORIZONTAL_ICON = '&#xe000;';
  StatusBar.DISTRIBUTE_BOTTOM_ICON     = '&#xe00f;';
  StatusBar.DISTRIBUTE_LEFT_ICON       = '&#xe00e;';
  StatusBar.DISTRIBUTE_VERTICAL_ICON   = '&#xe003;';
  StatusBar.DISTRIBUTE_RIGHT_ICON      = '&#xe010;';

  StatusBar.LEFT_ARROW_ICON       = '&#xe00d;';
  StatusBar.UP_LEFT_ARROW_ICON    = '&#xe008;';
  StatusBar.UP_RIGHT_ARROW_ICON   = '&#xe007;';
  StatusBar.DOWN_RIGHT_ARROW_ICON = '&#xe009;';
  StatusBar.DOWN_LEFT_ARROW_ICON  = '&#xe00a;';

  StatusBar.SHIFT   = '\u21e7';
  StatusBar.CTRL    = '\u2303';
  StatusBar.OPTION  = '\u2325';
  StatusBar.COMMAND = '\u2318';

  // --- Inheritance

  StatusBar.prototype = new DraggableElement;

  // --- Setup

  StatusBar.prototype.build = function() {
    this.el = new Element(document.body, 'div', 'status-bar').el;
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
  };

  StatusBar.prototype.buildButton = function(icon, area) {
    var button = new Element(this.el, 'div', 'icon ' + area.name +'-button').html(icon);
    button.addEventListener('click', this.toggleArea.bind(this, area));
  };

  StatusBar.prototype.buildArea = function(upper) {
    var camel = upper.slice(0, 1).toLowerCase() + upper.slice(1);
    var lower = upper.toLowerCase();
    var area = new Element(this.el, 'div', 'area '+ lower +'-area');
    area.name = lower;
    this[camel + 'Area'] = area;
    this.areas.push(area);
    this['build' + upper + 'Area'](area);
  };

  StatusBar.prototype.buildStartArea = function(area) {
    this.buildStartBlock('mouse', function(block) {
      new Element(block.el, 'div', 'icon start-icon').html(StatusBar.MOUSE_ICON);
      new Element(block.el, 'div', 'start-help-text').html('Use the mouse to drag, resize, and rotate elements.');
    });

    this.buildStartBlock('keyboard', function(block) {
      var bKey = this.buildInlineKeyIcon('b');
      var sKey = this.buildInlineKeyIcon('s');
      var mKey = this.buildInlineKeyIcon('m');
      var text = 'Arrow keys nudge elements.<br>'+ bKey + sKey + mKey +' change nudge modes.';

      new Element(block.el, 'div', 'icon start-icon').html(StatusBar.KEYBOARD_ICON);
      new Element(block.el, 'div', 'start-help-text').html(text);

    });

    this.buildStartBlock('sprites', function(block) {
      new Element(block.el, 'div', 'icon start-icon').html(StatusBar.BG_IMAGE_ICON);
      new Element(block.el, 'div', 'icon start-pointer-icon').html(StatusBar.POINTER_ICON);
      new Element(block.el, 'div', 'start-help-text').html('Double click on a background image to fit sprite dimensions.');
    });

    this.buildStartBlock('output', function(block) {

      var cmdKey = this.buildInlineKeyIcon(this.getCommandKey());
      var cKey = this.buildInlineKeyIcon('c');
      var sKey = this.buildInlineKeyIcon('s');
      var text = cmdKey + cKey + ' Copy styles to clipboard<br>' + cmdKey + sKey +' Save styles to disk';

      new Element(block.el, 'div', 'icon start-icon').html(StatusBar.DOWNLOAD_ICON);
      new Element(block.el, 'div', 'start-help-text start-help-text-left').html(text);
    });

    new Element(this.startArea.el, 'div', 'icon start-horizontal-line');
    new Element(this.startArea.el, 'div', 'icon start-vertical-line');

    var hide = new Element(this.startArea.el, 'span', 'start-hide-link').html("Don't Show");
    hide.addEventListener('click', this.skipStartArea.bind(this));
  };

  StatusBar.prototype.buildStartBlock = function(type, fn) {
    var block = new Element(this.startArea.el, 'div', 'start-help');
    fn.call(this, block);
  };

  StatusBar.prototype.buildInlineKeyIcon = function(key) {
    var classes = ['', 'icon', 'key-icon', 'letter-key-icon', 'inline-key-icon'];
    return '<span class="' + classes.join(' ' + EXTENSION_CLASS_PREFIX) + '">'+ key +'</span>';
  };

  StatusBar.prototype.buildQuickStartArea = function(area) {
    new Element(area.el, 'div', 'icon quickstart-icon').html(StatusBar.POINTER_ICON);
    new Element(area.el, 'div', 'quickstart-text').html('Select Element');
  };

  StatusBar.prototype.buildHelpArea = function(area) {


    // Keyboard help area

    var keyboardHelp = this.buildHelpBlock('keys', 'Keyboard');

    this.buildHelpBox(keyboardHelp.el, 'arrow', function(box, text) {
      new Element(box.el, 'div', 'icon key-icon arrow-key-icon left-key-icon').html(StatusBar.LEFT_ARROW_ICON);
      text.html('Use the arrow keys to nudge the element.');
    });

    this.buildHelpBox(keyboardHelp.el, 'shift', function(box, text) {
      new Element(box.el, 'div', 'key-icon shift-key-icon').html(StatusBar.SHIFT);
      text.html('Shift: Constrain dragging / nudge multiplier / select multiple.');
    });

    this.buildHelpBox(keyboardHelp.el, 'ctrl', function(box, text) {
      new Element(box.el, 'div', 'key-icon ctrl-key-icon').html(StatusBar.CTRL);
      text.html('Ctrl: Move the background image when dragging.');
    });

    this.buildHelpBox(keyboardHelp.el, 'alt', function(box, text) {
      new Element(box.el, 'div', 'key-icon alt-key-icon').html(StatusBar.OPTION);
      text.html('Option/Alt: Peek at the background image when dragging.');
    });

    this.buildHelpBox(keyboardHelp.el, 'cmd', function(box, text) {
      new Element(box.el, 'div', 'key-icon alt-key-icon').html(StatusBar.COMMAND);
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

    this.buildHelpBox(keyboardHelp.el, 'z', function(box, text) {
      new Element(box.el, 'div', 'key-icon alt-key-icon letter-key-icon').html('z');
      text.html('Toggle z-index nudge.');
    });


    // Mouse help area

    var mouseHelp = this.buildHelpBlock('mouse', 'Mouse');

    this.buildHelpBox(mouseHelp.el, 'position', function(box, text) {
      new Element(box.el, 'div', 'help-element');
      new Element(box.el, 'div', 'icon help-icon position-help-icon').html(StatusBar.POSITION_ICON);
      text.html('Drag the middle of the element to move it around.');
    });
    this.buildHelpBox(mouseHelp.el, 'resize', function(box, text) {
      new Element(box.el, 'div', 'help-element');
      new Element(box.el, 'div', 'icon help-icon resize-help-icon resize-nw-help-icon').html(StatusBar.UP_LEFT_ARROW_ICON);
      new Element(box.el, 'div', 'icon help-icon resize-help-icon resize-ne-help-icon').html(StatusBar.UP_RIGHT_ARROW_ICON);
      new Element(box.el, 'div', 'icon help-icon resize-help-icon resize-se-help-icon').html(StatusBar.DOWN_RIGHT_ARROW_ICON);
      new Element(box.el, 'div', 'icon help-icon resize-help-icon resize-sw-help-icon').html(StatusBar.DOWN_LEFT_ARROW_ICON);
      text.html('Drag element handles to resize.');
    });

    this.buildHelpBox(mouseHelp.el, 'rotate', function(box, text) {
      new Element(box.el, 'div', 'help-element');
      new Element(box.el, 'div', 'rotate-handle');
      text.html('Drag the rotate handle to rotate the element.');
    });

    this.buildHelpBox(mouseHelp.el, 'snapping', function(box, text) {
      new Element(box.el, 'div', 'help-element');
      new Element(box.el, 'div', 'icon help-icon snapping-help-icon').html(StatusBar.BG_IMAGE_ICON);
      new Element(box.el, 'div', 'icon help-icon snapping-nw-help-icon').html(StatusBar.UP_LEFT_ARROW_ICON);
      text.html('Double click to snap element dimensions to a background sprite.');
    });

    this.buildHelpBox(mouseHelp.el, 'aligning', function(box, text) {
      new Element(box.el, 'div', 'help-element multiple-select-help');
      new Element(box.el, 'div', 'icon help-icon aligning-pointer-icon').html(StatusBar.POINTER_ICON);
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

  };

  StatusBar.prototype.buildHelpBlock = function(name, header) {
    var block = new Element(this.helpArea.el, 'div', 'help-block '+ name +'-help-block');
    if(header) {
      new Element(block.el, 'h4', 'help-block-header').html(header);
    }
    return block;
  };

  StatusBar.prototype.buildHelpBox = function(el, name, fn) {
    var help = new Element(el, 'div', 'help ' + name + '-help');
    var box  = new Element(help.el, 'div', 'help-box ' + name + '-help-box');
    var text = new Element(help.el, 'div', 'help-text ' + name + '-help-text');
    fn.call(this, box, text);
  };

  StatusBar.prototype.buildElementArea = function(area) {

    this.singleElementArea = new Element(area.el, 'div', 'single-element-area');
    this.elementHeader     = new Element(this.singleElementArea.el, 'h3', 'single-header');
    this.elementData       = new Element(this.singleElementArea.el, 'div', 'single-data');

    this.multipleElementArea   = new Element(area.el, 'div', 'multiple-element-area');
    this.multipleElementHeader = new Element(this.multipleElementArea.el, 'h3', 'multiple-header');
    this.buildAlignActions(area);

    this.elementStates  = new Element(area.el, 'div', 'element-states');
    this.stateIcons = [];
  };

  StatusBar.prototype.buildAlignActions = function(area) {
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

  };

  StatusBar.prototype.buildElementAlign = function(type, icon, title) {
    var method = type === 'horizontal' || type === 'vertical' ? 'alignMiddle' : 'alignFocused';
    var action = new Element(this.elementActions.el, 'span', 'icon element-action element-align-' + type).html(icon);
    action.el.title = title;
    action.addEventListener('click', this.delegateElementAction(method, type));
  };

  StatusBar.prototype.buildElementDistribute = function(type, icon, title) {
    var action = new Element(this.elementActions.el, 'span', 'icon element-action element-distribute-' + type).html(icon);
    action.el.title = title;
    action.addEventListener('click', this.delegateElementAction('alignFocused', type, true));
  };

  StatusBar.prototype.buildSettingsArea = function(area) {

    new Element(this.settingsArea.el, 'h4', 'settings-header').html('Settings');

    this.buildTextField(area, Settings.DOWNLOAD_FILENAME, 'Filename when saving:', 'filename');
    this.buildTextField(area, Settings.EXCLUDE_ELEMENTS, 'Exclude elements matching:', 'CSS Selector');
    this.buildTextField(area, Settings.INCLUDE_ELEMENTS, 'Include elements matching:', 'CSS Selector');

    this.buildSelect(area, Settings.TABS, 'Tab style:', [
      [Settings.TABS_TAB, 'Tab'],
      [Settings.TABS_TWO_SPACES, 'Two Spaces'],
      [Settings.TABS_FOUR_SPACES, 'Four Spaces']
    ]);

    this.buildSelect(area, Settings.SELECTOR, 'Output:', [
      [Settings.SELECTOR_AUTO, 'Auto', 'Element id or first class will be used', '#id | .first { ... }'],
      [Settings.SELECTOR_ID, 'Id', 'Element id will be used', '#id { ... }'],
      [Settings.SELECTOR_FIRST, 'First Class', 'First class name found will be used', '.first { ... }'],
      [Settings.SELECTOR_LONGEST, 'Longest Class', 'Longest class name found will be used', '.long-class-name { ... }'],
      [Settings.SELECTOR_ALL, 'All Classes', 'All class names will be output together', '.one.two.three { ... }'],
      [Settings.SELECTOR_TAG, 'Tag', 'Only the tag name will be output', 'section { ... }'],
      [Settings.SELECTOR_INLINE, 'Inline', 'Only inline styles will be output.', 'width:200px;height:200px;...']
    ]);

    var save  = new Element(this.settingsArea.el, 'button', 'settings-save').html('Save');
    var reset = new Element(this.settingsArea.el, 'button', 'settings-reset').html('Clear All');
    var help  = new Element(this.settingsArea.el, 'help', 'settings-help-link').html('Help');

    reset.addEventListener('click', this.clearSettings.bind(this));
    save.addEventListener('click', this.saveSettings.bind(this));
    help.addEventListener('click', this.setArea.bind(this, this.helpArea));

    area.addEventListener('mousedown', this.filterClicks.bind(this));
    area.addEventListener('mouseup', this.filterClicks.bind(this));
    area.addEventListener('keydown', this.filterKeyboardInput.bind(this));
  };

  StatusBar.prototype.buildTextField = function(area, name, label, placeholder) {
    this.buildFormControl(area, name, label, function(block) {
      var input = new Element(block.el, 'input', 'setting-input setting-text-input');
      input.el.type = 'text';
      input.el.placeholder = placeholder;
      input.el.value = settings.get(name);
      this.inputs.push(input);
      return input;
    });
  };

  StatusBar.prototype.buildSelect = function(area, name, label, options) {
    var select;
    this.buildFormControl(area, name, label, function(block) {
      select = new Element(block.el, 'select', 'setting-input');
      if(options[0].length > 2) {
        // Associated descriptions exist so create the elements
        this[name + 'Description'] = new Element(block.el, 'div', 'setting-description');
        this[name + 'Example'] = new Element(block.el, 'div', 'setting-example');
      }
      options.forEach(function(o) {
        var option = new Element(select.el, 'option', 'setting-option');
        option.el.value = o[0];
        option.el.textContent = o[1];
        if(o[2]) {
          option.el.dataset.description = o[2];
          option.el.dataset.example = o[3];
        }
        if(settings.get(name) === option.el.value) {
          option.el.selected = true;
        }
      });
      return select;
    });
    this.checkLinkedDescription(select.el);
  };

  StatusBar.prototype.buildFormControl = function(area, name, label, fn) {
    var field = new Element(area.el, 'fieldset', 'setting-field');
    var label = new Element(field.el, 'label', 'setting-label').html(label);
    var block = new Element(field.el, 'div', 'setting-block');
    var input = fn.call(this, block);
    input.id('setting-' + name);
    label.el.htmlFor = input.el.id;
    input.el.dataset.name = name;
    input.addEventListener('change', this.inputChanged.bind(this));
  };

  StatusBar.prototype.createState = function(name, text, icon) {
    var state = new Element(this.elementStates.el, 'div', 'element-state ' + name + '-state');
    state.name = name;
    new Element(state.el, 'div', 'icon element-state-icon').html(icon);
    new Element(state.el, 'p', 'element-state-text').html(text);
    this.stateIcons.push(state);
  };


  // --- Util

  StatusBar.prototype.getCommandKey = function() {
    return navigator.platform.match(/Mac/) ? StatusBar.COMMAND : StatusBar.CTRL;
  };

  // --- Events

  StatusBar.prototype.inputChanged = function(evt) {
    var target = evt.target;
    settings.set(target.dataset.name, target.value);
    if(target.selectedIndex !== undefined) {
      this.checkLinkedDescription(target);
    }
  };

  StatusBar.prototype.filterClicks = function(evt) {
    evt.stopPropagation();
  };

  StatusBar.prototype.filterKeyboardInput = function(evt) {
    evt.stopPropagation();
    if(evt.keyCode === EventManager.ENTER) {
      this.saveSettings();
    }
  };

  // --- Actions

  StatusBar.prototype.setState = function(name) {
    this.stateIcons.forEach(function(i) {
      if(i.name === name) {
        i.addClass('element-active-state');
      } else {
        i.removeClass('element-active-state');
      }
    });
  };

  StatusBar.prototype.checkLinkedDescription = function(select) {
    var name = select.dataset.name;
    var option = select.options[select.selectedIndex];
    var description = this[name + 'Description'];
    var example = this[name + 'Example'];
    if(description && example) {
      description.html(option.dataset.description);
      example.html(option.dataset.example);
    }
  };

  StatusBar.prototype.setArea = function(area) {
    if(this.currentArea === area) return;
    this.areas.forEach(function(a) {
      var className = 'status-bar-' + a.name + '-active';
      if(a === area) {
        this.addClass(className);
        a.addClass('active-area');
      } else {
        this.removeClass(className);
        a.removeClass('active-area');
      }
    }, this);
    this.currentArea = area;
    if(area === this.elementArea) {
      this.defaultArea = this.elementArea;
    }
    if(area === this.settingsArea) {
      this.inputs[0].el.focus();
    } else {
      document.activeElement.blur();
    }
  };

  StatusBar.prototype.toggleArea = function(area) {
    if(this.currentArea !== area) {
      this.setArea(area);
    } else {
      this.resetArea();
    }
  };

  StatusBar.prototype.clearSettings = function() {
    if(confirm('Really clear all settings?')) {
      settings.clear();
      this.setArea(this.defaultArea);
      this.checkSelectorUpdate();
    }
  };

  StatusBar.prototype.saveSettings = function() {
    this.setArea(this.defaultArea);
    this.checkSelectorUpdate();
  };

  StatusBar.prototype.checkSelectorUpdate = function() {
    if(this.selectorsChanged()) {
      window.currentElementManager.refresh();
      settings.update(Settings.INCLUDE_ELEMENTS);
      settings.update(Settings.EXCLUDE_ELEMENTS);
    }
  };

  StatusBar.prototype.selectorsChanged = function() {
    return settings.hasChanged(Settings.INCLUDE_ELEMENTS) || settings.hasChanged(Settings.EXCLUDE_ELEMENTS);
  };

  StatusBar.prototype.resetArea = function(area) {
    this.setArea(this.defaultArea);
  };

  StatusBar.prototype.getStartArea = function() {
    if(settings.get(Settings.SHOW_QUICK_START)) {
      return this.quickStartArea;
    } else {
      return this.startArea;
    }
  };

  StatusBar.prototype.showElementArea = function() {
    this.setArea(this.elementArea);
  };

  StatusBar.prototype.skipStartArea = function() {
    settings.set(Settings.SHOW_QUICK_START, '1');
    this.defaultArea = this.getStartArea();
    this.resetArea();
  };

  StatusBar.prototype.delegateElementAction = function(action) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function () {
      elementManager[action].apply(elementManager, args);
    }
  };

  StatusBar.prototype.activate = function() {
    if(this.active) return;
    this.show();
    this.addClass('status-bar-active');
    this.active = true;
  };

  StatusBar.prototype.deactivate = function() {
    if(!this.active) return;
    this.active = false;
    this.removeClass('status-bar-active');
    setTimeout(function() {
      this.hide();
    }.bind(this), StatusBar.FADE_DELAY);
  };

  // --- Transform

  StatusBar.prototype.resetPosition = function() {
    this.position = this.defaultPostion;
    this.updatePosition();
  };

  StatusBar.prototype.setSelectorText = function(str) {
    var html;
    if (!str) {
      str = '[Inline Selector]';
      var className = EXTENSION_CLASS_PREFIX + 'inline-selector';
      html = '<span class="'+ className +'">' + str + '</span>';
    }
    this.elementHeader.html(html || str);
    this.elementHeader.el.title = str;
  };

  StatusBar.prototype.setElementData = function(str) {
    this.elementData.html(str);
  };

  StatusBar.prototype.setMultipleText = function(str) {
    this.multipleElementHeader.html(str);
  };

  StatusBar.prototype.update = function() {
    var size = elementManager.getFocusedSize();
    if(size === 0) {
      this.setArea(this.quickStartArea);
      return;
    } else if(size === 1) {
      this.setSingle(elementManager.getFirstFocused());
    } else {
      this.setMultiple(elementManager.getAllFocused());
    }
    this.setState(nudgeManager.mode);
    this.showElementArea();
  };

  StatusBar.prototype.setSingle = function(el) {
    this.setSelectorText(el.getSelector());
    this.setElementData(el.getData());
    this.singleElementArea.show();
    this.multipleElementArea.hide();
  };

  StatusBar.prototype.setMultiple = function(els) {
    this.setMultipleText(els.length + ' elements selected');
    this.singleElementArea.hide();
    this.multipleElementArea.show();
  };


  // --- Events

  StatusBar.prototype.dragStart = function(evt) {
    this.lastPosition = this.position;
  };

  StatusBar.prototype.drag = function(evt) {
    this.position = new Point(this.lastPosition.x + evt.dragOffset.x, this.lastPosition.y - evt.dragOffset.y);
    this.updatePosition();
  };

  // --- Compute

  StatusBar.prototype.getPosition = function() {
    var style = window.getComputedStyle(this.el);
    this.position = new Point(parseInt(style.left), parseInt(style.bottom));
    this.defaultPostion = this.position;
  };

  // --- Update

  StatusBar.prototype.updatePosition = function() {
    this.el.style.left   = this.position.x + 'px';
    this.el.style.bottom = this.position.y + 'px';
  };


  /*-------------------------] Settings [--------------------------*/

  function Settings () {
    this.changed  = {};
    this.defaults = {};
    this.defaults[Settings.TABS]              = Settings.TABS_TWO_SPACES;
    this.defaults[Settings.SELECTOR]          = Settings.SELECTOR_AUTO;
    this.defaults[Settings.DOWNLOAD_FILENAME] = 'styles.css';
  };

  Settings.TABS              = 'tabs';
  Settings.SELECTOR          = 'selector';
  Settings.INCLUDE_ELEMENTS  = 'include-elements';
  Settings.EXCLUDE_ELEMENTS  = 'exclude-elements';
  Settings.DOWNLOAD_FILENAME = 'download-filename';

  Settings.SELECTOR_ID      = 'id';
  Settings.SELECTOR_ALL     = 'all';
  Settings.SELECTOR_TAG     = 'tag';
  Settings.SELECTOR_AUTO    = 'auto';
  Settings.SELECTOR_FIRST   = 'first';
  Settings.SELECTOR_INLINE  = 'inline';
  Settings.SELECTOR_LONGEST = 'longest';

  Settings.TABS_TWO_SPACES  = 'two';
  Settings.TABS_FOUR_SPACES = 'four';
  Settings.TABS_TAB         = 'tab';

  Settings.prototype.get = function(name) {
    return localStorage[name] || this.defaults[name] || '';
  };

  Settings.prototype.set = function(name, value) {
    if(value !== this.get(name)) {
      this.changed[name] = true;
    }
    localStorage[name] = value;
  };

  Settings.prototype.hasChanged = function(name) {
    return !!this.changed[name];
  };

  Settings.prototype.update = function(name) {
    this.changed[name] = false;
  };

  Settings.prototype.clear = function() {
    for (key in localStorage) {
      if(localStorage[key]) {
        this.changed[key] = true;
      }
    }
    localStorage.clear();
  };


  /*-------------------------] Animation [--------------------------*/


  function Animation() {};

  Animation.prototype.defer = function(fn) {
    setTimeout(fn.bind(this), 0);
  };

  /*-------------------------] LoadingAnimation [--------------------------*/

  function LoadingAnimation () {
    this.build();
  };

  // --- Inheritance

  LoadingAnimation.prototype = new Animation();

  // --- Constants

  LoadingAnimation.VISIBLE_DELAY = 250;


  // --- Setup

  LoadingAnimation.prototype.build = function() {

    this.box   = new Element(document.body, 'div', 'loading'),
    this.shade = new Element(document.body, 'div', 'loading-shade');
    this.spin  = new Element(this.box.el, 'div', 'loading-spin');

    for(var i = 1; i <= 12; i++) {
      new Element(this.spin.el, 'div', 'loading-bar loading-bar-' + i);
    }
  };

  // --- Actions

  LoadingAnimation.prototype.show = function(fn) {
    this.box.show();
    this.shade.show();
    this.defer(function() {
      this.finished = function() {
        this.box.el.removeEventListener('webkitTransitionEnd', this.finished);
        if(fn) fn();
      }.bind(this);
      this.box.addEventListener('webkitTransitionEnd', this.finished);
      this.box.addClass('loading-active');
      this.shade.addClass('loading-shade-active');
    });
  };

  LoadingAnimation.prototype.hide = function(fn) {
    this.defer(function() {
      this.finished = function() {
        this.box.el.removeEventListener('webkitTransitionEnd', this.finished);
        this.box.hide();
        this.shade.hide();
        fn();
      }.bind(this);
      this.box.addEventListener('webkitTransitionEnd', this.finished);
      this.box.removeClass('loading-active');
      this.shade.removeClass('loading-shade-active');
    });
  };

  /*-------------------------] CopyAnimation [--------------------------*/

  function CopyAnimation () {
    this.build();
  };

  // --- Inheritance

  CopyAnimation.prototype = new Animation();

  // --- Constants

  CopyAnimation.IN_CLASS = 'copy-animation-in';
  CopyAnimation.TEXT_IN_CLASS = 'copy-animation-text-in';

  // --- Setup

  CopyAnimation.prototype.build = function() {
    this.box  = new Element(document.body, 'div', 'copy-animation');
    this.text = new Element(this.box.el, 'div', 'copy-animation-text').html('Copied!');
  };

  // --- Actions

  CopyAnimation.prototype.animate = function(dir) {

    this.reset();
    this.box.show();

    this.defer(function() {

      this.box.addClass(CopyAnimation.IN_CLASS);
      this.text.addClass(CopyAnimation.TEXT_IN_CLASS);

      this.finished = function() {
        this.box.el.removeEventListener('webkitAnimationEnd', this.finished);
        this.reset();
      }.bind(this);
      this.box.addEventListener('webkitAnimationEnd', this.finished);
    });
  };

  CopyAnimation.prototype.reset = function() {
    this.box.show(false);
    this.box.removeClass(CopyAnimation.IN_CLASS);
    this.text.removeClass(CopyAnimation.TEXT_IN_CLASS);
  };


  /*-------------------------] SpriteRecognizer [--------------------------*/

  function SpriteRecognizer (url) {
    this.map = {};
    this.loadPixelData(url);
  };

  SpriteRecognizer.ORIGIN_REG = new RegExp('^' + window.location.origin.replace(/([\/.])/g, '\\$1'));

  SpriteRecognizer.prototype.loadPixelData = function(url) {
    var xDomain = !SpriteRecognizer.ORIGIN_REG.test(url);
    if(xDomain) {
      this.loadXDomainImage(url);
    } else {
      this.loadImage(url);
    }
  };

  SpriteRecognizer.prototype.loadImage = function(obj) {
    if(obj.error) {
      console.warn('Positionable: "' + obj.url + '" could not be loaded!');
      return;
    }
    var url = obj;
    var img = new Image();
    img.addEventListener('load', this.handleImageLoaded.bind(this));
    img.src = url;
  };

  SpriteRecognizer.prototype.loadXDomainImage = function(url) {
    // The background page is the only context in which pixel data from X-Domain
    // images can be loaded so call out to it and tell it to load the data for this url.
    var message = { message: 'convert_image_url_to_data_url', url: url };
    chrome.runtime.sendMessage(message, this.loadImage.bind(this));
  };

  SpriteRecognizer.prototype.handleImageLoaded = function(evt) {
    var img = evt.target, canvas, context;
    canvas = document.createElement('canvas');
    canvas.setAttribute('width', img.width);
    canvas.setAttribute('height', img.height);
    context = canvas.getContext('2d');
    context.drawImage(img, 0, 0);
    this.pixelData = context.getImageData(0, 0, img.width, img.height).data;
    this.width = img.width;
    this.height = img.height;
  };

  SpriteRecognizer.prototype.getSpriteBoundsForCoordinate = function(pixel) {
    pixel = pixel.round();
    var cached, alpha = this.getAlphaForPixel(pixel);
    // No sprite detected
    if(!alpha) {
      return;
    }
    cached = this.map[this.getKey(pixel)];
    if(cached) {
      return cached;
    }
    this.queue = [];
    this.rect  = new Rectangle(pixel.y, pixel.x, pixel.y, pixel.x);
    do {
      this.testAdjacentPixels(pixel);
    } while(pixel = this.queue.shift());
    return this.rect;
  };

  SpriteRecognizer.prototype.testAdjacentPixels = function(pixel) {
    this.testPixel(new Point(pixel.x, pixel.y - 1)); // Top
    this.testPixel(new Point(pixel.x + 1, pixel.y)); // Right
    this.testPixel(new Point(pixel.x, pixel.y + 1)); // Bottom
    this.testPixel(new Point(pixel.x - 1, pixel.y)); // Left
  };

  SpriteRecognizer.prototype.testPixel = function(pixel) {
    var key = this.getKey(pixel);
    if(this.map[key] === undefined) {
      // If we have a pixel, then move on and test the adjacent ones.
      if(this.getAlphaForPixel(pixel)) {
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
  };

  SpriteRecognizer.prototype.getKey = function(pixel) {
    return pixel.x + ',' + pixel.y;
  };

  SpriteRecognizer.prototype.getAlphaForPixel = function(pixel) {
    return !!this.pixelData[((this.width * pixel.y) + pixel.x) * 4 + 3];
  };



  /*-------------------------] Point [--------------------------*/


  function Point (x, y) {
    this.x = x;
    this.y = y;
  };

  Point.DEGREES_IN_RADIANS = 180 / Math.PI;


  Point.degToRad = function(deg) {
    return deg / Point.DEGREES_IN_RADIANS;
  };

  Point.radToDeg = function(rad) {
    var deg = rad * Point.DEGREES_IN_RADIANS;
    while(deg < 0) deg += 360;
    return deg;
  };

  Point.vector = function(deg, len) {
    var rad = Point.degToRad(deg);
    return new Point(Math.cos(rad) * len, Math.sin(rad) * len);
  };

  Point.prototype.add = function(p) {
    return new Point(this.x + p.x, this.y + p.y);
  };

  Point.prototype.subtract = function(p) {
    return new Point(this.x - p.x, this.y - p.y);
  };

  Point.prototype.multiply = function(n) {
    return Point.vector(this.getAngle(), this.getLength() * n);
  };

  Point.prototype.getAngle = function() {
    return Point.radToDeg(Math.atan2(this.y, this.x));
  };

  Point.prototype.setAngle = function(deg) {
    return Point.vector(deg, this.getLength());
  };

  Point.prototype.rotate = function(deg) {
    return this.setAngle(this.getAngle() + deg);
  };

  Point.prototype.getLength = function() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  };

  Point.prototype.clone = function() {
    return new Point(this.x, this.y);
  };

  Point.prototype.round = function() {
    return new Point(Math.round(this.x), Math.round(this.y));
  };


  /*-------------------------] Rectangle [--------------------------*/

  function Rectangle (top, right, bottom, left, rotation) {
    this.top      = top    || 0;
    this.right    = right  || 0;
    this.bottom   = bottom || 0;
    this.left     = left   || 0;
    this.rotation = rotation || 0;
  };

  Rectangle.prototype.getWidth = function() {
    return this.right - this.left;
  };

  Rectangle.prototype.getHeight = function() {
    return this.bottom - this.top;
  };

  Rectangle.prototype.setPosition = function(point) {
    var offset = point.subtract(new Point(this.left, this.top));
    this.left   += offset.x;
    this.top    += offset.y;
    this.bottom += offset.y;
    this.right  += offset.x;
  };

  Rectangle.prototype.add = function(prop, amount) {
    if(!prop) return;
    amount = this.constrainProperty(prop, this[prop] + amount);
    this[prop] = amount;
  };

  Rectangle.prototype.constrainProperty = function(prop, amount) {
    switch(prop) {
      case 'left':   return Math.min(amount, this.right - 1);
      case 'right':  return Math.max(amount, this.left + 1);
      case 'top':    return Math.min(amount, this.bottom - 1);
      case 'bottom': return Math.max(amount, this.top + 1);
    }
  };

  Rectangle.prototype.getCenter = function() {
    return new Point(this.left + (this.getWidth() / 2), this.top + (this.getHeight() / 2));
  };

  Rectangle.prototype.getAspectRatio = function() {
    return this.getWidth() / this.getHeight();
  };

  // The rotated position for a given un-rotated coordinate.
  Rectangle.prototype.getPositionForCoords = function(coord) {
    if(!this.rotation) return coord;
    var center = this.getCenter();
    return coord.subtract(center).rotate(this.rotation).add(center);
  };

  // The un-rotated coords for a given rotated position.
  Rectangle.prototype.getCoordsForPosition = function(position) {
    if(!this.rotation) return position;
    var center = this.getCenter();
    return position.subtract(center).rotate(-this.rotation).add(center);
  };

  Rectangle.prototype.clone = function() {
    return new Rectangle(this.top, this.right, this.bottom, this.left, this.rotation);
  };

  /*-------------------------] Init [--------------------------*/

  if(window.currentElementManager) {
    window.currentElementManager.toggleActive();
    return;
  }

  var settings         = new Settings();
  var statusBar        = new StatusBar();
  var dragSelection    = new DragSelection();
  var nudgeManager     = new NudgeManager();
  var elementManager   = new PositionableElementManager();
  var eventManager     = new EventManager();
  var copyAnimation    = new CopyAnimation();
  var loadingAnimation = new LoadingAnimation();


  elementManager.startBuild();
  window.currentElementManager = elementManager;

})();

