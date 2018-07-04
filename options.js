window.addEventListener('load', load);

function save() {
    if (window.localStorage == null) {
        alert('Local storage is required for saving options.');
        return;
    }

    window.localStorage.customWorkbenchBaseUrl = this.parentNode.baseUrl.value;

    document.getElementById('saved').style.display = 'block';
}

function load() {
    document.getElementById('saveBtn').onclick=save;
    var baseUrlInput = document.getElementById('baseUrl');

    if (window.localStorage == null) {
        baseUrlInput.disabled = true;
        document.getElementById('saveBtn').disabled = true;
        alert('LocalStorage must be enabled for changing options.');
        return;
    }

    if (window.localStorage.customWorkbenchBaseUrl != null) {
        baseUrlInput.value = window.localStorage.customWorkbenchBaseUrl;
    }
}