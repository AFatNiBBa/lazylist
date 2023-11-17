
import { Convert, Predicate } from "..";
import { SourceList } from "./abstract";
import { FixedList } from "./simple";
import { IDENTITY } from "../util";

/** Output of {@link select} */
export class SelectList<I, O> extends FixedList<I, O> {
    constructor (source: Iterable<I>, public f: Convert<I, O, SelectList<I, O>>) { super(source); }

    *[Symbol.iterator]() {
        var i = 0;
        for (const elm of this.source)
            yield this.f(elm, i++, this);
    }
}

/** Output of {@link selectMany} */
export class SelectManyList<I, O = I extends Iterable<infer U> ? U : never> extends SourceList<I, O> {
    constructor (source: Iterable<I>, public f: Convert<I, Iterable<O>, SelectManyList<I, O>> = IDENTITY) { super(source); }

    *[Symbol.iterator]() {
        var i = 0;
        for (const elm of this.source)
            yield* this.f(elm, i++, this);
    }
}

/** Output of {@link selectWhere} */
export class SelectWhereList<I, O = I> extends SourceList<I, O> {
    constructor (source: Iterable<I>, public f: Predicate<{ value: I, result: O }, SelectWhereList<I, O>>) { super(source); }

    *[Symbol.iterator]() {
        var i = 0;
        const box = { value: <I>undefined, result: <O>undefined };
        for (const value of this.source)
            if (box.result = <any>(box.value = value), this.f(box, i++, this))
                yield box.result;
    }
}