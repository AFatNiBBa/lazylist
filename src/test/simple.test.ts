

import linq from "..";
import { check, checkLength, checkLengthFastCount } from "../util";

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

test("reverse - init", () => {
    var first = 0;
    const list = source
        .init(() => first++)
        .reverse();
    check(list, [ 3, 2, 1 ]);
    expect(first).toBe(1);
});

test("merge", () => {
    const other = linq([ 4, 5, 6 ]);
    const merged = source.merge(other);
    checkLengthFastCount(merged, 6);
    check(source.merge(other, true), [ 4, 5, 6, 1, 2, 3 ]);
});