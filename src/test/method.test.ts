
import linq from "..";
import { check, checkLength } from "../util";

test("toMap", () => {
    const source = linq([ 1, 2, 3 ]);
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