
import linq from "..";
import { AbstractList } from "./abstract";

/** A list with absolutely no items */
export class EmptyList extends AbstractList<any> {
    static instance = new this();

    *[Symbol.iterator]() { }
    
    get fastCount() { return 0; }
}

/** Output of {@link linq.rand} */
export class RandList extends AbstractList<number> {
    constructor(public top?: number, public bottom = 0) { super(); }

    *[Symbol.iterator]() {
        while (true)
            yield this.top != null
                ? Math.floor(Math.random() * (this.top - this.bottom + 1)) + this.bottom
                : Math.random();
    }

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
     * Uses math to reverse the list lazily
     * @inheritdoc
     */
    reverse() {
        if (!Number.isFinite(this.length)) throw new RangeError("An infinite sequence cannot be reversed");
        const start = this.start + (this.length - 1) * this.step;
        return new RangeList(this.length, start, -this.step);
    }

    get fastCount() { return this.length; }
}