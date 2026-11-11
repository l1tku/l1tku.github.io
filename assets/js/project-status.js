/* Fills every element with a [data-repo] attribute with that project's current
   version and last update:
 *
 *   <p class="proj-meta" data-repo="hll-spa-calculator"></p>
 *
 * Version comes from the project's own service worker (SW_VERSION, CACHE_VERSION or
 * the version inside CACHE_NAME). The update date is the Last-Modified header of the
 * project's page. Both are same-origin requests, so no API, no key, no rate limit.
 *
 * Results are cached in localStorage for 6 hours so a visitor triggers at most two
 * small requests per project per half day.
 */
(function () {
    "use strict";

    var KEY = "proj-meta-v1";
    var TTL = 6 * 60 * 60 * 1000;

    var nodes = document.querySelectorAll("[data-repo]");
    if (!nodes.length) return;

    var store = {};
    try { store = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { store = {}; }

    function formatDate(value) {
        if (!value) return "";
        var d = new Date(value);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }

    function getVersion(repo) {
        return fetch("/" + repo + "/service-worker.js", { cache: "no-cache" })
            .then(function (res) { return res.ok ? res.text() : ""; })
            .then(function (text) {
                var m = text.match(/SW_VERSION\s*=\s*["'](\d+(?:\.\d+){1,2})/) ||
                        text.match(/CACHE_VERSION\s*=\s*["'](\d+(?:\.\d+){1,2})/) ||
                        text.match(/CACHE_NAME\s*=\s*["'][^"']*?(\d+\.\d+\.\d+)["']/);
                return m ? m[1] : "";
            })
            .catch(function () { return ""; });
    }

    function getUpdated(repo) {
        return fetch("/" + repo + "/", { method: "HEAD", cache: "no-cache" })
            .then(function (res) { return res.headers.get("last-modified") || ""; })
            .catch(function () { return ""; });
    }

    function render(el, data) {
        var parts = [];
        if (data.v) parts.push("<strong>v" + data.v + "</strong>");
        if (data.d) parts.push("updated " + formatDate(data.d));
        el.innerHTML = parts.join(" &middot; ");
    }

    Array.prototype.forEach.call(nodes, function (el) {
        var repo = el.getAttribute("data-repo");
        if (!repo) return;

        var cached = store[repo];
        if (cached && Date.now() - cached.at < TTL) {
            render(el, cached);
            return;
        }

        Promise.all([getVersion(repo), getUpdated(repo)]).then(function (result) {
            var data = { v: result[0], d: result[1], at: Date.now() };
            store[repo] = data;
            render(el, data);
            try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
        });
    });
})();
