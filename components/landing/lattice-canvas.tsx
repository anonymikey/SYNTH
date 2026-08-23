"use client";

import { useEffect, useRef } from "react";

/*
 * LATTICE — drop-in animated WebGL2 background
 * Raw WebGL2, no library, no build step, no CDN, no module graph.
 * One <canvas>, one component. Self-contained.
 *
 * An infinite perspective floor with derivative-correct line widths,
 * running toward a lit horizon, with a ring that travels out across
 * the plane from the cursor.
 */

const CFG = {
  clear: "#05060b",
  bg: "#06070d",
  line: "#2c3d6b",
  hot: "#5cf2ff",
  cells: 1.4,
  speed: 0.55,
  grain: 0.016,
  dprCap: 1.5,
  maxFragments: 2400000,
  fps: 60,
};

const VERT = `#version 300 es
void main(){
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 uRes; uniform float uTime; uniform vec2 uPointer; uniform float uOn;
uniform vec3 uBg, uLine, uHot; uniform float uCells, uSpeed, uGrain;

float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

float grid(vec2 g, float w){
  vec2 d = abs(fract(g) - 0.5);
  vec2 f = fwidth(g) * w;
  vec2 l = smoothstep(f, vec2(0.0), d - f);
  return max(l.x, l.y);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 sp = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  float horizon = 0.30;
  float y = sp.y - horizon;
  if (y > -0.006) {
    float glow = exp(-(y * y) / 0.0016) * 0.55;
    vec3 sky = uBg + uHot * glow;
    sky += (h21(gl_FragCoord.xy + fract(uTime) * 33.7) - 0.5) * uGrain;
    O = vec4(max(sky, 0.0), 1.0); return;
  }
  float z = 0.36 / -y;
  vec2 g = vec2(sp.x * z, z + uTime * uSpeed) * uCells;

  float line = grid(g, 0.9);

  vec2 pw = vec2((uPointer.x - 0.5) * uRes.x / uRes.y, 0.0);
  float pz = 0.36 / max(0.02, (0.5 - uPointer.y) + horizon);
  float d = length(vec2(sp.x * z, z) - vec2(pw.x * pz / max(pz, 0.001), pz));
  float ring = exp(-pow(d - 1.4, 2.0) * 1.6) * uOn;

  float fade = exp(-z * 0.10);
  vec3 col = uBg;
  col += uLine * line * fade;
  col += uHot * line * ring * 1.8 * fade;
  col += uHot * exp(-(y * y) / 0.0022) * 0.20;

  col += (h21(gl_FragCoord.xy + fract(uTime) * 33.7) - 0.5) * uGrain;
  O = vec4(max(col, 0.0), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || "";
    console.error(
      log +
        "\n" +
        src
          .split("\n")
          .map((l, i) => String(i + 1).padStart(3) + " | " + l)
          .join("\n")
    );
    throw new Error("shader: " + log.split("\n")[0]);
  }
  return sh;
}

function rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function LatticeCanvas({ className }: { className?: string }) {
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;

    const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COARSE = matchMedia(
      "(hover: none) and (pointer: coarse)"
    ).matches;
    const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const MOBILE = innerWidth < 768 || COARSE;

    const gl = cv.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });

    if (!gl) {
      cv.style.background = CFG.clear;
      return;
    }

    /* Compile and link program */
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("link: " + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    /* Gather uniform locations */
    const U: Record<string, WebGLUniformLocation | null> = {};
    for (
      let i = 0, n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
      i < n;
      i++
    ) {
      const nm = gl.getActiveUniform(prog, i)!.name.replace(/\[0\]$/, "");
      U[nm] = gl.getUniformLocation(prog, nm);
    }

    /* Set per-background uniforms (baked-in SYNTH palette) */
    gl.uniform3fv(U.uBg, rgb(CFG.bg));
    gl.uniform3fv(U.uLine, rgb(CFG.line));
    gl.uniform3fv(U.uHot, rgb(CFG.hot));
    gl.uniform1f(U.uCells, CFG.cells);
    gl.uniform1f(U.uSpeed, CFG.speed);
    gl.uniform1f(U.uGrain, CFG.grain);

    /* DPR clamped twice — by tier, then by AREA */
    const MAX_FRAG = CFG.maxFragments;
    let W = 0;
    let H = 0;

    function fit() {
      const w = cv!.clientWidth || innerWidth;
      const h = cv!.clientHeight || innerHeight;
      const byTier = Math.min(
        devicePixelRatio || 1,
        MOBILE ? 1.25 : CFG.dprCap
      );
      const byArea = Math.sqrt(MAX_FRAG / Math.max(1, w * h));
      const dpr = Math.max(0.6, Math.min(byTier, byArea));
      const nw = Math.round(w * dpr);
      const nh = Math.round(h * dpr);
      if (nw === W && nh === H) return false;
      W = nw;
      H = nh;
      cv!.width = W;
      cv!.height = H;
      gl!.viewport(0, 0, W, H);
      return true;
    }

    fit();

    /* Pointer tracking — gated on fine pointer + has moved */
    const P = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0 };

    const onPointerMove = (e: PointerEvent) => {
      P.tx = e.clientX / innerWidth;
      P.ty = 1 - e.clientY / innerHeight;
      P.on = 1;
    };

    if (FINE && !MOBILE) {
      addEventListener("pointermove", onPointerMove, { passive: true });
    }

    /* Resize handler — Safari URL-bar collapse filter */
    let lastW = innerWidth;
    const onResize = () => {
      if (MOBILE && innerWidth === lastW) return;
      lastW = innerWidth;
      fit();
    };
    addEventListener("resize", onResize, { passive: true });

    /* Draw function */
    function draw(t: number) {
      if (fit()) gl!.viewport(0, 0, W, H);
      gl!.uniform2f(U.uRes, W, H);
      gl!.uniform1f(U.uTime, RM ? 3.0 : t);
      gl!.uniform2f(U.uPointer, P.x, P.y);
      gl!.uniform1f(U.uOn, P.on);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    draw(0);

    /* Animation loop — frame-rate independent */
    const t0 = performance.now();
    let last = t0;
    const budget = 1000 / (MOBILE ? 30 : CFG.fps);
    let raf: number;

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (now - last < budget) return;
      const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
      last = now;
      /* Frame-rate independent damping */
      const k = 1 - Math.pow(1 - 0.08, dt * 60);
      P.x += (P.tx - P.x) * k;
      P.y += (P.ty - P.y) * k;
      draw((now - t0) / 1000);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onPointerMove);
      removeEventListener("resize", onResize);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={cvRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
