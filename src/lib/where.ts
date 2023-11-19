
import { Convert, Predicate } from "..";
import { SourceList } from "./abstract";
import { IDENTITY } from "../util";

/** Output of {@link where} */
export class WhereList<T> extends SourceList<T, T> {
    constructor (source: Iterable<T>, public p: Predicate<T, WhereList<T>> = IDENTITY) { super(source); }

    *[Symbol.iterator]() {
        var i = 0;
        for (const elm of this.source)
            if (this.p(elm, i++, this))
                yield elm;
    }

    /**
     * Allows you to split the OR conditions of a {@link where} into multiple istructions
     * @param p A predicate function
     */
    or(p: Predicate<T, WhereList<T>>) { return new WhereList(this.source, (x, i, list) => this.p(x, i, list) || p(x, i, list)); }
}

/** Output of {@link case} */
export class CaseList<T> extends SourceList<T, T> {
    constructor (source: Iterable<T>, public p: Predicate<T, CaseList<T>>, public f: Convert<T, void, CaseList<T>>) { super(source); }

    *[Symbol.iterator]() {
        var i = 0;
        for (const elm of this.source)
            if (this.p(elm, i++, this))
                this.f(elm, i - 1, this)
            else
                yield elm;
    }
}

/** Output of {@link distinct} */
export class DistinctList<T, K = T> extends SourceList<T, T> {
    constructor (source: Iterable<T>, public f: Convert<T, K, DistinctList<T, K>> = IDENTITY) { super(source); }

    *[Symbol.iterator]() {
        var i = 0;
        const set = new Set<K>();
        for (const elm of this.source)
            if (set.size !== set.add(this.f(elm, i++, this)).size)
                yield elm;
    }
}

/** Output of {@link except} */
export class ExceptList<T, K = T> extends SourceList<T, T> {
    constructor (source: Iterable<T>, public other: Iterable<K>, public f: Convert<T, K, ExceptList<T, K>> = IDENTITY) { super(source); }

    *[Symbol.iterator]() {
        var i = 0;
        const set = new Set<K>(this.other);
        for (const elm of this.source)
            if (!set.has(this.f(elm, i++, this)))
                yield elm;
    }
}