
import ErrorMsg from "../util/errorMsg";
import { NOT_FOUND, calcIndex } from "../util/util";
import { FixedList } from "./simple";
import { TakeList } from "./take";
import { toGenerator } from "..";

/** Output of {@link insert}, {@link prepend} and {@link append} */
export class InsertList<T> extends FixedList<T, T> {
    constructor (source: Iterable<T>, public v: T, public i: number | null = null) { super(source); }

    *[Symbol.iterator]() {
        if (this.i == null)
        {
            const out = yield* this.source;
            yield this.v;
            return out;
        }

        const [ list, i ] = calcIndex(this.source, this.i);
        if (i < 0) throw ErrorMsg.beforeBegin();

        using iter = list[Symbol.iterator]();
        const taken = yield* TakeList.take(iter, i);
        if (taken !== i) throw new RangeError("It's not possible to insert an element more than 1 place after the end of the original sequence");

        yield this.v;
        return yield* toGenerator(iter);
    }

    get fastCount() {
        const temp = super.fastCount;
        return this.i == null || !(this.i < 0 ? temp + this.i < 0 : this.i > temp)
            ? temp + 1
            : NOT_FOUND; // Casi d'errore
    }
}

/** Output of {@link removeAt} */
export class RemoveAtList<T> extends FixedList<T, T> {
    constructor (source: Iterable<T>, public i: number) { super(source); }

    *[Symbol.iterator]() {
        const [ list, i ] = calcIndex(this.source, this.i);
        if (i < 0) throw ErrorMsg.beforeBegin();

        using iter = list[Symbol.iterator]();
        const taken = yield* TakeList.take(iter, i);
        if (taken !== i || iter.next().done) throw new RangeError("The provided index points after the end of the sequence");

        return yield* toGenerator(iter);
    }

    get fastCount() {
        const temp = super.fastCount;
        return (this.i < 0 ? temp + this.i < 0 : this.i >= temp)
            ? NOT_FOUND // Casi d'errore
            : temp - 1;
    }
}