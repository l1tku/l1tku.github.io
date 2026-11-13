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
        powerPreference: "default"
    });

    if (!gl) return;

    var debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    var renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    var software = /swiftshader|software|llvmpipe|mesa/i.test(String(renderer));

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
        "    vec3 lime = vec3(0.42, 0.95, 0.42);",
        "    vec3 green = vec3(0.12, 0.95, 0.46);",
        "    vec3 teal = vec3(0.06, 0.70, 0.46);",
        "    vec3 violet = vec3(0.28, 0.18, 0.58);",
        "    vec3 pink = vec3(0.50, 0.18, 0.46);",
        "    vec3 c = lime;",
        "    c = mix(c, green, smoothstep(0.02, 0.28, y));",
        "    c = mix(c, teal, smoothstep(0.28, 0.65, y) * 0.85);",
        "    c = mix(c, violet, smoothstep(0.62, 0.88, y) * 0.65);",
        "    c = mix(c, pink, smoothstep(0.86, 1.00, y) * 0.40);",
        "    return c;",
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

        "vec3 arc(vec2 uv, float t, float drift, float base, float shift, float amp, float reach) {",
        "    float x = uv.x;",
        "    float edge = base",
        "        + sin(x * 3.1 + t * 0.08 + shift) * amp",
        "        + sin(x * 7.3 - t * 0.05 + shift * 1.7) * amp * 0.5",
        "        + sin(x * 13.0 + t * 0.06 + shift * 2.3) * amp * 0.30",
        "        ;",
        "    float h = uv.y - edge;",
        "    float thick = 0.30 + 1.70 * fbm(vec2(x * 1.7 + shift * 0.5, 5.0));",
        "    float mask = smoothstep(-0.035, 0.018, h);",
        "    float glow = exp(-max(h, 0.0) * (3.0 / thick));",
        "    float rim = exp(-h * h * (30.0 / (thick * thick)));",
        /* rays are straight: the x pattern does not move with height */
        "    float rayX = x * 30.0 + shift * 7.0 + drift * mix(-1.0, 1.0, step(0.5, uRand.w));",
        "    float upperLines = 0.55 + 0.45 * fbm(vec2(rayX * 1.2, 3.7));",
        "    float lineGate = smoothstep(0.22, 0.38, h);",
        "    float striation = mix(1.0, upperLines, lineGate);",
        
        "    float rayFade = exp(-h / (reach * thick) * 2.2);",
        "    float detail = 1.0;",
                "    float pulse = 1.0;",
        "    float patch = 1.0;",
        "    float gapN = fbm(vec2(x * 2.2 + shift * 0.6 + drift * 0.05, 17.0));",
        "    float gaps = smoothstep(0.18, 0.42, gapN);",
        "    float scatter = 0.052 * exp(-abs(h) * 1.5) + 0.044 * exp(-abs(h) * 5.0);",
        "    float under = 0.045 * exp(-max(-h, 0.0) * 5.0);",
        "    return vec3((mask * (glow * 0.55 * rayFade + rim * 0.40) + under + scatter) * striation * pulse * patch * gaps * detail, h, scatter);",
        "}",

        "float starDot(vec2 uv, vec2 pos, float size, float bright) {",
        "    vec2 p = (uv - pos) * vec2(uRes.x / uRes.y, 1.0);",
        "    float d = length(p);",
        "    float core = smoothstep(size, 0.0, d);",
        "    float halo = smoothstep(size * 3.0, 0.0, d) * 0.12;",
        "    return (core + halo) * bright;",
        "}",
        "",
        "float constellations(vec2 uv) {",
        "    float s = 0.0;",
        "    s += starDot(uv, vec2(0.8664, 0.9793), 0.0016, 0.51);",
        "    s += starDot(uv, vec2(0.0424, 0.9719), 0.0010, 0.40);",
        "    s += starDot(uv, vec2(0.5329, 0.9600), 0.0027, 0.72);",
        "    s += starDot(uv, vec2(0.3597, 0.9471), 0.0019, 0.58);",
        "    s += starDot(uv, vec2(0.8392, 0.9273), 0.0016, 0.50);",
        "    s += starDot(uv, vec2(0.5456, 0.9269), 0.0013, 0.45);",
        "    s += starDot(uv, vec2(0.2096, 0.8935), 0.0019, 0.56);",
        "    s += starDot(uv, vec2(0.5729, 0.8917), 0.0013, 0.46);",
        "    s += starDot(uv, vec2(0.6303, 0.8710), 0.0009, 0.38);",
        "    s += starDot(uv, vec2(0.6967, 0.8649), 0.0026, 0.71);",
        "    s += starDot(uv, vec2(0.3293, 0.8576), 0.0018, 0.55);",
        "    s += starDot(uv, vec2(0.6192, 0.8491), 0.0013, 0.45);",
        "    s += starDot(uv, vec2(0.8425, 0.8404), 0.0017, 0.53);",
        "    s += starDot(uv, vec2(0.6921, 0.8403), 0.0021, 0.60);",
        "    s += starDot(uv, vec2(0.1398, 0.8325), 0.0019, 0.58);",
        "    s += starDot(uv, vec2(0.4663, 0.8295), 0.0020, 0.60);",
        "    s += starDot(uv, vec2(0.5144, 0.8192), 0.0015, 0.49);",
        "    s += starDot(uv, vec2(0.4196, 0.8163), 0.0011, 0.42);",
        "    s += starDot(uv, vec2(0.2567, 0.8114), 0.0024, 0.67);",
        "    s += starDot(uv, vec2(0.5610, 0.7905), 0.0020, 0.59);",
        "    s += starDot(uv, vec2(0.4439, 0.7900), 0.0012, 0.44);",
        "    s += starDot(uv, vec2(0.2922, 0.7881), 0.0011, 0.41);",
        "    s += starDot(uv, vec2(0.6022, 0.7717), 0.0022, 0.64);",
        "    s += starDot(uv, vec2(0.7875, 0.7601), 0.0019, 0.57);",
        "    s += starDot(uv, vec2(0.6800, 0.7521), 0.0015, 0.49);",
        "    s += starDot(uv, vec2(0.7294, 0.7400), 0.0012, 0.43);",
        "    s += starDot(uv, vec2(0.5438, 0.7065), 0.0025, 0.69);",
        "    s += starDot(uv, vec2(0.5819, 0.6957), 0.0022, 0.63);",
        "    s += starDot(uv, vec2(0.3832, 0.6953), 0.0024, 0.66);",
        "    s += starDot(uv, vec2(0.0822, 0.6940), 0.0010, 0.40);",
        "    s += starDot(uv, vec2(0.3494, 0.6877), 0.0011, 0.42);",
        "    s += starDot(uv, vec2(0.1518, 0.6834), 0.0031, 0.81);",
        "    s += starDot(uv, vec2(0.2307, 0.6815), 0.0010, 0.39);",
        "    s += starDot(uv, vec2(0.5887, 0.6749), 0.0010, 0.39);",
        "    s += starDot(uv, vec2(0.2268, 0.6742), 0.0009, 0.37);",
        "    s += starDot(uv, vec2(0.5371, 0.6688), 0.0016, 0.52);",
        "    s += starDot(uv, vec2(0.0710, 0.6687), 0.0010, 0.39);",
        "    s += starDot(uv, vec2(0.7617, 0.6481), 0.0011, 0.42);",
        "    s += starDot(uv, vec2(0.2801, 0.6476), 0.0016, 0.51);",
        "    s += starDot(uv, vec2(0.1518, 0.6341), 0.0025, 0.69);",
        "    s += starDot(uv, vec2(0.5764, 0.6276), 0.0010, 0.40);",
        "    s += starDot(uv, vec2(0.7380, 0.5823), 0.0012, 0.43);",
        "    s += starDot(uv, vec2(0.1821, 0.5770), 0.0015, 0.50);",
        "    s += starDot(uv, vec2(0.4257, 0.5756), 0.0036, 0.92);",
        "    s += starDot(uv, vec2(0.4013, 0.5682), 0.0013, 0.45);",
        "    s += starDot(uv, vec2(0.3713, 0.5652), 0.0015, 0.49);",
        "    s += starDot(uv, vec2(0.6529, 0.5579), 0.0011, 0.41);",
        "    s += starDot(uv, vec2(0.5370, 0.5579), 0.0010, 0.40);",
        "    s += starDot(uv, vec2(0.3726, 0.5335), 0.0013, 0.46);",
        "    s += starDot(uv, vec2(0.3417, 0.5299), 0.0009, 0.38);",
        "    s += starDot(uv, vec2(0.1979, 0.5233), 0.0021, 0.62);",
        "    s += starDot(uv, vec2(0.7776, 0.5190), 0.0011, 0.42);",
        "    s += starDot(uv, vec2(0.9260, 0.5190), 0.0013, 0.46);",
        "    s += starDot(uv, vec2(0.7160, 0.5086), 0.0011, 0.41);",
        "    s += starDot(uv, vec2(0.2112, 0.4983), 0.0020, 0.60);",
        "    s += starDot(uv, vec2(0.5298, 0.4866), 0.0012, 0.44);",
        "    return s;",
        "}",
        "",
        "float segDist(vec2 uv, vec2 a, vec2 b) {",
        "    vec2 p = uv * vec2(uRes.x / uRes.y, 1.0);",
        "    vec2 pa = p - a * vec2(uRes.x / uRes.y, 1.0);",
        "    vec2 ba = (b - a) * vec2(uRes.x / uRes.y, 1.0);",
        "    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);",
        "    return length(pa - ba * h);",
        "}",
        "",
        "float constellationLines(vec2 uv) {",
        "    float s = 0.0;",
        "    return s;",
        "}",
        "",
        "void main() {",
        "    vec2 uv = gl_FragCoord.xy / uRes;",
        "    float t = uTime;",
        /* horizon light pollution, blue-violet air, deep space above */
        "    vec3 col = mix(vec3(0.025, 0.030, 0.050), vec3(0.020, 0.023, 0.052), smoothstep(0.0, 0.30, uv.y));",
        "    col = mix(col, vec3(0.008, 0.011, 0.028), smoothstep(0.34, 0.92, uv.y));",
        "    float lpLow = exp(-uv.y * 10.0);",
        "    float lpHigh = exp(-uv.y * 3.2);",
        "    vec3 lpBase = vec3(0.42, 0.20, 0.065);",
        "    vec3 lpTop = vec3(0.115, 0.095, 0.060);",
        "    col += lpBase * (0.95 * lpLow) * 0.75;",
        "    col += lpTop * (0.14 * lpHigh) * 0.75;",

        /* aurora time: sometimes fast, sometimes almost still */
        "    float slow = t * (0.45 + uRand.z * 0.30) + 7.0 * sin(t * 0.020) + 2.0 * sin(t * 0.080);",
        "    float drift = t * (0.10 + uRand.z * 0.05) + 0.3 * sin(t * 0.035);",
        "    float base1 = 0.50 + uRand.x * 0.08;",
        "    float shift1 = uRand.x * 6.0;",
        "    float amp = 0.05 + uRand.z * 0.06;",
        "    vec3 ar = arc(uv, slow, drift, base1, shift1, amp, 0.30 + uRand.y * 0.20);",
        "    float alt = clamp(ar.y / 0.40, 0.0, 1.0);",
        "    float mood = 0.55;",
        "    float heat = 1.0 + 1.9 * (1.0 - smoothstep(0.30, 0.65, uv.y));",
        "    float a = max(ar.x - ar.z, 0.0);",
        "    vec3 auroraCol = auroraColor(alt, mood) * (a * heat + ar.z * 0.90) * 0.55;",
        "    auroraCol = auroraCol / (1.0 + auroraCol * 0.45);",
        "    vec3 auroraCore = auroraColor(alt, mood) * a * 0.55 * heat;",
        "    auroraCore = auroraCore / (1.0 + auroraCore * 0.45);",
        "    float auroraLum = dot(auroraCore, vec3(0.2126, 0.7152, 0.0722));",
        "    float auroraLumTotal = dot(auroraCol, vec3(0.2126, 0.7152, 0.0722));",

        "    float stars = starLayer(uv, t, 190.0, 0.955, 1.0)",
        "                + starLayer(uv, t, 280.0, 0.975, 7.0) * 0.7;",
        /* stars only in the dark upper sky; the aurora and its glow drown them out */
        "    float starHaze = 1.0 - smoothstep(0.015, 0.045, auroraLumTotal);",
        "    float starMask = (1.0 - smoothstep(0.004, 0.05, auroraLum)) * (1.0 - smoothstep(0.03, 0.22, a)) * starHaze;",
        "    float starTop = smoothstep(0.18, 0.40, uv.y);",
        "    float starAir = 0.5 + 0.5 * smoothstep(0.12, 0.55, uv.y);",
        "    col += vec3(0.75, 0.80, 0.92) * stars * starMask * starTop * starAir;",
        "    col += vec3(0.82, 0.88, 1.0) * constellations(uv) * (1.0 - smoothstep(0.015, 0.06, auroraLum)) * starHaze;",
        "    col += auroraCol;",

        "    vec2 p = uv * 2.0 - 1.0;",
        "    col *= 1.0 - 0.14 * dot(p, p);",
        "    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;",
        "    gl_FragColor = vec4(col, 1.0);",
        "}"
    ].join("\n");

    /* short exposure blend: keeps slow curtain motion continuous instead of
       stepping one pixel at a time */
    var COMPOSITE = [
        "precision mediump float;",
        "varying vec2 vUv;",
        "uniform sampler2D uScene;",
        "uniform sampler2D uPrev;",
        "uniform float uBlend;",
        "void main() {",
        "    vec3 s = texture2D(uScene, vUv).rgb;",
        "    vec3 p = texture2D(uPrev, vUv).rgb;",
        "    gl_FragColor = vec4(mix(p, s, uBlend), 1.0);",
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

    function buildProgram(fragment) {
        var vs = compile(gl.VERTEX_SHADER, VERTEX);
        var fs = compile(gl.FRAGMENT_SHADER, fragment);
        if (!vs || !fs) return null;

        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteProgram(program);
            return null;
        }

        return program;
    }

    var sceneProgram = buildProgram(FRAGMENT);
    var blendProgram = buildProgram(COMPOSITE);
    if (!sceneProgram || !blendProgram) return;

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    function bindGeometry(program) {
        var aPos = gl.getAttribLocation(program, "aPos");
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    }

    var sceneRes = gl.getUniformLocation(sceneProgram, "uRes");
    var sceneTime = gl.getUniformLocation(sceneProgram, "uTime");
    var sceneRand = gl.getUniformLocation(sceneProgram, "uRand");
    var blendScene = gl.getUniformLocation(blendProgram, "uScene");
    var blendPrev = gl.getUniformLocation(blendProgram, "uPrev");
    var blendAmount = gl.getUniformLocation(blendProgram, "uBlend");

    var seed = [Math.random(), Math.random(), Math.random(), Math.random()];
    gl.useProgram(sceneProgram);
    gl.uniform4f(sceneRand, seed[0], seed[1], seed[2], seed[3]);

    var level = 0;
    var cap = software ? 20 : 30;
    var width = 0;
    var height = 0;
    var scene = null;
    var histA = null;
    var histB = null;
    var blending = false;
    var resetHistory = true;

    var frame = 0;
    var lastDraw = 0;
    var time = 0;
    var perfStart = 0;
    var perfCount = 0;
    var perfSum = 0;
    var lastFrameAt = 0;
    var refreshFrames = [];
    var nextDraw = 0;

    function makeTarget(w, h) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

        var complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (!complete) {
            gl.deleteFramebuffer(fb);
            gl.deleteTexture(tex);
            return null;
        }

        return { tex: tex, fb: fb };
    }

    function dropTarget(target) {
        if (!target) return;

        gl.deleteFramebuffer(target.fb);
        gl.deleteTexture(target.tex);
    }

    function resize() {
        var rect = canvas.getBoundingClientRect();
        var vw = Math.max(1, Math.round(rect.width) || window.innerWidth);
        var vh = Math.max(1, Math.round(rect.height) || window.innerHeight);
        var base = software ? 260 : Math.min(1100, Math.max(300, Math.round(vw * 3.0)));
        var scale = [1, 0.82, 0.66][level];
        var w = Math.max(160, Math.round(base * scale));
        var h = Math.round(w * vh / vw);

        if (w === width && h === height && scene && histA && histB) {
            gl.useProgram(sceneProgram);
            gl.uniform2f(sceneRes, width, height);
            return;
        }

        width = w;
        height = h;
        canvas.width = w;
        canvas.height = h;

        dropTarget(scene);
        dropTarget(histA);
        dropTarget(histB);

        scene = makeTarget(w, h);
        histA = makeTarget(w, h);
        histB = makeTarget(w, h);
        blending = !!(scene && histA && histB);
        resetHistory = true;

        gl.useProgram(sceneProgram);
        gl.uniform2f(sceneRes, w, h);
    }

    function draw(t) {

        gl.bindFramebuffer(gl.FRAMEBUFFER, blending ? scene.fb : null);
        gl.viewport(0, 0, width, height);
        gl.useProgram(sceneProgram);
        bindGeometry(sceneProgram);
        gl.uniform1f(sceneTime, t);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (blending) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, histA.fb);
            gl.useProgram(blendProgram);
            bindGeometry(blendProgram);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, scene.tex);
            gl.uniform1i(blendScene, 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, histB.tex);
            gl.uniform1i(blendPrev, 1);

            gl.uniform1f(blendAmount, resetHistory ? 1 : 0.8);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            resetHistory = false;

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, histA.tex);
            gl.uniform1i(blendScene, 0);
            gl.uniform1i(blendPrev, 0);
            gl.uniform1f(blendAmount, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            var swap = histA;
            histA = histB;
            histB = swap;
        }


    }

    function degrade() {

        if (cap > 30) {
            cap = 30;
        } else if (level < 2) {
            level += 1;
            resize();
            draw(time);
        }
    }

    function loop(now) {
        frame = requestAnimationFrame(loop);


        if (refreshFrames.length < 40) {
            refreshFrames.push(now);
            if (refreshFrames.length === 40) {
                var rg = [];
                for (var gi = 8; gi < refreshFrames.length; gi++) rg.push(refreshFrames[gi] - refreshFrames[gi - 1]);
                rg.sort(function (a, b) { return a - b; });
                var med = rg[Math.floor(rg.length / 2)];
                if (med > 0) cap = Math.max(24, Math.min(60, (1000 / med) / 2));
                nextDraw = 0;
            }
        }

        if (!nextDraw) nextDraw = now;
        if (now < nextDraw) return;

        nextDraw += 1000 / cap;
        if (now - nextDraw > 1500 / cap) nextDraw = now + 1000 / cap;

        var dt = lastDraw ? Math.min(0.1, (now - lastDraw) / 1000) : 0;
        lastDraw = now;
        time += dt;
        draw(time);

        if (lastFrameAt) {
            perfSum += now - lastFrameAt;
            perfCount += 1;
        }
        lastFrameAt = now;

        if (!perfStart) perfStart = now;

        if (now - perfStart > 2500 && perfCount > 8) {
            var lateGap = perfSum / perfCount > (1000 / cap) * 1.3;
            if (lateGap) degrade();
            perfStart = now;
            perfCount = 0;
            perfSum = 0;
        }
    }

    function stop() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
    }

    function start() {
        stop();
        resize();
        lastDraw = 0;
        lastFrameAt = 0;
        perfStart = 0;
        perfCount = 0;
        perfSum = 0;
        draw(time);

        if (reduced.matches) return;

        frame = requestAnimationFrame(loop);
    }

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    var portrait = window.matchMedia("(orientation: portrait)");

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
            lastFrameAt = 0;
            frame = requestAnimationFrame(loop);
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            stop();
        } else if (portrait.matches && !reduced.matches) {
            resetHistory = true;
            lastDraw = 0;
            lastFrameAt = 0;
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


























































