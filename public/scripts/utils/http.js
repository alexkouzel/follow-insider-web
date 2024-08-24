export function post(url) {
    return request(url, { method: 'POST' });
}

export function postJson(url, json) {
    return postData(url, 'application/json', JSON.stringify(json));
}

export function postForm(url, form) {
    let contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
    return postData(url, contentType, new URLSearchParams(form));
}

export function getText(url) {
    return getData(url, 'text/plain', data => data.text());
}

export function getJson(url) {
    return getData(url, 'application/json', data => data.json());
}

export async function getModel(url, convert) {
    const json = await getJson(url);
    return convert(json);
}

export async function getModels(url, convert) {
    const json = await getJson(url);
    return json.map(obj => convert(obj));
}

function postData(url, contentType, body) {
    return request(url, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: body,
    });
}

async function getData(url, accept, convert) {
    const data = await request(url, {
        method: 'GET',
        headers: { 'Accept': accept },
    });
    if (!data) {
        throw new Error('Invalid data');
    }
    return convert(data);
}

async function request(url, props) {
    console.log(props.method + ' ' + url);

    props['redirect'] = 'follow';

    const response = await fetch(url, props);
    return handleResponse(response);
}

function handleResponse(response) {
    if (response.redirected) {
        window.location.href = response.url;
    }
    if (response.ok) {
        return response;
    }
    return response.json().then(errorData => {
        throw new Error(errorData.message || response.statusText);
    });
}