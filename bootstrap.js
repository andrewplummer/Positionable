(() => {

  if (window.appController) {
    window.appController.destroy();
    window.appController = null;
    return;
  }

  ShadowDomInjector.setBasePath(chrome.runtime.getURL(''));
  ShadowDomInjector.preload('element.html', 'element.css');

  const injector = new ShadowDomInjector(document.body);
  injector.setTemplate('ui.html');
  injector.setStylesheet('ui.css');
  injector.run((uiRoot) => {
    window.appController = new AppController(uiRoot);
  });

})();
