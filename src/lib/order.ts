
import { COMPARE, NOT_FOUND } from "../util";
import { FixedList } from "./simple";
import { Compare } from "..";

/** Array slice but works with strings too */
const slice: <T>(x: readonly T[]) => T[] = Function.prototype.call.bind(Array.prototype.slice);

/** Output of {@link order} and {@link orderBy} */
export class OrderList<T> extends FixedList<T, T> {
    constructor(source: Iterable<T>, public desc = false, public comp: Compare<T, OrderList<T>> = COMPARE) { super(source); }

    *[Symbol.iterator]() {
        const { comp } = this, mul = this.desc ? -1 : 1;
        return yield* slice(this.$sourceAsArray()).sort((a: T, b: T) => mul * comp(a, b, NOT_FOUND, this));
    }

    /**
     * -
     * Gets merged with the current {@link OrderList}
     * @inheritdoc
     */
    order(desc?: boolean, comp: Compare<T, OrderList<T>> = COMPARE): OrderList<T> {
        return new OrderList(this.source, desc, (a, b, i, list) => comp(a, b, i, list) || this.comp(a, b, i, list));
    }
}