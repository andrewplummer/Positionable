/*
 *  Positionable Chrome Extension
 *
 *  Freely distributable and licensed under the MIT-style license.
 *  Copyright (c) 2017 Andrew Plummer
 *
 * ---------------------------- */

class AppController {

  static get PLATFORM_IS_MAC() { return /mac/i.test(navigator.platform); }

  constructor(uiRoot) {
    this.uiRoot = uiRoot;
    this.setupInterface(uiRoot);
    this.setupPayment();
    this.setupKeyManager();
    this.setupSupportManagers();
    this.setupElementManager();
    this.loadingAnimation.show();
  }

  // --- Animation Events

  onLoadingAnimationTaskReady() {
    this.elementManager.findElements(
      this.settings.get(Settings.INCLUDE_SELECTOR),
      this.settings.get(Settings.EXCLUDE_SELECTOR)
    );
    this.checkInitialized();
  }

  // --- License Manager Events

  onLicensePurchased() {
    this.controlPanel.renderUpgradeThankYou();
    this.settings.toggleAdvancedFeatures(true);
  }

  onLicenseUpdated() {
    var pro  = this.licenseManager.hasProLicense();
    var time = this.licenseManager.freeTimeRemaining();
    this.controlPanel.renderUpgradeStatus(pro, time);
    this.settings.toggleAdvancedFeatures(pro || time);
  }

  // --- Control Panel Events

  onQuickstartSkip() {
    this.settings.set(Settings.SKIP_QUICKSTART, true);
    this.renderActiveControlPanel();
  }

  onShowSettingsClick() {
    this.settings.focusForm();
  }

  onBasicSettingsClick() {
    this.settings.setBasic();
  }

  onAdvancedSettingsClick() {
    this.settings.setAdvanced();
  }

  onUpgradeClick() {
    this.licenseManager.purchase();
  }

  onDebugClick() {
    this.licenseManager.setDebugMode();
  }

  onControlPanelDragStart() {
    this.cursorManager.setDragCursor('move');
  }

  onControlPanelDragStop() {
    this.cursorManager.clearDragCursor();
  }

  onElementHighlightMouseOver(index) {
    var element = this.elementManager.focusedElements[index], selector;
    selector = this.outputManager.getSelectorWithDefault(element);
    this.controlPanel.renderMultipleHeader(selector);
    element.setHighlightMode(true);
  }

  onElementHighlightMouseOut(index) {
    var element = this.elementManager.focusedElements[index];
    element.setHighlightMode(false);
    this.controlPanel.renderMultipleHeader();
  }

  onElementHighlightClick(index) {
    var element = this.elementManager.focusedElements[index];
    element.setHighlightMode(false);
    this.elementManager.setFocused([element]);
  }

  // --- Settings Events

  onSettingsInitialized() {
    this.elementManager.setSnap(
      this.settings.get(Settings.SNAP_X),
      this.settings.get(Settings.SNAP_Y)
    );
  }

  onSettingsSubmitted() {
    this.renderActiveControlPanel();
  }

  onSettingsCleared() {
    this.renderActiveControlPanel();
  }

  onSelectorUpdated() {
    this.elementManager.releaseAll();
    this.loadingAnimation.show();
  }

  onSnappingUpdated(x, y) {
    this.elementManager.setSnap(x, y);
  }

  onSettingsFormFocus() {
    this.keyManager.setActive(false);
    this.copyManager.setActive(false);
  }

  onSettingsFormBlur() {
    this.keyManager.setActive(true);
    this.copyManager.setActive(true);
  }

  // --- Element Manager Events

  onElementMouseDown() {
    this.controlPanel.closeSettings();
  }

  onFocusedElementsChanged() {
    this.renderActiveControlPanel();
  }

  // --- Position Drag Events

  onPositionDragIntentStart(evt, handle) {
    this.setHoverCursorForHandle(handle);
  }

  onPositionDragIntentStop() {
    this.cursorManager.clearHoverCursor();
  }

  onPositionDragStart(evt, handle) {
    this.setDragCursorForHandle(handle);
  }

  onPositionDragMove() {}

  onPositionDragStop() {
    this.cursorManager.clearDragCursor();
  }

  // --- Resize Drag Events

  onResizeDragIntentStart(evt, handle, element) {
    this.setHoverCursorForHandle(handle, element.getRotation());
    this.currentFocusedHandle = handle;
  }

  onResizeDragIntentStop() {
    this.cursorManager.clearHoverCursor();
    this.currentFocusedHandle = null;
  }

  onResizeDragStart(evt, handle, element) {
    this.isResizing = !evt.ctrlKey;
    this.setDragCursorForHandle(handle, element.getRotation());
  }

  onResizeDragMove() {}

  onResizeDragStop() {
    this.cursorManager.clearDragCursor();
    this.isResizing = false;
  }

  // --- Rotation Drag Events

  onRotationDragIntentStart(evt, handle, element) {
    this.setHoverCursorForHandle(handle, element.getRotation());
    this.currentFocusedHandle = handle;
  }

  onRotationDragIntentStop() {
    this.cursorManager.clearHoverCursor();
    this.currentFocusedHandle = null;
  }

  onRotationDragStart() {
    this.isRotating = true;
  }

  onRotationDragMove(evt, handle) {
    this.setDragCursorForHandle(handle, evt.rotation.abs);
  }

  onRotationDragStop(evt, handle, element) {
    this.isRotating = false;
    this.cursorManager.clearDragCursor();
    if (this.currentFocusedHandle) {
      this.setHoverCursorForHandle(this.currentFocusedHandle, element.getRotation());
    }
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

  // --- Key Manager Events

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
        if (this.elementManager.hasFocusedElements()) {
          this.elementManager.undo();
          this.renderActiveControlPanel();
        }
        break;
    }
  }

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
        this.elementManager.applyResizeNudge(evt.x, evt.y, evt.corner);
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

  onNudgeStop() {}

  onNudgeModeChanged(mode) {
    this.controlPanel.setNudgeMode(mode);
  }

  // --- Align Manager Events

  onAlignButtonClick(edge) {
    this.alignmentManager.align(this.elementManager.getFocusedElements(), edge);
  }

  onDistributeButtonClick(edge) {
    this.alignmentManager.distribute(this.elementManager.getFocusedElements(), edge);
  }

  // --- Drag Selection Events

  onDragSelectionStart() {
    this.cursorManager.setDragCursor('crosshair');
  }

  onDragSelectionMove() {
    this.elementManager.setFocused(element => {
      return this.dragSelection.contains(element.el);
    });
  }

  onDragSelectionStop() {
    this.cursorManager.clearDragCursor();
  }

  onDragSelectionClear() {
    this.elementManager.unfocusAll();
  }

  // --- Copy Manager Events

  onCopyEvent(evt) {
    var styles = this.outputManager.getStyles(this.elementManager.getFocusedElements());
    this.copyManager.setCopyData(evt, styles);
    this.copyAnimation.show(!!styles);
  }


  // === Private ===


  // --- Setup

  setupInterface(uiRoot) {
    this.settings         = new Settings(this, uiRoot);
    this.controlPanel     = new ControlPanel(this, uiRoot, AppController.PLATFORM_IS_MAC);
    this.dragSelection    = new DragSelection(this, uiRoot);
    this.copyAnimation    = new CopyAnimation(this, uiRoot);
    this.loadingAnimation = new LoadingAnimation(this, uiRoot);
    this.cursorManager    = new CursorManager(ShadowDomInjector.getBasePath());
  }

  setupPayment() {
    this.licenseManager = new LicenseManager(this);
  }

  setupKeyManager() {
    this.keyManager = new KeyManager(this, AppController.PLATFORM_IS_MAC);

    this.keyManager.setupKey(KeyManager.SHIFT_KEY);
    this.keyManager.setupKey(KeyManager.CTRL_KEY);
    this.keyManager.setupKey(KeyManager.META_KEY);
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

    // Command S for save works regardless of where you are,
    // other command keys should be able to disable as they
    // do other things in the context of the settings form.
    this.keyManager.setupCommandKeyException(KeyManager.S_KEY);
  }

  setupSupportManagers() {
    this.copyManager      = new CopyManager(this);
    this.nudgeManager     = new NudgeManager(this);
    this.alignmentManager = new AlignmentManager();
    this.outputManager    = new OutputManager(this.settings);
  }

  setupElementManager() {
    this.elementManager = new PositionableElementManager(this);
    this.elementManager.addIgnoredClass(ShadowDomInjector.UI_HOST_CLASS_NAME);
  }

  // --- Initializing

  checkInitialized() {
    if (this.initialized) {
      return;
    }
    this.controlPanel.activate();
    if (this.settings.get(Settings.SKIP_QUICKSTART)) {
      this.controlPanel.showDefaultArea();
    } else {
      this.controlPanel.showQuickstartArea();
    }
    this.initialized = true;
  }
  // --- Cursors

  setHoverCursorForHandle(handle, rotation) {
    var img = handle.hasImageCursor();
    var cursor = handle.getCursor(rotation);
    this.cursorManager.setHoverCursor(cursor, img);
  }

  setDragCursorForHandle(handle, rotation) {
    var img = handle.hasImageCursor();
    var cursor = handle.getCursor(rotation);
    this.cursorManager.setDragCursor(cursor, img);
  }

  // --- Peeking

  canPeek() {
    return !this.isResizing && !this.isRotating;
  }

  // --- Style Output

  saveStyles() {
    var styles = this.outputManager.getStyles(this.elementManager.getFocusedElements());
    if (styles) {
      this.outputManager.saveStyles(styles);
    } else {
      this.copyAnimation.show(false);
    }
  }

  // --- Control Panel Rendering

  renderActiveControlPanel() {
    var elements = this.elementManager.getFocusedElements();
    if (elements.length > 1) {
      this.renderMultipleArea(elements);
    } else if (elements.length === 1) {
      this.renderElementArea();
    } else {
      this.controlPanel.showDefaultArea();
    }
  }

  renderMultipleArea(elements) {
    this.controlPanel.showMultipleArea();
    this.controlPanel.renderMultipleSelected(elements);
  }

  renderElementArea() {
    this.controlPanel.showElementArea();
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

  // --- Other

  destroy() {
    this.elementManager.destroy();
    this.nudgeManager.destroy();
    this.uiRoot.host.remove();
  }

}

/*-------------------------] ShadowDomInjector [--------------------------*/

class ShadowDomInjector {

  static get UI_HOST_CLASS_NAME()          { return 'positionable-extension-ui'; }
  static get EXTENSION_RELATIVE_PATH_REG() { return /chrome-extension:\/\/__MSG_@@extension_id__\//g; }

  static getBasePath() {
    return this.basePath || '';
  }

  static setBasePath(path) {
    this.basePath = path;
  }

  // Template Preloading
  // -------------------
  // This saves I/O requests and makes testing a lot easier by allowing an initial
  // preload of templates and caching them so they can resolve synchronously.

  static preload(templatePath, stylesheetPath) {
    this.preloadedTemplatesByPath = this.preloadedTemplatesByPath || {};
    this.preloadedTemplateTasks   = this.preloadedTemplateTasks   || [];
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

  setContainerZIndex(zIndex) {
    this.container.style.zIndex = zIndex;
  }

  run(fn) {
    ShadowDomInjector.getPreloadedTemplateOrFetch(this, fn);
  }


  // === Private ===


  getUrl(path) {
    return ShadowDomInjector.getBasePath() + path;
  }

  fetchFile(filePath) {
    return fetch(this.getUrl(filePath)).then(response => {
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
    return this.fetchFile(this.stylesheetPath).then(styles => {
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
    container.className = ShadowDomInjector.UI_HOST_CLASS_NAME;

    // Note that changing this to attachShadow was causing some weird
    // issues with eventing (window copy event was not firing) in both
    // open and closed modes, so going back to createShadowRoot.
    var root = container.createShadowRoot();

    // Relative extension paths don't seem to be supported in HTML template
    // files, so manually swap out these tokens for the extension path.
    root.innerHTML = templateHtml.replace(ShadowDomInjector.EXTENSION_RELATIVE_PATH_REG, ShadowDomInjector.getBasePath());

    this.parent.insertBefore(container, this.parent.firstChild);
    this.container = container;

    return root;
  }

  destroy() {
    if (this.container) {
      this.container.remove();
    }
  }

}

/*-------------------------] ChromeStorageManager [--------------------------*/

class ChromeStorageManager {

  constructor(listener) {
    this.listener = listener;
  }

  fetch(arg) {
    chrome.storage.sync.get(arg, data => {
      this.listener.onStorageDataFetched(data);
    });
  }

  save(arg1, arg2) {
    var data;
    if (arguments.length === 1) {
      data = arg1;
    } else {
      data = { [arg1]: arg2 };
    }
    chrome.storage.sync.set(data, () => {
      this.listener.onStorageDataSaved(data);
    });
  }

  remove(arg) {
    chrome.storage.sync.remove(arg, () => {
      this.listener.onStorageDataRemoved();
    });
  }

}

/*-------------------------] LicenseManager [--------------------------*/

class LicenseManager {

  // API Constants
  static get SKU()         { return 'positionable_pro'; }
  static get ENVIRONMENT() { return 'prod';             }

  // Purchase States
  static get STATE_ACTIVE()  { return 'ACTIVE';  }
  static get STATE_PENDING() { return 'PENDING'; }

  // Error Types
  static get PURCHASE_CANCELED() { return 'PURCHASE_CANCELED'; }

  // License Statuses
  static get STATUS_NORMAL() { return 'normal'; }
  static get STATUS_PRO()    { return 'pro';    }

  // Storage Keys
  static get STORAGE_KEY_STATUS()    { return 'license-status';    }
  static get STORAGE_KEY_UPDATED()   { return 'license-updated';   }
  static get STORAGE_KEY_ACTIVATED() { return 'license-activated'; }

  // Free trial period (30 days)
  static get FREE_TRIAL_PERIOD() { return 30 * 24 * 60 * 60 * 1000; }

  // Time before re-checking purchases
  static get MAX_AGE() { return 7 * 24 * 60 * 60 * 1000;  }

  // Other
  static get CHECKOUT_ORDER_ID() { return 'checkoutOrderId'; }

  constructor(listener) {
    this.listener = listener;

    this.status    = null;
    this.activated = null;
    this.debugMode = false;

    this.setup();
    this.fetchStoredLicenseData();
  }

  hasProLicense() {
    return this.status === LicenseManager.STATUS_PRO;
  }

  freeTimeRemaining() {
    var period  = LicenseManager.FREE_TRIAL_PERIOD;
    var elapsed = Date.now() - this.activated;
    return Math.max(0, period - elapsed);
  }

  purchase() {
    this.beginPurchaseTransaction();
  }

  setDebugMode() {
    this.debugMode = true;
    console.log('Payments debug mode on');
    this.checkPurchases();
  }


  // === Protected ===


  onStorageDataFetched(data) {
    this.checkStoredActivatedDate(data);
    // Note: Comment out this line to force checking the payments api for testing
    this.checkStoredStatus(data);

    if (!this.status) {
      // If there is no stored license status, then go to the
      // in-app payments API to check for an active purchase.
      this.checkPurchases();
    }
  }

  onStorageDataSaved() {}
  onStorageDataRemoved() {}


  // === Private ===


  setup() {
    this.storageManager      = new ChromeStorageManager(this);
    this.buyOptions          = this.getBuyOptions();
    this.getPurchasesOptions = this.getGetPurchasesOptions();
  }

  // --- Storage

  fetchStoredLicenseData() {
    this.storageManager.fetch([
      LicenseManager.STORAGE_KEY_STATUS,
      LicenseManager.STORAGE_KEY_UPDATED,
      LicenseManager.STORAGE_KEY_ACTIVATED
    ]);
  }

  saveStatus() {
    var data = {
      [LicenseManager.STORAGE_KEY_STATUS]: this.status,
      [LicenseManager.STORAGE_KEY_UPDATED]: Date.now()
    };
    this.storageManager.save(data);
  }

  resolveStatus(status) {
    var purchased = this.licenseWasPurchased(status);
    this.status = status;
    if (purchased) {
      this.listener.onLicensePurchased();
    }
    this.listener.onLicenseUpdated();
  }

  licenseWasPurchased(status) {
    // If the previous status was normal and the new status
    // is pro, then the user has just purchased a license.
   return status === LicenseManager.STATUS_PRO &&
          this.status === LicenseManager.STATUS_NORMAL;
  }

  checkStoredActivatedDate(data) {
    var storageKey, activated;

    storageKey = LicenseManager.STORAGE_KEY_ACTIVATED;
    activated  = data[storageKey];

    if (!activated) {
      activated = Date.now();
      this.storageManager.save(storageKey, activated);
    }

    this.activated = activated;
  }

  checkStoredStatus(data) {
    var status = data[LicenseManager.STORAGE_KEY_STATUS];
    if (status && !this.storageNeedsUpdate(data)) {
      this.resolveStatus(status);
    }
  }

  storageNeedsUpdate(data) {
    var maxAge  = LicenseManager.MAX_AGE;
    var updated = data[LicenseManager.STORAGE_KEY_UPDATED] || maxAge;
    var age     = Date.now() - updated;
    return age >= maxAge;
  }

  // --- Checking Purchases

  checkPurchases() {
    google.payments.inapp.getPurchases(this.getPurchasesOptions);
  }

  onGetPurchasesSuccess(data) {
    this.logDebug('Get purchases succeded with', data);
    var status = this.getStatusFromPurchaseData(data);
    this.resolveStatus(status);
    this.saveStatus();
  }

  onGetPurchasesFailure(data) {
    this.logDebug('Get purchases failed with', data);
    console.error('Could not retreive purchases: ' + data.response.errorType, data);
  }

  getStatusFromPurchaseData(data) {
    var activePurchase = data.response.details.some(d => {
      return d.sku   === LicenseManager.SKU &&
            (d.state === LicenseManager.STATE_ACTIVE ||
             d.state === LicenseManager.STATE_PENDING);
    });
    return activePurchase ?
      LicenseManager.STATUS_PRO :
      LicenseManager.STATUS_NORMAL;
  }

  // --- Making Purchase

  beginPurchaseTransaction() {
    google.payments.inapp.buy(this.buyOptions);
  }

  onBuySuccess(data) {
    this.logDebug('Buy succeded with', data);
    // Note that it seems new purchases are not always reflected
    // in the getPurchases API, so don't check them at this point
    // but instead immediately grant the license. This may cause
    // some issues with canceling, but the default will be to grant
    // the license, which is the better fallback.
    this.resolveStatus(LicenseManager.STATUS_PRO);
    this.saveStatus();
  }

  onBuyFailure(data) {
    this.logDebug('Buy failed with', data);
    if (data[LicenseManager.CHECKOUT_ORDER_ID]) {
      // It seems that this may be an inapp payements bug
      // where it returns a checkoutOrderId in the failure
      // callback. Still not 100% why this is happening but
      // it may have to do with multiple Chrome logins. It
      // appears that the charges go through, however, so
      // grant the user pro status here.
      this.onBuySuccess(data);
    } else if (data.response && data.response.errorType !== LicenseManager.PURCHASE_CANCELED) {
      console.error('Could not complete purchase: ' + data.response);
    }
  }

  // --- Other

  getGetPurchasesOptions() {
    return Object.assign(this.getDefaultOptions(), {
      'success': this.onGetPurchasesSuccess.bind(this),
      'failure': this.onGetPurchasesFailure.bind(this)
    });
  }

  getBuyOptions() {
    return Object.assign(this.getDefaultOptions(), {
      'sku':     LicenseManager.SKU,
      'success': this.onBuySuccess.bind(this),
      'failure': this.onBuyFailure.bind(this)
    });
  }

  getDefaultOptions() {
    return {
      'parameters': {
        'env': LicenseManager.ENVIRONMENT
      }
    };
  }

  logDebug(message, data) {
    if (this.debugMode) {
      console.log(message, data);
    }
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


  // === Private ===


  // --- Align

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

  // --- Distribute

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

      rect = element.getBoundingClientRect();

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

  // --- Element Moves

  getElementMoves(elements, edge) {
    return elements.map(element => {
      return {
        element: element,
        current: this.getElementEdgeValue(element, edge)
      };
    });
  }

  executeElementMoves(elementMoves, edge) {
    elementMoves.forEach(em => {
      em.element.pushState();
      if (em.target !== em.current) {
        if (this.isHorizontalEdge(edge)) {
          em.element.move(em.target - em.current, 0);
        } else {
          em.element.move(0, em.target - em.current);
        }
      }
    });
  }

  getElementEdgeValue(element, edge) {
    var val, center;
    if (edge === 'hcenter' || edge === 'vcenter') {
      center = element.getViewportCenter();
      val = edge === 'hcenter' ? center.x : center.y;
    } else {
      val = element.getBoundingClientRect()[edge];
    }
    return Math.round(val);
  }

  isHorizontalEdge(edge) {
    return edge === 'left' || edge === 'right' || edge === 'hcenter';
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


  // === Private ===


  injectStylesheet() {
    var el = document.createElement('style');
    document.head.appendChild(el);
    el.sheet.insertRule('html, html * {}');
    this.style = el.sheet.rules[0].style;
  }

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

}

/*-------------------------] OutputManager [--------------------------*/

class OutputManager {

  constructor(settings) {
    this.settings = settings;
  }

  // --- Selectors

  getSelector(element) {
    return this.getSelectorFromElement(element);
  }

  getSelectorWithDefault(element) {
    return this.getSelectorFromElement(element, true);
  }

  // --- Headers

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

  // --- Styles

  getStyles(elements) {
    return this.getJoinedStyleBlocks(elements);
  }

  // --- Saving

  saveStyles(styles) {
    var link = document.createElement('a');
    link.href = 'data:text/css;base64,' + btoa(styles);
    link.download = this.settings.get(Settings.SAVE_FILENAME);
    link.click();
  }


  // === Private ===


  // --- Selectors

  getSelectorFromElement(element, fallback) {
    var el, type, selector;

    el       = element.el;
    type     = this.getSelectorType(el);
    selector = this.getSelectorForType(type, el);

    if (!selector && (fallback || type !== Settings.OUTPUT_SELECTOR_NONE)) {
      selector = el.tagName.toLowerCase();
    }
    return selector;
  }

  getSelectorType(el) {
    var type = this.settings.get(Settings.OUTPUT_SELECTOR);
    if (type === Settings.OUTPUT_SELECTOR_AUTO) {
      type = el.id ? Settings.OUTPUT_SELECTOR_ID : Settings.OUTPUT_SELECTOR_FIRST;
    }
    return type;
  }

  getSelectorForType(type, el) {
    switch(type) {
      case Settings.OUTPUT_SELECTOR_NONE:    return '';
      case Settings.OUTPUT_SELECTOR_ID:      return this.getId(el);
      case Settings.OUTPUT_SELECTOR_ALL:     return this.getAllClasses(el.classList);
      case Settings.OUTPUT_SELECTOR_TAG:     return this.getTagName(el);
      case Settings.OUTPUT_SELECTOR_TAG_NTH: return this.getTagNameWithNthIndex(el);
      case Settings.OUTPUT_SELECTOR_FIRST:   return this.getFirstClass(el.classList);
      case Settings.OUTPUT_SELECTOR_LONGEST: return this.getLongestClass(el.classList);
    }
  }

  getId(el) {
    return el.id ? '#' + el.id : null;
  }

  getFirstClass(list) {
    var first = list[0];
    return first ? '.' + first : null;
  }

  getAllClasses(list) {
    var str = Array.from(list).join('.');
    return str ? '.' + str : null;
  }

  getLongestClass(list) {
    var classNames = Array.from(list);
    if (classNames.length > 0) {
      return '.' + classNames.reduce((a, b) => {
        return a.length > b.length ? a : b;
      });
    }
  }

  getTagName(el) {
    return el.tagName.toLowerCase();
  }

  getTagNameWithNthIndex(el) {
    var child = el, i = 1;
    while ((child = child.previousSibling) != null) {
      // Count only element nodes.
      if (child.nodeType == 1) {
        i++;
      }
    }
    return el.tagName.toLowerCase() + ':nth-child(' + i + ')';
  }

  // --- Styles

  getJoinedStyleBlocks(elements) {
    var blocks, grouping, lineSeparator, blockSeparator;

    blocks   = elements.map(el => this.getElementDeclarationBlock(el));
    blocks   = blocks.filter(b => b && b.lines.length);
    grouping = this.settings.get(Settings.OUTPUT_GROUPING);

    if (grouping !== Settings.OUTPUT_GROUPING_NONE) {
      blocks = this.getGroupedDeclarationBlocks(blocks, grouping);
    }

    [lineSeparator, blockSeparator] = this.getDeclarationSeparators();

    return blocks.map(b => b.lines.join(lineSeparator)).join(blockSeparator);
  }

  getElementDeclarationBlock(element) {
    var declarations, selector, tab, lines = [];

    if (this.settings.get(Settings.OUTPUT_CHANGED_ONLY)) {
      declarations = element.getChangedCSSDeclarations();
    } else {
      declarations = element.getCSSDeclarations();
    }

    if (declarations.length === 0) {
      return null;
    }

    selector = this.getSelector(element);
    tab = selector ? this.getTab() : '';

    declarations = declarations.map(p => tab + p);

    lines = lines.concat(declarations);

    if (selector) {
      lines.unshift(selector + ' {');
      lines.push('}');
    }

    return {
      lines: lines,
      element: element,
      selector: selector
    };
  }

  getGroupedDeclarationBlocks(blocks, grouping) {
    var commonStyles, isMapping, groupingMap;

    // If there is 1 or less elements, then all styles are
    // considered to be unique, so just return the blocks.
    if (blocks.length <= 1) {
      return blocks;
    }

    // Get a hash of the declarations common to all blocks.
    commonStyles = this.buildCommonMap(blocks, block => {
      return block.lines.slice(1, -1);
    });

    isMapping = grouping === Settings.OUTPUT_GROUPING_MAP;
    if (isMapping) {
      groupingMap = this.settings.get(Settings.GROUPING_MAP);
    }

    // Declarations common to the group may either be removed
    // or mapped to variables defined in the grouping map. so
    // we need to step through each line here and filter out
    // those that have been removed.
    blocks = blocks.map(block => {
      var lines, firstLine, lastLine;

      lines     = block.lines;
      firstLine = lines.shift();
      lastLine  = lines.pop();

      lines = lines.map(line => {
        return this.getCommonDeclaration(line, commonStyles, groupingMap);
      });
      lines = lines.filter(l => l);

      // Push the first and last lines back onto the array.
      lines.unshift(firstLine);
      lines.push(lastLine);

      return {
        lines: lines,
        element: block.element,
        selector: block.selector
      };
    });

    // Filter out blocks that no longer have declarations
    // after grouping.
    blocks = blocks.filter(b => b.lines.length > 2);

    if (isMapping) {
      this.prependMappedVariableBlock(blocks, commonStyles, groupingMap);
    } else if (grouping === Settings.OUTPUT_GROUPING_AUTO) {
      this.prependAutoGroupedBlock(blocks, commonStyles);
    }

    // Return only blocks that have declarations.
    return blocks.filter(b => b.lines.length);
  }

  getCommonDeclaration(line, commonStyles, groupingMap) {
    var d, mappedProperty;
    // If the line is unique, then it must be retuned
    // as is. Otherwise, check the grouping map to see
    // if there are variables that it can be mapped to
    // and return those instead.
    if (!commonStyles[line]) {
      return line;
    }
    if (groupingMap) {
      d = this.decomposeLine(line);
      mappedProperty = groupingMap[d.prop];
      if (mappedProperty) {
        return d.whitespace + d.prop + ': ' + mappedProperty + ';';
      }
    }
  }

  prependAutoGroupedBlock(blocks, commonStyles) {
    var lines, selector;

    // Create an array of lines out of the hash of
    // styles common to all blocks. If there are none,
    // then don't do anything.
    lines = Object.keys(commonStyles);
    if (lines.length === 0) {
      return;
    }

    // Wrap the declarations with the selector that for the group.
    selector = this.getGroupedSelector(blocks);
    lines.unshift(selector + ' {');
    lines.push('}');

    blocks.unshift({
      lines: lines
    });
  }

  prependMappedVariableBlock(blocks, commonStyles, groupingMap) {
    var lines;

    lines = Object.keys(commonStyles);
    if (lines.length === 0) {
      return;
    }

    lines = lines.map(line => {
      var dec = this.decomposeLine(line);
      if (groupingMap[dec.prop]) {
        return groupingMap[dec.prop] + ': ' + dec.val + ';';
      }
    });
    lines = lines.filter(l => l);
    blocks.unshift({
      lines: lines
    });
  }

  decomposeLine(line) {
    var match, whitespace, prop, val;
    match = line.match(/(\s*)(.+?):\s*(.+?);/);
    whitespace = match[1];
    prop       = match[2];
    val        = match[3];
    return {
      val: val,
      prop: prop,
      whitespace: whitespace
    };
  }

  getGroupedSelector(blocks) {
    var commonMap, commonClasses, selector;

    // Create a hash table of classes common to all elements.
    commonMap = this.buildCommonMap(blocks, block => {
      return block.element.el.classList;
    });

    // If common classes exist, then choose the longest one,
    // otherwise join them together to create a group selector.
    commonClasses = Object.keys(commonMap);
    if (commonClasses.length > 0) {
      selector = '.';
      selector += commonClasses.reduce((longestName, name) => {
        return name.length > longestName.length ? name : longestName;
      }, '');
    } else {
      selector = blocks.map(block => block.selector).join(', ');
    }

    return selector;
  }

  buildCommonMap(blocks, fn) {
    var maps, commonMap = {};

    // Initialize a hash table to be used for all common strings,
    // then build up both the common hash table and individual
    // hash tables of strings found in each block.
    maps = blocks.map(block => {
      var arr, map = {};
      arr = fn(block);
      arr.forEach(str => {
        map[str] = true;
        commonMap[str] = true;
      });
      return map;
    });

    // Reduce the hash table to only strings common to everything
    // returned using hashIntersect.
    maps.forEach(map => {
      commonMap = hashIntersect(commonMap, map);
    });

    return commonMap;
  }

  getTab() {
    switch(this.settings.get(Settings.TAB_STYLE)) {
      case Settings.TABS_TWO_SPACES:   return '  ';
      case Settings.TABS_FOUR_SPACES:  return '    ';
      case Settings.TABS_EIGHT_SPACES: return '        ';
      case Settings.TABS_TAB:          return '\u0009';
    }
  }

  getDeclarationSeparators() {
    var type = this.settings.get(Settings.OUTPUT_SELECTOR);
    if (type === Settings.OUTPUT_SELECTOR_NONE) {
      return [' ', '\n'];
    } else {
      return ['\n', '\n\n'];
    }
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
    this.bind();
  }

  // --- Directions

  addDirection(dir) {
    if (!this.isNudging()) {
      this.onNudgeStart();
    }
    this.vectors[dir] = true;
    this.next();
  }

  removeDirection(dir) {
    this.vectors[dir] = false;
    if (!this.isNudging()) {
      this.resetTimeout();
      this.listener.onNudgeStop(this.mode);
    }
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


  // === Private ===


  bind() {
    this.checkNextNudge = this.checkNextNudge.bind(this);
  }

  // --- Modes

  isMode(mode) {
    return this.mode === mode;
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

  // --- Nudging

  isNudging() {
    var vectors = this.vectors;
    return !!(vectors.up || vectors.down || vectors.left || vectors.right);
  }

  onNudgeStart() {
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

  dispatchNudge(x, y) {
    var evt = new CustomEvent('nudge');
    if (this.isMode(NudgeManager.RESIZE_NW_MODE)) {
      evt.corner = 'nw';
    } else if (this.isMode(NudgeManager.RESIZE_SE_MODE)) {
      evt.corner = 'se';
    }
    this.vector.x += x;
    this.vector.y += y;
    evt.x = this.vector.x;
    evt.y = this.vector.y;
    evt.mode = this.mode;
    this.listener.onNudgeMove(evt);
  }

  checkNextNudge() {
    this.timer = undefined;
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

  resetTimeout() {
    this.timer = clearTimeout(this.timer);
  }

  // --- Other

  destroy() {
    this.resetTimeout();
  }

}

/*-------------------------] CopyManager [--------------------------*/

class CopyManager {

  constructor(listener) {
    this.listener = listener;
    this.active = true;
    this.setup();
  }

  setActive(on) {
    this.active = on;
  }

  setCopyData(evt, str) {
    evt.clipboardData.clearData();
    evt.clipboardData.setData('text/plain', str);
  }


  // === Private ===


  setup() {
    this.onCopyEvent = this.onCopyEvent.bind(this);
    window.addEventListener('copy', this.onCopyEvent.bind(this));
  }

  onCopyEvent(evt) {
    if (this.active) {
      evt.preventDefault();
      this.listener.onCopyEvent(evt);
    }
  }

}

/*-------------------------] KeyManager [--------------------------*/

class KeyManager {

  static get MODIFIER_NONE()    { return 1; }
  static get MODIFIER_COMMAND() { return 2; }

  static get ALT_KEY()     { return 'Alt';     }
  static get META_KEY()    { return 'Meta';    }
  static get CTRL_KEY()    { return 'Control'; }
  static get SHIFT_KEY()   { return 'Shift';   }

  static get UP_KEY()    { return 'ArrowUp';    }
  static get DOWN_KEY()  { return 'ArrowDown';  }
  static get LEFT_KEY()  { return 'ArrowLeft';  }
  static get RIGHT_KEY() { return 'ArrowRight'; }

  static get A_KEY() { return 'a'; }
  static get B_KEY() { return 'b'; }
  static get C_KEY() { return 'c'; }
  static get M_KEY() { return 'm'; }
  static get S_KEY() { return 's'; }
  static get R_KEY() { return 'r'; }
  static get Z_KEY() { return 'z'; }

  constructor(listener, isMacOS) {
    this.document = new BrowserEventTarget(document.documentElement);
    this.listener = listener;
    this.isMacOS  = isMacOS;

    this.handledKeys = {};
    this.active = true;

    this.setupEvents();
  }

  setupKey(key) {
    this.addKeyHandler(key, KeyManager.MODIFIER_NONE);
  }

  setupCommandKey(key) {
    this.addKeyHandler(key, KeyManager.MODIFIER_COMMAND);
  }

  setActive(on) {
    this.active = on;
  }

  setupCommandKeyException(key) {
    this.exceptedCommandKey = key;
  }


  // === Private ===


  setupEvents() {
    this.document.addEventListener('keydown', this.onKeyDown.bind(this));
    this.document.addEventListener('keyup',   this.onKeyUp.bind(this));
  }

  addKeyHandler(key, modifier) {
    var current = this.handledKeys[key] || 0;
    this.handledKeys[key] = current + modifier;
  }

  // --- Events

  onKeyDown(evt) {
    var flag = this.getMaskedFlag(evt);
    if (!flag) {
      return;
    }
    if (flag & KeyManager.MODIFIER_NONE && this.isSimpleKey(evt)) {
      evt.preventDefault();
      this.listener.onKeyDown(evt);
    } else if (flag & KeyManager.MODIFIER_COMMAND && this.isCommandKey(evt)) {
      evt.preventDefault();
      this.listener.onCommandKeyDown(evt);
    }
  }

  onKeyUp(evt) {
    if (this.getMaskedFlag(evt)) {
      this.listener.onKeyUp(evt);
    }
  }

  // --- Checking Keys

  isDisabled(evt) {
    return !this.active && !this.isExceptedCommandKey(evt);
  }

  isExceptedCommandKey(evt) {
    return this.isCommandKey(evt) && evt.key === this.exceptedCommandKey;
  }

  isSimpleKey(evt) {
    return (!evt.metaKey  || evt.key === KeyManager.META_KEY) &&
           (!evt.ctrlKey  || evt.key === KeyManager.CTRL_KEY) &&
           (!evt.altKey   || evt.key === KeyManager.ALT_KEY);
  }

  isCommandKey(evt) {
    return this.isMacOS ?
            evt.metaKey && !evt.shiftKey && !evt.ctrlKey && !evt.altKey :
            evt.ctrlKey && !evt.shiftKey && !evt.metaKey && !evt.altKey;
  }

  getMaskedFlag(evt) {
    var flag = this.handledKeys[evt.key];
    if (!flag || this.isDisabled(evt)) {
      return;
    }
    return flag;
  }

  // --- Other

  destroy() {
    this.document.removeAllListeners();
  }

}

/*-------------------------] PositionableElementManager [--------------------------*/

class PositionableElementManager {

  constructor(listener) {
    this.listener = listener;
    this.elements        = [];
    this.focusedElements = [];
    this.ignoredClasses  = [];
  }

  findElements(includeSelector, excludeSelector) {
    this.executeFindElements(includeSelector, excludeSelector);
  }

  addIgnoredClass(className) {
    this.ignoredClasses.push(className);
  }

  // --- Focusing

  focusAll() {
    this.setFocused(this.elements);
  }

  unfocusAll() {
    this.setFocused([]);
  }

  getFocusedElements() {
    return this.focusedElements;
  }

  hasFocusedElements() {
    return this.focusedElements.length > 0;
  }

  pushFocusedStates() {
    this.focusedElements.forEach(el => el.pushState());
  }

  // --- Other

  undo() {
    this.focusedElements.forEach(el => el.undo());
  }

  setSnap(x, y) {
    this.snapX = x;
    this.snapY = y;
  }


  // === Protected ===


  // --- Element Mouse Events

  onElementMouseDown(evt, element) {
    if (evt.shiftKey) {
      this.removeOnClick = this.isFocused(element);
      this.addFocused(element);
    } else if (!this.isFocused(element)) {
      this.setFocused(element);
    }
    this.listener.onElementMouseDown();
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
    this.draggingElements.forEach(el => el.validate());
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


  // === Private ===


  // --- Focusing

  addFocused(element) {
    this.setFocused(this.focusedElements.concat(element));
  }

  removeFocused(element) {
    this.setFocused(this.focusedElements.filter(el => el !== element));
  }

  isFocused(element) {
    return this.focusedElements.some(el => el === element);
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

  focus(element) {
    if (!this.elementIsFocused(element)) {
      element.focus();
      this.focusedElements.push(element);
    }
  }

  unfocus(element) {
    if (this.elementIsFocused(element)) {
      element.unfocus();
      this.focusedElements = this.focusedElements.filter(el => {
        return el !== element;
      });
    }
  }

  elementIsFocused(element) {
    return this.focusedElements.some(el => el === element);
  }

  // --- Element Drag Events

  onElementDragStart(evt, element) {
    this.setDraggingElements(evt, element);
  }

  onElementDragMove() {
    this.removeOnClick = false;
  }

  onElementDragStop() {}

  // --- Finding Elements

  executeFindElements(includeSelector, excludeSelector) {
    var els;

    try {
      // The :not pseudo-selector cannot have multiple arguments,
      // so split the query by commas and append the host class here.
      let excludeSelectors = excludeSelector ? excludeSelector.split(',') : [];

      excludeSelectors.push('script');
      excludeSelectors.push('style');
      excludeSelectors.push('link');
      excludeSelectors.push('svg');

      this.ignoredClasses.forEach(className => {
        excludeSelectors.push('.' + className);
      });

      excludeSelector = excludeSelectors.map(s => `:not(${s})`).join('');

      let query = `${includeSelector || '*'}${excludeSelector}`;

      els = document.body.querySelectorAll(query);

    } catch(e) {
      els = [];
    }

    for(let i = 0, el; el = els[i]; i++) {
      if (includeSelector || this.canAutoAddElement(el)) {
        this.elements.push(new PositionableElement(this, el));
      }
    }

  }

  canAutoAddElement(el) {
    var style = window.getComputedStyle(el);
    return this.elementIsVisible(style) && this.elementIsOutOfFlow(style);
  }

  elementIsVisible(style) {
    return style.display !== 'none';
  }

  elementIsOutOfFlow(style) {
    return style.position === 'absolute' || style.position === 'fixed';
  }

  // --- Dragging

  applyPositionDrag(evt, isBackground) {
    var constrained = evt.drag.constrained;
    this.draggingElements.forEach(el => {
      var x = el.isFixed ? evt.drag.clientX : evt.drag.pageX;
      var y = el.isFixed ? evt.drag.clientY : evt.drag.pageY;
      if (evt.ctrlKey) {
        el.moveBackground(x, y, constrained);
      } else {
        el.move(x, y, constrained, this.snapX, this.snapY);
      }
    });
    if (isBackground) {
      this.listener.onBackgroundPositionUpdated();
    } else {
      this.listener.onPositionUpdated();
    }
  }

  applyResizeDrag(evt, handle, element) {
    var corner, constrained, vector, rotation;

    corner      = handle.corner;
    constrained = evt.drag.constrained;

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
      el.resize(vector.x, vector.y, corner, constrained, this.snapX, this.snapY);
    });

    // Position may also shift as the result of dragging a box's
    // nw corner, or in the case of reflecting.
    this.listener.onPositionUpdated();
    this.listener.onDimensionsUpdated();
  }

  applyRotationDrag(evt) {
    this.draggingElements.forEach(el => el.rotate(evt.rotation.offset, evt.shiftKey));
    this.listener.onRotationUpdated();
  }

  setDraggingElements(evt, element) {
    this.metaKeyActive = evt.metaKey;
    if (this.metaKeyActive) {
      this.draggingElements = [element];
    } else {
      this.draggingElements = this.focusedElements;
    }
  }

  // --- Nudging

  applyPositionNudge(x, y) {
    x *= this.snapX || 1;
    y *= this.snapY || 1;
    this.focusedElements.forEach(el => el.move(x, y));
    this.listener.onPositionUpdated();
  }

  applyResizeNudge(x, y, corner) {
    x *= this.snapX || 1;
    y *= this.snapY || 1;
    this.focusedElements.forEach(el => {
      el.resize(x, y, corner);
    });
    this.listener.onPositionUpdated();
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

  // --- Peeking

  lockPeekMode() {
    this.focusedElements.forEach(el => el.lockPeekMode());
  }

  setPeekMode(on) {
    this.focusedElements.forEach(el => el.setPeekMode(on));
  }

  // --- Other

  releaseAll() {
    this.elements.forEach(el => el.destroy());
    this.elements = [];
    this.focusedElements = [];
  }

  destroy() {
    this.releaseAll();
  }

}

/*-------------------------] Element [--------------------------*/

class Element {

  constructor(el) {
    this.el = el;
  }

  addClass(className) {
    this.el.classList.add(className);
  }

  removeClass(className) {
    this.el.classList.remove(className);
  }

  replaceClass(oldName, newName) {
    this.el.classList.replace(oldName, newName);
  }

  toggleClass(className, toggle) {
    this.el.classList.toggle(className, toggle);
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

  getViewportCenter() {
    var rect = this.getBoundingClientRect();
    return new Point(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  getBoundingClientRect() {
    return this.el.getBoundingClientRect();
  }

  destroy() {
    this.el.remove();
  }

}

/*-------------------------] ElementWithState [--------------------------*/

class ElementWithState extends Element {

  constructor(el) {
    super(el);
  }

  clearState() {
    if (this.currentClassName) {
      this.removeClass(this.currentClassName);
    }
    this.currentClassName = null;
  }

  setState(className) {
    if (this.currentClassName) {
      this.replaceClass(this.currentClassName, className);
    } else {
      this.addClass(className);
    }
    this.currentClassName = className;
  }

}

/*-------------------------] BrowserEventTarget [--------------------------*/

class BrowserEventTarget extends Element {

  constructor(el) {
    super(el);
    this.listeners = [];
  }

  bindEvent(eventName, fn, capture) {
    this.addEventListener(eventName, evt => {
      fn.call(this, evt);
    }, capture);
  }

  stopPropagation(eventName) {
    this.bindEvent(eventName, evt => evt.stopPropagation());
  }

  addEventListener(eventName, handler, capture) {
    this.listeners.push({
      handler: handler,
      eventName: eventName
    });
    this.el.addEventListener(eventName, handler, capture);
  }

  removeAllListeners() {
    this.listeners.forEach(l => {
      this.el.removeEventListener(l.eventName, l.handler);
    });
    this.listeners = [];
  }

}

/*-------------------------] DragTarget [--------------------------*/

class DragTarget extends BrowserEventTarget {

  static get INTERACTIVE_ELEMENTS_SELECTOR() { return 'h1,h2,h3,h4,h5,h6,p,a,input,button,textarea,label,select,code,pre,span'; }
  static get CTRL_DOUBLE_CLICK_TIMEOUT()     { return 500; }

  constructor(el) {
    super(el);
    this.dragging = false;
    this.hovering = false;
    this.setupDragEvents();
  }


  // === Protected ===


  setDragThreshold(val) {
    this.dragThreshold = val;
  }

  setupCtrlKeyReset() {
    this.setupKeyEvents();
    this.resetsOnCtrlKey = true;
  }

  setupMetaKeyReset() {
    this.setupKeyEvents();
    this.resetsOnMetaKey = true;
  }

  setupDragIntents() {
    this.bindEvent('mouseover', this.onMouseOver);
    this.bindEvent('mouseout',  this.onMouseOut);
  }

  setupDoubleClick() {
    this.bindEvent('dblclick',    this.onDoubleClick);
    this.bindEvent('contextmenu', this.onContextMenu);
  }

  setupInteractiveElements() {
    var els = this.el.querySelectorAll(DragTarget.INTERACTIVE_ELEMENTS_SELECTOR);
    for (let i = 0, el; el = els[i]; i++) {
      var element = new BrowserEventTarget(el);
      element.stopPropagation('mousedown');
      element.stopPropagation('click');
    }
  }

  // --- Class Defined Events (to override)

  onClick()           {}
  onDoubleClick()     {}
  onDragIntentStart() {}
  onDragIntentStop()  {}

  onDragStart() {
    this.ctrlDoubleClickTimer = null;
  }

  onDragMove(evt)  {
    this.setDragData(evt);
  }

  onDragStop()  {
    this.clearUserSelect();
  }


  // === Private ===


  // --- Native Events

  onMouseOver(evt) {
    evt.stopPropagation();
    if (!this.hovering) {
      this.onDragIntentStart(evt);
    }
    this.hovering = true;
  }

  onMouseOut(evt) {
    evt.stopPropagation();
    if (this.hovering) {
      this.onDragIntentStop(evt);
    }
    this.hovering = false;
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

    this.disableUserSelect();
    this.attachDocumentListeners();
    this.attachOptionalKeyListeners();
  }

  onMouseMove(evt) {
    this.lastMouseEvent = evt;

    if (!this.canDrag(evt)) {
      return;
    }

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
    this.removeDocumentListeners();
    this.removeOptionalKeyListeners();
  }

  onScroll() {
    this.fireScrolledMouseMove();
  }

  onKeyDown(evt) {
    this.checkDragReset(evt);
  }

  onKeyUp(evt) {
    this.checkDragReset(evt);
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

  onContextMenu(evt) {
    if (evt.ctrlKey) {
      evt.preventDefault();
      this.handleCtrlDoubleClick(evt);
    }
  }

  // --- Dragging

  setupDragEvents() {
    this.bindEvent('mousedown', this.onMouseDown);
    this.bindEvent('click',     this.onNativeClick);
    this.bindEvent('dragstart', this.onNativeDragStart);

    // These two events are actually on the document, so bind manually.
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp   = this.onMouseUp.bind(this);
    this.onScroll    = this.onScroll.bind(this);
  }

  attachDocumentListeners() {
    document.documentElement.addEventListener('mousemove', this.onMouseMove);
    document.documentElement.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('scroll', this.onScroll);
  }

  removeDocumentListeners() {
    document.documentElement.removeEventListener('mousemove', this.onMouseMove);
    document.documentElement.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('scroll', this.onScroll);
  }

  setDragData(evt) {
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

  canDrag(evt) {
    return this.dragging || this.hasPassedDragThreshold(evt);
  }

  hasPassedDragThreshold(evt) {
    return !this.dragThreshold ||
           (this.axisIsPastDragThreshold(evt.clientX, this.dragOrigin.clientX) &&
            this.axisIsPastDragThreshold(evt.clientY, this.dragOrigin.clientY));
  }

  axisIsPastDragThreshold(pos, origin) {
    return Math.abs(pos - origin) >= this.dragThreshold;
  }

  // --- Key Resetting

  setupKeyEvents() {
    if (!this.hasKeyReset()) {
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp   = this.onKeyUp.bind(this);
    }
  }

  hasKeyReset() {
    return this.resetsOnMetaKey || this.resetsOnCtrlKey;
  }

  attachOptionalKeyListeners() {
    if (this.hasKeyReset()) {
      document.documentElement.addEventListener('keydown', this.onKeyDown);
      document.documentElement.addEventListener('keyup', this.onKeyUp);
    }
  }

  removeOptionalKeyListeners() {
    if (this.hasKeyReset()) {
      document.documentElement.removeEventListener('keydown', this.onKeyDown);
      document.documentElement.removeEventListener('keyup', this.onKeyUp);
    }
  }

  metaKeysChanged(keyEvt) {
    return (this.resetsOnCtrlKey && keyEvt.ctrlKey !== this.lastMouseEvent.ctrlKey) ||
           (this.resetsOnMetaKey && keyEvt.metaKey !== this.lastMouseEvent.metaKey);

  }

  checkDragReset(keyEvt) {
    if (this.metaKeysChanged(keyEvt)) {
      // Certain drag targets require a change in keys to reset the drag.
      // We can accomplish this by capturing the keys and firing mouseup,
      // mousedown, and mousemove events in order to simulate the drag being
      // stopped and restarted again. The firing of mousemove is to ensure
      // that the target remains in a "dragging" state. To represent the
      // current state of the drag correctly, the mouseup event should be
      // fired with the last mouse event object, and the new drag should
      // be started with a merged object that represents the position that
      // the mouse moved last with the current depressed keys from the
      // key events we've just received.
      var evt = this.getMergedKeyEvent(keyEvt, this.lastMouseEvent);
      this.onMouseUp(this.lastMouseEvent);
      this.onMouseDown(evt);
      this.onMouseMove(evt);
    }
  }

  getMergedKeyEvent(keyEvt, posEvt) {
    return {
      altKey:   keyEvt.altKey,
      metaKey:  keyEvt.metaKey,
      ctrlKey:  keyEvt.ctrlKey,
      shiftKey: keyEvt.shiftKey,

      pageX:   posEvt.pageX,
      pageY:   posEvt.pageY,
      clientX: posEvt.clientX,
      clientY: posEvt.clientY,
      button:  posEvt.button
    };
  }

  // --- Scrolling

  fireScrolledMouseMove() {
    // Elements that are relative to the page (not fixed) should also be dragged
    // while scrolling, as this will affect their positioning, so need to force
    // a mousemove event here. Note that there is no way to set pageX/Y on
    // triggered events, so we can't use dispatchEvent. Instead create a fake
    // event object and hand off to onMouseMove.
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
      altKey:   this.lastMouseEvent.altKey,
      button:   this.lastMouseEvent.button
    });
  }

  // --- Other

  disableUserSelect() {
    document.documentElement.style.userSelect = 'none';
  }

  clearUserSelect() {
    document.documentElement.style.userSelect = '';
  }

  handleCtrlDoubleClick(evt) {
    if (this.ctrlDoubleClickTimer) {
      this.onDoubleClick(evt);
    }
    this.ctrlDoubleClickTimer = setTimeout(() => {
      this.ctrlDoubleClickTimer = null;
    }, DragTarget.CTRL_DOUBLE_CLICK_TIMEOUT);
  }

}

/*-------------------------] DraggableElement [--------------------------*/

class DraggableElement extends DragTarget {

  static get DRAG_THRESHOLD() { return 5; }

  constructor(el, isFixed) {
    super(el);
    this.isFixed = isFixed;
    this.setupPosition();
    this.setDragThreshold(DraggableElement.DRAG_THRESHOLD);
  }


  // === Protected ===


  onMouseDown(evt) {
    super.onMouseDown(evt);
    evt.stopPropagation();
  }

  onDragStart(evt) {
    super.onDragStart(evt);
    this.dragStartH = this.cssH;
    this.dragStartV = this.cssV;
  }

  onDragMove(evt) {
    super.onDragMove(evt);
    this.cssH = this.dragStartH.clone();
    this.cssV = this.dragStartV.clone();
    this.cssH.add(this.isFixed ? evt.drag.clientX : evt.drag.pageX);
    this.cssV.add(this.isFixed ? evt.drag.clientY : evt.drag.pageY);
    this.render();
  }


  // === Private ===


  setupPosition() {
    var matcher = new CSSRuleMatcher(this.el);
    this.cssH = CSSPositioningProperty.horizontalFromMatcher(matcher);
    this.cssV = CSSPositioningProperty.verticalFromMatcher(matcher);
  }

  render() {
    this.cssH.render(this.el.style);
    this.cssV.render(this.el.style);
  }

}

/*-------------------------] DragSelection [--------------------------*/

class DragSelection extends DragTarget {

  constructor(listener, uiRoot) {
    super(document.documentElement);
    this.listener = listener;
    this.setupInterface(uiRoot);
  }

  contains(el) {
    var center = new Element(el).getViewportCenter();
    var rect   = this.ui.getBoundingClientRect();

    return rect.left   <= center.x &&
           rect.right  >= center.x &&
           rect.top    <= center.y &&
           rect.bottom >= center.y;
  }


  // === Protected ===


  onDragStart(evt) {
    super.onDragStart(evt);
    this.dragStartBox = CSSBox.fromPixelValues(evt.clientX, evt.clientY, 0, 0);
    this.ui.show();
    this.listener.onDragSelectionStart();
  }

  onDragMove(evt) {
    super.onDragMove(evt);
    this.cssBox = this.dragStartBox.clone();
    this.cssBox.resize(evt.drag.x, evt.drag.y, 'se');
    this.render();
    this.listener.onDragSelectionMove();
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.ui.hide();
    this.listener.onDragSelectionStop();
  }

  onClick() {
    this.listener.onDragSelectionClear();
  }


  // === Private ===


  setupInterface(uiRoot) {
    this.ui = new Element(uiRoot.getElementById('drag-selection'));
  }

  render() {
    this.cssBox.render(this.ui.el.style);
  }

}

/*-------------------------] ControlPanel [--------------------------*/

class ControlPanel extends DraggableElement {

  static get ACTIVE_CLASS()  { return 'control-panel--active'; }
  static get WINDOWS_CLASS() { return 'control-panel--win';    }

  constructor(listener, uiRoot, isMac) {
    super(uiRoot.getElementById('control-panel'), true);
    this.listener = listener;
    this.setup(uiRoot, isMac);
  }

  activate() {
    this.show();
    this.addClass(ControlPanel.ACTIVE_CLASS);
  }

  clearState() {
    this.clearAreaStates();
  }

  // --- Areas

  showDefaultArea() {
    this.showArea(this.defaultArea);
  }

  showElementArea() {
    this.showArea(this.elementArea);
  }

  showMultipleArea() {
    this.showArea(this.multipleArea);
  }

  showSettingsArea() {
    this.showArea(this.settingsArea);
  }

  showQuickstartArea() {
    this.showArea(this.quickstartArea);
  }

  // --- Rendering

  renderMultipleHeader(str) {
    this.multipleArea.renderHeader(str);
  }

  renderMultipleSelected(elements) {
    this.multipleArea.renderSelected(elements);
  }

  renderElementSelector(selector) {
    this.elementArea.renderSelector(selector);
  }

  renderElementPosition(position) {
    this.elementArea.renderPosition(position);
  }

  renderElementDimensions(dimensions) {
    this.elementArea.renderDimensions(dimensions);
  }

  renderElementZIndex(zIndex) {
    this.elementArea.renderZIndex(zIndex);
  }

  renderElementTransform(transform) {
    this.elementArea.renderTransform(transform);
  }

  renderElementBackgroundPosition(backgroundPosition) {
    this.elementArea.renderBackgroundPosition(backgroundPosition);
  }

  renderUpgradeStatus(pro, timeRemaining) {
    this.settingsArea.renderUpgradeStatus(pro, timeRemaining);
  }

  renderUpgradeThankYou() {
    this.settingsArea.renderUpgradeThankYou();
  }

  // --- Other

  setNudgeMode(mode) {
    this.modeIndicator.setMode(mode);
  }

  closeSettings() {
    if (this.activeArea === this.settingsArea) {
      this.showLastArea();
    }
  }


  // === Protected ===


  onDragStart(evt) {
    super.onDragStart(evt);
    this.listener.onControlPanelDragStart(evt);
  }

  onDragStop(evt) {
    super.onDragStop(evt);
    this.listener.onControlPanelDragStop(evt);
  }

  onAreaSizeChanged() {
    this.renderArea();
  }


  // === Private ===


  setup(uiRoot, isMac) {
    this.setupDimensions();
    this.setupAreas(uiRoot);
    this.setupButtons(uiRoot);
    this.setupModeIndicator(uiRoot);
    this.setupWindowsKeys(isMac);
    this.setupInteractiveElements();
    this.setupDoubleClick();
  }

  setupDimensions() {
    this.defaultH  = this.cssH;
    this.defaultV  = this.cssV;
    this.cssWidth  = new CSSPixelValue(0);
    this.cssHeight = new CSSPixelValue(0);
  }

  setupAreas(uiRoot) {
    this.defaultArea    = new ControlPanelDefaultArea(this, uiRoot);
    this.elementArea    = new ControlPanelElementArea(this, uiRoot);
    this.multipleArea   = new ControlPanelMultipleArea(this, uiRoot);
    this.settingsArea   = new ControlPanelSettingsArea(this, uiRoot);
    this.quickstartArea = new ControlPanelQuickstartArea(this, uiRoot);
  }

  setupButtons(uiRoot) {
    var el = uiRoot.getElementById('control-panel-settings-button');
    el.addEventListener('click', this.onSettingsClick.bind(this));
  }

  setupModeIndicator(uiRoot) {
    this.modeIndicator = new ControlPanelModeIndicator(uiRoot);
  }

  setupWindowsKeys(isMac) {
    if (!isMac) {
      this.addClass(ControlPanel.WINDOWS_CLASS);
    }
  }

  // --- Areas

  showArea(area) {
    if (this.activeArea) {
      this.activeArea.hide();
    }
    this.lastArea = this.activeArea;
    this.activeArea = area;
    this.renderModeIndicator();
    this.renderArea();
  }

  showLastArea() {
    if (this.lastArea) {
      this.showArea(this.lastArea);
    }
  }

  clearAreaStates() {
    this.defaultArea.clearState();
    this.elementArea.clearState();
    this.multipleArea.clearState();
    this.settingsArea.clearState();
    this.quickstartArea.clearState();
  }

  // --- Events

  onDoubleClick() {
    this.cssH = this.defaultH;
    this.cssV = this.defaultV;
    this.render();
  }

  onSettingsClick() {
    if (this.activeArea === this.settingsArea) {
      this.showLastArea();
    } else {
      this.showSettingsArea();
    }
    this.listener.onShowSettingsClick();
  }

  // --- Rendering

  renderModeIndicator() {
    if (this.activeArea.usesModeIndicator()) {
      this.modeIndicator.show();
    } else {
      this.modeIndicator.hide();
    }
  }

  renderArea() {
    var size = this.activeArea.getSize();
    this.activeArea.show();
    this.cssWidth.px  = size.x;
    this.cssHeight.px = size.y;
    this.el.style.width  = this.cssWidth;
    this.el.style.height = this.cssHeight;
  }

}

/*-------------------------] ControlPanelArea [--------------------------*/

class ControlPanelArea extends ElementWithState {

  static get ACTIVE_CLASS() { return 'control-panel-area--active'; }

  constructor(panel, uiRoot, name, sizes) {
    super(uiRoot.getElementById(name + '-area'));
    this.panel    = panel;
    this.sizes    = sizes;
    this.size     = sizes.default;
  }

  show() {
    this.addClass(ControlPanelArea.ACTIVE_CLASS);
  }

  hide() {
    this.removeClass(ControlPanelArea.ACTIVE_CLASS);
  }

  getSize() {
    return this.size;
  }

  usesModeIndicator() {
    return false;
  }


  // === Protected ===


  setupButton(uiRoot, id, handler, double) {
    var el = uiRoot.getElementById(id);
    var eventName = double ? 'dblclick' : 'click';
    el.addEventListener(eventName, handler.bind(this));
  }

  setSize(size) {
    if (size !== this.size) {
      this.size = size;
      this.panel.onAreaSizeChanged();
    }
  }

}

/*-------------------------] ControlPanelSettingsArea [--------------------------*/

class ControlPanelSettingsArea extends ControlPanelArea {

  static get AREA_HELP_CLASS()     { return 'settings-area--help';     }
  static get AREA_BASIC_CLASS()    { return 'settings-area--basic';    }
  static get AREA_ADVANCED_CLASS() { return 'settings-area--advanced'; }

  static get THANK_YOU_CLASS()     { return 'upgrade-prompt--thank-you';     }
  static get TRIAL_ACTIVE_CLASS()  { return 'upgrade-prompt--trial-active';  }
  static get TRIAL_EXPIRED_CLASS() { return 'upgrade-prompt--trial-expired'; }

  static get ONE_DAY()  { return 24 * 60 * 60 * 1000; }
  static get ONE_HOUR() { return 60 * 60 * 1000;      }

  static get SIZES() {
    return {
      default: new Point(680, 400),
      help:    new Point(660, 530)
    };
  }

  constructor(panel, uiRoot) {
    super(panel, uiRoot, 'settings', ControlPanelSettingsArea.SIZES);
    this.setupElements(uiRoot);
    this.setupButtons(uiRoot);
    this.setBasicMode();
  }

  renderUpgradeStatus(pro, timeRemaining) {
    if (pro) {
      this.proBadge.show();
    } else if (timeRemaining > 0) {
      this.upgradePrompt.setState(ControlPanelSettingsArea.TRIAL_ACTIVE_CLASS);
      this.upgradeTime.text(this.getTimeRemainingInWords(timeRemaining));
    } else {
      this.upgradePrompt.setState(ControlPanelSettingsArea.TRIAL_EXPIRED_CLASS);
    }
  }

  renderUpgradeThankYou() {
    this.upgradePrompt.setState(ControlPanelSettingsArea.THANK_YOU_CLASS);
  }

  // === Private ===


  setupElements(uiRoot) {
    this.proBadge      = new Element(uiRoot.getElementById('pro-badge'));
    this.upgradeTime   = new Element(uiRoot.getElementById('upgrade-time-remaining'));
    this.upgradePrompt = new ElementWithState(uiRoot.getElementById('upgrade-prompt'));
  }

  setupButtons(uiRoot) {
    this.setupButton(uiRoot, 'settings-tab-help', this.setHelpMode);
    this.setupButton(uiRoot, 'settings-tab-basic', this.setBasicMode);
    this.setupButton(uiRoot, 'settings-tab-advanced', this.setAdvancedMode);
    this.setupButton(uiRoot, 'upgrade-button', this.onUpgradeButtonClick);
    this.setupButton(uiRoot, 'payment-debug', this.onDebugButtonClick, true);
  }

  setHelpMode() {
    this.setState(ControlPanelSettingsArea.AREA_HELP_CLASS);
    this.setSize(this.sizes.help);
  }

  setBasicMode() {
    this.setState(ControlPanelSettingsArea.AREA_BASIC_CLASS);
    this.setSize(this.sizes.default);
    this.panel.listener.onBasicSettingsClick();
  }

  setAdvancedMode() {
    this.setState(ControlPanelSettingsArea.AREA_ADVANCED_CLASS);
    this.setSize(this.sizes.default);
    this.panel.listener.onAdvancedSettingsClick();
  }

  onUpgradeButtonClick() {
    this.panel.listener.onUpgradeClick();
  }

  onDebugButtonClick() {
    this.panel.listener.onDebugClick();
  }

  getTimeRemainingInWords(ms) {
    var day, hour, val, suffix;

    day  = ControlPanelSettingsArea.ONE_DAY;
    hour = ControlPanelSettingsArea.ONE_HOUR;

    if (ms >= day) {
      val = Math.floor(ms / day);
      suffix = val === 1 ? 'day' : 'days';
    } else if (ms >= hour) {
      val = Math.floor(ms / hour);
      suffix = val === 1 ? 'hour' : 'hours';
    } else {
      return 'a few minutes';
    }
    return val + ' ' + suffix;
  }

  clearState() {
    super.clearState();
    this.proBadge.hide();
    this.upgradePrompt.clearState();
  }

}


/*-------------------------] ControlPanelElementArea [--------------------------*/

class ControlPanelElementArea extends ControlPanelArea {

  static get TRANSFORM_CLASS()  { return 'element-area--transform-active'; }
  static get BACKGROUND_CLASS() { return 'element-area--background-active'; }

  static get LONG_SELECTOR_LENGTH() { return 30; }
  static get LONG_SELECTOR_CLASS()  { return 'element-area-selector--long'; }

  static get SIZES() {
    return {
      default:  new Point(500, 110),
      single:   new Point(500, 131),
      multiple: new Point(500, 152)
    };
  }

  constructor(panel, uiRoot) {
    super(panel, uiRoot, 'element', ControlPanelElementArea.SIZES);
    this.setupElements(uiRoot);
  }

  usesModeIndicator() {
    return true;
  }

  // --- Rendering

  renderSelector(selector) {
    var isLong = selector.length > ControlPanelElementArea.LONG_SELECTOR_LENGTH;
    this.toggleClass(ControlPanelElementArea.LONG_SELECTOR_CLASS, isLong);
    this.renderField(this.selector, selector);
  }

  renderPosition(position) {
    this.renderField(this.position, position);
  }

  renderDimensions(dimensions) {
    this.renderField(this.dimensions, dimensions);
  }

  renderZIndex(zIndex) {
    zIndex = zIndex ? zIndex + 'z' : '';
    this.renderField(this.zIndex, zIndex);
    if (zIndex) {
      this.zIndex.unhide();
    } else {
      this.zIndex.hide();
    }
  }

  renderTransform(transform) {
    this.hasTransform = !!transform;
    this.renderField(this.transform, transform);
    this.toggleClass(ControlPanelElementArea.TRANSFORM_CLASS, transform);
    this.setSize();
  }

  renderBackgroundPosition(backgroundPosition) {
    this.hasBackgroundPosition = !!backgroundPosition;
    this.renderField(this.backgroundPosition, backgroundPosition);
    this.toggleClass(ControlPanelElementArea.BACKGROUND_CLASS, backgroundPosition);
    this.setSize();
  }


  // === Private ===


  setupElements(uiRoot) {
    this.selector           = new Element(uiRoot.getElementById('element-selector'));
    this.position           = new Element(uiRoot.getElementById('element-position'));
    this.dimensions         = new Element(uiRoot.getElementById('element-dimensions'));
    this.zIndex             = new Element(uiRoot.getElementById('element-zindex'));
    this.transform          = new Element(uiRoot.getElementById('element-transform'));
    this.backgroundPosition = new Element(uiRoot.getElementById('element-background-position'));
  }

  setSize() {
    var size;
    if (this.hasTransform && this.hasBackgroundPosition) {
      size = this.sizes.multiple;
    } else if (this.hasTransform || this.hasBackgroundPosition) {
      size = this.sizes.single;
    } else {
      size = this.sizes.default;
    }
    super.setSize(size);
  }

  renderField(field, text) {
    field.text(text || '');
  }

}

/*-------------------------] ControlPanelMultipleArea [--------------------------*/

class ControlPanelMultipleArea extends ControlPanelArea {

  static get HIGHLIGHT_BUTTON_CLASS()   { return 'highlight-button'; }

  static get HIGHLIGHT_MANY_THRESHOLD() { return 16; }
  static get HIGHLIGHT_LOTS_THRESHOLD() { return 36; }
  static get HIGHLIGHT_TONS_THRESHOLD() { return 60; }
  static get HIGHLIGHT_LOTS_CLASS()     { return 'multiple-area--highlight-lots'; }
  static get HIGHLIGHT_TONS_CLASS()     { return 'multiple-area--highlight-tons'; }

  static get SIZES() {
    return {
      default: new Point(490, 150),
      many:    new Point(490, 165),
      lots:    new Point(490, 180),
      tons:    new Point(490, 190)
    };
  }

  constructor(panel, uiRoot) {
    super(panel, uiRoot, 'multiple', ControlPanelMultipleArea.SIZES);
    this.setupButtons(uiRoot);
  }

  usesModeIndicator() {
    return true;
  }

  // --- Rendering

  renderHeader(str) {
    str = str || this.highlightedCount + ' elements selected';
    this.header.text(str);
  }

  renderSelected(elements) {
    this.highlightedCount = elements.length;
    if (this.highlightedCount > 2) {
      this.distributeButtons.unhide();
    } else {
      this.distributeButtons.hide();
    }
    this.renderHighlightButtons(elements);
    this.renderHeader();
  }


  // === Private ===


  setupButtons(uiRoot) {
    // UI Buttons
    this.setupButton(uiRoot, 'align-top-button',          this.onAlignTopClick);
    this.setupButton(uiRoot, 'align-hcenter-button',      this.onAlignHCenterClick);
    this.setupButton(uiRoot, 'align-bottom-button',       this.onAlignBottomClick);
    this.setupButton(uiRoot, 'align-left-button',         this.onAlignLeftClick);
    this.setupButton(uiRoot, 'align-vcenter-button',      this.onAlignVCenterClick);
    this.setupButton(uiRoot, 'align-right-button',        this.onAlignRightClick);
    this.setupButton(uiRoot, 'distribute-hcenter-button', this.onDistributeHCenterClick);
    this.setupButton(uiRoot, 'distribute-vcenter-button', this.onDistributeVCenterClick);

    // Elements
    this.header            = new Element(uiRoot.getElementById('multiple-header'));
    this.distributeButtons = new Element(uiRoot.getElementById('distribute-buttons'));
    this.highlightButtons  = new BrowserEventTarget(uiRoot.getElementById('highlight-buttons'));

    // Highlights
    this.setupHighlightButtons();
  }

  setupHighlightButtons() {
    this.highlightButtons.addEventListener('mouseover', this.onHighlightButtonMouseOver.bind(this));
    this.highlightButtons.addEventListener('mouseout', this.onHighlightButtonMouseOut.bind(this));
    this.highlightButtons.addEventListener('click', this.onHighlightButtonClick.bind(this));
  }

  // --- Events

  onAlignTopClick() {
    this.panel.listener.onAlignButtonClick('top');
  }

  onAlignHCenterClick() {
    this.panel.listener.onAlignButtonClick('hcenter');
  }

  onAlignBottomClick() {
    this.panel.listener.onAlignButtonClick('bottom');
  }

  onAlignLeftClick() {
    this.panel.listener.onAlignButtonClick('left');
  }

  onAlignVCenterClick() {
    this.panel.listener.onAlignButtonClick('vcenter');
  }

  onAlignRightClick() {
    this.panel.listener.onAlignButtonClick('right');
  }

  onDistributeHCenterClick() {
    this.panel.listener.onDistributeButtonClick('hcenter');
  }

  onDistributeVCenterClick() {
    this.panel.listener.onDistributeButtonClick('vcenter');
  }

  onHighlightButtonMouseOver(evt) {
    this.fireFromHighlightEvent(evt, 'onElementHighlightMouseOver');
  }

  onHighlightButtonMouseOut(evt) {
    this.fireFromHighlightEvent(evt, 'onElementHighlightMouseOut');
  }

  onHighlightButtonClick(evt) {
    this.fireFromHighlightEvent(evt, 'onElementHighlightClick');
    this.clearHighlightButtons();
  }

  // --- Highlighting

  fireFromHighlightEvent(evt, name) {
    var index = evt.target.dataset.index;
    if (index && this.activeArea === this.multipleArea) {
      this.panel.listener[name](index);
    }
  }

  renderHighlightButtons(elements) {
    var el = this.highlightButtons.el, html, className;
    className = ControlPanelMultipleArea.HIGHLIGHT_BUTTON_CLASS;
    html = elements.map((el, i) => {
      return `<div data-index="${i}"class="${className}"></div>`;
    }).join('');
    el.innerHTML = html;
    if (elements.length > ControlPanelMultipleArea.HIGHLIGHT_TONS_THRESHOLD) {
      this.setState(ControlPanelMultipleArea.HIGHLIGHT_TONS_CLASS);
      this.setSize(this.sizes.tons);
    } else if (elements.length > ControlPanelMultipleArea.HIGHLIGHT_LOTS_THRESHOLD) {
      this.setState(ControlPanelMultipleArea.HIGHLIGHT_LOTS_CLASS);
      this.setSize(this.sizes.lots);
    } else if (elements.length > ControlPanelMultipleArea.HIGHLIGHT_MANY_THRESHOLD) {
      this.clearState();
      this.setSize(this.sizes.many);
    } else {
      this.clearState();
      this.setSize(this.sizes.default);
    }
  }

  clearHighlightButtons() {
    this.highlightButtons.el.innerHTML = '';
  }

}

/*-------------------------] ControlPanelQuickstartArea [--------------------------*/

class ControlPanelQuickstartArea extends ControlPanelArea {

  static get SIZES() {
    return {
      default: new Point(590, 380)
    };
  }

  constructor(panel, uiRoot) {
    super(panel, uiRoot, 'quickstart', ControlPanelQuickstartArea.SIZES);
    this.setupButtons(uiRoot);
  }


  // === Private ===


  setupButtons(uiRoot) {
    this.setupButton(uiRoot, 'quickstart-skip-link', this.onSkipClick);
  }

  // --- Events

  onSkipClick() {
    this.panel.listener.onQuickstartSkip();
  }

}

/*-------------------------] ControlPanelDefaultArea [--------------------------*/

class ControlPanelDefaultArea extends ControlPanelArea {

  static get SIZES() {
    return {
      default: new Point(180, 90)
    };
  }

  constructor(panel, uiRoot) {
    super(panel, uiRoot, 'default', ControlPanelDefaultArea.SIZES);
  }

}

/*-------------------------] ControlPanelModeIndicator [--------------------------*/

class ControlPanelModeIndicator extends Element {

  static get ACTIVE_CLASS() { return 'mode-indicator--active'; }

  constructor(uiRoot) {
    super(uiRoot.getElementById('mode-indicator'));
    this.setupElements(uiRoot);
  }

  show() {
    this.addClass(ControlPanelModeIndicator.ACTIVE_CLASS);
  }

  hide() {
    this.removeClass(ControlPanelModeIndicator.ACTIVE_CLASS);
  }

  setMode(mode) {
    var el = this.getElementForMode(mode);
    if (this.currentElement && this.currentElement !== el) {
      this.currentElement.hide();
    }
    el.show();
    this.currentElement = el;
  }


  // === Private ===


  setupElements(uiRoot) {
    this.position   = new Element(uiRoot.getElementById('mode-position'));
    this.seResize   = new Element(uiRoot.getElementById('mode-resize-se'));
    this.nwResize   = new Element(uiRoot.getElementById('mode-resize-nw'));
    this.resize     = new Element(uiRoot.getElementById('mode-resize'));
    this.rotate     = new Element(uiRoot.getElementById('mode-rotate'));
    this.zIndex     = new Element(uiRoot.getElementById('mode-z-index'));
    this.background = new Element(uiRoot.getElementById('mode-background'));
  }

  getElementForMode(mode) {
    switch (mode) {
      case 'position':   return this.position;
      case 'resize-se':  return this.seResize;
      case 'resize-nw':  return this.nwResize;
      case 'rotate':     return this.rotate;
      case 'z-index':    return this.zIndex;
      case 'background': return this.background;
    }
  }

}

/*-------------------------] Settings [--------------------------*/

class Settings {

  // --- Fields
  static get SAVE_FILENAME()       { return 'save-filename';       }
  static get INCLUDE_SELECTOR()    { return 'include-selector';    }
  static get EXCLUDE_SELECTOR()    { return 'exclude-selector';    }
  static get TAB_STYLE()           { return 'tab-style';           }
  static get OUTPUT_SELECTOR()     { return 'output-selector';     }
  static get OUTPUT_CHANGED_ONLY() { return 'output-changed-only'; }
  static get SNAP_X()              { return 'snap-x';              }
  static get SNAP_Y()              { return 'snap-y';              }
  static get OUTPUT_GROUPING()     { return 'output-grouping';     }
  static get GROUPING_MAP()        { return 'grouping-map';        }
  static get SKIP_QUICKSTART()     { return 'skip-quickstart';     }

  // --- Values
  static get OUTPUT_SELECTOR_ID()      { return 'id';      }
  static get OUTPUT_SELECTOR_ALL()     { return 'all';     }
  static get OUTPUT_SELECTOR_TAG()     { return 'tag';     }
  static get OUTPUT_SELECTOR_TAG_NTH() { return 'tag-nth'; }
  static get OUTPUT_SELECTOR_AUTO()    { return 'auto';    }
  static get OUTPUT_SELECTOR_FIRST()   { return 'first';   }
  static get OUTPUT_SELECTOR_NONE()    { return 'none';    }
  static get OUTPUT_SELECTOR_LONGEST() { return 'longest'; }
  static get OUTPUT_GROUPING_MAP()     { return 'map';     }
  static get OUTPUT_GROUPING_AUTO()    { return 'auto';    }
  static get OUTPUT_GROUPING_NONE()    { return 'none';    }
  static get OUTPUT_GROUPING_REMOVE()  { return 'remove';  }
  static get TABS_TWO_SPACES()         { return 'two';     }
  static get TABS_FOUR_SPACES()        { return 'four';    }
  static get TABS_EIGHT_SPACES()       { return 'eight';   }
  static get TABS_TAB()                { return 'tab';     }

  // --- Validation
  static get ATTRIBUTE_SELECTOR_REG() { return /\[[^\]]+(\])?/gi;    }

  // --- Controls
  static get SNAP_CONTROLS()          { return [Settings.SNAP_X, Settings.SNAP_Y];                     }
  static get QUERY_CONTROLS()         { return [Settings.INCLUDE_SELECTOR, Settings.EXCLUDE_SELECTOR]; }
  static get GROUPING_MAP_CONTROLS()  { return [Settings.GROUPING_MAP];                                }

  // --- Fields
  static get SNAP_FIELD()             { return 'snap-field';         }
  static get GROUPING_MAP_FIELD()     { return 'grouping-map-field'; }

  static get FIELDS() {
    return [
      this.SAVE_FILENAME,
      this.INCLUDE_SELECTOR,
      this.EXCLUDE_SELECTOR,
      this.TAB_STYLE,
      this.OUTPUT_SELECTOR,
      this.OUTPUT_CHANGED_ONLY,
      this.SNAP_X,
      this.SNAP_Y,
      this.OUTPUT_GROUPING,
      this.GROUPING_MAP,
      this.SKIP_QUICKSTART
    ];
  }

  static get ADVANCED_FIELDS() {
    return [
      this.SNAP_X,
      this.SNAP_Y,
      this.OUTPUT_GROUPING,
      this.GROUPING_MAP
    ];
  }

  constructor(listener, uiRoot) {
    this.listener = listener;
    this.setup(uiRoot);
    this.fetchStoredSettings();
  }

  get(name) {
    return this.data[name];
  }

  set(name, val) {
    this.data[name] = val;
    this.storageManager.save(name, val);
  }

  focusForm() {
    this.form.focus();
  }

  setBasic() {
    this.form.setBasic();
  }

  setAdvanced() {
    this.form.setAdvanced();
  }

  toggleAdvancedFeatures(on) {
    this.form.toggleAdvancedFeatures(on);
    this.advancedFeatures = on;
    this.checkAdvancedFeaturesReset();
  }


  // === Protected ===


  // --- Events

  onStorageDataFetched(data) {
    this.data = Object.assign({}, this.defaultData, data);
    this.onInitialized();
    this.checkAdvancedFeaturesReset();
  }

  onStorageDataSaved() {}
  onStorageDataRemoved() {}

  onFormFocus(evt) {
    this.listener.onSettingsFormFocus(evt);
  }

  onFormBlur(evt) {
    this.listener.onSettingsFormBlur(evt);
  }

  onFormSubmit(evt, form) {
    var data = form.getData();
    this.saveStoredSettings(data);
    this.updateData(data);
    this.listener.onSettingsSubmitted();
  }

  onFormReset() {
    this.clearStoredSettings();
    this.updateData(this.defaultData);
    this.updateLinkedSelects();
    this.listener.onSettingsCleared();
  }

  // === Private ===

  setup(uiRoot) {
    this.advancedFeatures = true;
    this.setupForm(uiRoot);
    this.setupStorage();
    this.defaultData = this.form.getData();
  }

  setupForm(uiRoot) {
    this.form = new SettingsForm(this, uiRoot.getElementById('settings-form'));

    this.isValidQuery         = this.isValidQuery.bind(this);
    this.isValidSnap          = this.isValidSnap.bind(this);
    this.isValidGroupingMap   = this.isValidGroupingMap.bind(this);
    this.parseGroupingMap     = this.parseGroupingMap.bind(this);
    this.stringifyGroupingMap = this.stringifyGroupingMap.bind(this);

    this.form.addValidation(Settings.QUERY_CONTROLS, this.isValidQuery);
    this.form.addValidation(Settings.SNAP_CONTROLS, this.isValidSnap, Settings.SNAP_FIELD);
    this.form.addValidation(Settings.GROUPING_MAP_CONTROLS, this.isValidGroupingMap, Settings.GROUPING_MAP_FIELD);
    this.form.addTransform(Settings.GROUPING_MAP, this.parseGroupingMap, this.stringifyGroupingMap);

    this.selectorLinkedSelect = new LinkedSelect(uiRoot.getElementById('output-selector'));
    this.groupingLinkedSelect = new LinkedSelect(uiRoot.getElementById('output-grouping'));
  }

  setupStorage() {
    this.storageManager = new ChromeStorageManager(this);
  }

  // --- Updating

  updateData(data) {
    if (this.selectorChanged(data)) {
      this.listener.onSelectorUpdated();
    }
    if (this.snapChanged(data)) {
      this.listener.onSnappingUpdated(
        data[Settings.SNAP_X],
        data[Settings.SNAP_Y]
      );
    }
    Object.assign(this.data, data);
  }

  // --- Events

  onInitialized() {
    this.form.setControlsFromData(this.data);
    this.updateLinkedSelects();
    this.listener.onSettingsInitialized();
  }

  selectorChanged(data) {
    return this.data[Settings.INCLUDE_SELECTOR] !== (data[Settings.INCLUDE_SELECTOR] || '') ||
           this.data[Settings.EXCLUDE_SELECTOR] !== (data[Settings.EXCLUDE_SELECTOR] || '');
  }

  snapChanged(data) {
    return this.data[Settings.SNAP_X] !== (data[Settings.SNAP_X] || 0) ||
           this.data[Settings.SNAP_Y] !== (data[Settings.SNAP_Y] || 0);
  }

  // --- Storage

  fetchStoredSettings() {
    this.storageManager.fetch(Settings.FIELDS);
  }

  saveStoredSettings(data) {
    this.storageManager.save(data);
  }

  clearStoredSettings() {
    this.storageManager.remove(Settings.FIELDS);
  }

  // --- Validations

  isValidQuery(query) {
    var reg, match;
    if (!query) {
      return true;
    }
    try {
      document.querySelector(query);
      reg = Settings.ATTRIBUTE_SELECTOR_REG;
      while (match = reg.exec(query)) {
        if (!match[1]) {
          return false;
        }
      }
    } catch (e) {
      return false;
    }
    return true;
  }

  isValidSnap(n) {
    return !n || n > 0;
  }

  isValidGroupingMap(str) {
    return !str || !!this.parseGroupingMap(str);
  }

  // --- Transforms

  parseGroupingMap(str) {
    var lines = str.split('\n'), data = {};
    lines = lines.filter(l => l);
    for (let i = 0, line; line = lines[i]; i++) {
      var match, key, val;
      match = line.match(/\s*([^:]+):\s*([^;]+)/);
      if (!match) {
        return null;
      }
      key = match[1];
      val = match[2];
      data[key] = val;
    }
    return data;
  }

  stringifyGroupingMap(obj) {
    return Object.keys(obj).map(key => {
      return key + ': ' + obj[key];
    }).join('\n');
  }

  // --- Linked Selects

  updateLinkedSelects() {
    this.selectorLinkedSelect.update();
    this.groupingLinkedSelect.update();
  }

  // --- Advanced Features

  checkAdvancedFeaturesReset() {
    if (!this.advancedFeatures && !this.advancedFeaturesAreDefault()) {
      this.resetAdvancedFeatures();
    }
  }

  advancedFeaturesAreDefault() {
    if (this.data) {
      return Settings.ADVANCED_FIELDS.every(f => {
        return this.data[f] === this.defaultData[f];
      });
    }
  }

  resetAdvancedFeatures() {
    var data = {};
    Settings.ADVANCED_FIELDS.forEach(f => {
      data[f] = this.defaultData[f];
    });
    // Set the data but do not save it to storage
    // so that it can be accessed again.
    this.updateData(data);
  }

  // --- Other

  destroy() {
    this.form.destroy();
  }

}

/*-------------------------] SettingsForm [--------------------------*/

class SettingsForm extends BrowserEventTarget {

  // Input Types
  static get TEXT()       { return 'text';       }
  static get NUMBER()     { return 'number';     }
  static get CHECKBOX()   { return 'checkbox';   }
  static get TEXTAREA()   { return 'textarea';   }
  static get SELECT_ONE() { return 'select-one'; }

  // Classes
  static get INVALID_CLASS()                    { return 'settings-field--invalid';          }
  static get ADVANCED_PAGE_CLASS()              { return 'settings-form-page--advanced';     }
  static get ADVANCED_VISIBLE_CLASS()           { return 'settings-form--advanced-visible';  }
  static get ADVANCED_FEATURES_DISABLED_CLASS() { return 'settings-form--advanced-disabled'; }

  // Other
  static get INPUT_TYPES()     { return ['input', 'select', 'textarea']; }
  static get CONFIRM_MESSAGE() { return 'Really clear all settings?';    }

  constructor(listener, el) {
    super(el);
    this.listener = listener;
    this.bindEvent('submit', this.onSubmit);
    this.bindEvent('reset', this.onReset);
    this.bindEvent('focus', this.onFocus, true);
    this.bindEvent('blur', this.onBlur, true);

    // Stop propagation on interactive events
    this.stopPropagation('click');

    this.validState = true;
    this.validations = [];
    this.transforms  = {};
  }

  // --- Modes

  setBasic() {
    this.removeClass(SettingsForm.ADVANCED_VISIBLE_CLASS);
  }

  setAdvanced() {
    this.addClass(SettingsForm.ADVANCED_VISIBLE_CLASS);
  }

  toggleAdvancedFeatures(on) {
    var query = SettingsForm.INPUT_TYPES.map(t => {
      return '.' + SettingsForm.ADVANCED_PAGE_CLASS + ' ' + t;
    }).join(',');
    this.el.querySelectorAll(query).forEach(el => el.disabled = !on);
    this.toggleClass(SettingsForm.ADVANCED_FEATURES_DISABLED_CLASS, !on);
  }

  // --- Transform and Validations

  addTransform(id, parse, stringify) {
    var transform = {
      parse: parse,
      stringify: stringify
    };
    this.transforms[id] = transform;
  }

  addValidation(controls, validator, field) {
    this.validations.push({
      field: field,
      controls: controls,
      validator: validator
    });
  }

  // --- Data Handling

  getData() {
    var data = {};
    this.forEachControl(control => {
      if (control.type === SettingsForm.CHECKBOX) {
        data[control.id] = control.checked;
      } else if (control.type === SettingsForm.NUMBER) {
        data[control.id] = parseInt(control.value) || 0;
      } else {
        data[control.id] = this.getTransformedControlValue(control);
      }
    });
    return data;
  }

  setControlsFromData(data) {
    this.forEachControl(control => {
      var val = this.getTransformedDataValue(data, control.id);

      if (val) {
        switch (control.type) {
          case SettingsForm.SELECT_ONE:
            for (var i = 0, option; option = control.options[i]; i++) {
              if (option.value === val) {
                option.selected = true;
              }
            }
            break;
          case SettingsForm.TEXT:
          case SettingsForm.NUMBER:
          case SettingsForm.TEXTAREA:
            control.value = val;
            break;
          case SettingsForm.CHECKBOX:
            control.checked = !!val;
            break;
        }
      }
    });
  }

  // --- Other

  focus() {
    // Set a bit of a timeout to focus to avoid rendering bugs.
    setTimeout(() => this.getFirstControl().focus(), 200);
  }


  // === Private ===


  // --- Events

  onSubmit(evt) {
    evt.preventDefault();
    this.runValidations();
    if (this.validState) {
      this.listener.onFormSubmit(evt, this);
      this.blur();
    }
  }

  onReset(evt) {
    if (confirm(SettingsForm.CONFIRM_MESSAGE)) {
      // Set a bit of a timeout to avoid UI jank after the
      // confirm dialogue clears. This also lets the form
      // reset itself so that the validations can be run
      // as the reset event happens before form controls
      // are actually cleared.
      setTimeout(() => {
        this.runValidations();
        this.listener.onFormReset(evt, this);
      }, 100);
      this.blur();
    } else {
      evt.preventDefault();
    }
  }

  onFocus(evt) {
    this.listener.onFormFocus(evt);
  }

  onBlur(evt) {
    this.listener.onFormBlur(evt);
  }

  // --- Transform and Validations

  getTransformedControlValue(control) {
    var transform = this.transforms[control.id];
    return transform ? transform.parse(control.value) : control.value;
  }

  getTransformedDataValue(data, id) {
    var val = data[id];
    var transform = this.transforms[id];
    return transform ? transform.stringify(val) : val;
  }

  runValidations() {
    var validState = true;
    this.clearInvalid();
    this.forEachValidation((control, field, validator) => {
      if (!validator(control.value)) {
        validState = false;
        field.classList.add(SettingsForm.INVALID_CLASS);
      }
    });
    this.validState = validState;
  }

  clearInvalid() {
    this.forEachValidation((control, field) => {
      field.classList.remove(SettingsForm.INVALID_CLASS);
    });
  }

  forEachValidation(fn) {
    this.validations.forEach(v => {
      v.controls.forEach(name => {
        var control = this.el.elements[name];
        var field   = this.el.elements[v.field || name + '-field'];
        fn(control, field, v.validator);
      });
    });
  }

  // --- Other

  getFirstControl() {
    var els = this.el.elements;
    for (var i = 0, control; control = els[i]; i++) {
      if (control.id) {
        return control;
      }
    }
  }

  forEachControl(fn) {
    var els = this.el.elements;
    for (var i = 0, control; control = els[i]; i++) {
      if (control.id) {
        fn(control);
      }
    }
  }

  blur() {
    if (document.activeElement) {
      document.activeElement.blur();
    }
  }

  destroy() {
    this.removeAllListeners();
    this.el.reset();
  }

}

/*-------------------------] LinkedSelect [--------------------------*/

class LinkedSelect extends BrowserEventTarget {

  static get AREA_ACTIVE_CLASS() { return 'select-linked-area--active'; }

  constructor(el) {
    super(el);
    this.setup();
  }

  update() {
    this.hideLinkedArea(this.activeLinkedArea);
    this.setCurrentAreaActive();
  }


  // === Private ===


  setup() {
    this.linked = {};
    var els = this.el.parentNode.querySelectorAll('[data-linked-option]');
    for (var i = 0, el; el = els[i]; i++) {
      this.linked[el.dataset.linkedOption] = new Element(el);
    }
    this.bindEvent('change', this.onChange);
    this.setCurrentAreaActive();
  }

  // --- Events

  onChange() {
    this.update();
  }

  // --- Areas

  setCurrentAreaActive() {
    var area = this.getLinkedAreaByValue(this.getCurrentValue());
    this.showLinkedArea(area);
    this.activeLinkedArea = area;
  }

  getCurrentValue() {
    return this.el.selectedOptions[0].value;
  }

  getLinkedAreaByValue(value) {
    return this.linked[value];
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

  constructor(listener, uiRoot, id, activeClass, expectedTransitionEvents) {
    this.listener    = listener;
    this.target      = new BrowserEventTarget(uiRoot.getElementById(id));
    this.activeClass = activeClass;
    this.expectedTransitionEvents = expectedTransitionEvents || 1;
  }

  show() {

    // Reset all transitions, states, and timeouts.
    clearTimeout(this.timer);

    this.defer(() => {
      this.target.removeAllListeners();
      this.target.removeClass(this.activeClass);
      this.target.addClass(Animation.NO_TRANSITION_CLASS);

      this.target.show();

      this.defer(() => {
        this.target.removeClass(Animation.NO_TRANSITION_CLASS);
        this.target.addClass(this.activeClass);
      });
      this.awaitTransitionEnd(this.onAnimationEnter);
    });
  }

  hide() {
    // If hide is called in the same tick as show, then transitionend will
    // continue firing, so need to defer it here.
    this.defer(() => {
      this.target.removeClass(this.activeClass);
      this.awaitTransitionEnd(this.onAnimationExit);
    });
  }


  // === Private ===


  // --- Events

  onAnimationExit() {
    this.target.hide();
  }

  // --- Timing

  defer(fn) {
    // Transitionend events are wonky and can easily get into a
    // state where they don't fire if the UI is updated too quickly,
    // so providing a utility method here to defer actions so that
    // animations don't get stuck.
    this.timer = setTimeout(fn, 50);
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

  static get ID()           { return 'loading-animation';         }
  static get ACTIVE_CLASS() { return 'loading-animation--active'; }

  constructor(listener, uiRoot) {
    super(listener, uiRoot, LoadingAnimation.ID, LoadingAnimation.ACTIVE_CLASS);
  }


  // === Protected ===


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

  constructor(listener, uiRoot) {
    super(listener, uiRoot, CopyAnimation.ID, CopyAnimation.ACTIVE_CLASS, 2);
    this.copied   = new Element(uiRoot.getElementById(CopyAnimation.COPIED_ID));
    this.noStyles = new Element(uiRoot.getElementById(CopyAnimation.NO_STYLES_ID));
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


  // === Protected ===


  onAnimationEnter() {
    this.hide();
  }

}

/*-------------------------] PositionableElement [--------------------------*/

class PositionableElement extends BrowserEventTarget {

  static get UI_FOCUSED_CLASS()   { return 'ui--focused';   }
  static get UI_HIGHLIGHT_CLASS() { return 'ui--highlight'; }
  static get PEEKING_DIMENSIONS() { return 500;             }
  static get ROTATION_SNAPPING()  { return 22.5;            }
  static get TOP_Z_INDEX()        { return 9999995;         }

  constructor(listener, el) {
    super(el);
    this.listener = listener;
    this.states   = [];

    this.setup();
  }

  // --- Manipulation

  move(x, y, constrain, snapX, snapY) {
    this.applyMove(x, y, constrain, snapX, snapY);
  }

  moveBackground(x, y, constrain) {
    this.applyBackgroundMove(x, y, constrain);
  }

  rotate(offset, constrained) {
    this.applyRotation(offset, constrained);
  }

  addZIndex(val) {
    this.applyZIndex(val);
  }

  resize(x, y, corner, constrain, snapX, snapY) {
    this.applyResize(x, y, corner, constrain, snapX, snapY);
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

  // --- CSS Declarations

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

  // --- Other

  getRotation() {
    return this.cssTransform.getRotation();
  }

  validate() {
    this.cssBox.validate();
  }

  setHighlightMode(on) {
    if (on) {
      this.ui.addClass(PositionableElement.UI_HIGHLIGHT_CLASS);
    } else {
      this.ui.removeClass(PositionableElement.UI_HIGHLIGHT_CLASS);
    }
  }


  // === Protected ===


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


  // === Private ===


  setup() {
    this.setupEvents();
    this.setupInitialState();
    this.injectInterface();
  }

  setupEvents() {
    this.bindEvent('click', this.onClick);
    this.bindEvent('mousedown', this.onMouseDown);
  }

  setupInitialState() {
    var matcher = new CSSRuleMatcher(this.el);
    this.applyOverrides(matcher);
    this.cssBox = CSSBox.fromMatcher(matcher);
    this.cssZIndex = CSSZIndex.fromMatcher(matcher);
    this.cssTransform = CSSTransform.fromMatcher(matcher);
    this.cssBackgroundImage = CSSBackgroundImage.fromMatcher(matcher);
  }

  injectInterface() {
    // As the UI is injected before any other elements, placing it at the
    // top level means that nested positionable elements will override it
    // with other positioned elements (hopefully, as long as they are less
    // than the top defined here) being underneath. However this also means
    // that positionable elements inside normal elements may be inaccessible,
    // but this is a tradeoff and can be worked around with the drag select
    // or highlighting functions.
    this.injector = new ShadowDomInjector(this.el, true);
    this.injector.setTemplate('element.html');
    this.injector.setStylesheet('element.css');
    this.injector.run(this.onInterfaceInjected.bind(this));
  }

  onInterfaceInjected(uiRoot) {
    this.ui = new Element(uiRoot.getElementById('ui'));
    this.setupHandles(uiRoot);
  }

  setupHandles(uiRoot) {
    new ResizeHandle(this, uiRoot, 'n');
    new ResizeHandle(this, uiRoot, 'e');
    new ResizeHandle(this, uiRoot, 's');
    new ResizeHandle(this, uiRoot, 'w');
    new ResizeHandle(this, uiRoot, 'ne');
    new ResizeHandle(this, uiRoot, 'se');
    new ResizeHandle(this, uiRoot, 'sw');
    new ResizeHandle(this, uiRoot, 'nw');
    new PositionHandle(this, uiRoot);
    new RotationHandle(this, uiRoot);
  }

  // --- Events

  onMouseDown(evt) {
    evt.stopPropagation();
    this.listener.onElementMouseDown(evt, this);
  }

  onClick(evt) {
    evt.stopPropagation();
    this.listener.onElementClick(evt, this);
  }

  // --- Focusing

  focus() {
    this.ui.addClass(PositionableElement.UI_FOCUSED_CLASS);
    this.setTemporaryZIndex(PositionableElement.TOP_Z_INDEX);
    this.injector.setContainerZIndex(PositionableElement.TOP_Z_INDEX);
  }

  unfocus() {
    this.ui.removeClass(PositionableElement.UI_FOCUSED_CLASS);
    this.setTemporaryZIndex('');
    this.renderZIndex();
    this.injector.setContainerZIndex('');
  }

  setTemporaryZIndex(zIndex) {
    var el = this.el;
    do {
      el.style.zIndex = zIndex;
    } while (el = el.offsetParent);
  }

  // --- Moving

  applyMove(x, y, constrain, snapX, snapY) {
    var p = this.getConstrainedMovePosition(x, y, constrain);
    this.cssBox = this.getLastState().cssBox.clone();
    this.cssBox.move(p.x, p.y);
    this.cssBox.snapPosition(snapX, snapY);
    this.renderBox();
  }

  applyBackgroundMove(x, y, constrain) {
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

  // --- Resizing

  applyResize(x, y, corner, constrain, snapX, snapY) {
    var lastState, lastBox, nextBox;

    lastState = this.getLastState();
    lastBox   = lastState.cssBox;
    nextBox   = lastBox.clone();

    nextBox.resize(x, y, corner);

    if (constrain) {
      nextBox.constrain(lastBox.getRatio(), corner);
    }

    nextBox.snapPosition(snapX, snapY);
    nextBox.snapDimensions(snapX, snapY);

    // Render the box first so that percentage values can update
    // below to ensure correct anchor calculations.
    this.cssBox = nextBox;
    this.renderBox();

    this.cssTransform = lastState.cssTransform.clone();
    this.cssBackgroundImage = lastState.cssBackgroundImage.clone();

    // When the box is resized, both the background image and
    // transform (origin and percentage translations) may change,
    // so update their values here.
    this.cssTransform.update();
    this.cssBackgroundImage.update();

    if (this.cssTransform.getRotation() || this.cssTransform.hasPercentTranslation()) {
      // If a box is rotated or its transform has a translate using percent
      // values, then the anchor positions will shift as the box is resized,
      // so update the translation here to keep them aligned.
      this.alignAnchors(corner, lastState, this);
    }

  }

  alignAnchors(corner, lastState, nextState) {
    var anchorOffset = this.getAnchorShift(corner, lastState, nextState);
    if (anchorOffset.x || anchorOffset.y) {
      this.cssTransform.addTranslation(anchorOffset.multiply(-1));
      this.renderTransform();
    }
  }

  getAnchorShift(corner, lastState, nextState) {
    var lastAnchorPos = this.getAnchorPositionForState(corner, lastState);
    var nextAnchorPos = this.getAnchorPositionForState(corner, nextState);
    return nextAnchorPos.subtract(lastAnchorPos);
  }

  getAnchorPositionForState(corner, state) {
    var rotation       = state.cssTransform.getRotation();
    var translation    = state.cssTransform.getTranslation();
    var rotationOrigin = state.cssTransform.getOrigin();
    var anchorPosition = state.cssBox.getAnchorPosition(corner, rotation, rotationOrigin);
    return anchorPosition.add(translation);
  }

  // --- Rotation

  applyRotation(offset, constrained) {
    if (constrained) {
      offset = Math.round(offset / PositionableElement.ROTATION_SNAPPING) * PositionableElement.ROTATION_SNAPPING;
    }
    this.cssTransform = this.getLastState().cssTransform.clone();
    this.cssTransform.addRotation(offset);
    this.renderTransform();
  }

  // --- Z-Index

  applyZIndex(val) {
    this.cssZIndex = this.getLastState().cssZIndex.clone();
    this.cssZIndex.add(val);
    this.renderZIndex();
  }

  // --- Sprite Snapping

  snapToSprite(evt) {
    var center, origin, pos, coords, bounds, dim, cDim, iPos;

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
    center = this.getViewportCenter();

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

  // --- Overrides

  applyOverrides(matcher) {
    var position = matcher.getComputedValue('position');
    if (position === 'static') {
      this.el.style.position = 'relative';
    }
    this.el.style.animation  = 'none';
    this.el.style.transition = 'none';
    this.el.style.userSelect = 'none';
    this.el.style.minWidth  = '0px';
    this.el.style.minHeight = '0px';
    this.el.style.maxWidth  = 'none';
    this.el.style.maxHeight = 'none';
    this.isFixed = position === 'fixed';
  }

  clearOverrides() {
    this.el.style.position   = '';
    this.el.style.animation  = '';
    this.el.style.transition = '';
    this.el.style.userSelect = '';
    this.el.style.minWidth   = '';
    this.el.style.minHeight  = '';
    this.el.style.maxWidth   = '';
    this.el.style.maxHeight  = '';
  }

  // --- Rendering

  render() {
    this.renderBox();
    this.renderTransform();
    this.renderBackgroundPosition();
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

  renderTransform() {
    this.cssTransform.render(this.el.style);
  }

  renderBackgroundPosition() {
    this.cssBackgroundImage.renderPosition(this.el.style);
  }

  renderZIndex() {
    this.el.style.zIndex = this.cssZIndex;
  }

  // --- CSS Declarations

  getCSSDeclarationsForAttributes(cssBox, cssZIndex, cssBackgroundImage, cssTransform) {
    var declarations = [];
    this.appendPositionDeclaration(declarations);
    cssBox.appendCSSDeclarations(declarations);
    cssZIndex.appendCSSDeclaration(declarations);
    cssBackgroundImage.appendCSSDeclaration(declarations);
    cssTransform.appendCSSDeclaration(declarations);
    return declarations;
  }

  appendPositionDeclaration(declarations) {
    if (this.el.style.position === 'relative') {
      declarations.push('position: relative;');
    }
  }

  // --- Other

  getLastState() {
    return this.states[this.states.length - 1];
  }

  destroy() {
    // Choosing not to destroy the rendered styles on the element.
    // There may be cases where users want to set up their positioning
    // and then search for other elements as a workflow. The jump that
    // is caused when these elements are destroyed is also jarring.
    this.unfocus();
    this.injector.destroy();
    this.removeAllListeners();
    this.clearOverrides();
  }

}

/*-------------------------] PositionHandle [--------------------------*/

class PositionHandle extends DragTarget {

  static get CURSOR() { return 'move'; }

  constructor(listener, uiRoot) {
    super(uiRoot.getElementById('position-handle'));
    this.listener = listener;

    this.setupDoubleClick();
    this.setupDragIntents();
    this.setupCtrlKeyReset();
    this.setupMetaKeyReset();
  }

  hasImageCursor() {
    return false;
  }

  getCursor() {
    return PositionHandle.CURSOR;
  }


  // === Protected ===


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

  static get CORNERS() { return ['se','s','sw','w','nw','n','ne','e'];             }
  static get CURSORS() { return ['nwse','ns','nesw','ew','nwse','ns','nesw','ew']; }

  constructor(listener, uiRoot, corner) {
    super(uiRoot.getElementById('resize-handle-' + corner));
    this.listener = listener;
    this.corner   = corner;

    this.setupDoubleClick();
    this.setupDragIntents();
    this.setupCtrlKeyReset();
    this.setupMetaKeyReset();
  }

  hasImageCursor() {
    return false;
  }

  getCursor(rotation) {
    var cursors = ResizeHandle.CURSORS;
    var index   = ResizeHandle.CORNERS.indexOf(this.corner);
    var offset  = Math.round(rotation / (360 / cursors.length));
    var cursor  = ResizeHandle.CURSORS.slice((index + offset) % cursors.length)[0];
    return cursor + '-resize';
  }


  // === Protected ===


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

}

/*-------------------------] RotationHandle [--------------------------*/

class RotationHandle extends DragTarget {

  static get OFFSET_ANGLE()     { return -45; }
  static get TURN_THRESHOLD()   { return 180; }
  static get GRADS_PER_CURSOR() { return 16;  }

  constructor(listener, uiRoot) {
    super(uiRoot.getElementById('rotation-handle'));
    this.listener = listener;

    this.setupDragIntents();
    this.setupMetaKeyReset();
  }

  setOrigin(origin) {
    this.origin = origin;
  }

  hasImageCursor() {
    return true;
  }

  getCursor(rotation) {
    var grad = Point.degToGrad(rotation, true);
    var per  = RotationHandle.GRADS_PER_CURSOR;
    // Step the cursor into one of 25 cursors and ensure that 400 is 0.
    grad = Math.round(grad / per) * per % 400;
    return 'rotate-' + grad;
  }


  // === Protected ===


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


  // === Private ===


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


  // === Private ===


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

  // --- Testing Pixels

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

/*-------------------------] CSSRuleMatcher [--------------------------*/

class CSSRuleMatcher {

  static get VAR_REG() { return /var\((.+)\)/; }

  constructor(el) {
    this.el = el;
    this.computedStyle = window.getComputedStyle(el);
    this.matchedRules  = this.getMatchedRules(el);
  }

  getProperty(name) {
    var matchedValue  = this.getMatchedValue(name);
    var computedValue = this.getComputedValue(name);
    return new CSSProperty(name, matchedValue, computedValue);
  }

  getValue(name) {
    return this.getProperty(name).getValue();
  }

  getComputedValue(name) {
    return this.computedStyle[name];
  }


  // === Private ===


  getMatchedRules(el) {
    let sheets = el.getRootNode().styleSheets, matched = [];
    for (let i = 0; i < sheets.length; i++) {
      let rules = sheets[i].rules;
        for (let j = 0; j < rules.length; j++) {
          let rule = rules[j];
          if (el.matches(rule.selectorText)) {
            matched.push(rule);
          }
        }
    }
    return matched;
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
          val = this.getRuleValue(val);
          break;
        }
      }
    }

    return val;
  }

  getRuleValue(val) {
    var match = val.match(CSSRuleMatcher.VAR_REG);
    if (match) {
      // Typically we don't want to fall back to computed styles to get a matched
      // value, however in the case of CSS variables the original variable value
      // only exists on the computed style object, so return it here. It seems
      // this value may contain whitespace, so trim it before returning.
      val = this.computedStyle.getPropertyValue(match[1]).trim();
    }
    return val;
  }

}

/*-------------------------] CSSProperty [--------------------------*/

class CSSProperty {

  // Initial Values
  static get NONE()    { return 'none';    }
  static get AUTO()    { return 'auto';    }
  static get INITIAL() { return 'initial'; }

  // Position Keywords
  static get TOP()    { return 'top';    }
  static get LEFT()   { return 'left';   }
  static get WIDTH()  { return 'width';  }
  static get RIGHT()  { return 'right';  }
  static get HEIGHT() { return 'height'; }
  static get BOTTOM() { return 'bottom'; }
  static get CENTER() { return 'center'; }

  // Properties
  static get TRANSFORM()           { return 'transform';          }
  static get TRANSFORM_ORIGIN()    { return 'transformOrigin';    }
  static get BACKGROUND_IMAGE()    { return 'backgroundImage';    }
  static get BACKGROUND_POSITION() { return 'backgroundPosition'; }

  // Special Values
  static get LINEAR_GRADIENT_REG()         { return /linear-gradient/; }
  static get BACKGROUND_POSITION_INITIAL() { return '0% 0%';           }

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


  // === Private ===


  normalize() {
    // We need to normalize values here so that they can all be tested.
    // Force all "auto", "none", and "initial" values to empty strings,
    // then set matched background images to their computed value, as
    // they don't contain the domain, which we need to detect cross
    // domain images. They also may contain linear-gradient values which
    // need to be coerced as well. Finally handle positioning keywords
    // like "top left" by replacing with percentages and removing the
    // computed value.
    this.coerceInitialValues();
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

  // --- Background Image

  coerceBackgroundImageValue() {
    if (this.name === CSSProperty.BACKGROUND_IMAGE) {
      if (CSSProperty.LINEAR_GRADIENT_REG.test(this.computedValue)) {
        this.matchedValue  = '';
        this.computedValue = '';
      } else {
        this.matchedValue = this.computedValue;
      }
    }
  }

  // --- CSS Positioning Keywords

  coercePositionKeywordPairs() {
    if (this.isPositioningPair()) {
      this.matchedValue = this.replacePositionKeywords(this.matchedValue);

      // Note that when working on the local filesystem access to stylesheets
      // is restricted, so we cannot rely on matched values to indicate whether
      // the property is initial or not, so choose what to do here based on
      // the type of property itself.
      if (!this.matchedValue) {
        if (this.canIgnoreComputedValue()) {
          this.computedValue = '';
        } else {
          this.matchedValue = this.computedValue;
        }
      }
    }
  }

  canIgnoreComputedValue() {
    // The computed background position should only be ignored if it is
    // in the initial state (0% 0%). This will fail on a local filesystem
    // where we don't have access to matched styles if it is actually set
    // to 0% 0%, but there is no way to know otherwise whether or not it
    // is initial. The computed transform origin should always be ignored
    // as the initial value is 50% 50%, which will change as the element
    // is resized, so the computed value does not accurately reflect what
    // it is. Again, this will fail when we don't have access to matched
    // styles and is explicitly set.
    return this.isTransformOrigin() || this.isInitialBackgroundPosition(this.computedValue);
  }

  isInitialBackgroundPosition(str) {
    return this.isBackgroundPosition() &&
           str === CSSProperty.BACKGROUND_POSITION_INITIAL;
  }

  // --- Specific Properties

  isPositioningPair() {
    return this.isBackgroundPosition() || this.isTransformOrigin();
  }

  isBackgroundPosition() {
    return this.name === CSSProperty.BACKGROUND_POSITION;
  }

  isTransformOrigin() {
    return this.name === CSSProperty.TRANSFORM_ORIGIN;
  }

  isTransform() {
    return this.name === CSSProperty.TRANSFORM;
  }

  // --- Keywords

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

/*-------------------------] CSSBox [--------------------------*/

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
    var cssWidth  = this.getCSSDimension(matcher, 'width');
    var cssHeight = this.getCSSDimension(matcher, 'height');
    return new CSSBox(cssH, cssV, cssWidth, cssHeight);
  }

  static getCSSDimension(matcher, name) {
    var prop = matcher.getProperty(name);
    return CSSValue.parse(prop.getValue(), prop, matcher.el);
  }

  constructor(cssH, cssV, cssWidth, cssHeight) {
    this.cssH      = cssH;
    this.cssV      = cssV;
    this.cssWidth  = cssWidth;
    this.cssHeight = cssHeight;
  }

  // --- Manipulation

  move(x, y) {
    this.cssH.add(x);
    this.cssV.add(y);
  }

  resize(x, y, corner) {
    this.moveEdge(x, this.cssH, this.cssWidth,  this.getEdgeForCorner(corner, 'h'));
    this.moveEdge(y, this.cssV, this.cssHeight, this.getEdgeForCorner(corner, 'v'));
  }

  constrain(newRatio, corner) {
    this.applyConstraint(newRatio, corner);
  }

  snapPosition(x, y) {
    this.applySnap(this.cssH, x);
    this.applySnap(this.cssV, y);
  }

  snapDimensions(x, y) {
    this.applySnap(this.cssWidth, x);
    this.applySnap(this.cssHeight, y);
  }

  // --- Dimensions

  getDimensions() {
    return new Point(this.cssWidth.px, this.cssHeight.px);
  }

  setDimensions(x, y) {
    this.cssWidth.px  = x;
    this.cssHeight.px = y;
  }

  // --- Anchors

  // Returns the final position of an anchor opposite the
  // provided corner in an x/y frame, taking into account any
  // rotation. Note that this point is not necessarily the same
  // as the rendered position, as the box may be inverted, in
  // which case it will which case it will extend negatively
  // from a 0,0 origin.
  getAnchorPosition(corner, rotation, rotationOrigin) {
    var xyPosition, anchorOffset;

    xyPosition   = this.getXYPosition();
    anchorOffset = this.getAnchorOffset(corner);

    if (rotation) {
      anchorOffset = anchorOffset
        .subtract(rotationOrigin)
        .rotate(rotation)
        .add(rotationOrigin);
    }

    return xyPosition.add(anchorOffset);
  }

  // --- Rendering

  render(style) {
    this.renderAxis(style, this.cssH, this.cssWidth,  'width');
    this.renderAxis(style, this.cssV, this.cssHeight, 'height');
  }

  // --- CSS Declarations

  appendCSSDeclarations(declarations) {
    var cssH, cssV, cssWidth, cssHeight;

    [cssH, cssV]          = this.getRenderablePosition();
    [cssWidth, cssHeight] = this.getRenderableDimensions();

    cssV.appendCSSDeclaration(declarations);
    cssH.appendCSSDeclaration(declarations);
    cssWidth.appendCSSDeclaration('width', declarations);
    cssHeight.appendCSSDeclaration('height', declarations);
  }

  // --- Other

  getPositionHeader() {
    return this.getRenderablePosition().join(', ');
  }

  getDimensionsHeader() {
    return this.getRenderableDimensions().join(', ');
  }

  getRatio() {
    var x = this.cssWidth.px;
    var y = this.cssHeight.px;
    return y === 0 ? 0 : Math.abs(x) / Math.abs(y);
  }

  validate() {
    this.validateAxis(this.cssH, this.cssWidth);
    this.validateAxis(this.cssV, this.cssHeight);
  }

  clone() {
    return new CSSBox(
      this.cssH.clone(),
      this.cssV.clone(),
      this.cssWidth.clone(),
      this.cssHeight.clone()
    );
  }


  // === Private ===


  // --- Manipulation

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

  applyConstraint(targetRatio, corner) {
    var hEdge, vEdge, currentRatio;
    var w, h, absW, absH, targetW, targetH, offsetW, offsetH;

    hEdge = this.getEdgeForCorner(corner, 'h');
    vEdge = this.getEdgeForCorner(corner, 'v');

    currentRatio = this.getRatio();

    if (!hEdge || !vEdge || currentRatio === targetRatio) {
      // Both edges are required to allow constraining,
      // so abort if either is not passed, or if the ratios
      // are the same.
      return;
    }

    w = this.cssWidth.px;
    h = this.cssHeight.px;

    absW = Math.abs(w);
    absH = Math.abs(h);

    if (currentRatio === 0 || targetRatio === 0) {
      absW = 0;
      absH = 0;
    } else if (currentRatio > targetRatio) {
      absW = absH * targetRatio;
    } else if (currentRatio < targetRatio) {
      absH = absW / targetRatio;
    }

    targetW = Math.min(Math.max(w, -absW), absW);
    targetH = Math.min(Math.max(h, -absH), absH);

    offsetW = this.isInvertedEdge(hEdge) ? targetW - w : w - targetW;
    offsetH = this.isInvertedEdge(vEdge) ? targetH - h : h - targetH;

    this.moveEdge(offsetW, this.cssH, this.cssWidth,  hEdge);
    this.moveEdge(offsetH, this.cssV, this.cssHeight, vEdge);
  }

  // --- Snapping

  applySnap(cssValue, mult) {
    if (mult && mult > 1) {
      cssValue.px = Math.round(cssValue.px / mult) * mult;
    }
  }

  // --- Edges

  getEdgeForCorner(corner, axis) {
    var normal = this.getCornerNormal(corner);
    if (axis === 'h') {
      switch(normal.x) {
        case -1: return 'left';
        case  1: return 'right';
      }
    } else {
      switch(normal.y) {
        case -1: return 'top';
        case  1: return 'bottom';
      }
    }
  }

  isInvertedEdge(prop) {
    return prop === 'right' || prop === 'bottom';
  }

  // --- Normals

  // Returns a normalized vector representing the
  // direction that the box extends into x/y space.
  getDirectionNormal() {
    return new Point(
      this.cssH.isInverted() ? -1 : 1,
      this.cssV.isInverted() ? -1 : 1
    );
  }

  // Returns a normalized vector representing the
  // offset of a corner in x/y space.
  getCornerNormal(corner) {
    switch (corner) {
      case 'n':  return new Point( 0, -1);
      case 'e':  return new Point( 1,  0);
      case 's':  return new Point( 0,  1);
      case 'w':  return new Point(-1,  0);
      case 'nw': return new Point(-1, -1);
      case 'ne': return new Point( 1, -1);
      case 'se': return new Point( 1,  1);
      case 'sw': return new Point(-1,  1);
    }
  }

  // Returns a normalized vector representing the offset
  // of an anchor opposite the provided corner from the
  // center of the box in an x/y frame.
  getAnchorNormal(corner) {
    var dim, normal;
    dim    = this.getDimensions();
    normal = this.getCornerNormal(corner);
    return new Point(
      -normal.x * (dim.x < 0 ? -1 : 1),
      -normal.y * (dim.y < 0 ? -1 : 1)
    );
  }

  // --- Anchors

  // Returns the position of the box in an x/y frame.
  // Note that boxes using right/bottom positioning are not
  // relative to the viewport's width/height, but instead extend
  // in a negative direction from a 0,0 origin. Boxes which are
  // reflected (ie. those with negative dimensions) may also
  // affect the final position, as they may extend negatively
  // into the x/y frame. For example:
  //
  // top:     100px;
  // left:    100px;
  // width:  -200px;
  // height: -200px;
  //
  // returns -100,-100
  //
  // right:  100px;
  // bottom: 100px;
  // width:  100px;
  // height: 100px;
  //
  // returns -200,-200
  //
  // right:   100px;
  // bottom:  100px;
  // width:  -100px;
  // height: -100px;
  //
  // returns 0,0
  //
  getXYPosition() {
    var dir, xyPos, xyDim, xyOffset;

    dir = this.getDirectionNormal();

    xyPos = this.getPositionOffset().multiply(dir);
    xyDim = this.getDimensions().multiply(dir);

    xyOffset = new Point(
      Math.min(0, xyDim.x),
      Math.min(0, xyDim.y)
    );

    return xyPos.add(xyOffset);
  }

  getPositionOffset() {
    return new Point(this.cssH.px, this.cssV.px);
  }

  // Returns the offset of an anchor opposite to the provided
  // corner in an x/y frame. Note that in the case that the
  // box is reflected, the points be flipped along the anchor
  // point to account for this.
  getAnchorOffset(corner) {
    var center = new Point(
      Math.abs(this.cssWidth.px  / 2),
      Math.abs(this.cssHeight.px / 2)
    );
    return center.add(this.getAnchorNormal(corner).multiply(center));
  }

  // --- Rendering

  renderAxis(style, pos, dim, prop) {
    pos = this.getRenderablePositionValue(pos, dim);
    dim = this.getRenderableDimensionValue(dim);
    pos.render(style);
    style[prop] = dim.isInitial() ? '' : dim;
  }

  getRenderablePosition() {
    return [
      this.getRenderablePositionValue(this.cssH, this.cssWidth),
      this.getRenderablePositionValue(this.cssV, this.cssHeight)
    ];
  }

  getRenderableDimensions() {
    return [
      this.getRenderableDimensionValue(this.cssWidth),
      this.getRenderableDimensionValue(this.cssHeight)
    ];
  }

  getRenderablePositionValue(pos, dim) {
    if (dim.px < 0) {
      pos = pos.clone();
      pos.px += dim.px;
    }
    return pos;
  }

  getRenderableDimensionValue(dim) {
    if (dim.px < 0) {
      dim = dim.clone();
      dim.px = -dim.px;
    }
    return dim;
  }

  // --- Other

  validateAxis(pos, dim) {
    if (dim.px < 0) {
      pos.px += dim.px;
      dim.px = -dim.px;
    }
  }

}

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

  // --- Accessors

  get px() {
    return this.cssValue.px;
  }

  set px(px) {
    this.cssValue.px = px;
  }

  add(px) {
    this.px += this.isInverted() ? -px : px;
  }

  isInverted() {
    return this.prop === 'right' || this.prop === 'bottom';
  }

  // --- Rendering

  render(style) {
    style[this.prop] = this.cssValue.isInitial() ? '': this.cssValue;
  }

  // --- CSS Declarations

  appendCSSDeclaration(declarations) {
    return this.cssValue.appendCSSDeclaration(this.prop, declarations);
  }

  // --- Other

  toString() {
    return this.cssValue.toString();
  }

  clone() {
    return new CSSPositioningProperty(this.cssValue.clone(), this.prop);
  }

}

/*-------------------------] CSSBackgroundImage [--------------------------*/

class CSSBackgroundImage {

  static get SAME_DOMAIN_REG() { return new RegExp('^' + this.getOrigin().replace(/([/.])/g, '\\$1')); }
  static get FILE_URL_REG()    { return /^file:\/\/\//; }
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
    return !this.FILE_URL_REG.test(url) &&
           (this.SAME_DOMAIN_REG.test(url) || this.DATA_URI_REG.test(url));
  }

  // This seems to be the only way to mock the origin
  // for testing, as window location is read only.

  static getOrigin() {
    return this.origin || location.origin;
  }

  static setOrigin(origin) {
    this.origin = origin;
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

  // --- Positioning

  move(x, y) {
    this.cssLeft.px += x;
    this.cssTop.px  += y;
  }

  getPosition() {
    return new Point(this.cssLeft.px, this.cssTop.px);
  }

  setPosition(x, y) {
    this.cssLeft.px = x;
    this.cssTop.px  = y;
  }

  // --- Rendering

  renderPosition(style) {
    style.backgroundPosition = this.getPositionString();
  }

  // --- CSS Declarations

  appendCSSDeclaration(declarations) {
    var str = this.getPositionString();
    if (str) {
      declarations.push(`background-position: ${str};`);
    }
  }

  // --- Other

  getPositionHeader() {
    return this.getPositionString(', ');
  }

  getPositionString(join) {
    if (this.cssLeft.isInitial() && this.cssTop.isInitial()) {
      return '';
    } else {
      return [this.cssLeft, this.cssTop].join(join || ' ');
    }
  }

  clone() {
    // The background image data itself is never assumed to be changed,
    // so there's no need to clone the image or sprite recognizer when cloning.
    return new CSSBackgroundImage(this.img, this.cssLeft.clone(), this.cssTop.clone(), this.spriteRecognizer);
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

  update() {
    this.updateOrigin();
    this.updateTranslation();
  }

  // --- Rotation

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

  // --- Translation

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

  hasPercentTranslation() {
    var func = this.getPreceedingTranslationFunction();
    return !!func && func.hasPercentTranslation();
  }

  // --- Origin

  getOrigin() {
    return new Point(
      this.cssTransformOrigin.cssX.px,
      this.cssTransformOrigin.cssY.px
    );
  }

  // --- Rendering

  render(style) {
    style.transform = this.toString();
  }

  // --- CSS Declarations

  appendCSSDeclaration(declarations) {
    var str = this.toString();
    if (str) {
      declarations.push(`transform: ${str};`);
    }
  }

  // --- Other

  getHeader() {
    return this.functions.map(f => f.getHeader()).join(' | ');
  }

  toString() {
    return this.isNull() ? '' : this.functions.join(' ');
  }

  clone() {
    var functions = this.functions.map(f => f.clone());
    return new CSSTransform(functions, this.cssTransformOrigin.clone());
  }


  // === Private ===


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

  updateTranslation() {
    var func = this.getPreceedingTranslationFunction();
    if (func) {
      func.values.forEach(v => v.update());
    }
  }

  updateOrigin() {
    this.cssTransformOrigin.update();
  }

  isNull() {
    return this.functions.every(f => {
      return f.values.every(v => {
        return typeof v !== 'string' && !v.val;
      });
    });
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

  // --- Other

  getHeader() {
    return this.getAbbreviatedHeader() + ': ' + this.values.join(this.getHeaderJoin());
  }

  toString() {
    return this.name + '(' + this.values.join(', ') + ')';
  }

  clone() {
    var values = this.values;
    if (this.canMutate) {
      values = this.values.map(v => v.clone());
    }
    return new CSSTransformFunction(this.name, values, this.canMutate);
  }


  // === Private ===


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

  // --- Other

  clone() {
    return new CSSTransformOrigin(this.cssX.clone(), this.cssY.clone());
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

  // --- CSS Declarations

  appendCSSDeclaration(declarations) {
    if (!this.cssValue.isInitial()) {
      declarations.push(`z-index: ${this.cssValue};`);
    }
  }

  // --- Other

  getHeader() {
    return this.toString();
  }

  toString() {
    return this.cssValue.isInitial() ? '' : this.cssValue.toString();
  }

  clone() {
    return new CSSZIndex(this.cssValue.clone());
  }

}

/*-------------------------] CSSValue [--------------------------*/

class CSSValue {

  static get SUBPIXEL_PRECISION() { return 2; }

  static parse(str, prop, el, isVertical, img) {
    var initial, match, val, unit;

    initial = prop.isInitial();

    if (isVertical === undefined) {
      isVertical = prop.isVertical();
    }

    match = str.match(/([-\d.]+)(px|%|r?em|deg|g?rad|turn|v(?:w|h|min|max))?$/);

    if (!match) {
      return new CSSPixelValue(0, true);
    }

    val   = parseFloat(match[1]);
    unit  = match[2] || '';

    switch (unit) {

      case '%':    return CSSPercentValue.create(val, initial, prop, el, isVertical, img);
      case 'px':   return CSSPixelValue.create(val, initial, prop);
      case 'em':   return CSSEmValue.create(val, initial, el);
      case 'rem':  return CSSRemValue.create(val, initial);

      case 'deg':  return new CSSDegreeValue(val, initial);
      case 'rad':  return new CSSRadianValue(val, initial);
      case 'grad': return new CSSGradianValue(val, initial);
      case 'turn': return new CSSTurnValue(val, initial);
      case '':     return new CSSIntegerValue(val, initial);

      case 'vw':
      case 'vh':
      case 'vmin':
      case 'vmax':
        return new CSSViewportValue(val, initial, unit);

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

  isInitial() {
    return this.initial;
  }

  isPercent() {
    return this.unit === '%';
  }

  // --- CSS Declarations

  appendCSSDeclaration(prop, declarations) {
    if (!this.isInitial()) {
      declarations.push(`${prop}: ${this};`);
    }
  }

  // --- Other

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


  // === Protected ===


  // Note that this method is intended to be overridden by child
  // css values that require an update, such as CSSPercentValue.
  update() {}

}

/*-------------------------] CSSIntegerValue [--------------------------*/

class CSSIntegerValue extends CSSValue {

  constructor(val, initial) {
    super(val, initial, '');
  }

  // --- Other

  clone() {
    return new CSSIntegerValue(this.val, this.initial);
  }

}

/*-------------------------] CSSPixelValue [--------------------------*/

class CSSPixelValue extends CSSValue {

  static create(val, initial, prop) {
    return new CSSPixelValue(val, initial, prop.isTransform());
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

  // --- Other

  clone() {
    return new CSSPixelValue(this.val, this.initial, this.subpixel);
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
    return prop.isTransform() ||
           prop.isTransformOrigin() ||
           prop.isBackgroundPosition();
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

  update() {
    this.size = this.getTotalSize();
  }

  // --- Other

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


  // === Private ===


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

  // --- Other

  clone() {
    return new CSSViewportValue(this.val, this.initial, this.unit);
  }


  // === Private ===


  getViewportValue() {
    switch (this.unit) {
      case 'vw':   return window.innerWidth;
      case 'vh':   return window.innerHeight;
      case 'vmin': return Math.min(window.innerWidth, window.innerHeight);
      case 'vmax': return Math.max(window.innerWidth, window.innerHeight);
    }
  }

}

/*-------------------------] CSSFontSizeValue [--------------------------*/

class CSSFontSizeValue extends CSSValue {

  constructor(val, initial, unit, fontSize) {
    super(val, initial, unit, true);
    this.fontSize = fontSize;
  }

  get px() {
    return (this.val || 0) * this.fontSize;
  }

  set px(px) {
    this.val = px / this.fontSize;
  }

}

/*-------------------------] CSSEmValue [--------------------------*/

class CSSEmValue extends CSSFontSizeValue {

  static create(val, initial, el) {
    var fontSize = parseFloat(window.getComputedStyle(el).fontSize);
    return new CSSEmValue(val, initial, fontSize);
  }

  constructor(val, initial, fontSize) {
    super(val, initial, 'em', fontSize);
  }

  // --- Other

  clone() {
    return new CSSEmValue(this.val, this.initial, this.fontSize);
  }

}

/*-------------------------] CSSRemValue [--------------------------*/

class CSSRemValue extends CSSFontSizeValue {

  static create(val, initial) {
    var doc = document.documentElement;
    var fontSize = parseFloat(window.getComputedStyle(doc).fontSize);
    return new CSSRemValue(val, initial, fontSize);
  }

  constructor(val, initial, fontSize) {
    super(val, initial, 'rem', fontSize);
  }

  // --- Other

  clone() {
    return new CSSRemValue(this.val, this.initial, this.fontSize);
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

  // --- Other

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

  // --- Other

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

  // --- Other

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

  // --- Other

  clone() {
    return new CSSTurnValue(this.val, this.initial);
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
    this.x = x;
    this.y = y;
  }

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

  rotate(deg) {
    if (deg === 0) {
      return new Point(this.x, this.y);
    }
    var rad = Point.degToRad(deg);
    var x = this.x * Math.cos(rad) - this.y * Math.sin(rad);
    var y = this.x * Math.sin(rad) + this.y * Math.cos(rad);
    return new Point(x, y);
  }

  clone() {
    return new Point(this.x, this.y);
  }

  round() {
    return new Point(Math.round(this.x), Math.round(this.y));
  }

}

/*-------------------------] Rectangle [--------------------------*/

class Rectangle {

  constructor(top, right, bottom, left) {
    this.top    = top;
    this.right  = right;
    this.bottom = bottom;
    this.left   = left;
  }

}

/*-------------------------] Utilities [--------------------------*/

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


window.AppController = AppController;
