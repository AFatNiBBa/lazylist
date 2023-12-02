
import linq from "..";
import { NOT_FOUND } from "../util/util";
import { check } from "../util/testing";

test("cache", () => {
    const source = linq([ 1, 2, 3 ]);
    const once = source.once();
    using onceCache = once.cache();
    expect(onceCache.cache()).toBe(onceCache);
    onceCache.forEach();
    onceCache.forEach();
    expect(() => once.forEach()).toThrow(RangeError);

    const wrapped = source.select(x => ({ x }));
    expect(wrapped.first === wrapped.first).toBe(false);
    using wrappedCache = wrapped.cache();
    expect(wrappedCache.first === wrappedCache.first).toBe(true);

    using multi = source.cache();
    using a = multi[Symbol.iterator]();
    using b = multi[Symbol.iterator]();
    expect(a.next().value).toBe(1);
    expect(b.next().value).toBe(1);
    expect(b.next().value).toBe(2); // Swapped
    expect(a.next().value).toBe(2); // Swapped
    expect(a.next().value).toBe(3);
    expect(b.next().value).toBe(3);
    expect(a.next().value).toBe(undefined);
    expect(b.next().value).toBe(undefined);

    using where = source.skip(2).where().cache();
    using c = where[Symbol.iterator]();
    c.next();
    expect(where.fastCount).toBe(NOT_FOUND);
    c.next();
    expect(where.fastCount).toBe(1);

    var n = 0;
    using at = source.but(() => n++).cache();
    at.forEach();
    expect(at.at(1)).toBe(2);
    expect(n).toBe(3);

    using rest = source.where().cache();
    rest.take(1).forEach();
    check(rest.rest(), [ 2, 3 ]);

    using iterCache = source.merge([ 4, 5 ]).cache();
    const iter = iterCache.iterator();
    expect(iter.next(2)).toBe(2);
    const { buffer } = iter;
    check(iterCache.cached, [ 1, 2 ]);
    expect(iterCache.cached).toBe(buffer);
    expect(iter.inBound(3)).toBe(true);
    check(iterCache.cached, [ 1, 2, 3, 4 ]);
    expect(iter.inBound(6)).toBe(false);
    check(iterCache.cached, [ 1, 2, 3, 4, 5 ]);
    expect(iterCache.cached).toBe(buffer);

    using count = source.where().cache();
    count.take(2).forEach();
    expect(count.count).toBe(3);
});