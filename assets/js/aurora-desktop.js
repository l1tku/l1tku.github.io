/* Desktop aurora. Phase 1: northern sky, deterministic star chart and a
   subtle background star field. The mobile renderer lives in aurora.js. */
(function () {
    "use strict";

    var landscape = window.matchMedia("(orientation: landscape)");

    var canvas = document.createElement("canvas");
    canvas.className = "aurora-canvas aurora-canvas--desktop";
    canvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(canvas, document.body.firstChild);

    var gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "default"
    });

    if (!gl) return;

    var debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    var renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    var software = /swiftshader|software|llvmpipe|mesa/i.test(String(renderer));


    /* Generate three ridged mountain profiles plus the aurora fold layout.
       Folded noise gives sharp peaks and V-shaped valleys; each layer is
       independent, so the range has real depth instead of smooth humps. */
    function ridgeHash(x, y) {
        x = x * 123.34; y = y * 456.21;
        x = x - Math.floor(x); y = y - Math.floor(y);
        var d = x * (x + 45.32) + y * (y + 45.32);
        x += d; y += d;
        return (x - Math.floor(x)) * (y - Math.floor(y));
    }
    function ridgeNoise(x, y) {
        var ix = Math.floor(x), iy = Math.floor(y);
        var fx = x - ix, fy = y - iy;
        var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
        var a = ridgeHash(ix, iy), b = ridgeHash(ix + 1, iy);
        var c = ridgeHash(ix, iy + 1), d = ridgeHash(ix + 1, iy + 1);
        var top = a + (b - a) * ux, bot = c + (d - c) * ux;
        return top + (bot - top) * uy;
    }
    function ridgeFbm(x, seed) {
        return 0.55 * ridgeNoise(x, seed)
             + 0.30 * ridgeNoise(x * 2.1, seed + 7.3)
             + 0.15 * ridgeNoise(x * 4.3, seed + 13.1);
    }
    function ridgeCrest(x, seed) {
        var n = ridgeNoise(x, seed);
        n = 1 - Math.abs(n * 2 - 1);
        return n * n;
    }
    function ridgeRidged(x, seed, octaves) {
        var v = 0, a = 0.55, f = 1, w = 1;
        for (var i = 0; i < octaves; i++) {
            var r = ridgeCrest(x * f, seed + i * 17.7);
            r *= w;
            w = Math.min(1, Math.max(0, r * 1.7));
            v += a * r;
            f *= 2.07;
            a *= 0.54;
        }
        return v;
    }

    function ridgeGauss(x, c, w) {
        var d = (x - c) / w;
        return Math.exp(-d * d);
    }
    function ridgePeak(x, c, w) {
        return Math.exp(-Math.abs((x - c) / w));
    }
    function farRidge(x) {
        var h = 0.155
            + 0.045 * ridgeGauss(x, 0.55, 0.30)
            + 0.035 * ridgePeak(x, 0.12, 0.06)
            + 0.040 * ridgePeak(x, 0.38, 0.07)
            + 0.030 * ridgePeak(x, 0.62, 0.05)
            + 0.045 * ridgePeak(x, 0.80, 0.06)
            + 0.030 * ridgePeak(x, 0.93, 0.04);
        h += (ridgeRidged(x * 7.0, 41, 4) - 0.35) * 0.030;
        return h;
    }
    function mainRidge(x) {
        var h = 0.095
            + 0.040 * ridgeGauss(x, 0.85, 0.16)
            + 0.130 * ridgePeak(x, 0.84, 0.085)
            + 0.070 * ridgePeak(x, 0.76, 0.045)
            + 0.045 * ridgePeak(x, 0.71, 0.035)
            + 0.035 * ridgePeak(x, 0.79, 0.030)
            + 0.055 * ridgePeak(x, 0.92, 0.055)
            + 0.050 * ridgePeak(x, 0.17, 0.045)
            + 0.035 * ridgePeak(x, 0.25, 0.035)
            + 0.030 * ridgePeak(x, 0.31, 0.055)
            + 0.028 * ridgePeak(x, 0.59, 0.040)
            + 0.022 * ridgePeak(x, 0.67, 0.055);
        h += (ridgeRidged(x * 9.0, 17, 5) - 0.35) * 0.045;
        return h;
    }
    function nearRidge(x) {
        var h = 0.055
            + 0.025 * ridgePeak(x, 0.12, 0.06)
            + 0.020 * ridgePeak(x, 0.34, 0.05)
            + 0.030 * ridgePeak(x, 0.57, 0.07)
            + 0.020 * ridgePeak(x, 0.80, 0.05);
        h += (ridgeRidged(x * 12.0, 71, 4) - 0.35) * 0.020;
        return h;
    }
    function buildRidgePixels(size) {
        var pixels = new Uint8Array(size * 4);
        for (var i = 0; i < size; i++) {
            var x = i / (size - 1);
            var fp = x * (FOLD.length - 1);
            var f0 = Math.floor(fp);
            var f1 = Math.min(FOLD.length - 1, f0 + 1);
            var fold = FOLD[f0] + (FOLD[f1] - FOLD[f0]) * (fp - f0);
            pixels[i * 4] = Math.round(Math.min(1, Math.max(0, farRidge(x))) * 255);
            pixels[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, mainRidge(x))) * 255);
            pixels[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, nearRidge(x))) * 255);
            pixels[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, fold)) * 255);
        }
        return pixels;
    }

    /* Original fold brightness layout. Two bright curtain groups with a
       dark gap between them; the reference study only informed the contrast. */
    var FOLD = [0.1762, 0.1765, 0.1771, 0.1781, 0.1793, 0.1808, 0.1826, 0.1847, 0.1872, 0.1903, 0.1940, 0.1989, 0.2071, 0.2189, 0.2345, 0.2537, 0.2766, 0.3031, 0.3332, 0.3667, 0.4031, 0.4420, 0.4831, 0.5268, 0.5724, 0.6189, 0.6650, 0.7094, 0.7505, 0.7868, 0.8170, 0.8398, 0.8544, 0.8594, 0.8546, 0.8400, 0.8163, 0.7846, 0.7462, 0.7026, 0.6555, 0.6065, 0.5569, 0.5080, 0.4598, 0.4132, 0.3687, 0.3265, 0.2864, 0.2484, 0.2121, 0.1773, 0.1439, 0.1121, 0.0828, 0.0568, 0.0346, 0.0171, 0.0053, 0.0000, 0.0021, 0.0119, 0.0294, 0.0542, 0.0856, 0.1237, 0.1676, 0.2160, 0.2677, 0.3214, 0.3763, 0.4315, 0.4864, 0.5407, 0.5941, 0.6462, 0.6966, 0.7450, 0.7909, 0.8338, 0.8731, 0.9082, 0.9384, 0.9632, 0.9820, 0.9944, 1.0000, 0.9987, 0.9906, 0.9759, 0.9551, 0.9287, 0.8974, 0.8620, 0.8234, 0.7825, 0.7402, 0.6972, 0.6547, 0.6135, 0.5746, 0.5392, 0.5082, 0.4825, 0.4630, 0.4503, 0.4445, 0.4463, 0.4550, 0.4690, 0.4858, 0.5029, 0.5175, 0.5271, 0.5297, 0.5240, 0.5098, 0.4874, 0.4574, 0.4224, 0.3849, 0.3475, 0.3122, 0.2807, 0.2539, 0.2326, 0.2169, 0.2068];

    var ridgeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, ridgeTexture);
    var ridgePixels = buildRidgePixels(1024);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, ridgePixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var VERTEX = [
        "attribute vec2 aPos;",
        "varying vec2 vUv;",
        "void main() {",
        "    vUv = aPos * 0.5 + 0.5;",
        "    gl_Position = vec4(aPos, 0.0, 1.0);",
        "}"
    ].join("\n");

    var FRAGMENT = [
        "precision highp float;",
        "uniform vec2 uRes;",
        "uniform float uTime;",
        "uniform float uStarsOnly;",
        "uniform sampler2D uRidge;",

        "float hash(vec2 p) {",
        "    p = fract(p * vec2(123.34, 456.21));",
        "    p += dot(p, p + 45.32);",
        "    return fract(p.x * p.y);",
        "}",

        "float noise(vec2 p) {",
        "    vec2 i = floor(p);",
        "    vec2 f = fract(p);",
        "    vec2 u = f * f * (3.0 - 2.0 * f);",
        "    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),",
        "               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
        "}",

        "float fbm(vec2 p) {",
        "    float v = 0.0;",
        "    float a = 0.5;",
        "    for (int i = 0; i < 2; i++) {",
        "        v += a * noise(p);",
        "        p *= 2.03;",
        "        a *= 0.5;",
        "    }",
        "    return v;",
        "}",

        /* Folded noise: sharp crests used for cliff texture on the summit
           line, and for the tiny serrations along the mountain edge. */
        "float crest(float x, float seed) {",
        "    float n = noise(vec2(x, seed));",
        "    n = 1.0 - abs(n * 2.0 - 1.0);",
        "    return n * n;",
        "}",

        "float starLayer(vec2 uv, float t, float scale, float threshold, float seed) {",
        "    vec2 p = uv * scale;",
        "    vec2 id = floor(p);",
        "    vec2 f = fract(p);",
        "    float h = hash(id + seed);",
        "    if (h < threshold) return 0.0;",
        "    vec2 pos = vec2(hash(id + seed + 3.1), hash(id + seed + 7.7)) * 0.7 + 0.15;",
        "    float d = length(f - pos);",
        "    float size = 0.03 + hash(id + seed + 11.0) * 0.05;",
        "    float core = smoothstep(size, 0.0, d);",
        "    float halo = smoothstep(size * 4.0, 0.0, d) * 0.15;",
        "    float tw = 0.7 + 0.3 * noise(vec2(h * 31.0, t * 0.3 + h * 9.0));",
        "    float brightness = 0.4 + 0.6 * hash(id + seed + 17.0);",
        "    return (core + halo) * tw * brightness;",
        "}",

        "float starAt(vec2 uv, vec2 src, float size, float bright) {",
        "    float aspect = uRes.x / uRes.y;",
        "    vec2 pos = vec2(0.5 + (src.x - 966.0) * (1.4 / 1895.0),",
        "                    0.96 - (src.y - 116.0) * (1.4 / 1895.0) * aspect);",
        "    vec2 p = (uv - pos) * vec2(aspect, 1.0);",
        "    float d = length(p);",
        "    float core = smoothstep(size, 0.0, d);",
        "    float halo = smoothstep(size * 3.0, 0.0, d) * 0.12;",
        "    return (core + halo) * bright;",
        "}",

        "float chartStars(vec2 uv) {",
        "    float s = 0.0;",
        "    s += starAt(uv, vec2(556.0, 5.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1393.0, 4.0), 0.0011, 0.64);",
        "    s += starAt(uv, vec2(501.0, 11.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(428.0, 25.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(480.0, 26.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1260.0, 82.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(540.0, 105.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1535.0, 104.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(966.0, 116.0), 0.0022, 0.95);",
        "    s += starAt(uv, vec2(966.0, 116.0), 0.0045, 0.20);",
        "    s += starAt(uv, vec2(816.0, 138.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1451.0, 156.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1237.0, 164.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(978.0, 169.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(330.0, 196.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1003.0, 225.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(685.0, 225.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1431.0, 243.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1054.0, 256.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1113.0, 266.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(788.0, 282.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1045.0, 291.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1244.0, 304.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1110.0, 307.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1408.0, 309.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(307.0, 317.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(622.0, 324.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(910.0, 326.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(494.0, 341.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(533.0, 344.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(953.0, 343.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(869.0, 347.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(725.0, 356.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(492.0, 361.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(458.0, 363.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(893.0, 390.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(457.0, 390.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1455.0, 395.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(385.0, 395.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(756.0, 396.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1030.0, 419.0), 0.0016, 0.86);",
        "    s += starAt(uv, vec2(1198.0, 437.0), 0.0016, 0.86);",
        "    return s;",
        "}",

        "vec3 auroraColor(float h) {",
        "    vec3 edge = vec3(0.60, 1.00, 0.42);",
        "    vec3 green = vec3(0.08, 0.80, 0.25);",
        "    vec3 teal = vec3(0.015, 0.42, 0.20);",
        "    vec3 deep = vec3(0.005, 0.10, 0.06);",
        "    vec3 c = edge;",
        "    c = mix(c, green, smoothstep(0.00, 0.10, h));",
        "    c = mix(c, teal, smoothstep(0.12, 0.38, h));",
        "    c = mix(c, deep, smoothstep(0.40, 0.80, h) * 0.60);",
        "    return c;",
        "}",

        "vec3 auroraShape(vec2 uv) {",
        "    float x = uv.x;",
        "    float warp = (fbm(vec2(x * 2.1 + 4.0, 6.0 + uTime * 0.008)) - 0.5) * 0.12;",
        "    float wx = x + warp;",

        /* Overlapping curtain folds. Each scale adds brightness instead of
           multiplying, so the rays stay next to each other and blend. */
        "    float foldX = uv.x + (noise(vec2(uv.x * 2.0, uTime * 0.010)) - 0.5) * 0.020;",
        "    float foldProfile = texture2D(uRidge, vec2(foldX, 0.5)).a;",
        "    float fold = smoothstep(0.10, 0.80, foldProfile);",
        "    float fx = wx + 0.020 * sin(uv.y * 7.0 + wx * 9.0 + uTime * 0.10);",
        "    float rayMid = fbm(vec2(fx * 32.0 + 5.0, 6.0 + uTime * 0.020));",
        "    float rayMid2 = fbm(vec2(fx * 58.0 + 11.0, 3.0 + uTime * 0.025));",
        "    float ray2 = fbm(vec2(fx * 85.0 + 9.0, 4.0 + uTime * 0.026));",
        "    float ray3 = fbm(vec2(fx * 165.0 + 2.0, 5.0 + uTime * 0.032));",
        "    float curtain = 0.28 + 0.72 * fold;",
        "    curtain *= 0.35 + 0.65 * smoothstep(0.15, 0.85, rayMid);",
        "    curtain *= 0.70 + 0.30 * rayMid2;",
        "    curtain *= 0.80 + 0.20 * ray2;",
        "    curtain *= 0.90 + 0.10 * ray3;",

        /* The bright folds hang lower, so the lower edge rises and falls
           with the curtain instead of running straight across. */
        "    float edge = 0.300",
        "        + (fbm(vec2(wx * 1.6 + 2.0, 3.0 + uTime * 0.010)) - 0.5) * 0.12",
        "        + (fbm(vec2(wx * 5.0 + 7.0, 5.0)) - 0.5) * 0.04",
        "        + (fbm(vec2(wx * 22.0 + 4.0, 7.0)) - 0.5) * 0.035",
        "        - 0.090 * curtain - 0.030 * smoothstep(0.2, 0.8, rayMid);",
        "    float h = uv.y - edge;",

        "    float thick = 0.30 + 0.20 * fbm(vec2(wx * 2.0 + 3.0, 4.0 + uTime * 0.006));",
        "    float lower = smoothstep(-0.120, 0.020, h);",
        "    float body = lower * exp(-max(h, 0.0) / thick);",
        "    body *= 0.58 + 0.42 * exp(-max(h, 0.0) * 7.0);",
        "    float edgeGlow = exp(-max(h, 0.0) * 6.0) * 0.35;",
        "    float soft = exp(-abs(h) * 2.8) * 0.20;",
        "    float shape = (body + edgeGlow + soft) * curtain;",
        "    return vec3(shape, h, curtain);",
        "}",

        "void main() {",
        "    vec2 uv = gl_FragCoord.xy / uRes;",

        /* Hold mode: the original star chart and background star field,
           with no aurora and no terrain. */
        "    if (uStarsOnly > 0.5) {",
        "        vec3 sky = mix(vec3(0.035, 0.045, 0.045), vec3(0.010, 0.018, 0.022), smoothstep(0.0, 0.60, uv.y));",
        "        sky = mix(sky, vec3(0.004, 0.009, 0.014), smoothstep(0.60, 1.0, uv.y));",
        "        sky += vec3(0.010, 0.018, 0.015) * exp(-uv.y * 3.0);",
        "        float holdStars = starLayer(uv, uTime, 190.0, 0.955, 1.0)",
        "            + starLayer(uv, uTime, 280.0, 0.975, 7.0) * 0.7;",
        "        float holdAir = 0.55 + 0.45 * smoothstep(0.05, 0.55, uv.y);",
        "        sky += vec3(0.75, 0.80, 0.92) * holdStars * holdAir * 0.75;",
        "        sky += vec3(0.82, 0.88, 1.0) * chartStars(uv) * holdAir;",
        "        vec2 holdP = uv * 2.0 - 1.0;",
        "        sky *= 1.0 - 0.12 * dot(holdP, holdP);",
        "        sky += (hash(gl_FragCoord.xy) - 0.5) / 255.0;",
        "        gl_FragColor = vec4(sky, 1.0);",
        "        return;",
        "    }",

        /* deep navy sky with a faint violet top and a soft horizon */
        "    vec3 col = mix(vec3(0.035, 0.045, 0.045), vec3(0.010, 0.018, 0.022), smoothstep(0.0, 0.60, uv.y));",
        "    col = mix(col, vec3(0.004, 0.009, 0.014), smoothstep(0.60, 1.0, uv.y));",
        "    col += vec3(0.010, 0.018, 0.015) * exp(-uv.y * 3.0);",

        "    vec3 ar = auroraShape(uv);",
        "    float curtain = ar.x;",
        "    float h = ar.y;",
        "    float glow = ar.z;",
        "    float cover = smoothstep(0.15, 0.80, curtain);",
        "    float starMask = 1.0 - cover;",
        "    float stars = starLayer(uv, uTime, 190.0, 0.955, 1.0)",
        "                + starLayer(uv, uTime, 280.0, 0.975, 7.0) * 0.7;",
        "    float starAir = 0.55 + 0.45 * smoothstep(0.05, 0.55, uv.y);",
        "    col += vec3(0.75, 0.80, 0.92) * stars * starAir * 0.75 * starMask;",
        "    col += vec3(0.82, 0.88, 1.0) * chartStars(uv) * starAir * starMask;",
        "    vec3 auroraTint = auroraColor(max(h, 0.0));",
        "    auroraTint = mix(auroraTint, vec3(0.72, 1.0, 0.48), pow(min(glow, 1.0), 3.0) * 0.35);",
        "    vec3 aurora = auroraTint * curtain;",
        "    aurora = aurora / (1.0 + aurora * 0.28);",
        "    col += aurora * 1.25;",

        "    float glowGate = 0.15 + 0.85 * min(glow, 1.0);",
        "    float haze = exp(-abs(h) * 1.4) * (0.60 + 0.40 * fbm(vec2(uv.x * 3.0 + 2.0, 5.0))) * 0.09;",
        "    col += auroraColor(max(h, 0.0)) * haze * 0.35 * glowGate;",
        "    float underGlow = exp(-max(-h, 0.0) * 1.8) * 0.14 * glowGate;",
        "    col += auroraColor(0.0) * underGlow;",
        "    float lp = exp(-uv.y * 8.0) * 0.10 + exp(-uv.y * 2.5) * 0.020;",
        "    col += vec3(0.18, 0.09, 0.04) * lp;",

        /* Original layered range. Three independent ridged profiles are
           baked into one texture: a soft far range, a crisp main range and
           dark near foothills. Each layer gets its own edge softness and
           atmospheric tone, so the range has depth without any photo. */
        "    float aa = 1.6 / uRes.y;",
        "    vec4 prof = texture2D(uRidge, vec2(uv.x, 0.5));",
        "    float farTop = prof.r;",
        "    float mainTop = prof.g;",
        "    float nearTop = prof.b;",
        "    float depth = max(mainTop - uv.y, 0.0);",

        "    float farMask = smoothstep(farTop + 0.008, farTop - 0.008, uv.y);",
        "    vec3 farCol = vec3(0.120, 0.135, 0.115)",
        "        + vec3(0.018, 0.028, 0.018) * smoothstep(0.05, 0.26, uv.y);",
        "    col = mix(col, farCol, farMask * 0.70);",
        "    col += vec3(0.022, 0.038, 0.022) * exp(-uv.y * 7.0) * 0.30;",

        /* main range: crisp edge and sharp rock striations */
        "    float mainMask = smoothstep(mainTop + 0.0018, mainTop - 0.0018, uv.y);",
        "    vec2 rq = uv;",
        "    rq.x += 0.06 * (noise(vec2(uv.y * 4.0, 3.0)) - 0.5);",
        "    rq.y += 0.05 * (noise(vec2(uv.x * 3.0, 7.0)) - 0.5);",
        "    float hs = noise(rq * vec2(13.0, 13.0)) + 0.50 * noise(rq * vec2(31.0, 31.0));",
        "    float hsX = noise((rq + vec2(0.006, 0.0)) * vec2(13.0, 13.0))",
        "        + 0.50 * noise((rq + vec2(0.006, 0.0)) * vec2(31.0, 31.0));",
        "    float hsY = noise((rq + vec2(0.0, 0.006)) * vec2(13.0, 13.0))",
        "        + 0.50 * noise((rq + vec2(0.0, 0.006)) * vec2(31.0, 31.0));",
        "    vec3 nrm = normalize(vec3((hs - hsX) * 8.0, (hs - hsY) * 8.0, 1.0));",
        "    float shade = clamp(dot(nrm, normalize(vec3(-0.45, 0.55, 0.70))), 0.0, 1.0);",
        "    float bigRock = fbm(vec2(uv.x * 7.0 + uv.y * 3.0, uv.y * 16.0));",
        "    float rockA = fbm(vec2(uv.x * 26.0 + uv.y * 8.0, uv.y * 70.0));",
        "    float rockB = fbm(vec2(uv.x * 60.0, uv.y * 150.0));",
        "    float gully = fbm(vec2(uv.x * 45.0, uv.y * 10.0));",
        "    vec3 mainCol = vec3(0.150, 0.145, 0.118);",
        "    mainCol *= 0.50 + 0.70 * shade;",
        "    mainCol *= 0.65 + 0.55 * bigRock;",
        "    mainCol *= 0.78 + 0.35 * rockA;",
        "    mainCol *= 0.86 + 0.22 * rockB;",
        "    mainCol *= 0.88 + 0.24 * gully;",
        "    mainCol *= 0.94 + 0.14 * crest(uv.x * 180.0 + uv.y * 90.0, 13.0);",
        "    mainCol = mix(mainCol, vec3(0.200, 0.195, 0.160), exp(-depth * 8.0) * 0.45);",
        "    mainCol *= mix(0.55, 1.10, exp(-depth * 6.0));",
        "    mainCol += auroraColor(0.0) * exp(-depth * 28.0) * 0.05 * min(glow, 1.0);",
        "    mainCol += vec3(0.020, 0.012, 0.005) * exp(-depth * 100.0);",
        "    float rL = texture2D(uRidge, vec2(uv.x - 0.008, 0.5)).g;",
        "    float rR = texture2D(uRidge, vec2(uv.x + 0.008, 0.5)).g;",
        "    float face = clamp(0.5 - (rR - rL) * 80.0, 0.0, 1.0);",
        "    mainCol += vec3(0.045, 0.034, 0.018) * face * exp(-depth * 22.0) * 0.35;",
        "    col = mix(col, mainCol, mainMask);",

        /* near foothills */
        "    float nearMask = smoothstep(nearTop + 0.006, nearTop - 0.006, uv.y);",
        "    vec3 nearCol = vec3(0.040, 0.042, 0.034)",
        "        + vec3(0.016, 0.009, 0.004) * exp(-max(nearTop - uv.y, 0.0) * 24.0);",
        "    col = mix(col, nearCol, nearMask);",

        /* foreground field and small warm lights */
        "    col += auroraColor(0.0) * exp(-depth * 30.0) * 0.020;",
        "    col = mix(col, vec3(0.013, 0.014, 0.010), smoothstep(0.055, 0.035, uv.y) * 0.80);",
        "    float town = exp(-uv.y * 20.0) * (0.25 + 0.75 * noise(vec2(uv.x * 3.0 + 1.0, 7.0)));",
        "    col += vec3(0.20, 0.08, 0.02) * town * 0.16;",
        "    float lampX = exp(-pow((uv.x - 0.12) / 0.008, 2.0))",
        "        + exp(-pow((uv.x - 0.23) / 0.006, 2.0));",
        "    col += vec3(0.90, 0.45, 0.14) * lampX * exp(-uv.y * 180.0) * 0.45;",

        "    vec2 p = uv * 2.0 - 1.0;",
        "    col *= 1.0 - 0.12 * dot(p, p);",
        "    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;",
        "    gl_FragColor = vec4(col, 1.0);",
        "}"
    ].join("\n");

    function compile(type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    var vs = compile(gl.VERTEX_SHADER, VERTEX);
    var fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var aPos = gl.getAttribLocation(program, "aPos");
    var uRes = gl.getUniformLocation(program, "uRes");
    var uTime = gl.getUniformLocation(program, "uTime");
    var uRidge = gl.getUniformLocation(program, "uRidge");
    var uStarsOnly = gl.getUniformLocation(program, "uStarsOnly");

    var width = 0;
    var height = 0;
    var time = 0;
    var last = 0;
    var frame = 0;

    function resize() {
        var rect = canvas.getBoundingClientRect();
        var vw = Math.max(1, Math.round(rect.width) || window.innerWidth);
        var vh = Math.max(1, Math.round(rect.height) || window.innerHeight);
        var base = software ? 1200 : Math.min(1920, Math.max(900, Math.round(vw * 1.5)));
        var w = Math.max(600, Math.round(base));
        var h = Math.round(w * vh / vw);

        if (w === width && h === height) {
            gl.useProgram(program);
            gl.uniform2f(uRes, width, height);
            return;
        }

        width = w;
        height = h;
        canvas.width = w;
        canvas.height = h;
        gl.useProgram(program);
        gl.uniform2f(uRes, w, h);
    }

    function draw(t) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, ridgeTexture);
        gl.uniform1i(uRidge, 0);
        gl.uniform1f(uStarsOnly, 1.0);
        gl.uniform1f(uTime, t);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop(now) {
        frame = requestAnimationFrame(loop);
        if (!last) last = now;
        if (now - last < 1000 / 30) return;
        var dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        time += dt;
        draw(time);
    }

    function stop() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
    }

    function start() {
        stop();
        resize();
        draw(time);
        if (reduced.matches) return;
        last = 0;
        frame = requestAnimationFrame(loop);
    }

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    function sync() {
        if (landscape.matches && !document.hidden) start();
        else stop();
    }

    landscape.addEventListener("change", sync);
    reduced.addEventListener("change", sync);

    window.addEventListener("resize", function () {
        if (!landscape.matches) return;
        stop();
        resize();
        draw(time);
        if (!reduced.matches) {
            last = 0;
            frame = requestAnimationFrame(loop);
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            stop();
        } else if (landscape.matches && !reduced.matches) {
            last = 0;
            frame = requestAnimationFrame(loop);
        }
    });

    canvas.addEventListener("webglcontextlost", function (event) {
        event.preventDefault();
        stop();
    });

    canvas.addEventListener("webglcontextrestored", function () {
        sync();
    });

    sync();
})();
