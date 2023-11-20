
import { Combine, JoinMode, fastCount } from "..";
import { FixedList } from "./simple";
import { TUPLE } from "../util/util";

/** Output of {@link zip} */
export class ZipList<A, B, R = [ A, B ]> extends FixedList<A, R> {
    constructor(source: Iterable<A>, public other: Iterable<B>, public f: Combine<A, B, R, ZipList<A, B, R>> = TUPLE, public mode: JoinMode = JoinMode.inner) { super(source); }

    *[Symbol.iterator](): Generator<R> {

        var i = 0;
        const source = this.source[Symbol.iterator]();
        const other = this.other[Symbol.iterator]();
        
        try
        {
            while(true)
            {
                const a = source.next();
                if (a.done && !(this.mode & JoinMode.right)) break;
                const b = other.next();
                if (b.done && (a.done || !(this.mode & JoinMode.left))) break;
                yield this.f(a.value, b.value, i++, this);
            }
        }
        finally 
        {
            source.return?.();
            other.return?.();
        }
    }

    get fastCount() {
        switch (this.mode) {
            case JoinMode.inner: return Math.min(super.fastCount, fastCount(this.other));
            case JoinMode.left: return super.fastCount;
            case JoinMode.right: return fastCount(this.other);
            case JoinMode.outer: return Math.max(super.fastCount, fastCount(this.other));
        }
    }
}