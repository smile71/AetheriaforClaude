import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const root = document.getElementById("root") as HTMLElement;

function show(msg: string) {
    root.innerHTML = "";
    const pre = document.createElement("pre");
    pre.style.cssText =
        "color:#ff8a8a;background:#111;padding:16px;margin:8px;white-space:pre-wrap;font:12px monospace;user-select:text;overflow:auto;height:calc(100% - 16px)";
    pre.textContent = msg;
    root.appendChild(pre);
}

window.addEventListener("error", (e) => {
    show("Ошибка: " + e.message + "\n" + (e.error && e.error.stack ? e.error.stack : ""));
});
window.addEventListener("unhandledrejection", (e) => {
    show("Ошибка (promise): " + String(e.reason && e.reason.stack ? e.reason.stack : e.reason));
});

class Boundary extends React.Component<{ children: React.ReactNode }, { err: string }> {
    state = { err: "" };
    static getDerivedStateFromError(e: Error) {
        return { err: e.message + "\n" + (e.stack || "") };
    }
    render() {
        if (this.state.err) {
            return (
                <pre style={{ color: "#ff8a8a", background: "#111", padding: 16, margin: 8, whiteSpace: "pre-wrap", font: "12px monospace", userSelect: "text" }}>
                    {this.state.err}
                </pre>
            );
        }
        return this.props.children;
    }
}

import("./App")
    .then(({ default: App }) => {
        ReactDOM.createRoot(root).render(
            <React.StrictMode>
                <Boundary>
                    <App />
                </Boundary>
            </React.StrictMode>
        );
    })
    .catch((e) => show("Не загрузился модуль: " + (e && e.stack ? e.stack : String(e))));