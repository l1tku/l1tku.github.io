/* Lava lamp background: one low-resolution goo layer, scaled to the viewport.
   The CSS filter merges the blobs; this script builds and randomizes them on
   every load. */
(function () {
    "use strict";

    if (document.querySelector(".lava")) return;

    var COLORS = ["#9ac04a", "#7fae52", "#5f9e46", "#8a9a3f", "#a8b84a", "#5f8f3f", "#b7a23a"];
    var MOVES = ["lava-a", "lava-b", "lava-c", "lava-d", "lava-e", "lava-f", "lava-g"];

    function random(min, max) {
        return min + Math.random() * (max - min);
    }

    function shuffled(list) {
        var copy = list.slice();

        for (var i = copy.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var held = copy[i];
            copy[i] = copy[j];
            copy[j] = held;
        }

        return copy;
    }

    var layer = document.createElement("div");
    layer.className = "lava";
    layer.setAttribute("aria-hidden", "true");

    /* One blob per cell, jittered: random every refresh, never all stacked. */
    var cells = [];

    for (var row = 0; row < 2; row++) {
        for (var col = 0; col < 4; col++) {
            cells.push([col, row]);
        }
    }

    cells = shuffled(cells).slice(0, 7);
    var colors = shuffled(COLORS);
    var moves = shuffled(MOVES);

    for (var i = 0; i < 7; i++) {
        var blob = document.createElement("span");
        var cell = cells[i];

        blob.className = "lava__blob";
        blob.style.left = (cell[0] * 25 + random(2, 23)).toFixed(1) + "%";
        blob.style.top = (cell[1] * 50 + random(2, 48)).toFixed(1) + "%";
        blob.style.width = random(20, 34).toFixed(1) + "%";
        blob.style.background = colors[i % colors.length];
        blob.style.animation = moves[i] + " " + random(32, 50).toFixed(1) + "s -" +
            random(0, 40).toFixed(1) + "s infinite alternate ease-in-out";

        layer.appendChild(blob);
    }

    document.body.insertBefore(layer, document.body.firstChild);
})();
