/* Hedgehog interactions: hearts on click, confetti and coins on the 30th pet,
   then the reward terminal types itself out. All effects are Web Animations
   (transform/opacity only) so they stay off the main thread. */
(function () {
    "use strict";

    var PETS_NEEDED = 30;
    var STORAGE_KEY = "grumpy-pets";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    var hedgehogs = document.querySelectorAll('img[src$=".gif"]');
    var grumpy = document.querySelector('img[src*="hedgehog-angry"]');
    var reward = document.querySelector(".pet-reward");

    /* ---- hearts ---------------------------------------------------------- */

    var HEARTS = ["❤️", "💖", "💗", "💓", "💕", "💘"];

    function heartBurst(img) {
        if (reduceMotion.matches) return;

        var box = img.getBoundingClientRect();
        var cx = box.left + box.width / 2;
        var cy = box.top + box.height / 2;

        for (var i = 0; i < 14; i++) {
            var el = document.createElement("span");
            el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
            el.setAttribute("aria-hidden", "true");
            el.style.cssText =
                "position:fixed;left:0;top:0;display:block;pointer-events:none;" +
                "user-select:none;z-index:9999;line-height:1;will-change:transform,opacity;" +
                "font-size:" + (14 + Math.random() * 18) + "px;";

            document.body.appendChild(el);

            var sx = cx + (Math.random() - 0.5) * box.width * 0.5;
            var sy = cy + (Math.random() - 0.5) * box.height * 0.3;
            var dx = (Math.random() - 0.5) * 240;
            var dy = -(90 + Math.random() * 190);
            var spin = (Math.random() - 0.5) * 120;

            var anim = el.animate(
                [
                    { transform: "translate3d(" + sx + "px," + sy + "px,0) scale(0.5)", opacity: 1, offset: 0 },
                    { transform: "translate3d(" + (sx + dx * 0.6) + "px," + (sy + dy * 0.6) + "px,0) scale(1.15) rotate(" + (spin * 0.6) + "deg)", opacity: 1, offset: 0.55 },
                    { transform: "translate3d(" + (sx + dx) + "px," + (sy + dy) + "px,0) scale(0.9) rotate(" + spin + "deg)", opacity: 0, offset: 1 }
                ],
                { duration: 900 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" }
            );

            anim.onfinish = (function (node) {
                return function () { node.remove(); };
            })(el);
        }
    }

    Array.prototype.forEach.call(hedgehogs, function (img) {
        img.setAttribute("draggable", "false");

        // Firefox starts a text selection on the second click; this stops it
        img.addEventListener("mousedown", function (e) { e.preventDefault(); });
        img.addEventListener("selectstart", function (e) { e.preventDefault(); });
        img.addEventListener("click", function () { heartBurst(img); });
    });

    /* ---- confetti -------------------------------------------------------- */

    var CONFETTI_COLORS = ["#ffc107", "#e56b4a", "#ffffff", "#2ea44f", "#1572b6", "#ffdd00"];

    function confettiBurst(img) {
        if (reduceMotion.matches) return;

        var box = img.getBoundingClientRect();
        var cx = box.left + box.width / 2;
        var cy = box.top + box.height / 2;

        for (var i = 0; i < 120; i++) {
            var el = document.createElement("span");
            el.setAttribute("aria-hidden", "true");
            el.setAttribute("data-confetti", "1");
            el.style.cssText =
                "position:fixed;left:0;top:0;display:block;pointer-events:none;" +
                "z-index:9999;border-radius:1px;will-change:transform,opacity;" +
                "width:" + (11 + Math.random() * 9) + "px;" +
                "height:" + (15 + Math.random() * 12) + "px;" +
                "background:" + CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] + ";";

            document.body.appendChild(el);

            var ex = cx + (Math.random() - 0.5) * 760;
            var peakX = cx + (ex - cx) * 0.62;
            var peakY = cy - (240 + Math.random() * 360);
            var endY = cy + (140 + Math.random() * 280);
            var spin = (Math.random() - 0.5) * 720;

            var anim = el.animate(
                [
                    { transform: "translate3d(" + cx + "px," + cy + "px,0) rotate(0deg) scale(0.9)", opacity: 1, offset: 0, easing: "cubic-bezier(.12,.62,.45,1)" },
                    { transform: "translate3d(" + peakX + "px," + peakY + "px,0) rotate(" + (spin * 0.5) + "deg) scale(1)", opacity: 1, offset: 0.45, easing: "cubic-bezier(.45,0,.85,.55)" },
                    { transform: "translate3d(" + ex + "px," + endY + "px,0) rotate(" + spin + "deg) scale(0.95)", opacity: 0, offset: 1 }
                ],
                { duration: 1900 + Math.random() * 900, fill: "both" }
            );

            anim.onfinish = (function (node) {
                return function () { node.remove(); };
            })(el);
        }
    }

    /* ---- coins ----------------------------------------------------------- */

    function coinRain() {
        if (reduceMotion.matches) return;

        for (var i = 0; i < 60; i++) {
            var el = document.createElement("span");
            el.textContent = Math.random() < 0.8 ? "🪙" : "💰";
            el.setAttribute("aria-hidden", "true");
            el.setAttribute("data-coin", "1");

            var size = 16 + Math.random() * 20;
            el.style.cssText =
                "position:fixed;left:0;top:0;display:block;pointer-events:none;" +
                "user-select:none;z-index:9999;line-height:1;will-change:transform,opacity;" +
                "font-size:" + size + "px;";

            document.body.appendChild(el);

            var x = Math.random() * window.innerWidth;
            var floor = window.innerHeight - size * 0.5;
            var drift = (Math.random() - 0.5) * 140;
            var spin = (Math.random() - 0.5) * 540;
            var bounce1 = 70 + Math.random() * 90;
            var bounce2 = 30 + Math.random() * 50;

            var anim = el.animate(
                [
                    { transform: "translate3d(" + x + "px,-70px,0) rotate(0deg)", opacity: 0, offset: 0, easing: "ease-in" },
                    { opacity: 1, offset: 0.05 },
                    { transform: "translate3d(" + (x + drift * 0.3) + "px," + floor + "px,0) rotate(" + (spin * 0.3) + "deg)", opacity: 1, offset: 0.44, easing: "ease-out" },
                    { transform: "translate3d(" + (x + drift * 0.55) + "px," + (floor - bounce1) + "px,0) rotate(" + (spin * 0.55) + "deg)", opacity: 1, offset: 0.57, easing: "ease-in" },
                    { transform: "translate3d(" + (x + drift * 0.72) + "px," + floor + "px,0) rotate(" + (spin * 0.72) + "deg)", opacity: 1, offset: 0.68, easing: "ease-out" },
                    { transform: "translate3d(" + (x + drift * 0.86) + "px," + (floor - bounce2) + "px,0) rotate(" + (spin * 0.86) + "deg)", opacity: 1, offset: 0.78, easing: "ease-in" },
                    { transform: "translate3d(" + (x + drift) + "px," + floor + "px,0) rotate(" + spin + "deg)", opacity: 1, offset: 0.86, easing: "ease-in" },
                    { transform: "translate3d(" + (x + drift) + "px," + (window.innerHeight + 240) + "px,0) rotate(" + spin + "deg)", opacity: 1, offset: 1 }
                ],
                { duration: 2200 + Math.random() * 1400, delay: Math.random() * 2600, fill: "both" }
            );

            anim.onfinish = (function (node) {
                return function () { node.remove(); };
            })(el);
        }
    }

    /* ---- reward terminal ------------------------------------------------- */

    function rewardLines(el) {
        var expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 15);

        var expiryText = expiry.toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric"
        });

        return Array.prototype.map.call(el.querySelectorAll("span"), function (s) {
            return s.textContent.replace("{{expires}}", expiryText);
        });
    }

    /* Already unlocked (page refresh): print the finished terminal, no animation. */
    function fillReward(el) {
        if (!el) return;

        var lines = rewardLines(el);
        if (!lines.length) return;

        el.textContent = "";

        lines.forEach(function (line, i) {
            var span = document.createElement("span");
            span.textContent = line;
            el.appendChild(span);
            if (i < lines.length - 1) el.appendChild(document.createElement("br"));
        });
    }

    /* Keep the terminal above the fold while it grows, unless the visitor has
       scrolled away themselves - then leave them alone. */
    var userScrolled = false;

    ["wheel", "touchmove", "keydown"].forEach(function (name) {
        window.addEventListener(name, function () { userScrolled = true; }, { passive: true });
    });

    function keepInView(el) {
        if (userScrolled) return;

        var box = el.getBoundingClientRect();
        if (box.bottom > window.innerHeight - 24) {
            window.scrollTo(0, document.documentElement.scrollHeight);
        }
    }

    function typeReward(el) {
        if (!el || reduceMotion.matches) return;

        var lines = rewardLines(el);
        if (!lines.length) return;

        // beat after each line, in order
        var pauses = [900, 1500, 1300, 1150, 1500, 0];

        el.textContent = "";

        var spans = lines.map(function (_, i) {
            var span = document.createElement("span");
            el.appendChild(span);
            if (i < lines.length - 1) el.appendChild(document.createElement("br"));
            return span;
        });

        function sleep(ms) {
            return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
        }

        function delayFor(ch) {
            var d = 30 + Math.random() * 45;

            if (ch === " ") d += 18 + Math.random() * 34;
            if (".:,;".indexOf(ch) !== -1) d += 110 + Math.random() * 150;
            if (Math.random() < 0.055) d += 150 + Math.random() * 220;
            if (Math.random() < 0.18) d = Math.max(16, d - 30);

            return d;
        }

        (async function run() {
            for (var i = 0; i < lines.length; i++) {
                var text = lines[i];
                var span = spans[i];

                span.classList.add("typing");
                await sleep(90 + Math.random() * 180);   // a beat before the first key

                for (var c = 0; c < text.length; c++) {
                    var ch = text[c];
                    span.textContent += ch;
                    await sleep(delayFor(ch));

                    if (c % 4 === 0) keepInView(el);

                    // rare fumble, corrected on the spot
                    if (ch !== " " && Math.random() < 0.02) {
                        await sleep(120 + Math.random() * 120);
                        span.textContent = span.textContent.slice(0, -1);
                        await sleep(90 + Math.random() * 90);
                        span.textContent += ch;
                    }
                }

                // the cursor stays on the finished line during the pause;
                // the last line keeps it
                if (i < lines.length - 1) {
                    await sleep(pauses[i] || 1200);
                    keepInView(el);
                span.classList.remove("typing");

                    // human hesitation before the next line
                    var beat = Math.random();
                    if (beat < 0.35) {
                        await sleep(40 + Math.random() * 90);
                    } else if (beat < 0.92) {
                        await sleep(220 + Math.random() * 620);
                    } else {
                        await sleep(900 + Math.random() * 600);
                    }
                }
            }
        })();
    }

    /* ---- pet counter ----------------------------------------------------- */

    if (!grumpy) return;

    var pets = 0;

    try {
        pets = Number(window.sessionStorage.getItem(STORAGE_KEY) || 0) || 0;
    } catch (e) {
        pets = 0;
    }

    function unlock(celebrate) {
        // hold the frame until the reward image has loaded
        grumpy.classList.add("is-swapping");
        grumpy.classList.remove("is-ready");

        function reveal() { grumpy.classList.add("is-ready"); }

        grumpy.addEventListener("load", reveal, { once: true });
        grumpy.src = "images/1f0f339c63adb21b2b12e30b0eaffba7.gif";
        grumpy.alt = "You have passed the humanity test";

        if (grumpy.complete) reveal();

        if (typeof window.secretReveal === "function") window.secretReveal();

        if (reward) {
            reward.hidden = false;
            if (celebrate) typeReward(reward);
            else fillReward(reward);
        }

        if (!celebrate) return;

        userScrolled = false;

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                // instant, not smooth: a smooth scroll is cancelled while clicking
                window.scrollTo(0, document.documentElement.scrollHeight);
                confettiBurst(grumpy);
                coinRain();
            });
        });
    }

    if (pets >= PETS_NEEDED) {
        unlock(false);
    } else {
        grumpy.classList.add("is-ready");
    }

    grumpy.addEventListener("click", function () {
        if (pets >= PETS_NEEDED) return;

        pets += 1;

        try {
            window.sessionStorage.setItem(STORAGE_KEY, pets);
        } catch (e) { /* private mode */ }

        if (pets >= PETS_NEEDED) unlock(true);
    });
})();







