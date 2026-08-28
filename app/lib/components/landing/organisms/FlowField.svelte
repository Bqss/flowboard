<script lang="ts">
  let { class: klass = '' }: { class?: string } = $props();
  let canvas: HTMLCanvasElement;

  const vertexSource = `#version 300 es
    in vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `#version 300 es
    precision highp float;

    uniform vec2 resolution;
    uniform float time;
    uniform float darkMode;
    out vec4 color;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p = rotation * p * 2.03 + 17.13;
        amplitude *= 0.48;
      }
      return value;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
      float t = time * 0.095;
      vec2 warped = uv;
      warped.y += (fbm(uv * 1.1 + vec2(t, -t * 0.4)) - 0.5) * 0.34;
      warped.x += (fbm(uv * 0.8 + vec2(-t * 0.7, t)) - 0.5) * 0.16;

      float ribbonA = exp(-24.0 * abs(warped.y - 0.32 * sin(warped.x * 1.7 + t * 3.0)));
      float ribbonB = exp(-34.0 * abs(warped.y + 0.46 - 0.22 * sin(warped.x * 2.2 - t * 2.1)));
      float ribbonC = exp(-28.0 * abs(warped.y - 0.62 + 0.16 * cos(warped.x * 2.8 + t * 1.4)));
      float field = fbm(warped * 1.5 + t * 0.6);
      float vignette = smoothstep(1.75, 0.15, length(uv * vec2(0.72, 1.0)));
      float energy = (ribbonA * 0.56 + ribbonB * 0.34 + ribbonC * 0.22 + field * 0.055) * vignette;

      vec3 lightIndigo = vec3(0.31, 0.27, 0.90);
      vec3 darkIndigo = vec3(0.40, 0.44, 0.85);
      vec3 tint = mix(lightIndigo, darkIndigo, darkMode);
      float alpha = energy * mix(0.25, 0.22, darkMode);
      color = vec4(tint, alpha);
    }
  `;

  function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  $effect(() => {
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'low-power'
    });
    if (!gl) return;

    const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, 'resolution');
    const time = gl.getUniformLocation(program, 'time');
    const darkMode = gl.getUniformLocation(program, 'darkMode');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    let frame = 0;
    let visible = true;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio, 1.5);
      const width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const render = (now: number) => {
      frame = 0;
      if (!visible && !reduceMotion) return;
      resize();
      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, reduceMotion ? 7 : (now - startedAt) / 1000);
      gl.uniform1f(darkMode, document.documentElement.classList.contains('dark') ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduceMotion) frame = requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduceMotion && !frame) frame = requestAnimationFrame(render);
    });

    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  });
</script>

<canvas bind:this={canvas} class="{klass} flow-field" aria-hidden="true"></canvas>

<style>
  .flow-field {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
