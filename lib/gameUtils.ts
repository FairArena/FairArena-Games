// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
}

export function createParticles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count = 12,
  speed = 3,
  lifetime = 600
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const magnitude = speed * (0.5 + Math.random() * 0.5);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude,
      life: lifetime,
      maxLife: lifetime,
      color,
      size: 2 + Math.random() * 2,
      gravity: 0.08,
    });
  }
}

export function createBurstParticles(
  particles: Particle[],
  x: number,
  y: number,
  colors: string[],
  count = 20
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 800 + Math.random() * 400,
      maxLife: 1200,
      color,
      size: 1 + Math.random() * 3,
      gravity: 0.05 + Math.random() * 0.05,
    });
  }
}

export function updateParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  deltaTime: number
): void {
  const dt = deltaTime / 16.67; // normalize to 60fps

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= deltaTime;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    p.vx *= 0.98;

    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN SHAKE
// ─────────────────────────────────────────────────────────────────────────────

export interface ShakeState {
  intensity: number;
  duration: number;
  elapsed: number;
  active: boolean;
}

export function createShake(intensity: number, duration: number): ShakeState {
  return { intensity, duration, elapsed: 0, active: true };
}

export function applyShake(
  ctx: CanvasRenderingContext2D,
  shake: ShakeState,
  deltaTime: number
): ShakeState {
  if (!shake.active) return shake;

  shake.elapsed += deltaTime;
  if (shake.elapsed >= shake.duration) {
    return { ...shake, active: false };
  }

  const progress = shake.elapsed / shake.duration;
  const currentIntensity = shake.intensity * (1 - progress);
  const dx = (Math.random() - 0.5) * currentIntensity * 2;
  const dy = (Math.random() - 0.5) * currentIntensity * 2;

  ctx.translate(dx, dy);
  return shake;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLISION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export function rectIntersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function circleIntersects(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < a.radius + b.radius;
}

export function circleRectIntersects(circle: Circle, rect: Rect): boolean {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

// ─────────────────────────────────────────────────────────────────────────────
// EASING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeIn(t: number): number {
  return t * t * t;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB AUDIO — GENERATED TONES (NO AUDIO FILES)
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function generateTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "square",
  volume = 0.1,
  endFrequency?: number
): void {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (endFrequency !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(
        endFrequency,
        ctx.currentTime + durationMs / 1000
      );
    }

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + durationMs / 1000
    );

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // silently fail if audio not available
  }
}

export function playScoreSound(): void {
  generateTone(220, 80, "square", 0.08, 440);
}

export function playDeathSound(): void {
  generateTone(440, 300, "sawtooth", 0.12, 110);
}

export function playComboSound(comboLevel: number): void {
  const baseFreqs = [261, 329, 392, 523, 659];
  const freq = baseFreqs[Math.min(comboLevel - 1, baseFreqs.length - 1)];
  generateTone(freq, 150, "sine", 0.1);
  setTimeout(() => generateTone(freq * 1.25, 100, "sine", 0.08), 80);
}

export function playPowerUpSound(): void {
  [440, 550, 660, 880].forEach((freq, i) => {
    setTimeout(() => generateTone(freq, 100, "sine", 0.09), i * 70);
  });
}

export function playHitSound(): void {
  generateTone(330, 60, "square", 0.07);
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function fillBackground(
  ctx: CanvasRenderingContext2D,
  color = "#0c0c0e"
): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    color?: string;
    font?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  } = {}
): void {
  const {
    color = "#e8e8ec",
    font = "16px Inter, sans-serif",
    align = "left",
    baseline = "alphabetic",
  } = options;

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE ANIMATION (counting up effect)
// ─────────────────────────────────────────────────────────────────────────────

export function animateScoreCount(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void,
  onDone?: () => void
): void {
  const start = performance.now();
  function tick(now: number) {
    const t = Math.min((now - start) / durationMs, 1);
    const value = Math.round(lerp(from, to, easeOut(t)));
    onUpdate(value);
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      onDone?.();
    }
  }
  requestAnimationFrame(tick);
}

// ─────────────────────────────────────────────────────────────────────────────
// RANDOM UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0x100000000);
  };
}
