
import linq from "..";
import { check, checkLength } from "../util";

const source = linq([ 1, 2, 3 ]);
const wrapped = source.select(x => ({ x }));

test("toMap", () => {
    const map = source.toMap(x => x * 2);
    check(map.keys(), [ 2, 4, 6 ]);
    checkLength(map.values());
    check(source.toMap(() => 1, x => x.toString()).values(), [ "3" ]);
    expect(() => source.toMap(() => 1, undefined, true)).toThrow(RangeError);
});

test("toSet", () => {
    const source = linq([ 1, 2, 2, 3 ]);
    checkLength(source.toSet());
    expect(() => source.toSet(true)).toThrow(RangeError);
});

test("aggregate", () => {
    var k = 0, min = Infinity, max = -Infinity;
    const out = source.aggregate((a, b, i) => {
        k++;
        min = Math.min(min, i);
        max = Math.max(max, i);
        if (i === 1) expect(a).toBe(1);
        return a * b;
    });
    
    expect(k).toBe(2);
    expect(min).toBe(1);
    expect(max).toBe(2);
    expect(out).toBe(6);
    expect(() => linq<number>().aggregate((a, b) => a * b)).toThrow(RangeError);
});

test("aggregate - out", () => {
    var k = 0, min = Infinity, max = -Infinity;
    const out = source.aggregate(4, (a, b, i) => {
        k++;
        min = Math.min(min, i);
        max = Math.max(max, i);
        if (!i) expect(a).toBe(4);
        return a * b;
    });
    
    expect(k).toBe(3);
    expect(min).toBe(0);
    expect(max).toBe(2);
    expect(out).toBe(24);
    expect(linq<number>().aggregate(1, (a, b) => a * b)).toBe(1);
});

test("max", () => {
    expect(source.max()).toBe(3);
    expect(wrapped.max((a, b) => a.x - b.x).x).toBe(3);
});

test("maxBy", () => {
    expect(wrapped.maxBy(x => x.x).x).toBe(3);
    expect(wrapped.maxBy(x => x.x, (a, b) => b - a).x).toBe(1);
});

test("min", () => {
    expect(source.min()).toBe(1);
    expect(wrapped.min((a, b) => a.x - b.x).x).toBe(1);
});

test("minBy", () => {
    expect(wrapped.minBy(x => x.x).x).toBe(1);
    expect(wrapped.minBy(x => x.x, (a, b) => b - a).x).toBe(3);
});