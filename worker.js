chrome.action.onClicked.addListener(() => {
  chrome.tabs.executeScript(null, {
    file: 'libs/buy.js'
  });
  chrome.tabs.executeScript(null, {
    file: 'positionable.js'
  });
  chrome.tabs.executeScript(null, {
    file: 'bootstrap.js'
  });
});
