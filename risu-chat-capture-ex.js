//@name risu-chat-capture-ex
//@display-name RisuAI Chat Capture Ex v20250331
//@author Wolfgang Kurz
//@repository https://github.com/WolfgangKurz/RisuAI-Chat-Capture-Ex

const __DEBUG = false;

const __addOnUnload_fns = [];
const addOnUnload = (fn) => { // Stackable onUnload proxy
    __addOnUnload_fns.push(fn);
};

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
.default-chat-screen .risu-chat .flexium.chat-width > div button {
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
    z-index: -1;
}
body.capture-ex-capturing .default-chat-screen .risu-chat .flexium.chat-width > div {
    display: none;
}
body.capture-ex-capturing .default-chat-screen .risu-chat * {
    box-shadow: none !important; /* html2canvas not supporting box-shadow */
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

let _capture_from = null;
let _capture_to = null;
function takeScreenshot () {
    if (!window.html2canvas) return alert("html2canvas not loaded!\nTry refresh page and retry.");

    if (!_capture_from) return alert("Should select the starting point of the capture range!");
    if (!_capture_to) return alert("Should select the ending point of the capture range!");

    const chats = [...document.querySelectorAll(".default-chat-screen .risu-chat")];
    let idxStart = chats.indexOf(_capture_from);
    let idxEnd = chats.indexOf(_capture_to);
    if (idxStart < idxEnd) { // column-reverse
        if (!confirm("The starting point must be before the end point.\nDo you want to swap them and continue capturing?"))
            return;

        const t = idxEnd;
        idxEnd = idxStart;
        idxStart = t;
    }

    async function proc () {
        // Prepare (remove any styles)
        document.body.classList.add("capture-ex-capturing");
        _capture_from.classList.remove("capture-ex-from");
        _capture_to.classList.remove("capture-ex-to");

        const bg = window.getComputedStyle(_capture_from).getPropertyValue("--risu-theme-bgcolor");

        const count = idxStart - idxEnd + 1;
        console.log(`Taking screenShot... 0/${count}`);

        const cvs = [];
        for (let i = idxEnd; i <= idxStart; i++) { // column-reverse
            const cv = await window.html2canvas(chats[i], {
                foreignObjectRendering: false,
                backgroundColor: bg,
            });
            cvs.push(cv);
            console.log(`Taking screenShot... ${cvs.length}/${count}`);
        }
        cvs.reverse();

        console.log("Merging images...");

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
        const chat_buttons = chat.querySelector(".flexium.chat-width > div");

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
});