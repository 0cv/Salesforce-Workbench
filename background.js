var workbenchtoolsforchrome = {
    badPageErrorMsg : 'Ooops! This command must only be excuted when logged into Salesforce. Select a tab with an active Salesforce session and try again.',

    onClicked: function(tab) {
        if (tab.url.indexOf('http:') != 0 && tab.url.indexOf('https:') != 0) {
            return chrome.notifications.create({
                type: 'basic',
                title: 'Error',
                iconUrl: 'workbench-3-cube-48x48.png',
                message: workbenchtoolsforchrome.badPageErrorMsg,
                priority: 1
            });
        }

        chrome.scripting.executeScript({
            target : {tabId : tab.id},
            files: ['postTabInfo.js']
        });
    },
    onConnect: function(port) {
        // This will get called by the content script we execute in
        // the tab as a result of the user pressing the browser action.
        port.onMessage.addListener((tabInfo) => {
            // Get the SID related to the page the content script ran on
            chrome.cookies.getAll({'url':tabInfo.url,'name':'sid'}, (cookie) => {
                if (!tabInfo.url || !cookie || !cookie.length) {
                    return chrome.notifications.create({
                        type: 'basic',
                        title: 'Error',
                        iconUrl: 'workbench-3-cube-48x48.png',
                        message: workbenchtoolsforchrome.badPageErrorMsg,
                        priority: 1
                    });
                }
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
    gotoWorkbench: async function(urlTail) {
        const ls = chrome.storage.local;

        if (!ls) {
            return chrome.notifications.create({
                type: 'basic',
                title: 'Error',
                iconUrl: 'workbench-3-cube-48x48.png',
                message: 'Permission missing for local storage',
                priority: 1
            });
        }

        const key = 'customWorkbenchBaseUrl';
        const baseUrl = (await ls.get(key))[key];

        if (!baseUrl) {
            console.log('get url options.html', chrome.runtime.getURL('options.html'));
            return chrome.tabs.create({'url': chrome.runtime.getURL('options.html')});
        }

        urlTail = urlTail || '';
        var urlToOpen = baseUrl + urlTail;
        chrome.tabs.create({'url': urlToOpen});
    },
    loginFromSession: function(currentUrl, sessionId) {
        //pass params to Workbench
        this.gotoWorkbench('/login.php?serverUrlPrefix=' + escape(currentUrl) + '&sid=' + escape(sessionId));
    },
};

// REGISTER LISTENERS
chrome.runtime.onMessage.addListener(workbenchtoolsforchrome.onRequest);
chrome.action.onClicked.addListener(workbenchtoolsforchrome.onClicked);
chrome.runtime.onConnect.addListener(workbenchtoolsforchrome.onConnect);

// Trick to successfully grey / ungrey the icon on other websites due to a bug in the manifest 3
// Credits to https://stackoverflow.com/questions/64473519/how-to-disable-gray-out-page-action-for-chrome-extension/64475504#64475504
chrome.declarativeContent.onPageChanged.removeRules(async () => {
    const loadImageData = async (url) => {
        const img = await createImageBitmap(await (await fetch(url)).blob());
        const {width: w, height: h} = img;
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        return ctx.getImageData(0, 0, w, h);
    }

    chrome.declarativeContent.onPageChanged.addRules([{
        conditions: [
            new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { hostSuffix: '.salesforce.com' },
            }),
            new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { hostSuffix: '.force.com' },
            }),
        ],
        actions: [
            new chrome.declarativeContent.SetIcon({
                imageData: {
                    48: await loadImageData('workbench-3-cube-48x48.png'),
                },
            }),
            chrome.declarativeContent.ShowAction
                ? new chrome.declarativeContent.ShowAction()
                : new chrome.declarativeContent.ShowPageAction(),
        ],
    }]);
});

