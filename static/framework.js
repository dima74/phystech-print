async function fetchJson(url) {
    let response = await fetch(`${url}`, {credentials: 'same-origin'});
    return await response.json();
}

assert = function (condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
};