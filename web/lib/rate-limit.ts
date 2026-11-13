export function retryAfterSeconds(value: string | null, now = Date.now()): number {
  if (value && /^\d+$/.test(value.trim())) {
    const seconds = Number(value);
    return Number.isFinite(seconds) ? Math.max(1, Math.min(seconds, 2_147_483_647)) : 60;
  }
  const date = value ? Date.parse(value) : NaN;
  return Number.isFinite(date) ? Math.max(1, Math.ceil((date - now) / 1000)) : 60;
}
export class OriginRateLimitError extends Error {
  readonly retryAfter: number;
  constructor(seconds: number) {
    super(`El sitio de origen está limitando las solicitudes (HTTP 429). Espera al menos ${seconds} segundos antes de reintentar. Si persiste, puede estar restringiendo el acceso desde nuestro servidor.`);
    this.name = 'OriginRateLimitError';
    this.retryAfter = seconds;
  }
}
export class OriginBackoff {
  private deadlines = new Map<string, number>();
  private clock: () => number;
  constructor(clock = Date.now) { this.clock = clock; }
  check(origin: string): void {
    const deadline = this.deadlines.get(origin);
    if (deadline === undefined) return;
    const seconds = Math.ceil((deadline - this.clock()) / 1000);
    if (seconds > 0) throw new OriginRateLimitError(seconds);
    this.deadlines.delete(origin);
  }
  record(origin: string, header: string | null): OriginRateLimitError {
    const seconds = retryAfterSeconds(header, this.clock());
    for (const [key, until] of this.deadlines) if (until <= this.clock()) this.deadlines.delete(key);
    if (this.deadlines.size >= 256) this.deadlines.delete(this.deadlines.keys().next().value!);
    this.deadlines.set(origin, this.clock() + seconds * 1000);
    return new OriginRateLimitError(seconds);
  }
}
