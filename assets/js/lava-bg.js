/* Two backgrounds: a lava field for wide screens and vertical aurora
   curtains for portrait screens. CSS shows one of them. */
(function () {
    "use strict";

    if (document.querySelector(".lava")) return;

    var COLORS = [
        ["#d7e6a6", "#7fae52"],
        ["#a9cf8e", "#3f7a3a"],
        ["#f0d98a", "#c9a84a"]
    ];

    var MOVES = ["lava-a", "lava-b", "lava-c", "lava-d", "lava-e"];

    var SHAPES = [
        "58% 42% 55% 45%",
        "45% 55% 40% 60%",
        "60% 40% 45% 55%",
        "50% 50% 62% 38%"
    ];

    /* left, top, width in percent of the goo layer */
    var LAYOUTS = [
        [[16, 8, 34], [55, 0, 30], [72, 34, 28], [8, 48, 30], [45, 64, 36]],
        [[4, 12, 32], [33, 2, 28], [58, 34, 30], [20, 56, 34], [68, 64, 26]],
        [[26, 4, 36], [60, 12, 26], [10, 36, 30], [46, 48, 34], [70, 70, 24]],
        [[6, 18, 30], [42, 0, 32], [70, 22, 28], [24, 54, 34], [56, 66, 30]]
    ];

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

    var layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
    var colors = shuffled(COLORS);
    var moves = shuffled(MOVES);

    layout.forEach(function (spot, i) {
        var color = colors[i % colors.length];
        var blob = document.createElement("span");

        blob.className = "lava__blob";
        blob.style.left = random(spot[0] - 4, spot[0] + 4).toFixed(1) + "%";
        blob.style.top = random(spot[1] - 4, spot[1] + 4).toFixed(1) + "%";
        blob.style.width = Math.min(75, random(spot[2] - 3, spot[2] + 3)).toFixed(1) + "%";
        blob.style.borderRadius = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        blob.style.background =
            "radial-gradient(circle at 36% 32%, " + color[0] + " 0%, " + color[1] + " 65%, transparent 100%)";
        blob.style.animation = moves[i % moves.length] + " " + random(64, 88).toFixed(1) + "s -" +
            random(0, 50).toFixed(1) + "s infinite alternate ease-in-out";

        layer.appendChild(blob);
    });

    document.body.insertBefore(layer, document.body.firstChild);
})();

