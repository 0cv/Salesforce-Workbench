var tabId,
    hostname,
    isInLightning = false;


var workbenchtoolsforchrome = {  
    badPageErrorMsg : 'Ooops! This command must only be excuted when logged into Salesforce. Select a tab with an active Salesforce session and try again.',
        
    onRequest : function(request, sender, sendResponse) {
      // Show the page action for the tab that the sender (content script) was on.
      if (sender.tab.url.indexOf('blacktaboid') > -1 && sender.tab.url.indexOf('servlet/servlet.su') == -1) {
        chrome.pageAction.setIcon({'tabId':sender.tab.id, 'path':'workbench-3-black-cube-48x48.png'});
      }
      
      chrome.pageAction.show(sender.tab.id);
  
      // Return nothing to let the connection be cleaned up.
      sendResponse({});
    },
    
    onClicked : function(tab) {
      if (tab.url.indexOf("http:") != 0 && tab.url.indexOf("https:") != 0) {
        alert(this.badPageErrorMsg);
        return;
      }
      
      chrome.tabs.executeScript(null, {file: "postTabInfo.js"});
    },
    
    onConnect : function(port) {
      // This will get called by the content script we execute in
      // the tab as a result of the user pressing the browser action.
      port.onMessage.addListener((tabInfo) => {      
        if (!tabInfo.url || !tabInfo.sessionId) {
          alert(this.badPageErrorMsg);
          return;        
        }
        hostname = tabInfo.hostname;
        workbenchtoolsforchrome.loginFromSession(tabInfo.url, tabInfo.sessionId);
      });
    },
    
    gotoWorkbench : function(urlTail) {
      if (window.localStorage == null) {
        alert("Local storage must be enabled for Workbench Tools");
        return;
      }
            
      if (window.localStorage.customWorkbenchBaseUrl == null || window.localStorage.customWorkbenchBaseUrl == "") {
        try {
          const DEFAULT_WORKBENCH_BASE_URL = "http://workbench";
          var xhr = new XMLHttpRequest();  
          xhr.open("HEAD", DEFAULT_WORKBENCH_BASE_URL, false);
          xhr.send(null);
          
          if (xhr.status == 302 || xhr.status == 200) {
              window.localStorage.customWorkbenchBaseUrl = DEFAULT_WORKBENCH_BASE_URL;
          }            
        } catch (e) {
          chrome.tabs.create({'url': chrome.extension.getURL("options.html")});
          return;
        }      
      }
      
      urlTail = urlTail || '';
      var urlToOpen = window.localStorage.customWorkbenchBaseUrl + urlTail;
      chrome.tabs.create({'url': urlToOpen});
    },
  
    loginFromSession : function(currentUrl, sessionId) {
      //capture serverUrl prefix
      if (currentUrl.indexOf('localhost') > -1) {
        alert('Cannot login to Workbench with \'localhost\'. To use with a local build, set \'app_server\' in your user.properties to your hostname.');
        return;
      }
    
      if (currentUrl.indexOf('blacktaboid') > -1 && currentUrl.indexOf('servlet/servlet.su') == -1) {
        alert('Cannot login to Workbench from Blacktab unless you are viewing the Session ID of a user who granted login access.');
        return;
      }
    
      var currentUrlTailIndex = currentUrl.indexOf('/',8); //ignore slashes in protocol
      if (currentUrlTailIndex == -1) {
        alert(this.badPageErrorMsg);
        return;
      }
      var serverUrlPrefix = currentUrl.substring(0, currentUrlTailIndex);
    

      if(hostname.indexOf('.salesforce.com') > -1) {
      //pass params to Workbench
        this.gotoWorkbench('/login.php?serverUrlPrefix=' + escape(serverUrlPrefix) + '&sid=' + escape(sessionId));
      } else {
        // We are on a Force.com domain, so that we need first to go to the salesforce.com domain to login, because 
        // the Session ID is not valid on Force.com domain.
        
        // We capture whether we are in lightning
        isInLightning = false;
        if(hostname.indexOf('.lightning.force.com') > -1) { 
          isInLightning = true;
        }

        // We listen when the tab loads 
        chrome.tabs.onUpdated.addListener(workbenchtoolsforchrome.listenTabLoading);
        
        //we execute the lightning switcher to Salesforce Classic
        chrome.tabs.create({'url': 'https://' + hostname + '/lightning/switcher?destination=classic'}, (tab) => {
          tabId = tab.id
        });
      }      
    },

    listenTabLoading(_tabId, changeInfo) {
      if(tabId === _tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(workbenchtoolsforchrome.listenTabLoading);
        
        // Now that the salesforce.com page is loaded, we can execute the script to open the Workbench
        chrome.tabs.executeScript(tabId, {file: "postTabInfo.js"}, () => {
          
          if(isInLightning) {
            // We listen when the tab loads 
            chrome.tabs.onUpdated.addListener(workbenchtoolsforchrome.listenTabLoading2);
      
            // We have to revert back to Lightning, to not change the context of the User
            chrome.tabs.update(tabId, {url: 'https://' + hostname + '/lightning/switcher?destination=lex'});
          } else {
            // We can remove safely the temporary .salesforce.com page
            chrome.tabs.remove(tabId);
          }
        });
      }
    },

    listenTabLoading2(_tabId, changeInfo) {
      if(tabId === _tabId && changeInfo.url.indexOf('.lightning.force.com') > -1) {
        chrome.tabs.onUpdated.removeListener(workbenchtoolsforchrome.listenTabLoading2);

        //now we are back in Lightning, we can remove safely the temporary .salesforce.com page
        chrome.tabs.remove(tabId);
      }
    }
  };

  // REGISTER LISTENERS
  chrome.runtime.onMessage.addListener(workbenchtoolsforchrome.onRequest);
  chrome.pageAction.onClicked.addListener(workbenchtoolsforchrome.onClicked);
  chrome.runtime.onConnect.addListener(workbenchtoolsforchrome.onConnect);