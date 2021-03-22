chrome.action.onClicked.addListener(({ id: tabId }) => {
  const target = { tabId };
  chrome.scripting.executeScript({
    target,
    files: ['positionable.js']
  });
  chrome.scripting.executeScript({
    target,
    files: ['bootstrap.js']
  });
});
