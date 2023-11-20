
import linq from "..";
import { check, checkLength } from "../util/testing";

test("flat", () => {
    const source = linq([ [ 1, 2, [], [ [ 3 ], [ 4, [ 5, 6 ], 7 ] ], 8, 9 ], 10 ]);
    checkLength(source.flat(), 10);
});

test("traverse", () => {
    type node = { v: number, e: node[] };
    const source = linq<node>([
        {
            v: 1,
            e: [
                { v: 4, e: [] },
                { v: 5, e: [] },
            ]
        },
        { v: 2, e: [] },
        {
            v: 6,
            e: [
                {
                    v: 7,
                    e: [
                        { v: 8, e: [] },
                    ]
                },
            ]
        },
    ]);

    check(source.traverse(x => x.e).select(x => x.v), [ 1, 4, 5, 2, 6, 7, 8 ]);
    check(source.traverse(x => x.e, x => x.v !== 7, true).select(x => x.v), [ 4, 5, 1, 2, 6 ]);
});