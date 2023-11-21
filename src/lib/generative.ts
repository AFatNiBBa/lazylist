
import linq from "..";
import ErrorMsg from "../util/errorMsg";
import { AbstractList } from "./abstract";

/** A list with absolutely no items */
export class EmptyList extends AbstractList<any> {
    static instance = new this();

    *[Symbol.iterator]() { }

    at(_: number) { throw new RangeError("There is no element in an empty list"); }
    
    get fastCount() { return 0; }
}

/** Output of {@link linq.rand} */
export class RandList extends AbstractList<number> {
    constructor(public top?: number, public bottom?: number) { super(); }

    *[Symbol.iterator]() {
        while (true)
            yield this.top != null
                ? RandList.rand(this.top + 1, this.bottom)
                : Math.random();
    }

    /**
     * Gets a random integer beween {@link top} and {@link bottom}
     * @param top The upper bound of the random numbers; Not included
     * @param bottom The lower bound of the random numbers; It defaults to 0
     */
    static rand(top: number, bottom = 0) { return Math.floor(Math.random() * (top - bottom)) + bottom; }

    get fastCount() { return Infinity; }
}

/** Output of {@link linq.range} */
export class RangeList extends AbstractList<number> {
    constructor(public length = Infinity, public start = 0, public step = 1) { super(); }

    *[Symbol.iterator]() {
        for (var i = 0; i < this.length; i++)
            yield i * this.step + this.start;
    }

    /**
     * -
     * Uses math to reverse the list lazily.
     * If the list has no finite length, it will throw a {@link RangeError}
     * @inheritdoc
     */
    reverse() {
        if (!Number.isFinite(this.length)) throw new RangeError("An infinite sequence cannot be reversed");
        const start = this.start + (this.length - 1) * this.step;
        return new RangeList(this.length, start, -this.step);
    }

    /**
     * - 
     * Uses math to get the value at O(1)
     * @inheritdoc 
     */
    at(i: number) {
        if (i < 0)
            if ((i += this.length) < 0)
                throw ErrorMsg.beforeBegin();
        if (i >= this.length)
            throw ErrorMsg.afterEnd();
        return i * this.step + this.start;
    }

    get fastCount() { return this.length; }
}