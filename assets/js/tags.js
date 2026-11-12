/* Centre the uppercase chip labels optically. A line box carries descender
   space that capital letters never use, so the label can look high or low
   depending on the font. Measure the real font and offset the padding. */
(function () {
    "use strict";

    var tags = document.querySelectorAll(".markdown-body h4 .tag");
    var canvas = document.createElement("canvas");

    function fit(tag) {
        if (tag.querySelector("img")) return;

        var style = window.getComputedStyle(tag);
        var top = parseFloat(tag.dataset.padTop || style.paddingTop);
        var bottom = parseFloat(tag.dataset.padBottom || style.paddingBottom);

        tag.dataset.padTop = top;
        tag.dataset.padBottom = bottom;

        var ctx = canvas.getContext("2d");
        ctx.font = style.fontWeight + " " + style.fontSize + " " + style.fontFamily;

        var m = ctx.measureText(tag.textContent.trim().toUpperCase());
        if (typeof m.fontBoundingBoxAscent !== "number") return;

        var shift = ((m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) -
                     (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent)) / 2;

        tag.style.paddingTop = (top + shift) + "px";
        tag.style.paddingBottom = (bottom - shift) + "px";
    }

    function fitAll() {
        Array.prototype.forEach.call(tags, fit);
    }

    fitAll();

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(fitAll);
    }

    var timer = 0;

    window.addEventListener("resize", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(fitAll, 150);
    });
})();
