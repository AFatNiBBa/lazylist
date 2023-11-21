
import { MarkedIterator } from "../util/util";
import { FixedList } from "./simple";
import { toGenerator } from "..";

/** Output of {@link cache} */
export class CacheList<T> extends FixedList<T, T> {
    iter: MarkedIterator<T> | undefined;
    cached: T[] = [];

    *[Symbol.iterator]() {
        yield* this.cached;
        for (const elm of toGenerator(this.iter ??= this.source[Symbol.iterator]())) {
            this.cached.push(elm);
            var prev = this.cached.length;
            yield elm;
            while (prev < this.cached.length)
                yield this.cached[prev++]; // Yields the element that were put in the cache by other enumerations during the previous yield
        }
        this.iter.done = true;
    }

    /**
     * -
     * Allows you to access already cached elements at O(1)
     * @inheritdoc
     */
    at(i: number) {
        if (i >= 0)
            if (i < this.cached.length)
                return this.cached[i];
            else if (this.iter?.done)
                throw new RangeError("The provided index is after the end of the sequence");
            else;
        else if (this.iter?.done)
            if ((i += this.cached.length) >= 0)
                return this.cached[i];
            else
                throw new RangeError("The provided index is before the beginning of the sequence");
        return super.at(i);
    }

    get fastCount() {
        return this.iter?.done
            ? this.cached.length
            : super.fastCount;
    }
}