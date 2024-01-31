
const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'ja';
recognition.onresult = e => {
    let txt = e.results[0][0].transcript;
    console.log(txt);
    if (txt.indexOf('トップページ') >= 0) {
        location = '/';
    } else if (txt.indexOf('アカウント') >= 0) {
        if (txt.indexOf('追加') >= 0 || txt.indexOf('作成') >= 0 || txt.indexOf('入力') >= 0) {
            location = '/account?write';
        } else {
            location = '/account';
        }
    } else if (txt.indexOf('設定') >= 0) {
        location = '/settings';
    } else if (txt.indexOf('車') >= 0) {
        if (txt.indexOf('追加') >= 0 || txt.indexOf('作成') >= 0 || txt.indexOf('入力') >= 0) {
            location = '/car?write';
        } else {
            location = '/car';
        }
    } else if (txt.indexOf('ドライバー') >= 0) {
        if (txt.indexOf('追加') >= 0 || txt.indexOf('作成') >= 0 || txt.indexOf('入力') >= 0) {
            location = '/driver?write';
        } else {
            location = '/driver';
        }
    } else if (txt.indexOf('請求先') >= 0) {
        if (txt.indexOf('追加') >= 0 || txt.indexOf('作成') >= 0 || txt.indexOf('入力') >= 0) {
            location = '/customer?write';
        } else {
            location = '/customer';
        }
    } else if (txt.indexOf('支払い先') >= 0 || txt.indexOf('支払先') >= 0) {
        if (txt.indexOf('追加') >= 0 || txt.indexOf('作成') >= 0 || txt.indexOf('入力') >= 0) {
            location = '/payable?write';
        } else {
            location = '/payable';
        }
    } else if (txt.indexOf('請求') >= 0) {
        if (txt.indexOf('追加') >= 0 || txt.indexOf('作成') >= 0 || txt.indexOf('入力') >= 0) {
            location = '/invoice?write';
        } else if (txt.indexOf('今月') >= 0) {
            let dt = new Date();
            location = '/invoice?in_year=' + dt.getFullYear() + '&in_month=' + (dt.getMonth() + 1);
        } else if (txt.indexOf('先月') >= 0) {
            let dt = new Date();
            let y = dt.getFullYear();
            let m = dt.getMonth();
            if (m == 0) m = 12,y--;
            location = '/invoice?in_year=' + y + '&in_month=' + m;
        } else if (txt.indexOf('来月') >= 0) {
            let dt = new Date();
            let y = dt.getFullYear();
            let m = dt.getMonth();
            m++;
            if (m == 12) m = 1,y++;
            else m++;
            location = '/invoice?in_year=' + y + '&in_month=' + m;
        } else {
            location = '/invoice';
        }
    } else if (txt.indexOf('便') >= 0) {
        if (txt.indexOf('追加') >= 0 || txt.indexOf('作成') >= 0 || txt.indexOf('入力') >= 0) {
            location = '/bin?write';
        } else {
            location = '/bin';
        }
    } else {
        viewMessageSR('「' + txt + '」に対応する機能がありません');
    }
};

let recognitioning = false;
window.addEventListener('keydown', e => {
    if (!recognitioning) {
        if (e.key == 'v') {
            //console.log('start');
            recognitioning = true;
            recognition.start();
        }
    }
});

window.addEventListener('keyup', e => {
    if (recognitioning) {
        if (e.key == 'v') {
            //console.log('end');
            recognitioning = false;
            recognition.stop();
        }
    }
});

function viewMessageSR(str) {
    let txt = document.createElement('div');
    txt.innerText = str;
    if (document.querySelector('.messagebox')) {
        document.querySelector('.messagebox').appendChild(txt);
    } else {
        let msg = document.createElement('div');
        msg.setAttribute('class', 'messagebox');
        msg.setAttribute('onclick', 'this.remove()');
        msg.appendChild(txt);
        document.body.appendChild(msg);
    }
}