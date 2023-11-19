
import linq from "..";
import { NOT_FOUND, TRUE } from "../util";

test("cache", () => {
    const source = linq([ 1, 2, 3 ]);
    const once = source.once();
    const onceCache = once.cache();
    onceCache.forEach();
    onceCache.forEach();
    expect(() => once.forEach()).toThrow(RangeError);

    const wrapped = source.select(x => ({ x }));
    expect(wrapped.first === wrapped.first).toBe(false);
    const wrappedCache = wrapped.cache();
    expect(wrappedCache.first === wrappedCache.first).toBe(true);

    const multi = source.cache();
    const a = multi[Symbol.iterator]();
    const b = multi[Symbol.iterator]();
    expect(a.next().value).toBe(1);
    expect(b.next().value).toBe(1);
    expect(b.next().value).toBe(2); // Swapped
    expect(a.next().value).toBe(2); // Swapped
    expect(a.next().value).toBe(3);
    expect(b.next().value).toBe(3);
    expect(a.next().value).toBe(undefined);
    expect(b.next().value).toBe(undefined);

    const where = source.skip(2).where().cache();
    const c = where[Symbol.iterator]();
    c.next();
    expect(where.fastCount).toBe(NOT_FOUND);
    c.next();
    expect(where.fastCount).toBe(1);
});