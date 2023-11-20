
import linq from "..";
import { check, checkLength, checkLengthFastCount } from "../util/testing";
import { NOT_FOUND, TRUE } from "../util/util";

const source = linq([ 1, 2, 3 ]);
const wrapped = source.select(x => ({ x }));

test("await", async () => {
    const temp = await source
        .select(x => new Promise<number>(t => setTimeout(() => t(x), x)))
        .await();
    checkLengthFastCount(temp);
});

test("calc", () => {
    const temp = source.where(TRUE);
    expect(temp.fastCount).toBe(NOT_FOUND);
    expect(temp.calc().fastCount).toBe(3);
});

test("pipe", () => check(linq([ 8, 9, 10 ]).pipe(x => x.value.sort()), [ 10, 8, 9 ]));

test("fill", () => {
    const obj = {};
    check(source.fill(obj).where(x => x !== obj), []);
});

test("assign", () => {
    check(wrapped.assign({ y: 4 }), [
        { x: 1, y: 4 },
        { x: 2, y: 4 },
        { x: 3, y: 4 }
    ]);
});

test("but", () => {
    var sum = 0;
    const temp = source.but(x => sum += x)[Symbol.iterator]();
    expect(sum).toBe(0);
    temp.next();
    expect(sum).toBe(1);
    temp.next();
    expect(sum).toBe(3);
    expect(temp.next().done).toBe(false);
    expect(sum).toBe(6);
    expect(temp.next().done).toBe(true);
    expect(sum).toBe(6);
});

test("forEach", () => {
    function *two() {
        yield 1;
        yield 2;
        return 3;
    }

    expect(linq(two).forEach()).toBe(3);
});

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

test("at", () => {
    expect(source.at(0)).toBe(1);
    expect(source.at(1)).toBe(2);
    expect(source.at(-1)).toBe(3);

    var finished = false;
    const list = source.but((_, i) => i == 2 && (finished = true));
    expect(list.at(-2)).toBe(2);
    expect(finished).toBe(false);
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

test("sum", () => expect(source.sum).toBe(6));

test("avg", () => expect(source.avg).toBe(2));

test("count", () => {
    const temp = source.where(TRUE);
    expect(temp.fastCount).toBe(NOT_FOUND);
    expect(temp.count).toBe(3);
});