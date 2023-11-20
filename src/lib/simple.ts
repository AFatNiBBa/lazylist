
import linq, { Convert, fastCount, toGenerator } from "..";
import { AbstractList, SourceList } from "./abstract"; 
import { calcArray } from "../util/util";
import { RandList } from "./generative";

/**
 * Output of {@link linq}.
 * Represents a list with the same number of elements as {@link source}.
 * It is used even by lists that need the {@link FixedList.fastCount} of the {@link source} to calculate theirs
 */
export class FixedList<I, O = I> extends SourceList<I, O> {
    get fastCount() { return fastCount(this.source); }
}

/** Output of {@link wrap} */
export class WrapList<T, TList extends Iterable<T>> extends SourceList<T, TList> {
    constructor(source: TList) { super(source); }

    *[Symbol.iterator]() { yield <TList>this.source; }

    /**
     * -
     * Returns itself
     * @inheritdoc
     */
    reverse(): AbstractList<TList> { return this; }

    at(i: number) {
        if (i === 0 || i === -1)
            return <TList>this.source;
        throw new RangeError("There is just one element in a wrapped list");
    }

    get fastCount() { return 1; }
}

/** Output of {@link default} */
export class DefaultList<T> extends FixedList<T, T> {
    constructor (source: Iterable<T>, public def?: T) { super(source); }

    *[Symbol.iterator]() {
        var value: T;
        const iter = this.source[Symbol.iterator]();
        if (({ value } = iter.next()).done) return yield this.def!, <any>value;
        else yield value;
        return yield* toGenerator(iter);
    }

    get fastCount() { return super.fastCount || 1; }
}

/** Output of {@link repeat} */
export class RepeatList<T> extends FixedList<T, T> {
    constructor (source: Iterable<T>, public n: number) { super(source); }

    *[Symbol.iterator]() {
        for (var i = 0; i < this.n; i++)
            yield* this.source;
    }

    get fastCount() { return super.fastCount * Math.max(0, this.n); }
}

/** Output of {@link reverse} */
export class ReverseList<T> extends FixedList<T, T> {
    *[Symbol.iterator]() {
        const temp = calcArray(this.source);
        for (var i = temp.length - 1; i >= 0; i--)
            yield temp[i];
    }

    at(i: number) {
        if (i >= 0) return super.at(i);
        for (const elm of this.source)
            if (!++i)
                return elm;
        throw new RangeError("The provided index is before the beginning of the sequence");
    }
}

/** Output of {@link shuffle} */
export class ShuffleList<T> extends FixedList<T, T> {
    *[Symbol.iterator]() {
        const temp = [ ...this.source ]; // A new array must be created since we're going change the elements
        for (var i = 0; i < temp.length; i++) {
            const k = RandList.rand(temp.length, i);
            yield temp[k];
            temp[k] = temp[i];
        }
    }
}

/** Output of {@link init} */
export class InitList<T> extends FixedList<T> {
    constructor (source: Iterable<T>, public f: Convert<T, void, InitList<T>>) { super(source); }

    *[Symbol.iterator]() {
        const iter = this.source[Symbol.iterator]();
        const { value, done } = iter.next();
        if (done) return value;

        this.f(value, 0, this);
        yield value;
        return yield* toGenerator(iter);
    }
}

/** Output of {@link finally} */
export class FinallyList<T> extends FixedList<T, T> {
    constructor (source: Iterable<T>, public f: (list: FinallyList<T>) => void) { super(source); }

    *[Symbol.iterator]() {
        try { return yield* this.source; }
        finally { this.f(this); }
    }
}

/** Output of {@link once} */
export class OnceList<T> extends FixedList<T, T> {
    executed = false;

    *[Symbol.iterator]() {
        if (this.executed) throw new RangeError("This list can only be enumerated once");
        this.executed = true;
        return yield* this.source;
    }
}

/** Output of {@link merge} */
export class MergeList<T> extends FixedList<T, T> {
    constructor(source: Iterable<T>, public other: Iterable<T>, public flip = false) { super(source); }

    *[Symbol.iterator]() {
        if (this.flip) return yield* this.other, yield* this.source;
        const out = yield* this.source;
        yield* this.other;
        return out;
    }

    get fastCount() { return super.fastCount + fastCount(this.other); }
}