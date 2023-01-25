window.addEventListener('load', load);
const ls = chrome.storage.local;
const key = 'customWorkbenchBaseUrl';

async function save() {
    if (!ls) {
        return chrome.notifications.create({
            type: 'basic',
            title: 'Error',
            iconUrl: 'workbench-3-cube-48x48.png',
            message: 'Local storage is required.',
            priority: 1
        });
    }

    await ls.set({[key]: this.parentNode.baseUrl.value})

    document.getElementById('saved').style.display = 'block';
}

function load() {
    document.getElementById('saveBtn').onclick=save;
    var baseUrlInput = document.getElementById('baseUrl');

    if (!ls) {
        baseUrlInput.disabled = true;
        document.getElementById('saveBtn').disabled = true;
        alert('LocalStorage must be enabled for changing options.');
        return;
    }

    chrome.storage.local.get([key]).then((result) => {
        if (result[key]) {
            baseUrlInput.value = result[key];
        }
    });
}