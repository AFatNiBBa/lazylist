
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
export class DistinctList<T, TKey = T> extends SourceList<T, T> {
    constructor (source: Iterable<T>, public f: Convert<T, TKey, DistinctList<T, TKey>> = IDENTITY) { super(source); }

    *[Symbol.iterator]() {
        var i = 0;
        const set = new Set<TKey>();
        for (const elm of this.source)
            if (set.size !== set.add(this.f(elm, i++, this)).size)
                yield elm;
    }
}

/** Output of {@link except} */
export class ExceptList<T, TKey = T> extends SourceList<T, T> {
    constructor (source: Iterable<T>, public other: Iterable<TKey>, public f: Convert<T, TKey, ExceptList<T, TKey>> = IDENTITY) { super(source); }

    *[Symbol.iterator]() {
        var i = 0;
        const set = new Set<TKey>(this.other);
        for (const elm of this.source)
            if (!set.has(this.f(elm, i++, this)))
                yield elm;
    }
}