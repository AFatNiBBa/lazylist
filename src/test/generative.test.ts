
import linq from "..";
import { EmptyList, RangeList } from "../lib/generative";
import { check, checkLengthFastCount } from "../util/test";

test("empty", () => {
    const list = linq<number>();
    expect(list).toBeInstanceOf(EmptyList);
    checkLengthFastCount(list, 0);
});

test("rand", () => {
    const bottom = 1, top = 4;
    for (const elm of linq.rand(top, bottom).take(10))
        expect(bottom <= elm && elm <= top).toBe(true);
    for (const elm of linq.rand().take(10))
        expect(0 <= elm && elm <= 1).toBe(true);
    expect(linq.rand().fastCount).toBe(Infinity);
});

test("range", () => {
    checkLengthFastCount(linq.range(3, 1));

    const source = linq.range(5, 2, -3);
    const data = [ 2, -1, -4, -7, -10 ];
    check(source, data);

    const reversed = source.reverse();
    check(reversed, data.reverse());
    expect(reversed).toBeInstanceOf(RangeList);
});