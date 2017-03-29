async function fetchJson(url) {
    let response = await fetch(`${url}`, {credentials: 'same-origin'});
    return await response.json();
}