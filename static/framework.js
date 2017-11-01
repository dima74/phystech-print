assert = function (condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
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

function showError(scope, message, throwError = true) {
    let text = message === undefined ? scope : `[${scope}] ${message}`;
    Materialize.toast(text, 40000);
    if (throwError) {
        throw new Error(text);
    }
}

function ajaxError(scope) {
    return function (response) {
        json = JSON.parse(response.responseText);
        showError(scope, json.message);
    };
}

$.fn.exists = function () {
    return this.length !== 0;
};