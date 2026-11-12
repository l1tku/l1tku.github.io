/* WebGL aurora for portrait screens: a broad arc with a bright, undulating
   lower edge and soft vertical striations. Desktop uses the lava layer. */
(function () {
    "use strict";

    var canvas = document.createElement("canvas");
    canvas.className = "aurora-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(canvas, document.body.firstChild);

    var gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power"
    });

    if (!gl) return;

    var VERTEX = [
        "attribute vec2 aPos;",
        "void main() {",
        "    gl_Position = vec4(aPos, 0.0, 1.0);",
        "}"
    ].join("\n");

    var FRAGMENT = [
        "precision highp float;",
        "uniform vec2 uRes;",
        "uniform float uTime;",
        "uniform vec4 uRand;",

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

        "vec3 auroraColor(float y, float mood) {",
        "    vec3 green = vec3(0.10, 0.86, 0.30);",
        "    vec3 teal = vec3(0.08, 0.62, 0.55);",
        "    vec3 cyan = vec3(0.06, 0.45, 0.70);",
        "    vec3 violet = vec3(0.38, 0.20, 0.72);",
        "    vec3 red = vec3(0.75, 0.12, 0.22);",
        "    vec3 c = mix(green, teal, smoothstep(0.33, 0.52, y));",
        "    c = mix(c, violet, smoothstep(0.65, 0.90, y) * 0.5);",
        "    c = mix(c, cyan, smoothstep(0.30, 0.60, y) * mood * 0.4);",
        "    c = mix(c, red, smoothstep(0.68, 0.88, y) * smoothstep(0.82, 1.0, mood) * 0.2);",
        "    c += vec3(0.12, 0.20, 0.55) * smoothstep(0.12, 0.0, y) * 0.2;",
        "    return c;",
        "}",

        "float fbm(vec2 p) {",
        "    float v = 0.0;",
        "    float a = 0.5;",
        "    for (int i = 0; i < 3; i++) {",
        "        v += a * noise(p);",
        "        p *= 2.03;",
        "        a *= 0.5;",
        "    }",
        "    return v;",
        "}",

        "float arc(vec2 uv, float t, float base, float shift, float amp) {",
        "    float x = uv.x;",
        "    float edge = base",
        "        + sin(x * 3.1 + t * 0.25 + shift) * amp",
        "        + sin(x * 7.3 - t * 0.18 + shift * 1.7) * amp * 0.5",
        "        + (fbm(vec2(x * 2.4 + shift, t * 0.02 + 3.7)) - 0.5) * amp * 1.6;",
        "    float h = uv.y - edge;",
        "    float mask = smoothstep(-0.035, 0.045, h);",
        "    float glow = exp(-max(h, 0.0) * 3.2);",
        "    float rim = exp(-h * h * 90.0);",
        /* rays are straight: the x pattern does not move with height */
        "    float rayX = x * 30.0 + shift * 7.0 + t * mix(-0.2, 0.2, step(0.5, uRand.w));",
        "    float striation = 0.45 + 0.55 * fbm(vec2(rayX, 3.7));",
        "    float reach = 0.4 + 0.6 * fbm(vec2(rayX, t * 0.015 + 9.1));",
        "    float rayFade = exp(-h / reach * 2.2);",
        "    float pulse = 0.8 + 0.2 * sin(x * 5.0 - t * 0.25 + shift);",
        "    float patch = 0.5 + 0.5 * smoothstep(0.25, 0.75, fbm(vec2(x * 3.0 + shift, t * 0.025)));",
        "    float gaps = 0.7 + 0.3 * smoothstep(0.3, 0.7, fbm(vec2(x * 10.0 + shift, t * 0.05)));",
        "    return mask * (glow * 0.65 * rayFade + rim * 0.9) * striation * pulse * patch * gaps;",
        "}",

        "void main() {",
        "    vec2 uv = gl_FragCoord.xy / uRes;",
        "    float t = uTime;",
        "    vec3 col = mix(vec3(0.030, 0.055, 0.060), vec3(0.012, 0.028, 0.055), smoothstep(0.0, 1.0, uv.y));",
        "    col += vec3(0.035, 0.010, 0.050) * exp(-uv.y * 10.0);",
        "    col += vec3(0.010, 0.030, 0.045) * smoothstep(0.45, 1.0, uv.y) * 0.9;",

        /* aurora time: sometimes fast, sometimes almost still */
        "    float slow = t * (0.7 + uRand.z * 0.6) + 14.0 * sin(t * 0.026) + 4.0 * sin(t * 0.11);",
        "    float base1 = 0.28 + uRand.x * 0.14;",
        "    float base2 = base1 + 0.14 + uRand.y * 0.12;",
        "    float amp = 0.05 + uRand.z * 0.06;",
        "    float a = arc(uv, slow, base1, uRand.x * 6.0, amp)",
        "            + arc(uv, slow, base2, uRand.y * 6.0, amp * 0.75) * (0.35 + uRand.w * 0.25);",

        "    float mood = smoothstep(0.3, 0.75, fbm(vec2(t * 0.01 + uRand.x * 3.0, 2.7)));",
        "    mood = mix(mood, smoothstep(0.3, 0.75, fbm(vec2(uv.x * 1.6 + uRand.y * 2.0, t * 0.02))), 0.4);",
        "    vec3 auroraCol = auroraColor(uv.y, mood) * a * 0.95;",
        "    float auroraLum = dot(auroraCol, vec3(0.2126, 0.7152, 0.0722));",

        "    float stars = starLayer(uv, t, 190.0, 0.97, 1.0)",
        "                + starLayer(uv, t, 280.0, 0.985, 7.0) * 0.7;",
        "    float starMask = 1.0 - smoothstep(0.004, 0.05, auroraLum);",
        "    float starTop = 1.0 - smoothstep(0.52, 0.7, uv.y);",
        "    col += vec3(0.72, 0.79, 0.90) * stars * starMask * starTop;",
        "    col += auroraCol;",

        "    vec2 p = uv * 2.0 - 1.0;",
        "    col *= 1.0 - 0.14 * dot(p, p);",
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

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(program, "uRes");
    var uTime = gl.getUniformLocation(program, "uTime");
    var uRand = gl.getUniformLocation(program, "uRand");

    var seed = [Math.random(), Math.random(), Math.random(), Math.random()];
    gl.uniform4f(uRand, seed[0], seed[1], seed[2], seed[3]);

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    var portrait = window.matchMedia("(orientation: portrait)");
    var frame = 0;
    var lastDraw = 0;
    var time = 0;

    function resize() {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var w = Math.min(360, Math.max(220, Math.round(vw * 0.8)));

        canvas.width = w;
        canvas.height = Math.round(w * vh / vw);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
    }

    function draw(t) {
        gl.uniform1f(uTime, t);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop(now) {
        frame = requestAnimationFrame(loop);

        if (now - lastDraw < 33) return;

        var dt = lastDraw ? Math.min(0.1, (now - lastDraw) / 1000) : 0;
        lastDraw = now;
        time += dt;
        draw(time);
    }

    function stop() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
    }

    function start() {
        stop();
        resize();
        draw(time);

        if (reduced.matches) return;

        lastDraw = 0;
        frame = requestAnimationFrame(loop);
    }

    function sync() {
        if (portrait.matches && !document.hidden) start();
        else stop();
    }

    portrait.addEventListener("change", sync);
    reduced.addEventListener("change", sync);

    window.addEventListener("resize", function () {
        if (!portrait.matches) return;

        stop();
        resize();
        draw(time);

        if (!reduced.matches) {
            lastDraw = 0;
            frame = requestAnimationFrame(loop);
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            stop();
        } else if (portrait.matches && !reduced.matches) {
            lastDraw = 0;
            frame = requestAnimationFrame(loop);
        }
    });

    sync();
})();























