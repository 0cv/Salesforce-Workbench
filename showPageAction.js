//check if this page is a salesforce.com session
if (document.cookie.indexOf('sid=') > -1) {
  chrome.runtime.sendMessage({}, function(response) {console.log("response", response);});
}