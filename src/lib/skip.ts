
import { Predicate, toGenerator } from "..";
import { AbstractList } from "./abstract";
import { FixedList } from "./simple";
import { NOT_FOUND, calcLength } from "../util/util";
import { TakeList } from "./take";

/** Output of {@link AbstractList.skip} */
export class SkipList<T> extends FixedList<T, T> {
    constructor (source: Iterable<T>, public p: Predicate<T, SkipList<T>> | number, public leftOnNegative = false) { super(source); }

    *[Symbol.iterator]() {
        if (typeof this.p === "number")
        {
            if (this.p >= 0) return yield* SkipList.skip(this.source[Symbol.iterator](), this.p);

            const [ iter, l ] = calcLength(this.source);
            return yield* (this.leftOnNegative ? SkipList.skip : TakeList.take)(iter[Symbol.iterator](), l + this.p);
        }

        var i = 0, done = false;
        for (const elm of this.source)
            if (done ||= !this.p(elm, i++, this))
                yield elm;
    }

    /**
     * Skips the first {@link n} elements from {@link iter}
     * @param iter The iterator from which to skip {@link n} elements
     * @param n The number of elements to skip
     */
    static *skip<T>(iter: Iterator<T>, n: number) {
        for (var i = 0; i < n; i++)
            if (iter.next().done)
                return;
        yield* toGenerator(iter);
    }

    get fastCount() {
        if (typeof this.p === "function")
            return NOT_FOUND;

        const temp = super.fastCount;
        return this.p < 0 && this.leftOnNegative
            ? Math.min(temp, -this.p)
            : Math.max(0, temp - Math.abs(this.p));
    }
}