
import linq, { Convert, fastCount, toGenerator } from "..";
import { SourceList } from "./abstract";
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
    reverse() { return this; }

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
        const temp = this.$sourceAsArray();
        for (var i = temp.length - 1; i >= 0; i--)
            yield temp[i];
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