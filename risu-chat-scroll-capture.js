//@name risu-chat-scrolled-capture
//@display-name RisuAI Chat Scroll Capture v20250330
//@author Wolfgang Kurz
//@repository https://github.com/WolfgangKurz/RisuAI-Chat-Scroll-Capture

if (!window.html2canvas) {
    const script = document.createElement("script");
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.body.appendChild(script);
}

function doCapture (el) {
    if (!window.html2canvas) {
        alert("html2canvas not loaded!");
        return;
    }

    const input = el.querySelector(".items-stretch:first-child");
    input.style.display = "none";

    const pages = Math.ceil(el.scrollHeight / el.clientHeight);
    const canvas_ = [];

    let mode = 0; // 0: to positive, 1: from negative (flex, column-reverse)
    const oriTop = el.scrollTop;
    el.scrollTop = 0;

    const st = window.getComputedStyle(el);
    if (st.display === "flex" && st.flexDirection === "column-reverse")
        mode = 1;

    let scrollBase = 0;
    if (mode === 1) {
        el.scrollTop = -el.scrollHeight;
        scrollBase = el.scrollTop;
    }

    const backgroundColor = window.getComputedStyle(document.body).backgroundColor;

    function _then (cv) {
        if (cv) {
            canvas_.push(cv);
            if (canvas_.length === pages) {
                setTimeout(() => {
                    el.scrollTop = oriTop;
                    input.style.display = null;
                }, 200);

                const mcv = document.createElement("canvas");
                mcv.width = Math.max(...canvas_.map(c => c.width));
                mcv.height = el.scrollHeight;

                const ctx = mcv.getContext("2d");
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, mcv.width, mcv.height);
                for (let i = 0; i < canvas_.length; i++) {
                    const y = el.clientHeight * (i + 1) > el.scrollHeight
                        ? el.scrollHeight - el.clientHeight
                        : el.clientHeight * i;

                    ctx.drawImage(canvas_[i], 0, y);
                }

                mcv.toBlob(b => {
                    const url = URL.createObjectURL(b);
                    const a = document.createElement("a");
                    a.href = url;
                    a.target = "_blank";
                    a.download = `RisuAI - ${document.querySelector("div.risu-chat >button.bg-selected").innerText}.png`;
                    a.click();
                    // window.open(url) || console.log(url);
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                }, "image/png");

                return;
            }
        }

        el.scrollTop = scrollBase + (canvas_.length * el.clientHeight);
        return window.html2canvas(el, {
            backgroundColor,
        }).then(_then);
    }
    setTimeout(() => _then(null), 100);
}

const startupChecker = setInterval(() => {
    const menu = document.querySelector("main > .rs-sidebar");
    if (!menu) return;
    clearInterval(startupChecker);

    const btn = document.createElement("button");
    btn.className = "flex h-8 min-h-8 w-14 min-w-14 cursor-pointer text-white mt-2 items-center justify-center rounded-md bg-textcolor2 transition-colors hover:bg-green-500";
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 18q2.075 0 3.538-1.462Q17 15.075 17 13q0-2.075-1.462-3.538Q14.075 8 12 8Q9.925 8 8.463 9.462Q7 10.925 7 13q0 2.075 1.463 3.538Q9.925 18 12 18Zm0-2q-1.25 0-2.125-.875T9 13q0-1.25.875-2.125T12 10q1.25 0 2.125.875T15 13q0 1.25-.875 2.125T12 16Zm6-6q.425 0 .712-.288Q19 9.425 19 9t-.288-.713Q18.425 8 18 8t-.712.287Q17 8.575 17 9t.288.712Q17.575 10 18 10ZM4 21q-.825 0-1.412-.587Q2 19.825 2 19V7q0-.825.588-1.412Q3.175 5 4 5h3.15L8.7 3.325q.15-.15.337-.238Q9.225 3 9.425 3h5.15q.2 0 .388.087q.187.088.337.238L16.85 5H20q.825 0 1.413.588Q22 6.175 22 7v12q0 .825-.587 1.413Q20.825 21 20 21Z"/></svg>`;
    btn.addEventListener("click", e => {
        e.preventDefault();

        const el = document.querySelector(".default-chat-screen");
        if (el)
            doCapture(el);
    });
    menu.insertBefore(btn, menu.querySelector("div.mt-2"));

    onUnload(() => menu.removeChild(btn));
}, 100);
