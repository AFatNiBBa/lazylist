
import { BufferIterator, BufferList } from "../lib/buffer";
import { check } from "../util/testing";

const source = [ 1, 2, 3, 4 ];

test("buffer", () => {
    const from = BufferList.from(source);
    check(from, source);

    const req: number[] = [];
    const buffer = new BufferList(i => (req.push(i), source.slice(i, i + 3)));
    check(buffer, source);
    check(req, [ 0 /* [ 1, 2, 3 ] */, 3 /* [ 4 ] */, 4 /* [] */ ]);
});

test("iterator", () => {
    const iter = new BufferIterator(i => source.slice(i, i + 2));
    check(iter, source);
    expect(iter.currentIndex).toBe(4);
    check(iter, []);
    iter.currentIndex = 0;
    check(iter, [ 2, 3, 4 ]);

    const clone = iter.clone();
    clone.currentIndex = 1;
    check(clone.buffer as Array<number>, [ 2, 3 ]);
    check(iter.buffer as Array<number>, []);
    check(clone.move(-1).move(-1), source);

    const query = iter.move(-1, true).but((_, i) => i === 1 && iter.next());
    check(query, [ 1, 2, 4 ]);

    expect(clone.move(0, true).next()).toBe(2);
    expect(iter.reach(clone)).toBe(2);
    expect(iter.next()).toBe(3);

    expect(iter.peek(-2)).toBe(1);
});