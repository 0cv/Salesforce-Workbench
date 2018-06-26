
var tabInfo = {
  "url": document.URL,
  "hostname": window.location.hostname,
};


chrome.runtime.connect().postMessage(tabInfo);
