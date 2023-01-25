
var tabInfo = {
    url: document.URL,
};

chrome.runtime.connect().postMessage(tabInfo);