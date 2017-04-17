async function fetchJson(url) {
    let response = await fetch(`${url}`, {credentials: 'same-origin'});
    let json = await response.json();
    console.log('[fetchJson]', url, json);
    return json.ans;
}

assert = function (condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
};

function getLoadingAnimation(cssClass) {
    return `<div class="preloader-wrapper active tiny ${cssClass}">
                    <div class="spinner-layer spinner-green-only">
                        <div class="circle-clipper left">
                            <div class="circle"></div>
                        </div>
                        <div class="gap-patch">
                            <div class="circle"></div>
                        </div>
                        <div class="circle-clipper right">
                            <div class="circle"></div>
                        </div>
                    </div>
                </div>`;
}

const loadingAnimation = getLoadingAnimation('');

function showError(scope, message) {
    let text = message === undefined ? scope : `[${scope}] ${message}`;
    Materialize.toast(text, 40000);
    throw text;
}

function ajaxError(scope) {
    return function (response) {
        json = JSON.parse(response.responseText);
        showError(scope, json.message);
    }
}