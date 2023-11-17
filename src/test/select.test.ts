
import linq from "..";
import { checkLength } from "../util";

test("select", () => {
    const source = linq([ 2, 3, 4 ]).select(x => x - 1);
    checkLength(source);
    expect(source.fastCount).toBe(3);
});

test("selectMany", () => {
    checkLength(linq([ 1 ]).selectMany(x => [ x, x + 1 ]), 2);
    checkLength(linq([ [ 1 ], [ 2, 3 ] ]).selectMany());
});

test("selectWhere", () => {
    const source = linq([ "1", "aaa", "2", "3" ]);
    const result = source.selectWhere<number>(x => !isNaN(x.result = +x.value));
    checkLength(result);
});