
import linq from "..";
import { check, checkLengthFastCount } from "../util/testing";
import { NOT_FOUND } from "../util/util";

const source = linq([ 1, 2, 3 ]);

test("insert", () => {
    check(source.insert(0, 12), [ 12, 1, 2, 3 ]);
    check(source.insert(-1, 12), [ 1, 2, 12, 3 ]);
    check(source.insert(3, 12), [ 1, 2, 3, 12 ]);
    check(source.insert(null, 12), [ 1, 2, 3, 12 ]);

    check(source.insert(1, 12), [ 1, 12, 2, 3 ]);
    check(source.insert(-2, 12), [ 1, 12, 2, 3 ]);

    checkLengthFastCount(linq([ 2, 3 ]).prepend(1));
    checkLengthFastCount(linq([ 1, 2 ]).append(3));
    
    expect(source.insert(4, 2).fastCount).toBe(NOT_FOUND);
});

test("removeAt", () => {
    check(source.removeAt(0), [ 2, 3 ]);
    check(source.removeAt(-1), [ 1, 2 ]);

    check(source.removeAt(1), [ 1, 3 ]);
    check(source.removeAt(-2), [ 1, 3 ]);

    expect(source.removeAt(3).fastCount).toBe(NOT_FOUND);
    expect(source.removeAt(2).fastCount).toBe(2);
});