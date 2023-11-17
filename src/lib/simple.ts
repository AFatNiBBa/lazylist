
import linq, { Convert, fastCount, toGenerator } from "..";
import { SourceList } from "./abstract";
import { NOT_FOUND } from "../util";

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

/** Output of {@link reverse} */
export class ReverseList<T> extends FixedList<T, T> {
    *[Symbol.iterator]() {
        const temp = this.$sourceAsArray();
        for (var i = temp.length - 1; i >= 0; i--)
            yield temp[i];
    }
}

/** Output of {@link merge} */
export class MergeList<T> extends FixedList<T, T> {
    constructor(source: Iterable<T>, public other: Iterable<T>, public flip = false) { super(source); }

    *[Symbol.iterator]() {
        if (!this.flip) yield* this.source;
        yield* this.other;
        if (this.flip) yield* this.source;
    }

    get fastCount() {
        const first = super.fastCount;
        if (!~first) return NOT_FOUND;
        const second = fastCount(this.other);
        return ~second ? first + second : NOT_FOUND;
    }
}

/** Output of {@link init} */
export class InitList<T> extends FixedList<T> {
    constructor (source: Iterable<T>, public f: Convert<T, void, InitList<T>>) { super(source); }

    *[Symbol.iterator]() {
        const iter = this.source[Symbol.iterator]();
        const { value, done } = iter.next();
        if (done) return;

        this.f(value, 0, this);
        yield value;
        yield* toGenerator(iter);
    }
}