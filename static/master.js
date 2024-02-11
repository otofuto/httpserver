function setHeight() {
    document.documentElement.style.setProperty('--vh', window.innerHeight + 'px');
}
setHeight();
window.onresize = () => setHeight();

onload = () => {
    document.querySelectorAll('[data-ot-get]').forEach(elm => {
        execGet(elm);
    });
    document.querySelectorAll('form[data-ot-post]').forEach(elm => {
        elm.onsubmit = () => {
            let acts = elm.getAttribute('data-ot-post').split(',');
            if (acts[0] != '') {
                let data = new FormData(elm);
                formDisabled(elm, true);
                post(acts[0], data).then(res => {
                    if (res.result) {
                        if (acts.length > 0) {
                            viewMessage(acts[1]);
                        } else {
                            viewMessage('成功しました');
                        }
                    } else if (res.message && res.message != '') {
                        viewMessage(res.message);
                    } else {
                        viewMessage('失敗しました');
                    }
                }).catch(err => {
                    console.error(err);
                    elm.innerHTML = err;
                }).finally(() => {
                    formDisabled(elm, false);
                    if (typeof getend == 'function') {
                        getend(elm.getAttribute('data-ot-post'));
                    }
                });
            }
            return false;
        }
    });
};

function execGet(elm, custom, getend) {
    get(elm.getAttribute('data-ot-get')).then(res => {
        if (res.result) {
            if (res.message) {
                setText(elm, res.message);
            } else if (res.html) {
                elm.innerHTML = res.html;
            } else if (Array.isArray(res.list)) {
                let sample = null;
                if (elm.children.length > 0) {
                    sample = elm.children[0];
                    sample.removeAttribute('class');
                    sample.removeAttribute('style');
                } else {
                    sample = document.createElement('div');
                }
                res.list.forEach(l => {
                    let art = sample.cloneNode(true);
                    for (let i = 0; i < Object.keys(l).length; i++) {
                        art.querySelectorAll('[data-ot-' + Object.keys(l)[i] + ']').forEach(target => {
                            let intext = l[Object.keys(l)[i]];
                            if (typeof custom == 'function') {
                                intext = custom(Object.keys(l)[i], intext, target);
                                if (intext == undefined) intext = l[Object.keys(l)[i]];
                            }
                            setText(target, intext);
                        });
                        elm.appendChild(art);
                    }
                });
                sample.setAttribute('class', 'ot-sample');
                sample.style.display = 'none';
            } else {
                elm.innerText += 'Success';
            }
        } else {
            elm.innerHTML = res.message;
        }
    }).catch(err => {
        console.error(err);
        elm.innerHTML = err;
    }).finally(() => {
        if (typeof getend == 'function') {
            getend(elm.getAttribute('data-ot-get'));
        }
    });
}

function setText(target, text) {
    let tagname = target.tagName.toLowerCase();
    if (tagname == 'input' || tagname == 'select' || tagname == 'textarea') {
        target.value = text;
    } else {
        target.innerText = text;
    }
}

function otClear(target) {
    if (target.querySelector('[ot-sample]')) {
        let sample = target.querySelector('[ot-sample]').cloneNode(true);
        target.innerHTML = '';
        target.appendChild(sample);
    } else if (target.children.length > 0) {
        let sample = target.children[0];
        target.innerHTML = '';
        target.appendChild(sample);
    } else {
        target.innerHTML = '';
    }
}

function viewMessage(str, f) {
    let txt = document.createElement('div');
    txt.innerText = str;
    if (document.querySelector('.messagebox')) {
        document.querySelector('.messagebox').appendChild(txt);
    } else {
        let msg = document.createElement('div');
        msg.setAttribute('class', 'messagebox');
        if (f) msg.addEventListener('click', () => {
            msg.remove();
            f();
        });
        else msg.setAttribute('onclick', 'this.remove()');
        msg.appendChild(txt);
        document.body.appendChild(msg);
    }
}

function selectAndCopy(elm){
    window.getSelection().selectAllChildren(elm);
    document.execCommand('copy');
}

function post(url, data) {
    return new Promise((resolve, reject) => {
        sendAPI(url, data, 'POST')
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
}

function get(url, object) {
    return new Promise((resolve, reject) => {
        let query = new URLSearchParams(object).toString();
        sendAPI(url + '?' + query, null, 'GET')
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
}

function put(url, data) {
    return new Promise((resolve, reject) => {
        sendAPI(url, data, 'PUT')
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
}

function del(url, data) {
    return new Promise((resolve, reject) => {
        sendAPI(url, data, 'DELETE')
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
}

function sendAPI(url, data, method) {
    return new Promise((resolve, reject) => {
        let d = data;
        if (d == null && method != 'GET') d = new FormData();
        fetch(url, {
            method: method,
            body: d,
            credentials: 'include'
        }).then(res => {
            return res.text();
        }).then(txt => {
            try {
                resolve(JSON.parse(txt));
            } catch(err) {
                console.error(err);
                reject(err);
            }
        }).catch(err => {
            console.error(err);
            reject(err);
        });
    });
}

function formDisabled(form, dis) {
	if (dis) {
		Array.from(form.getElementsByTagName('input')).forEach(elm => elm.setAttribute('disabled', ''));
		Array.from(form.getElementsByTagName('textarea')).forEach(elm => elm.setAttribute('disabled', ''));
		Array.from(form.getElementsByTagName('button')).forEach(elm => elm.setAttribute('disabled', ''));
		Array.from(form.getElementsByTagName('select')).forEach(elm => elm.setAttribute('disabled', ''));
        Array.from(form.querySelectorAll('input[type="checkbox"]')).forEach(elm => elm.setAttribute('onclick', 'return false;'));
        Array.from(form.querySelectorAll('input[type="radiobutton"]')).forEach(elm => elm.setAttribute('onclick', 'return false;'));
	} else {
		Array.from(form.getElementsByTagName('input')).forEach(elm => elm.removeAttribute('disabled'));
		Array.from(form.getElementsByTagName('textarea')).forEach(elm => elm.removeAttribute('disabled'));
		Array.from(form.getElementsByTagName('button')).forEach(elm => elm.removeAttribute('disabled'));
		Array.from(form.getElementsByTagName('select')).forEach(elm => elm.removeAttribute('disabled'));
        Array.from(form.querySelectorAll('input[type="checkbox"]')).forEach(elm => elm.removeAttribute('onclick'));
        Array.from(form.querySelectorAll('input[type="radiobutton"]')).forEach(elm => elm.removeAttribute('onclick'));
	}
}

function get2form(form) {
    let inputs = [];
    for (let i = 0; i < (inputs = form.getElementsByTagName('input')).length; i++) {
        if (inputs[i].getAttribute('type') == 'checkbox' || inputs[i].getAttribute('type') == 'radiobutton') {
            if (inputs[i].checked) inputs[i].click();
        }
    }
    new URL(location).searchParams.forEach((v, k) => {
        Array.from(document.getElementsByName(k)).forEach(elm => {
            if (elm.getAttribute('type') == 'checkbox' || elm.getAttribute('type') == 'radio') {
                if (elm.value == v) (!elm.checked ? elm.click() : 0);
            } else {
                elm.value = v;
            }
        });
    });
}

function object2form(obj, form) {
    let inputs = [];
    for (let i = 0; i < (inputs = form.getElementsByTagName('input')).length; i++) {
        if (inputs[i].getAttribute('type') == 'checkbox' || inputs[i].getAttribute('type') == 'radiobutton') {
            if (inputs[i].checked) inputs[i].click();
        }
    }
    for (let i = 0; i < Object.keys(obj).length; i++) {
        let k = Object.keys(obj)[i];
        let v = obj[k];
        document.querySelectorAll('form[name="' + form.getAttribute('name') + '"] [name="' + k + '"]').forEach(elm => {
            if (elm.getAttribute('type') == 'checkbox' || elm.getAttribute('type') == 'radio') {
                if (elm.value == v) (!elm.checked ? elm.click() : 0);
            } else {
                elm.value = v;
            }
        });
    }
}