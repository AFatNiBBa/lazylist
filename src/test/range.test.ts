
import linq from "..";
import { checkLength } from "../util";

test("take", () => {
    checkLength(linq([ 1, 2, 3, 0, 1, 4, 5 ]).take(3));
    checkLength(linq([ 0, 1, 4, 5, 1, 2, 3 ]).take(-3));
    checkLength(linq([ 1, 2, 3, 0, 1, 4, 5 ]).take(-4, undefined, undefined, true));
    checkLength(linq([ 1, 2, 3, 0, 8, 4, 5 ]).take(x => !!x));
    checkLength(linq([ 1, 2 ]).take(3, true, 3));
    checkLength(linq([ 1, 2 ]).take(-3, true, 3));
});

test("skip", () => {
    checkLength(linq([ 0, 1, 4, 5, 1, 2, 3 ]).skip(4));
    checkLength(linq([ 1, 2, 3, 0, 1, 4, 5 ]).skip(-4));
    checkLength(linq([ 0, 1, 4, 5, 1, 2, 3 ]).skip(-3, true));
    checkLength(linq([ 0, 8, 4, 5, 1, 2, 3 ]).skip(x => x !== 1));
});