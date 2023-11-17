
import linq from "..";
import { check, checkLength } from "../util";

test("where", () => {
    const source = linq([ 1, 2, 4, 5, 3 ]);
    checkLength(source.where(x => x <= 3));
    checkLength(source.where((x, i) => x !== 4 && i !== 3));
    check(linq([ true, false, true ]).where(), [ true, true ]);
});

test("case", () => {
    const pari: number[] = [], lettere: string[] = [];
    const source = linq([ 1, "a", 3, 67, 3, 68 ]);
    const dispari = source
        .case(x => isNaN(+x), x => lettere.push(<string>x))
        .case(x => <number>x % 2 === 0, x => pari.push(<number>x));
    check(pari, []);
    check(lettere, []);
    check(dispari, [ 1, 3, 67, 3 ]);
    check(pari, [ 68 ]);
    check(lettere, [ "a" ]);
});

test("distinct", () => {
    const source = linq([ 1, 2, 1, 2, 3 ]);
    checkLength(source.distinct());
    const wrapped = source.select(x => ({ x }));
    checkLength(wrapped.distinct(x => x.x).select(x => x.x));
});

test("except", () => {
    const list = [ 4, 5, 5, 6 ];
    const source = linq([ 1, 4, 6, 2, 3, 5 ]);
    checkLength(source.except(list));
    const wrapped = source.select(x => ({ x }));
    checkLength(wrapped.except(list, x => x.x).select(x => x.x));
});