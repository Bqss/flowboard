<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * A self-contained WebGL2 fragment-shader canvas. Renders a slow domain-warped
   * fractal-noise field tinted with Narko's red hero palette bleeding into a
   * near-black canvas — the site's signature "launch-banner" atmosphere, alive.
   *
   * Design + safety notes:
   * - SSR-safe: all GL work happens in onMount (browser only).
   * - Honors prefers-reduced-motion: paints one static frame, no rAF loop.
   * - Falls back silently to the CSS gradient underlay if WebGL2 is missing.
   * - Pointer parallax is throttled to the rAF loop; DPR capped at 2 for perf.
   * - Fully cleaned up on destroy (cancel rAF, delete GL objects, drop context).
   */
  let { class: klass = '' }: { class?: string } = $props();

  let canvas: HTMLCanvasElement;

  const VERT = `#version 300 es
    in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
    precision highp float;
    out vec4 outColor;
    uniform vec2  uRes;
    uniform float uTime;
    uniform vec2  uMouse;

    // -- hash / value noise ------------------------------------------------
    float hash(vec2 p){
      p = fract(p * vec2(233.34, 851.73));
      p += dot(p, p + 23.45);
      return fract(p.x * p.y);
    }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for(int i = 0; i < 6; i++){ v += a * noise(p); p = m * p; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      float t = uTime * 0.04;

      // parallax from pointer, gentle
      vec2 par = (uMouse - 0.5) * 0.25;
      vec2 q = uv + par;

      // domain warp: fbm feeding fbm
      vec2 w = vec2(
        fbm(q * 1.6 + vec2(0.0, t)),
        fbm(q * 1.6 + vec2(5.2, -t))
      );
      float f = fbm(q * 2.2 + w * 1.8 + vec2(t * 0.6, 0.0));

      // red hero palette bleeding out of near-black
      vec3 canvasCol = vec3(0.027, 0.031, 0.039);   // #07080a
      vec3 deepRed   = vec3(0.63, 0.075, 0.102);     // #a1131a
      vec3 hotRed    = vec3(1.0, 0.34, 0.34);        // #ff5757
      vec3 ember     = vec3(1.0, 0.55, 0.30);

      vec3 col = canvasCol;
      col = mix(col, deepRed, smoothstep(0.35, 0.85, f));
      col = mix(col, hotRed,  smoothstep(0.55, 0.95, f) * 0.85);
      col += ember * smoothstep(0.75, 1.0, f) * 0.25;

      // radial vignette pulls the glow toward the upper band
      vec2 g = uv - vec2(0.0, 0.35);
      float glow = exp(-dot(g, g) * 1.6);
      col += hotRed * glow * 0.12;

      // fade to canvas at the lower edge so content stays legible
      float vfade = smoothstep(-0.15, -0.85, uv.y);
      col = mix(col, canvasCol, vfade * 0.9);

      // faint film grain to kill banding on the dark gradient
      float grain = (hash(gl_FragCoord.xy + t) - 0.5) * 0.025;
      col += grain;

      outColor = vec4(col, 1.0);
    }`;

  function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src.trim());
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  onMount(() => {
    const ctx = canvas.getContext('webgl2', {
      antialias: false,
      alpha: true,
      powerPreference: 'low-power'
    });
    if (!ctx) return; // CSS underlay carries the look
    const gl = ctx; // narrowed non-null binding for the nested closures

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // Fullscreen triangle
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');

    const mouse = { x: 0.5, y: 0.5 };
    const target = { x: 0.5, y: 0.5 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }

    function onPointer(e: PointerEvent) {
      target.x = e.clientX / window.innerWidth;
      target.y = 1 - e.clientY / window.innerHeight;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let raf = 0;

    function frame(now: number) {
      mouse.x += (target.x - mouse.x) * 0.05;
      mouse.y += (target.y - mouse.y) * 0.05;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);

    if (reduce) {
      // Single static frame — no motion, no pointer coupling.
      gl.uniform1f(uTime, 0);
      gl.uniform2f(uMouse, 0.5, 0.5);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      window.addEventListener('pointermove', onPointer, { passive: true });
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    };
  });
</script>

<div class="pointer-events-none absolute inset-0 overflow-hidden {klass}" aria-hidden="true">
  <!-- CSS underlay: shows if WebGL is unavailable or before first paint. -->
  <div
    class="absolute inset-0"
    style="background:
      radial-gradient(120% 80% at 50% -10%, rgba(255,87,87,0.22), transparent 55%),
      radial-gradient(90% 60% at 80% 0%, rgba(161,19,26,0.20), transparent 60%),
      var(--color-canvas);"
  ></div>
  <canvas bind:this={canvas} class="absolute inset-0 h-full w-full"></canvas>
</div>
