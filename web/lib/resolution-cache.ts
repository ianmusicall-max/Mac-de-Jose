/** Short-lived, isolate-local cache of public metadata, never file bodies. */
export class ResolutionCache<T> {
  private entries = new Map<string, { expires: number; result: Promise<T> }>();
  private clock: () => number;
  constructor(clock = Date.now) { this.clock = clock; }
  invalidate(key:string):void{this.entries.delete(key);}
  get(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing && existing.expires > this.clock()) return existing.result;
    for (const [url, entry] of this.entries) if (entry.expires <= this.clock()) this.entries.delete(url);
    if (this.entries.size >= 100) this.entries.delete(this.entries.keys().next().value!);
    const result = Promise.resolve().then(load);
    const entry = { expires: this.clock() + 120_000, result };
    this.entries.set(key, entry);
    void result.catch(() => { if (this.entries.get(key) === entry) this.entries.delete(key); });
    return result;
  }
}
