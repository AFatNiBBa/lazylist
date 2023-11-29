
import { IDENTITY, MarkedIterator, NOT_FOUND, calcLength } from "../util/util";
import { AbstractList } from "./abstract";
import { JoinMode, Predicate } from "..";
import { FixedList } from "./simple";
import { SkipList } from "./skip";

/** Output of {@link AbstractList.take} */
export class TakeList<T> extends FixedList<T, T> {
    constructor (source: Iterable<T>, public p: Predicate<T, TakeList<T>> | number, public padEnd: JoinMode | boolean = false, public def?: T, public leftOnNegative = false) { super(source); }

    *[Symbol.iterator]() {
        if (typeof this.p === "function")
        {
            using iter = this.source[Symbol.iterator]();
            return yield* TakeList.takeWhile(iter, this.p, this);
        }

        if (this.p >= 0)
        {
            using iter = this.source[Symbol.iterator]();
            return yield* TakeList.take(iter, this.p, this.padEnd, this.def);
        }

        const [ list, l ] = calcLength(this.source);
        using iter = list[Symbol.iterator]();
        if (this.leftOnNegative)
            return yield* TakeList.take(iter, l + this.p, this.padEnd, this.def);

        yield* SkipList.skip(iter, l + this.p);
        if (this.padEnd)
            for (var i = l; i < -this.p; i++)
                yield this.def!;
    }

    /**
     * Takes {@link n} elements from {@link iter}
     * @param iter The iterator from which to take {@link n} elements
     * @param n The number of elements to take
     * @param padEnd Whether to yield {@link n} minus the length of the sequence {@link def} at the end, if the length of the sequence is less than {@link n}
     * @param def Default value with which to fill the rest of the sequence if it has less than {@link n} elements
     * @returns The number of the elements that have actually been taken; It's different from {@link n} only if {@link padEnd} is disabled
     */
    static *take<T>(iter: MarkedIterator<T>, n: number, padEnd: JoinMode | boolean = false, def?: T) {
        for (var value: T, i = 0; i < n; i++) // If this were a foreach loop the first element after "n" would have been calculated too
            if (iter.done ||= ({ value } = iter.next()).done)
                if (padEnd)
                    yield def!;
                else
                    break;
            else
                yield value;
        return i;
    }

    /**
     * Takes each element until {@link p} returns `false`
     * @param iter The iterator from which to take the elements
     * @param p The predicate to which to pass each element of the sequence; If omitted, it will check elements for truthiness
     * @param list The list to eventually pass to {@link p}
     * @returns The eventual element that made {@link p} return `false`
     */
    static *takeWhile<T, TList = undefined>(iter: MarkedIterator<T>, p: Predicate<T, TList> = IDENTITY, list?: TList) {
        var i = 0;
        for (var value: T; !(iter.done = ({ value } = iter.next()).done); )
            if (p(value, i++, list!))
                yield value;
            else
                return value;
    }

    get fastCount() {
        if (typeof this.p === "function")
            return NOT_FOUND;

        const n = Math.abs(this.p);
        if (this.padEnd && !(this.p < 0 && this.leftOnNegative))
            return n; // The value of "this.padEnd" has no meaning when "this.leftOnNegative" is `true`

        const temp = super.fastCount;
        return this.p >= 0 || !this.leftOnNegative
            ? Math.min(temp, n)
            : Math.max(0, temp - n);
    }
}