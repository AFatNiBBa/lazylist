
import linq from "..";
import { check, checkLength, checkLengthFastCount } from "../util";

test("take", () => {
    checkLengthFastCount(linq([ 1, 2, 3, 0, 1, 4, 5 ]).take(3));
    checkLengthFastCount(linq([ 0, 1, 4, 5, 1, 2, 3 ]).take(-3));
    checkLengthFastCount(linq([ 1, 2, 3, 0, 1, 4, 5 ]).take(-4, undefined, undefined, true));
    checkLength(linq([ 1, 2, 3, 0, 8, 4, 5 ]).take(x => !!x));
    checkLengthFastCount(linq([ 1, 2 ]).take(3, true, 3));
    checkLengthFastCount(linq([ 1, 2 ]).take(-3, true, 3));
});

test("skip", () => {
    checkLengthFastCount(linq([ 0, 1, 4, 5, 1, 2, 3 ]).skip(4));
    checkLengthFastCount(linq([ 1, 2, 3, 0, 1, 4, 5 ]).skip(-4));
    checkLengthFastCount(linq([ 0, 1, 4, 5, 1, 2, 3 ]).skip(-3, true));
    checkLength(linq([ 0, 8, 4, 5, 1, 2, 3 ]).skip(x => x !== 1));
});

test("slice", () => {
    const source = linq.range(7, 1);
    expect(source.slice(1, -1).fastCount).toBe(5);
    
    check(source.slice(x => x !== 4, 2), [ 4, 5 ]);
    check(source.slice(x => x !== 4, x => x !== 7), [ 4, 5, 6 ]);

    check(source.slice(2, 3), [ 3, 4, 5 ]);
    check(source.slice(-4, 3), [ 4, 5, 6 ]);
    check(source.slice(-4, -3), [ 4 ]);
    check(source.slice(4, -2), [ 5 ]);
    check(source.slice(-4, -2, undefined, undefined, true), [ 2, 3 ]);
    check(source.slice(4, -2, undefined, undefined, true), [ 3, 4 ]);

    check(source.slice(5, 3, true), [ 6, 7, undefined ]); 
    check(source.slice(5, 3, true, 12), [ 6, 7, 12 ]); 
});