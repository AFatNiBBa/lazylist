
import linq from "..";
import { checkLength, checkLengthFastCount } from "../util";

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