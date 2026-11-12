/* Keep the hub open: content links go to a new tab. */
(function () {
    "use strict";

    var links = document.querySelectorAll(".markdown-body a[href]");

    Array.prototype.forEach.call(links, function (link) {
        var href = link.getAttribute("href");

        if (!href || href.charAt(0) === "#") return;

        link.target = "_blank";
        link.rel = "noopener noreferrer";
    });
})();
