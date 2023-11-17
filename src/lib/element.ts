
import { FixedList } from "./simple";
import { NOT_FOUND } from "../util";
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

        const [ list, l ] = this.i < 0 ? this.$calcLength() : [ this.source, 0 ];
        const i = l + this.i;
        if (i < 0) throw new RangeError("It's not possible to insert an element before the beginning of the original sequence");

        const iter = list[Symbol.iterator]();
        const taken = yield* TakeList.take(iter, i);
        if (taken !== i) throw new RangeError("It's not possible to insert an element more than 1 place after the end of the original sequence");

        yield this.v;
        return yield* toGenerator(iter);
    }

    get fastCount() {
        const temp = super.fastCount;
        return ~temp
            ? this.i == null || !(this.i < 0 ? temp + this.i < 0 : this.i > temp)
                ? temp + 1
                : NOT_FOUND // Casi d'errore
            : NOT_FOUND;
    }
}