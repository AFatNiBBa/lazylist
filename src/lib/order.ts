
import { COMPARE, NOT_FOUND, isReadonlyArray } from "../util/util";
import { FixedList } from "./simple";
import { Comparer } from "..";

/** Array slice but works with strings too */
const slice: <T>(x: readonly T[]) => T[] = Function.prototype.call.bind(Array.prototype.slice);

/** Output of {@link order} and {@link orderBy} */
export class OrderList<T> extends FixedList<T, T> {
    constructor(source: Iterable<T>, public desc = false, public comp: Comparer<T, OrderList<T>> = COMPARE) { super(source); }

    *[Symbol.iterator]() {
        const { comp } = this, mul = this.desc ? -1 : 1;
        const list = isReadonlyArray(this.source) ? slice(this.source) : [ ...this.source ];
        return yield* list.sort((a: T, b: T) => mul * comp(a, b, NOT_FOUND, this));
    }

    /**
     * -
     * Gets merged with the current {@link OrderList} into one single sort operation
     * @inheritdoc
     */
    order(desc?: boolean, comp: Comparer<T, OrderList<T>> = COMPARE): OrderList<T> {
        return new OrderList(this.source, desc, (a, b, i, list) => comp(a, b, i, list) || this.comp(a, b, i, list));
    }
}