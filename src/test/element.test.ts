
import linq from "..";
import { check, checkLength } from "../util";

test("insert", () => {
    const source = linq([ 1, 2, 3 ]);
    check(source.insert(0, 12), [ 12, 1, 2, 3 ]);
    check(source.insert(-1, 12), [ 1, 2, 12, 3 ]);
    check(source.insert(null, 12), [ 1, 2, 3, 12 ]);

    check(source.insert(1, 12), [ 1, 12, 2, 3 ]);
    check(source.insert(-2, 12), [ 1, 12, 2, 3 ]);

    checkLength(linq([ 2, 3 ]).prepend(1));
    checkLength(linq([ 1, 2 ]).append(3));
});