
import linq from "..";
import { checkLengthFastCount } from "../util/test";

const source = linq([ 7, 4, 3, 2, 5, 6, 1 ]);
const wrapped = source.select(x => ({ x }));

test("order", () => {
    checkLengthFastCount(source.order(), 7);
    checkLengthFastCount(source.order(true).reverse(), 7);
    checkLengthFastCount(source.order(true, (a, b) => b - a), 7);
    checkLengthFastCount(source.order(true, (a, b) => b - a), 7);
    checkLengthFastCount(wrapped.order(false, (a, b) => a.x - b.x).select(x => x.x), 7);
});

test("orderBy", () => {
    checkLengthFastCount(wrapped.orderBy(x => x.x, ).select(x => x.x), 7);
    checkLengthFastCount(wrapped.orderBy(x => x.x, true).reverse().select(x => x.x), 7);
    checkLengthFastCount(wrapped.orderBy(x => x.x, true, (a, b) => b - a).select(x => x.x), 7);
    checkLengthFastCount(wrapped.orderBy(x => x.x, true, (a, b) => b - a).select(x => x.x), 7);
});