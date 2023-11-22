
import { AbstractList } from "./abstract";

/** Type hack */
const CTOR = AbstractList as new <T>() => AbstractList<T> & Pick<Array<T>, number | "length" | "push" | "pop" | "unshift" | "shift">;

/** A class that needs to be applied to an {@link Array} to make the {@link AbstractList} methods available to it */
export abstract class ArrayList<T> extends CTOR<T> {
    static {
        this.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
        this.prototype.at = Array.prototype.at;
        this.prototype.push = Array.prototype.push;
        this.prototype.pop = Array.prototype.pop;
        this.prototype.unshift = Array.prototype.unshift;
        this.prototype.shift = Array.prototype.shift;
    }

    get fastCount() { return this.length; }
}