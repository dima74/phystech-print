async function fetchJson(url) {
    let response = await fetch(`${url}`, {credentials: 'same-origin'});
    let json = await response.json();
    console.log('fetchJson:', url, json);
    return json.ans;
}

assert = function (condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
};