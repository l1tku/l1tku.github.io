/* Liquid band at the top of the page: one SVG path of rounded drips over a
   green-to-gold gradient. The viewBox matches the element size in pixels, so
   nothing is stretched at any viewport width. */
(function () {
    "use strict";

    var NS = "http://www.w3.org/2000/svg";
    var BAND = 30;
    var SEED_KEY = "liquid-seed";

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "liquid-top");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    var defs = document.createElementNS(NS, "defs");

    var gradient = document.createElementNS(NS, "linearGradient");
    gradient.setAttribute("id", "lq-grad");
    gradient.setAttribute("gradientUnits", "userSpaceOnUse");
    gradient.setAttribute("x1", "-300");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("x2", "100%");
    gradient.setAttribute("y2", "0");

    [
        ["0%", "#5fdc55"],
        ["28%", "#8ee87a"],
        ["50%", "#c6e64a"],
        ["72%", "#ffc107"],
        ["100%", "#cbb16e"]
    ].forEach(function (stop) {
        var node = document.createElementNS(NS, "stop");
        node.setAttribute("offset", stop[0]);
        node.setAttribute("stop-color", stop[1]);
        gradient.appendChild(node);
    });

    var slide = null;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        slide = document.createElementNS(NS, "animateTransform");
        slide.setAttribute("attributeName", "gradientTransform");
        slide.setAttribute("type", "translate");
        slide.setAttribute("values", "-260 0; 260 0; -260 0");
        slide.setAttribute("dur", "24s");
        slide.setAttribute("repeatCount", "indefinite");
        slide.setAttribute("calcMode", "spline");
        slide.setAttribute("keySplines", "0.45 0 0.55 1; 0.45 0 0.55 1");
        gradient.appendChild(slide);
    }

    defs.appendChild(gradient);
    svg.appendChild(defs);

    var path = document.createElementNS(NS, "path");
    path.setAttribute("fill", "url(#lq-grad)");
    svg.appendChild(path);

    /* Deterministic per visitor: the pattern is drawn once and then reused. */
    function seed() {
        try {
            var stored = window.localStorage.getItem(SEED_KEY);
            if (stored) return Number(stored) || 1;
            var fresh = Math.floor(Math.random() * 1e9) + 1;
            window.localStorage.setItem(SEED_KEY, String(fresh));
            return fresh;
        } catch (e) {
            return 20260101;
        }
    }

    function random(seedValue) {
        var state = seedValue >>> 0;
        return function () {
            state = (state + 0x6d2b79f5) >>> 0;
            var t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function buildDrips(width, height) {
        var rng = random(seed() + width);
        var count = Math.max(6, Math.min(18, Math.round(width / 120)));
        var scale = Math.min(1, Math.max(0.55, width / 1400));
        var drips = [];
        var guard = 0;

        while (drips.length < count && guard < count * 80) {
            guard += 1;

            var x = 50 + rng() * (width - 100);
            var half = (9 + Math.pow(rng(), 1.2) * 17) * scale;
            var clash = drips.some(function (d) {
                return Math.abs(d.x - x) < d.half + half + 14;
            });

            if (clash) continue;

            var roll = rng();
            var length;

            if (roll < 0.32) {
                length = 12 + rng() * 10;
            } else if (roll < 0.84) {
                length = 24 + rng() * 18;
            } else {
                length = 46 + rng() * 20;
            }

            length = Math.min(length, height - BAND - 10);

            drips.push({ x: x, half: half, length: Math.max(length, half * 2.2) });
        }

        return drips.sort(function (a, b) { return b.x - a.x; });
    }

    function buildPath(width, height) {
        var drips = buildDrips(width, height);
        var d = "M 0 0 L " + width + " 0 L " + width + " " + BAND;

        drips.forEach(function (drip) {
            var x = drip.x;
            var half = drip.half;
            var neck = half * 1.9;
            var shaftTop = BAND + 14;
            var capTop = BAND + drip.length - half;

            d += " L " + (x + neck).toFixed(1) + " " + BAND;

            d += " C " + (x + neck * 0.5).toFixed(1) + " " + (BAND + 1) +
                 " " + (x + half).toFixed(1) + " " + (BAND + 6) +
                 " " + (x + half).toFixed(1) + " " + shaftTop;

            d += " L " + (x + half).toFixed(1) + " " + capTop.toFixed(1);

            d += " A " + half.toFixed(1) + " " + half.toFixed(1) + " 0 0 1 " +
                 (x - half).toFixed(1) + " " + capTop.toFixed(1);

            d += " L " + (x - half).toFixed(1) + " " + shaftTop;

            d += " C " + (x - half).toFixed(1) + " " + (BAND + 6) +
                 " " + (x - neck * 0.5).toFixed(1) + " " + (BAND + 1) +
                 " " + (x - neck).toFixed(1) + " " + BAND;
        });

        return d + " L 0 " + BAND + " Z";
    }

    function render() {
        var box = svg.getBoundingClientRect();
        var width = Math.max(320, Math.round(box.width));
        var height = Math.max(80, Math.round(box.height));

        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        var pad = Math.round(width * 0.18);
        gradient.setAttribute("x1", String(-pad));
        gradient.setAttribute("x2", String(width + pad));

        if (slide) {
            var amp = Math.round(width * 0.14);
            slide.setAttribute("values", -amp + " 0; " + amp + " 0; " + -amp + " 0");
        }

        path.setAttribute("d", buildPath(width, height));
    }

    document.body.appendChild(svg);
    render();

    var resizeTimer = 0;

    window.addEventListener("resize", function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(render, 150);
    });
})();

