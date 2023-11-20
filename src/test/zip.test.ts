
import linq, { Combine, JoinMode } from "..";
import { check } from "../util/testing";

test("zip", () => {
    const source = linq([ 1, 2, 3 ]);
    const small = [ 4, 5 ];
    const big = [ 6, 7, 8, 9 ];
    const f: Combine<number, number, number> = (a, b) => a + b;

    check(source.zip(small), [ [ 1, 4 ], [ 2, 5 ] ]);
    
    check(source.zip(small, f), [ 5, 7 ]);
    check(source.zip(big, f, JoinMode.inner), [ 7, 9, 11 ]);
    check(source.zip(small, f, JoinMode.left), [ 5, 7, NaN ]);
    check(source.zip(big, f, JoinMode.left), [ 7, 9, 11 ]);
    check(source.zip(small, f, JoinMode.right), [ 5, 7 ]);
    check(source.zip(big, f, JoinMode.right), [ 7, 9, 11, NaN ]);
    check(source.zip(small, f, JoinMode.outer), [ 5, 7, NaN ]);
    check(source.zip(big, f, JoinMode.left | JoinMode.right), [ 7, 9, 11, NaN ]);

    expect(source.zip(small, f).fastCount).toBe(small.length);
    expect(source.zip(big, f, JoinMode.inner).fastCount).toBe(source.fastCount);
    expect(source.zip(small, f, JoinMode.left).fastCount).toBe(source.fastCount);
    expect(source.zip(big, f, JoinMode.left).fastCount).toBe(source.fastCount);
    expect(source.zip(small, f, JoinMode.right).fastCount).toBe(small.length);
    expect(source.zip(big, f, JoinMode.right).fastCount).toBe(big.length);
    expect(source.zip(small, f, JoinMode.outer).fastCount).toBe(source.fastCount);
    expect(source.zip(big, f, JoinMode.left | JoinMode.right).fastCount).toBe(big.length);
});