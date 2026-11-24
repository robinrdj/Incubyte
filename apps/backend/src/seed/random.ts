/**
 * Seeded pseudo-random generator (mulberry32). The same seed always produces the same sequence,
 * which is what makes the seed dataset reproducible across machines and runs.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** A number in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** An integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** A uniformly chosen element. Throws on an empty list, which is always a programming error here. */
  pick<T>(items: readonly T[]): T {
    const item = items[this.int(0, items.length - 1)];
    if (item === undefined) {
      throw new Error("cannot pick from an empty list");
    }
    return item;
  }

  /** An element chosen with probability proportional to its weight. */
  weighted<T>(items: readonly { value: T; weight: number }[]): T {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let threshold = this.next() * total;
    for (const item of items) {
      threshold -= item.weight;
      if (threshold < 0) {
        return item.value;
      }
    }
    const last = items[items.length - 1];
    if (last === undefined) {
      throw new Error("cannot choose from an empty list");
    }
    return last.value;
  }

  /** A version-4 UUID built from the generator, so identifiers are reproducible too. */
  uuid(): string {
    const bytes = Array.from({ length: 16 }, () => this.int(0, 255));
    const b6 = bytes[6] ?? 0;
    const b8 = bytes[8] ?? 0;
    bytes[6] = (b6 & 0x0f) | 0x40;
    bytes[8] = (b8 & 0x3f) | 0x80;
    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
