
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message == 'convert_image_url_to_data_url'){
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
        sendResponse({ error: true, url: request.url });
        return;
      }
      sendResponse(data);
    });
    img.src = request.url;
  }
  return true;
});

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.executeScript(null, {
    file: 'positionable.js'
  });
  chrome.tabs.executeScript(null, {
    file: 'bootstrap.js'
  });
});

