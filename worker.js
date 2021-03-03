chrome.action.onClicked.addListener(() => {
  chrome.tabs.executeScript(null, {
    file: 'positionable.js'
  });
  chrome.tabs.executeScript(null, {
    file: 'bootstrap.js'
  });
});
