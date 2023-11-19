

import linq from "..";
import { check, checkLengthFastCount } from "../util";

const source = linq([ 1, 2, 3 ]);

test("fixed", () => checkLengthFastCount(source));

test("wrap", () => {
    const list = source.wrap();
    const { value } = list;
    expect(value[0]).toBe(source);
    expect(value).toHaveLength(1);
    expect(list.fastCount).toBe(1);
    expect(list.reverse()).toBe(list);
});

test("default", () => {
    checkLengthFastCount(source.default(12));
    checkLengthFastCount(linq([ 1,2 ]).removeAt(0).removeAt(0).default(12).select(x => x - 11), 1);
});

test("repeat", () => {
    checkLengthFastCount(source.repeat(2).select((x, i) => i >= 3 ? x + 3 : x), 6);
});

test("reverse - init", () => {
    var first = 0;
    const list = source
        .init(() => first++)
        .reverse();
    check(list, [ 3, 2, 1 ]);
    expect(first).toBe(1);
});

test("shuffle", () => {
    const source = linq
        .range(9, 1)
        .shuffle()
        .order();
    checkLengthFastCount(source, 9);
});

test("merge", () => {
    const other = linq([ 4, 5, 6 ]);
    const merged = source.merge(other);
    checkLengthFastCount(merged, 6);
    check(source.merge(other, true), [ 4, 5, 6, 1, 2, 3 ]);
});