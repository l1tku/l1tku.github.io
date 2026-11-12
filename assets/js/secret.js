/* Redacted line in About: click a word to read it, one at a time. The whole
   riddle is only unsealed by the hedgehog easter egg. */
(function () {
    "use strict";

    var secret = document.querySelector(".secret-hint");
    if (!secret) return;

    var KEY = "secret-solved";
    var hint = secret.getAttribute("data-hint") || "";
    var words = hint.split(/\s+/).filter(Boolean);
    var active = -1;
    var solved = false;

    try {
        solved = window.localStorage.getItem(KEY) === "1";
    } catch (e) {
        solved = false;
    }

    if (solved) secret.classList.add("solved");

    function bars(word) {
        return "█".repeat(word.length);
    }

    function render() {
        secret.textContent = "";

        words.forEach(function (word, i) {
            var span = document.createElement("span");
            var open = solved || i === active;

            span.className = "w " + (open ? "shown" : "hidden");

            /* Bars and word share one grid cell, so the slot is always as wide
               as the wider of the two. Revealing a word cannot resize it. */
            var mask = document.createElement("span");
            mask.className = "w-bars";
            mask.setAttribute("aria-hidden", "true");
            mask.textContent = bars(word);

            var text = document.createElement("span");
            text.className = "w-word";
            text.setAttribute("aria-hidden", "true");
            text.textContent = word;

            span.appendChild(mask);
            span.appendChild(text);

            if (!solved) {
                span.setAttribute("role", "button");
                span.setAttribute("tabindex", "0");
                span.setAttribute("aria-label", open ? word : "redacted word");

                span.addEventListener("click", function (e) {
                    e.stopPropagation();
                    activate(i);
                });

                span.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        activate(i);
                    }
                });
            }

            secret.appendChild(span);
        });
    }

    function activate(i) {
        active = active === i ? -1 : i;
        render();
    }

    /* Called by the hedgehog easter egg; remembered across reloads. */
    function solve() {
        if (solved) return;

        solved = true;
        active = -1;
        secret.classList.add("solved");

        try { window.localStorage.setItem(KEY, "1"); } catch (e) { /* private mode */ }

        render();
    }

    window.secretReveal = solve;

    render();
})();
