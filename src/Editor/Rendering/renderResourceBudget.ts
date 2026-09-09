/** Shared retained blur images and preview upscaling surfaces. */
export class RenderResourceBudget {
  private sizes = new Map<object, number>();
  private total = 0;
  constructor(readonly limit: number) {}
  reserve(owner: object, bytes: number) {
    const next = this.total - (this.sizes.get(owner) ?? 0) + bytes;
    if (!Number.isFinite(bytes) || bytes < 0 || next > this.limit) return false;
    this.sizes.set(owner, bytes);
    this.total = next;
    return true;
  }
  release(owner: object) {
    this.total -= this.sizes.get(owner) ?? 0;
    this.sizes.delete(owner);
  }
  get used() { return this.total; }
}
export const renderResourceBudget = new RenderResourceBudget(256 * 1024 * 1024);
