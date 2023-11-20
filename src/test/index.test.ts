
import linq, { fastCount, toGenerator } from "..";
import { AbstractList } from "../lib/abstract";
import { checkLength } from "../util/testing";
import { NOT_FOUND } from "../util/util";

test("linq", () => {
    function *iter() {
        yield 1;
        yield 2;
        yield 3;
    }

    checkLength(linq([ 1, 2, 3 ]));

    const multiple = linq(iter);
    checkLength(multiple);
    checkLength(multiple);

    const single = linq(iter());
    checkLength(single);
    checkLength(single, 0);

    expect(linq(single)).toBe(single);
});

test("fastCount", () => {
    expect(fastCount(undefined)).toBe(0);
    expect(fastCount("2")).toBe(1);
    expect(fastCount(Object("14"))).toBe(2);
    expect(fastCount([ 1, 2, 3 ])).toBe(3);
    expect(fastCount(new Uint8Array([ 4, 8, 15, 16 ]))).toBe(4);
    expect(fastCount(new Set([ "ciao" ]))).toBe(1);
    expect(fastCount(new Map([ [ "a", "b" ], [ "c", "d" ] ]))).toBe(2);
    expect(fastCount(AbstractList.prototype)).toBe(NOT_FOUND);
});

test("toGenerator", () => {
    var i = 0;
    checkLength(toGenerator<number>({
        next: () => i < 3
            ? { value: i++ + 1, done: false }
            : { value: undefined, done: true }
    }));
});