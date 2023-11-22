
import linq from "..";
import { checkLengthFastCount } from "../util/testing";

test("array", () => {
    const source = [ 2, 1, 2, 3 ];
    linq.array(source);
    checkLengthFastCount(source.skip(1));
    source.shift();
    checkLengthFastCount(source);
    expect(() => source.map(x => 0)).toThrow(TypeError);
});