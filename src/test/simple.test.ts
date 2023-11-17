

import linq from "..";
import { check, checkLength } from "../util";

const source = linq([ 1, 2, 3 ]);

test("fixed", () => {
    checkLength(source);
    expect(source.fastCount).toBe(3);
});

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
    expect(source.fastCount).toBe(3);
    expect(first).toBe(1);
});

test("merge", () => {
    const other = linq([ 4, 5, 6 ]);
    checkLength(source.merge(other), 6);
    check(source.merge(other, true), [ 4, 5, 6, 1, 2, 3 ]);
});