ShadowDomInjector.setBasePath(chrome.extension.getURL(''));
ShadowDomInjector.preload('element.html', 'element.css');

var injector = new ShadowDomInjector(document.body);
injector.setTemplate('ui.html');
injector.setStylesheet('ui.css');
injector.run(function(uiRoot) {
  new AppController(uiRoot);
});
