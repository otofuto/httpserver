let tutorialdata = [];
let tutorialindex = 0;

function startTutorial() {
    document.getElementById('tutorialback').removeAttribute('style');
    viewnexttutorial();
}

function setTutorial(arr) {
    tutorialdata = arr;
    let gb = document.createElement('div');
    gb.style.display = 'none';
    gb.setAttribute('class', 'grayback');
    gb.id = 'tutorialback';
    gb.setAttribute('onclick', 'viewnexttutorial()');
    document.body.appendChild(gb);
    let gray = document.createElement('div');
    gray.id = 'tutorialarea';
    gb.appendChild(gray);
    let com = document.createElement('div');
    com.id = 'tutorialcomment';
    gb.appendChild(com);

    let style = document.createElement('style');
    document.head.appendChild(style);
    style.innerText = `
    #tutorialback {
        display: flex;
        justify-content: center;
        position: fixed;
        width: 100vw;
        height: 100vh;
        top: 0;
        left: 0;
        background-color: transparent;
        z-index: 200;
    }
    #tutorialarea {
        display: flex;
        justify-content: center;
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        background-color: #0008;
        z-index: 201;
        transition: all 400ms ease;
    }
    #tutorialcomment {
        display: block;
        position: relative;
        width: 90%;
        height: max-content;
        max-width: 600px;
        background-color: white;
        border: solid 2px black;
        border-radius: 10px;
        padding: 10px;
        box-sizing: border-box;
        margin: 40vh auto;
        z-index: 202;
        transition: all 400ms ease;
    }
    #tutorialcomment>span {
        opacity: 0;
        transition: all 100ms ease;
    }
    `;
    tutorialindex = 0;
}

function viewnexttutorial() {
    if (tutorialindex == tutorialdata.length) {
        document.getElementById('tutorialback').style.display = 'none';
        tutorialindex = 0;
        let data = new FormData();
        data.append('path', location.pathname);
        fetch('/api/tutorial', {
            method: 'POST',
            body: data,
            credentials: 'include'
        });
        return;
    }
    let dom = document.querySelector(tutorialdata[tutorialindex][0]);
    let t = dom.getBoundingClientRect().top;
    let h = dom.offsetHeight;
    let l = dom.getBoundingClientRect().left;
    let w = dom.offsetWidth;
    let cp = 'polygon(0 0, 100% 0, 100% 100%, 0 100%, ' +
    l + 'px ' + (t + h) + 'px, ' +
    (l + w) + 'px ' + (t + h) + 'px, ' +
    (l + w) + 'px ' + t + 'px, ' +
    l + 'px ' + t + 'px, ' +
    l + 'px ' + (t + h) + 'px, ' +
    '0 100%)';
    document.getElementById('tutorialarea').style.clipPath = cp;
    if (tutorialdata[tutorialindex].length > 2) {
        document.getElementById('tutorialback').style.clipPath = cp;
    } else {
        document.getElementById('tutorialback').style.clipPath = 'none';
    }
    let com = document.getElementById('tutorialcomment');
    com.innerHTML = '';
    let txt = tutorialdata[tutorialindex][1];
    for (let i = 0; i < txt.length; i++) {
        let spn = document.createElement('span');
        spn.innerText = txt.charAt(i);
        com.appendChild(spn);
    }
    if (t + h + com.offsetHeight + 10 < window.innerHeight) {
        com.style.marginTop = (t + h + 5) + 'px';
    } else {
        com.style.marginTop = (t - com.offsetHeight - 5) + 'px';
    }
    let i = 0;
    let si = setInterval(() => {
        if (i < com.getElementsByTagName('span').length) {
            com.getElementsByTagName('span')[i].style.opacity = '1';
            i++;
        } else {
            clearInterval(si);
        }
    }, 40);
    tutorialindex++;
}