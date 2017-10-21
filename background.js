
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message == 'convert_image_url_to_data_url') {
    var canvas = document.createElement('canvas');
    var img = new Image();
    img.addEventListener('load', function() {
      var data;
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
    img.addEventListener('error', function() {
      sendResponse({ success: false, url: request.url });
    });
    img.src = request.url;
  }
  return true;
});

chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.executeScript(null, {
    file: 'positionable.js'
  });
  chrome.tabs.executeScript(null, {
    file: 'bootstrap.js'
  });
});

