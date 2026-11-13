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
        "    vec3 green = vec3(0.12, 0.95, 0.32);",
        "    vec3 teal = vec3(0.05, 0.55, 0.52);",
        "    vec3 cyan = vec3(0.62, 0.16, 0.42);",
        "    vec3 violet = vec3(0.35, 0.18, 0.65);",
        "    vec3 red = vec3(0.75, 0.12, 0.22);",
        "    vec3 c = green;",
        "    c = mix(c, teal, smoothstep(0.45, 0.72, y) * 0.30);",
        "    c = mix(c, violet, smoothstep(0.72, 0.92, y) * 0.40);",
        
        "    c += vec3(0.12, 0.20, 0.55) * smoothstep(0.12, 0.0, y) * 0.2;",
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

        "vec2 arc(vec2 uv, float t, float drift, float base, float shift, float amp) {",
        "    float x = uv.x;",
        "    float edge = base",
        "        + sin(x * 3.1 + t * 0.12 + shift) * amp",
        "        + sin(x * 7.3 - t * 0.08 + shift * 1.7) * amp * 0.5",
        "        ;",
        "    float h = uv.y - edge;",
        "    float mask = smoothstep(-0.055, 0.030, h);",
        "    float glow = exp(-max(h, 0.0) * 2.8);",
        "    float rim = exp(-h * h * 30.0);",
        /* rays are straight: the x pattern does not move with height */
        "    float rayX = x * 30.0 + shift * 7.0 + drift * mix(-1.0, 1.0, step(0.5, uRand.w));",
        "    float striation = 1.0;",
        "    float reach = 0.66;",
        "    float rayFade = exp(-h / reach * 2.2);",
        "    float detail = 0.82 + 0.18 * fbm(vec2(rayX * 0.90, h * 9.0 + t * 0.02));",
                "    float pulse = 1.0;",
        "    float patch = 1.0;",
        "    float gaps = 1.0;",
        "    float under = 0.04 * exp(-max(-h, 0.0) * 7.0);",
        "    return vec2((mask * (glow * 0.55 * rayFade + rim * 0.40) + under) * striation * pulse * patch * gaps * detail, h);",
        "}",

        "void main() {",
        "    vec2 uv = gl_FragCoord.xy / uRes;",
        "    float t = uTime;",
        /* horizon light pollution, blue-violet air, deep space above */
        "    vec3 col = mix(vec3(0.072, 0.052, 0.078), vec3(0.020, 0.023, 0.052), smoothstep(0.0, 0.30, uv.y));",
        "    col = mix(col, vec3(0.008, 0.011, 0.028), smoothstep(0.34, 0.92, uv.y));",
        "    col += vec3(0.090, 0.050, 0.052) * exp(-uv.y * 5.0);",

        /* aurora time: sometimes fast, sometimes almost still */
        "    float slow = t * (0.7 + uRand.z * 0.45) + 10.0 * sin(t * 0.026) + 3.0 * sin(t * 0.11);",
        "    float drift = t * (0.14 + uRand.z * 0.06) + 0.4 * sin(t * 0.045);",
        "    float base1 = 0.50 + uRand.x * 0.08;",
        "    float base2 = base1 + 0.07 + uRand.y * 0.06;",
        "    float amp = 0.05 + uRand.z * 0.06;",
        "    vec2 ar = arc(uv, slow, drift, base1, uRand.x * 6.0, amp);",
        "    float a = ar.x;",
        "    float alt = clamp(ar.y / 0.30, 0.0, 1.0);",

        "    float mood = 0.55;",
        "    float heat = 1.0 + 1.9 * (1.0 - smoothstep(0.30, 0.65, uv.y));",
        "    vec3 auroraCol = auroraColor(uv.y, mood) * a * 0.55 * heat;",
        "    auroraCol = auroraCol / (1.0 + auroraCol * 0.30);",
        "    float auroraLum = dot(auroraCol, vec3(0.2126, 0.7152, 0.0722));",

        "    float stars = starLayer(uv, t, 190.0, 0.955, 1.0)",
        "                + starLayer(uv, t, 280.0, 0.975, 7.0) * 0.7;",
        /* stars only in the dark upper sky; the aurora and its glow drown them out */
        "    float starMask = (1.0 - smoothstep(0.004, 0.05, auroraLum)) * (1.0 - smoothstep(0.03, 0.22, a));",
        "    float starTop = smoothstep(0.55, 0.80, uv.y);",
        "    col += vec3(0.75, 0.80, 0.92) * stars * starMask * starTop;",
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
        var vw = Math.max(1, window.innerWidth);
        var vh = Math.max(1, window.innerHeight);
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































