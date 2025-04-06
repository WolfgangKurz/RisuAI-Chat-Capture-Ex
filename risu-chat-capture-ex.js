//@name risu-chat-capture-ex
//@display-name RisuAI Chat Capture Ex v20250406
//@author Wolfgang Kurz
//@repository https://github.com/WolfgangKurz/RisuAI-Chat-Capture-Ex

const __DEBUG = false;

const __addOnUnload_fns = [];
const addOnUnload = (fn) => { // Stackable onUnload proxy
    __addOnUnload_fns.push(fn);
};

let risuLib = null;
fetch("https://raw.githubusercontent.com/WolfgangKurz/RisuAI-Chat-Capture-Ex/refs/heads/master/risu-lib.js?_=" + Date.now())
    .then(r => r.text())
    .then(r => risuLib = eval(r));

// MARK: html2canvas loader
if (!window.html2canvas) {
    const script = document.createElement("script");
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.body.appendChild(script);
}

// MARK: Styling
{
    const captureIndicatorColor = [255, 66, 13];
    const c0 = `rgba(${captureIndicatorColor.join(", ")}, 1.0)`;
    const c1 = `rgba(${captureIndicatorColor.join(", ")}, 0.5)`;
    const c2 = `rgba(${captureIndicatorColor.join(", ")}, 0.0)`;

    const style = document.createElement("style");
    style.innerHTML = (/* for debug */ __DEBUG ? `
.default-chat-screen .risu-chat .capture-ex-buttonbox button {
    padding: 3px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.3);
    color: #fff;
}
main > .flex-grow > .h-full.w-full:not(.absolute) {
    backdrop-filter: blur(10px);
}
` : "") + `
.risu-chat.capture-ex-from,
.risu-chat.capture-ex-to {
    position: relative;
}
.risu-chat.capture-ex-from::before {
    top: 0;
}
.risu-chat.capture-ex-to::after {
    bottom: 0;
    transform: scale(1, -1);
}
.risu-chat.capture-ex-from::before,
.risu-chat.capture-ex-to::after {
    content: "";
    position: absolute;
    display: block;
    left: 0;
    width: 100%;
    height: 20px;
    border-top: 2px solid ${c0};
    background: linear-gradient(to bottom, ${c1}, ${c2});
    opacity: 0.5;
    z-index: 5;
    pointer-events: none !important;
}
body.capture-ex-capturing .default-chat-screen .risu-chat .capture-ex-buttonbox,
body.capture-ex-capturing .default-chat-screen .risu-chat details:not(:open) > *:not(summary) {
    display: none;
}
body.capture-ex-capturing .default-chat-screen .risu-chat * {
    box-shadow: none !important; /* html2canvas not supporting box-shadow */
}
.capture_ex_proxy_image {
    display: flex;
}
.capture_ex_proxy_image > div {
    position: relative;
    flex: 1;
    overflow: hidden;
}
.capture_ex_proxy_image > div > img {
    position: absolute;
    object-fit: unset !important;
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
    max-height: none !important;
    min-width: none !important;
    min-height: none !important;
}
`;
    document.body.appendChild(style);
    addOnUnload(() => style.remove());
}

// MARK: Function
function uuid () {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);

    const h = [3, 5, 7, 9];
    return [...arr].map((r, i) => r.toString(16).padStart(2, "0") + (h.includes(i) ? "-" : "")).join("");
}
function findElemWithAll (on, target, _with) {
    return [...on.querySelectorAll(target)]
        .filter(el => !!el.querySelector(_with));
}
function findElemWith (on, target, _with) {
    return findElemWithAll(on, target, _with)[0] || null;
}

function _alert (message) {
    if (risuLib && risuLib.alert)
        risuLib.alert(message);
    else
        alert(message);
}
function _confirm (message, y, n) {
    return new Promise(resolve => {
        if (risuLib && risuLib.alert)
            return risuLib.alert(message, {
                buttons: [
                    { text: y, callback: () => resolve(true) },
                    { text: n, callback: () => resolve(false) },
                ],
            });
        else
            resolve(confirm(message));
    });
}

function i18n (k) {
    const loc = (() => {
        switch (k) {
            case "html2canvas_notfound":
                return {
                    en: "html2canvas library has not loaded!\nTry refresh page and retry.",
                    ko: "html2canvas 라이브러리가 로드되지 않았습니다!\n새로고침 후 다시 시도해보세요.",
                };
            case "point_starting_notset":
                return {
                    en: "Should select the starting point of the capture range!",
                    ko: "캡쳐할 채팅 범위의 시작 지점을 선택해야합니다!",
                };
            case "point_ending_notset":
                return {
                    en: "Should select the ending point of the capture range!",
                    ko: "캡쳐할 채팅 범위의 끝 지점을 선택해야합니다!",
                };
            case "point_swap_confirm":
                return {
                    en: "The starting point must be before the end point.\nDo you want to swap them and continue capturing?",
                    ko: "캡쳐할 채팅 범위의 시작은 끝보다 앞이어야 합니다.\n두 지점을 바꿔서 캡쳐를 시작하시겠습니까?",
                };
            case "point_swap_confirm_Y":
                return {
                    en: "Yes",
                    ko: "예",
                };
            case "point_swap_confirm_N":
                return {
                    en: "No",
                    ko: "아니오",
                };
            default:
                return {};
        }
    })();

    const langs = window.navigator.languages.map(r => {
        const i = r.indexOf("-");
        return (i >= 0 ? r.substring(0, i) : r).toLowerCase();
    });
    for (const lang of langs) {
        if (lang in loc)
            return loc[lang];
    }
    if ("en" in loc) return loc.en;
    return k;
}

let _capture_from = null;
let _capture_to = null;
function takeScreenshot () {
    if (!window.html2canvas) return _alert(i18n("html2canvas_notfound"));

    if (!_capture_from) return _alert(i18n("point_starting_notset"));
    if (!_capture_to) return _alert(i18n("point_ending_notset"));

    const chats = [...document.querySelectorAll(".default-chat-screen .risu-chat")];

    let risuMessage = null;
    function progress (message) {
        if (risuMessage)
            risuMessage.update(message, { closable: false });
        else
            risuMessage = risuLib.alert(message, { closable: false });
        console.log(message);
    }

    async function proc () {
        // check point swap
        let idxStart = chats.indexOf(_capture_from);
        let idxEnd = chats.indexOf(_capture_to);
        if (idxStart < idxEnd) { // column-reverse
            if (!await _confirm(
                i18n("point_swap_confirm"),
                i18n("point_swap_confirm_Y"),
                i18n("point_swap_confirm_N"),
            )) return;

            const t = idxEnd;
            idxEnd = idxStart;
            idxStart = t;
        }

        // Prepare (remove any styles)
        document.body.classList.add("capture-ex-capturing");
        _capture_from.classList.remove("capture-ex-from");
        _capture_to.classList.remove("capture-ex-to");

        const bg = window.getComputedStyle(_capture_from).getPropertyValue("--risu-theme-bgcolor");

        const count = idxStart - idxEnd + 1;
        progress(`Taking screenShot... 0/${count}`);

        const cvs = [];
        const covers = [];
        for (let i = idxEnd; i <= idxStart; i++) { // column-reverse
            // patch for object-fit image
            const images = [...chats[i].querySelectorAll("img")].map(r => {
                r.__previous_display = r.style.display;

                const st = window.getComputedStyle(r);

                const cover = document.createElement("var");
                cover.className = "capture_ex_proxy_image";
                cover.style.padding = st.padding;
                cover.style.margin = st.margin;
                cover.style.width = `${r.clientWidth}px`;
                cover.style.height = `${r.clientHeight}px`;

                covers.push(cover);

                if ("chrome" in window) {
                    cover.style.backgroundImage = `url(${r.src})`;

                    if (st.objectFit === "cover" || st.objectFit === "contain")
                        cover.style.backgroundSize = st.objectFit;
                } else {
                    const coverImgCont = document.createElement("div");
                    cover.appendChild(coverImgCont);

                    const coverImg = document.createElement("img");
                    coverImg.src = r.src;
                    coverImgCont.appendChild(coverImg);

                    switch (st.objectFit) {
                        case "cover": { // fit to object, scale-up
                            const r1 = r.clientWidth / r.naturalWidth;
                            const r2 = r.clientHeight / r.naturalHeight;
                            const rt = Math.max(r1, r2);
                            coverImg.style.width = `${r.naturalWidth * rt}px`;
                            coverImg.style.height = `${r.naturalHeight * rt}px`;
                            coverImg.style.top = `${(r.clientHeight - (r.naturalHeight * rt)) / 2}px`;
                            coverImg.style.left = `${(r.clientWidth - (r.naturalWidth * rt)) / 2}px`;
                            break;
                        }
                        case "contain": { // fit to object, scale-down
                            const r1 = r.clientWidth / r.naturalWidth;
                            const r2 = r.clientHeight / r.naturalHeight;
                            const rt = Math.min(r1, r2);
                            coverImg.style.width = `${r.naturalWidth * rt}px`;
                            coverImg.style.height = `${r.naturalHeight * rt}px`;
                            coverImg.style.top = `${(r.clientHeight - (r.naturalHeight * rt)) / 2}px`;
                            coverImg.style.left = `${(r.clientWidth - (r.naturalWidth * rt)) / 2}px`;
                            break;
                        }
                        default:
                            coverImg.width = r.clientWidth;
                            coverImg.height = r.clientHeight;
                            break;
                    }
                }

                if (r.nextElementSibling)
                    r.parentNode.insertBefore(cover, r.nextElementSibling);
                else
                    r.parentNode.appendChild(cover);

                r.style.display = "none";
                return r;
            });

            const cv = await window.html2canvas(chats[i], {
                foreignObjectRendering: false,
                backgroundColor: bg,
            });
            cvs.push(cv);
            progress(`Taking screenShot... ${cvs.length}/${count}`);

            // revert for object-fit image
            images.forEach(r => {
                r.style.display = r.__previous_display;
                delete r.__previous_display;
            });
            covers.forEach(c => c.remove());
        }
        cvs.reverse();

        progress("Merging images...");

        const cv = document.createElement("canvas");
        cv.width = 0;
        cv.height = 0;

        const ctx = cv.getContext("2d");

        let totalHeight = 0;
        let maxWidth = 0;
        cvs.forEach(c => {
            totalHeight += c.height;
            maxWidth = Math.max(maxWidth, c.width);
        });
        cv.width = maxWidth;
        cv.height = totalHeight;

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, maxWidth, totalHeight);

        let y = 0;
        cvs.forEach(c => {
            y += c.height;
            ctx.drawImage(c, 0, y - c.height);
            c.remove();
        });

        cv.toBlob(b => {
            const u = URL.createObjectURL(b);

            const a = document.createElement("a");
            a.href = u;
            if (__DEBUG)
                a.target = "_blank";
            else
                a.download = `chat-ex-${uuid()}.png`;

            document.body.appendChild(a);
            a.style.display = "none";
            a.click();
            a.remove();

            setTimeout(() => URL.revokeObjectURL(u), 5000);
        }, "image/png");

        // Post
        document.body.classList.remove("capture-ex-capturing");
        _capture_from.classList.add("capture-ex-from");
        _capture_to.classList.add("capture-ex-to");

        if (risuMessage)
            risuMessage.close();
    }
    proc();
}

// MARK: Chat Menu Injection
const _chat_menu_injector = setInterval(() => {
    if (document.querySelector("._capture_ex_take_button_")) return;

    const menu = document.querySelector("main > .flex-grow");
    if (!menu) return;

    const button = document.createElement("button");
    button.className = "_capture_ex_take_button_ absolute left-0 h-12 w-12 border-r border-b border-t border-transparent rounded-r-md bg-darkbg hover:border-neutral-200 transition-colors flex items-center justify-center text-textcolor z-20";
    button.style.top = "4.0rem";
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M15.854 6.146a2.84 2.84 0 0 1 .685 1.114l.448 1.377a.543.543 0 0 0 1.026 0l.448-1.377a2.84 2.84 0 0 1 1.798-1.796l1.378-.448a.544.544 0 0 0 0-1.025l-.028-.007l-1.378-.448a2.84 2.84 0 0 1-1.798-1.796L17.987.363a.544.544 0 0 0-1.027 0l-.448 1.377l-.011.034a2.84 2.84 0 0 1-1.005 1.367h-.001a2.8 2.8 0 0 1-.753.396l-.6.194l-.78.249a.57.57 0 0 0-.26.2a.5.5 0 0 0-.1.339a.5.5 0 0 0 .099.292a.54.54 0 0 0 .26.199l1.38.45a2.8 2.8 0 0 1 1.114.686m7.163 3.819l.766.248l.015.004a.303.303 0 0 1 .147.46a.3.3 0 0 1-.147.11l-.765.248a1.58 1.58 0 0 0-1 .999l-.248.764a.3.3 0 0 1-.382.186a.3.3 0 0 1-.112-.054a.28.28 0 0 1-.12-.14l-.092-.41l-.113-.347a1.58 1.58 0 0 0-.999-1.001l-.765-.249a.303.303 0 0 1-.147-.46a.3.3 0 0 1 .147-.11l.765-.248a1.58 1.58 0 0 0 .984-.999l.249-.764a.302.302 0 0 1 .57 0l.249.764a1.58 1.58 0 0 0 .999.999M15 12.5a3 3 0 1 0-6 0a3 3 0 0 0 6 0m7 5.25v-3.858a1.29 1.29 0 0 1-1.29-.122a1.35 1.35 0 0 1-.49-.65l-.24-.76a.6.6 0 0 0-.14-.23a.7.7 0 0 0-.22-.14l-.79-.25a1.3 1.3 0 0 1-.63-.48a1.26 1.26 0 0 1-.24-.75a1.3 1.3 0 0 1 .18-.66a1.45 1.45 0 0 1-.68.16a1.57 1.57 0 0 1-.89-.28a1.6 1.6 0 0 1-.57-.77l-.44-1.38a2 2 0 0 0-.29-.55l-.15-.17a1.8 1.8 0 0 0-.72-.44L13 5.96a1.6 1.6 0 0 1-.74-.57a1.57 1.57 0 0 1 0-1.79a1.65 1.65 0 0 1 .77-.57l1.36-.44l.066-.023a2.3 2.3 0 0 0-.531-.064h-3.803a2.25 2.25 0 0 0-1.917 1.073L7.33 5H5.25A3.25 3.25 0 0 0 2 8.25v9.5A3.25 3.25 0 0 0 5.25 21h13.5A3.25 3.25 0 0 0 22 17.75M7.5 12.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0"/></svg>`;

    button.addEventListener("click", e => {
        e.preventDefault();
        takeScreenshot();
    });
    menu.appendChild(button);
}, 100);
addOnUnload(() => {
    clearInterval(_chat_menu_injector);

    const el = document.querySelector("._capture_ex_take_button_");
    if (el) el.remove();
});

// MARK: Chat Line Injection
const _chat_line_injector = setInterval(() => {
    const chats = document.querySelectorAll(".default-chat-screen .risu-chat");
    chats.forEach(chat => {
        const chat_buttons = findElemWith(chat, ".flex-grow.flex.items-center.justify-end", ".text-xs:first-child");
        if (!chat_buttons) return;

        chat_buttons.classList.add("capture-ex-buttonbox");

        if (!chat_buttons.querySelector(".button-icon-capture_ex-from")) {
            const button_from = document.createElement("button");
            button_from.className = "ml-2 hover:text-blue-500 transition-colors button-icon-capture_ex-from";
            button_from.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 20H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v3.5"/><path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0-6 0m10 3v6m3-3l-3 3l-3-3"/></g></svg>`;
            button_from.addEventListener("click", e => {
                e.preventDefault();

                if (_capture_from) _capture_from.classList.remove("capture-ex-from");
                if (_capture_from !== chat) {
                    _capture_from = chat;
                    _capture_from.classList.add("capture-ex-from");
                } else
                    _capture_from = null;
            });
            chat_buttons.appendChild(button_from);
        }
        if (!chat_buttons.querySelector(".button-icon-capture_ex-to")) {
            const button_to = document.createElement("button");
            button_to.className = "ml-2 hover:text-blue-500 transition-colors button-icon-capture_ex-to";
            button_to.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 20H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v3.5"/><path d="M12 16a3 3 0 1 0 0-6a3 3 0 0 0 0 6m7 6v-6m3 3l-3-3l-3 3"/></g></svg>`;
            button_to.addEventListener("click", e => {
                e.preventDefault();

                if (_capture_to) _capture_to.classList.remove("capture-ex-to");
                if (_capture_to !== chat) {
                    _capture_to = chat;
                    _capture_to.classList.add("capture-ex-to");
                } else
                    _capture_to = null;
            });
            chat_buttons.appendChild(button_to);
        }
    });
}, 1000);
addOnUnload(() => {
    clearInterval(_chat_line_injector);

    document.querySelectorAll(".button-icon-capture_ex-from,.button-icon-capture_ex-to")
        .forEach(el => el.remove());
});

onUnload(() => {
    __addOnUnload_fns.forEach(f => f());
    if (risuLib) risuLib.unload();
});