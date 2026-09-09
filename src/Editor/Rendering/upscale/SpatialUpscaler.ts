import easu from "./easu.glsl?raw";
import rcas from "./rcas.glsl?raw";
import { renderResourceBudget } from "../renderResourceBudget";

const vertex = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** One GPU context for all preview layers. No second animation loop or frame history. */
export class SpatialUpscaler {
  private canvas = document.createElement("canvas");
  private gl: WebGL2RenderingContext;
  private programs: WebGLProgram[] = [];
  private textures: WebGLTexture[] = [];
  private framebuffer: WebGLFramebuffer | null = null;
  private inputSize = "";
  private outputSize = "";
  private maxSize: number;
  constructor() {
    const gl = this.canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) throw new Error("WebGL 2 is unavailable");
    this.gl = gl;
    this.maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    try {
      this.programs.push(this.program(vertex, easu));
      this.programs.push(this.program(vertex, rcas));
      for (let i = 0; i < 2; i++) {
        const texture = gl.createTexture();
        if (!texture) throw new Error("Unable to allocate upscale texture");
        this.textures.push(texture);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      this.framebuffer = gl.createFramebuffer();
      if (!this.framebuffer) throw new Error("Unable to allocate upscale framebuffer");
    } catch (error) { this.dispose(); throw error; }
  }
  private program(vertexSource: string, fragmentSource: string) {
    const gl = this.gl;
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    if (!program) throw new Error("Unable to create upscale program");
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("Unable to create upscale shader");
        shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Upscale shader failed");
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Upscale link failed");
      return program;
    } catch (error) { gl.deleteProgram(program); throw error; }
    finally { shaders.forEach(shader => gl.deleteShader(shader)); }
  }
  draw(source: HTMLCanvasElement, destination: HTMLCanvasElement) {
    const gl = this.gl;
    const width = destination.width, height = destination.height;
    if (gl.isContextLost()) throw new Error("Upscale context lost");
    if (Math.max(width, height, source.width, source.height) > this.maxSize) throw new Error("Preview exceeds GPU texture size");
    // Input texture, EASU target, and browser drawing buffer. Per-layer outputs
    // are separately reserved by their adapter against this same ceiling.
    if (!renderResourceBudget.reserve(this, source.width * source.height * 4 + width * height * 8)) throw new Error("Preview resource budget reached");
    const nextOutput = `${width}:${height}`;
    const resized = this.outputSize !== nextOutput;
    if (this.outputSize !== nextOutput) {
      this.canvas.width = width; this.canvas.height = height;
      gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.outputSize = nextOutput;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const nextInput = `${source.width}:${source.height}`;
    if (this.inputSize !== nextInput) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      this.inputSize = nextInput;
    } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[1], 0);
    if (resized && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Upscale framebuffer incomplete");
    this.pass(this.programs[0], width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
    this.pass(this.programs[1], width, height);
    const context = destination.getContext("2d");
    if (!context) throw new Error("Preview output unavailable");
    context.clearRect(0, 0, width, height);
    context.drawImage(this.canvas, 0, 0);
  }
  private pass(program: WebGLProgram, width: number, height: number) {
    const gl = this.gl;
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "iChannel0"), 0);
    gl.uniform2f(gl.getUniformLocation(program, "iResolution"), width, height);
    // RCAS uses attenuation stops: lower values mean stronger sharpening.
    gl.uniform1f(gl.getUniformLocation(program, "sharpness"), 0.25);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  dispose() {
    this.programs.forEach(program => this.gl.deleteProgram(program));
    this.textures.forEach(texture => this.gl.deleteTexture(texture));
    this.gl.deleteFramebuffer(this.framebuffer);
    this.canvas.width = this.canvas.height = 0;
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    renderResourceBudget.release(this);
  }
}

let shared: SpatialUpscaler | undefined;
let users = 0;
export function acquireUpscaler() {
  shared ??= new SpatialUpscaler();
  users++;
  let released = false;
  return { renderer: shared, release() {
    if (released) return;
    released = true;
    if (--users === 0) { shared?.dispose(); shared = undefined; }
  } };
}
