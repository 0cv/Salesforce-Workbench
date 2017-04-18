function getSessionId() {
  if (document.URL.indexOf('servlet/servlet.su') > -1) {
    var suSessionHtml = document.getElementsByTagName('pre')[0].innerHTML;
    var sessionIdPrefix = 'Session ID: ';
    if (suSessionHtml.substring(0, sessionIdPrefix.length) != sessionIdPrefix) {
      return null;
    }
    return suSessionHtml.substring(sessionIdPrefix.length, suSessionHtml.length);
  } else {
    var allCookies = document.cookie;
    if (allCookies.indexOf('sid=') == -1) {
      return null;
    }
    return allCookies.match(/sid\=(.*?);/)[1];
  }
}

var tabInfo = {
  "url": document.URL,
  "hostname": window.location.hostname,
  "sessionId": getSessionId()
};

chrome.runtime.connect().postMessage(tabInfo);