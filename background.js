var tabId,
    hostname,
    isInLightning = false;

var workbenchtoolsforchrome = {
    badPageErrorMsg : 'Ooops! This command must only be excuted when logged into Salesforce. Select a tab with an active Salesforce session and try again.',
    onRequest: function(request, sender, sendResponse) {
        // Show the page action for the tab that the sender (content script) was on.
        if (sender.tab.url.indexOf('blacktaboid') > -1 && sender.tab.url.indexOf('servlet/servlet.su') == -1) {
            chrome.pageAction.setIcon({'tabId':sender.tab.id, 'path':'workbench-3-black-cube-48x48.png'});
        }

        // Check if there is a SID related to the page the content script ran on
        chrome.cookies.getAll({'url':sender.tab.url,'name':'sid'},function (cookie){
            console.log (cookie.length);
            console.log(JSON.stringify(cookie[0]));
            if (cookie.length > 0) {
                chrome.pageAction.show(sender.tab.id);
            }
        });

        // Return nothing to let the connection be cleaned up.
        sendResponse({});
    },
    onClicked: function(tab) {
        if (tab.url.indexOf('http:') != 0 && tab.url.indexOf('https:') != 0) {
            alert(this.badPageErrorMsg);
            return;
        }

        chrome.tabs.executeScript(null, {file: 'postTabInfo.js'});
    },
    onConnect: function(port) {
        // This will get called by the content script we execute in
        // the tab as a result of the user pressing the browser action.
        port.onMessage.addListener((tabInfo) => {
            if (!tabInfo.url ) {
                alert(this.badPageErrorMsg);
                return;
            }
            hostname = tabInfo.hostname;
            // Get the SID related to the page the content script ran on
            chrome.cookies.getAll({'url':tabInfo.url,'name':'sid'},function (cookie){
                console.log(JSON.stringify(cookie[0]));
                var sessionId = cookie[0].value;
                var domain = cookie[0].domain
                // If the domain is .salesforce.com, pass to workbench
                if(domain.indexOf('.salesforce.com') > -1) {
                    workbenchtoolsforchrome.loginFromSession('https://'+ domain, sessionId);
                // Otherwise, use the first 15 chars of the SID to find the salesforce.com SID cookie
                } else {
                    var orgID = sessionId.substring(0,15);
                    chrome.cookies.getAll({'name':'sid'}, function(cookie) {
                        for (i=0; i<cookie.length; i++) {
                            sessionId = cookie[i].value;
                            domain = cookie[i].domain;
                            if (sessionId.indexOf(orgID)>-1 && domain.indexOf('.salesforce.com') > -1) {
                                workbenchtoolsforchrome.loginFromSession('https://'+ domain, sessionId);
                            }
                        }
                    });
                }
            });
        });
    },
    gotoWorkbench: function(urlTail) {
        if (window.localStorage == null) {
            alert('Local storage must be enabled for Workbench Tools');
            return;
        }

        if (window.localStorage.customWorkbenchBaseUrl == null || window.localStorage.customWorkbenchBaseUrl == '') {
            try {
                const DEFAULT_WORKBENCH_BASE_URL = 'http://workbench';
                var xhr = new XMLHttpRequest();
                xhr.open('HEAD', DEFAULT_WORKBENCH_BASE_URL, false);
                xhr.send(null);

                if (xhr.status == 302 || xhr.status == 200) {
                    window.localStorage.customWorkbenchBaseUrl = DEFAULT_WORKBENCH_BASE_URL;
                }
            } catch (e) {
                chrome.tabs.create({'url': chrome.extension.getURL('options.html')});
                return;
            }
        }

        urlTail = urlTail || '';
        var urlToOpen = window.localStorage.customWorkbenchBaseUrl + urlTail;
        chrome.tabs.create({'url': urlToOpen});
    },
    loginFromSession: function(currentUrl, sessionId) {
        //capture serverUrl prefix
        if (currentUrl.indexOf('localhost') > -1) {
            alert('Cannot login to Workbench with \'localhost\'. To use with a local build, set \'app_server\' in your user.properties to your hostname.');
            return;
        }

        if (currentUrl.indexOf('blacktaboid') > -1 && currentUrl.indexOf('servlet/servlet.su') == -1) {
            alert('Cannot login to Workbench from Blacktab unless you are viewing the Session ID of a user who granted login access.');
            return;
        }
        //pass params to Workbench
        this.gotoWorkbench('/login.php?serverUrlPrefix=' + escape(currentUrl) + '&sid=' + escape(sessionId));
    },
};

// REGISTER LISTENERS
chrome.runtime.onMessage.addListener(workbenchtoolsforchrome.onRequest);
chrome.pageAction.onClicked.addListener(workbenchtoolsforchrome.onClicked);
chrome.runtime.onConnect.addListener(workbenchtoolsforchrome.onConnect);