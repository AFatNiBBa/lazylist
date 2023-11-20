
import linq from "..";
import { GroupByList, Grouping } from "../lib/group";
import { check } from "../util/testing";

const source = linq.range(4, 1).select(x => ({ x }));

test("groupBy", () => {
    const unwrap = <T, K>(x: GroupByList<{ x: T }, K>) => x.select(y => y.pipe(z => z.select(w => w.x).value));
    
    check(unwrap(source.groupBy(x => x.x % 3)), [
        new Grouping(1, [ 1, 4 ]),
        new Grouping(2, [ 2 ]),
        new Grouping(0, [ 3 ])
    ]);

    check(unwrap(source.groupBy(x => x.x, x => x % 3)), [
        new Grouping(1, [ 1, 4 ]),
        new Grouping(2, [ 2 ]),
        new Grouping(3, [ 3 ])
    ]);
});

test("lookup", () => {
    const temp = source.lookup(x => x.x + 2, x => x % 3).get(1)!;
    const group = new Grouping(4, [ { x: 2 } ]);
    expect(JSON.stringify(temp)).toBe(JSON.stringify(group));
});