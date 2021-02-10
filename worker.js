chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message == 'convert_image_url_to_data_url') {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.addEventListener('load', () => {
      let data;
      canvas.setAttribute('width', img.width);
      canvas.setAttribute('height', img.height);
      canvas.getContext('2d').drawImage(img, 0, 0);
      try {
        data = canvas.toDataURL();
      } catch(e) {
        sendResponse({ success: false, url: request.url });
        return;
      }
      sendResponse({ success: true, data: data });
    });
    img.addEventListener('error', () => {
      sendResponse({ success: false, url: request.url });
    });
    img.src = request.url;
  }
  return true;
});

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
