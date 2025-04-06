// RisuAI Lib - for Plugins
// by Wolfgang Kurz
// https://github.com/WolfgangKurz

const BACKDROP_CN = "risu-lib-message-backdrop";
const BACKDROP_DISP_CN = "risu-lib-message-display";
const MESSAGE_WRAP_CN = "risu-lib-message-wrapper";
const MESSAGE_CN = "risu-lib-message";
const MESSAGE_CLOSE_CN = "risu-lib-message-close";

const style = document.createElement("style");
style.innerHTML = `
    #${BACKDROP_CN} {
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.35);
        transition: opacity 0.28s ease;
        z-index: 9999;
    }
    #${BACKDROP_CN}:not(.${BACKDROP_DISP_CN}) {
        opacity: 0 !important;
        pointer-events: none !important;
    }
    #${BACKDROP_CN} .${MESSAGE_WRAP_CN} {
        display: flex;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        transition: opacity 0.28s ease;
        opacity: 0;
    }
    #${BACKDROP_CN} .${MESSAGE_CN} {
        border-radius: 6px;
        padding: 10px;
        background-color: #fff;
        text-align: center;
        font-weight: 500;
        font-size: 16px;
        color: #232429;
        box-shadow: 0 2px 7px rgba(0, 0, 0, 0.65);
    }
    #${BACKDROP_CN} .${MESSAGE_CN} > div {
        display: flex;
        min-width: min(400px, 90vw);
        min-height: 80px;
        justify-content: center;
        align-items: center;
    }
    #${BACKDROP_CN} .${MESSAGE_CN} > div + button {
        margin-top: 10px;
    }
    #${BACKDROP_CN} .${MESSAGE_CN} button {
        margin: 2px;
        padding: 3px 12px;
        border-radius: 4px;
        background-color: #36383D;
        font-weight: 600;
        font-size: 16px;
        color: #fff;
    }
    #${BACKDROP_CN} .${MESSAGE_CN} button.${MESSAGE_CLOSE_CN} {
        order: 999;
    }
`;
document.body.appendChild(style);

const backdrop = document.createElement("div");
backdrop.id = BACKDROP_CN;
document.body.appendChild(backdrop);

function flushBackdrop () {
    // Late clean
    if (backdrop.children.length === 0)
        backdrop.classList.remove(BACKDROP_DISP_CN);
}

const risuLib = {
    alert (message, opt) {
        opt ||= {};
        const o_closable = opt.closable || true;
        const o_buttons = opt.buttons || [];
        const o_callback = opt.callback;

        const wrapper = document.createElement("div");
        wrapper.classList.add(MESSAGE_WRAP_CN);
        wrapper.addEventListener("transitionend", e => {
            e.preventDefault();
            if (wrapper.style.opacity != 0) return;

            wrapper.remove();
            if (o_callback) callback();

            flushBackdrop();
        });

        const box = document.createElement("div");
        box.classList.add(MESSAGE_CN);

        const content = document.createElement("div");
        content.appendChild(document.createTextNode(message));
        box.append(content);

        if (Array.isArray(o_buttons))
            o_buttons.forEach(b => {
                const btn = document.createElement("button");
                btn.appendChild(document.createTextNode(b.text || "Button"));
                btn.addEventListener("click", e => {
                    e.preventDefault();
                    if (b.callback) b.callback();
                });
                box.append(btn);
            });

        function generateCloseButton () {
            const close = document.createElement("button");
            close.classList.add(MESSAGE_CLOSE_CN);
            close.appendChild(document.createTextNode("OK"));

            close.addEventListener("click", e => {
                e.preventDefault();

                wrapper.style.opacity = 0;
                if (backdrop.children.length === 1) // Is this message only?
                    backdrop.classList.remove(BACKDROP_DISP_CN); // Close backdrop also
            });
            box.appendChild(close);
        }
        if (o_closable) generateCloseButton();

        wrapper.appendChild(box);
        backdrop.appendChild(wrapper);
        backdrop.classList.add(BACKDROP_DISP_CN);

        // Display wrapper at next frame
        requestAnimationFrame(() => (wrapper.style.opacity = 1));

        return {
            update (message, opt) {
                opt ||= {};
                const o_closable = opt.closable;
                const o_buttons = opt.buttons;

                content.innerHTML = ""; // simple clear
                content.appendChild(document.createTextNode(message));

                if (o_buttons !== undefined) {
                    box.querySelectorAll(`button:not(.${MESSAGE_CLOSE_CN})`).forEach(el => el.remove());
                    if (Array.isArray(o_buttons))
                        o_buttons.forEach(b => {
                            const btn = document.createElement("button");
                            btn.appendChild(document.createTextNode(b.text || "Button"));
                            btn.addEventListener("click", e => {
                                e.preventDefault();
                                if (b.callback) b.callback();
                            });
                            box.append(btn);
                        });
                }

                if (o_closable !== undefined) {
                    const was_closable = box.querySelector(`.${MESSAGE_CLOSE_CN}`);
                    if (o_closable !== !!was_closable) {
                        if (o_closable)
                            generateCloseButton();
                        else
                            was_closable.remove();
                    }
                }
            },
            close () {
                wrapper.style.opacity = 0;
                if (backdrop.children.length === 1) // Is this message only?
                    backdrop.classList.remove(BACKDROP_DISP_CN); // Close backdrop also
            },
        };
    },
    clear () {
        backdrop.querySelectorAll(`.${MESSAGE_WRAP_CN}`).forEach(w => {
            w.style.opacity = 0;
        });
        backdrop.classList.remove(BACKDROP_DISP_CN);
    },
    unload () {
        style.remove();
    },
};
risuLib; // set as eval return