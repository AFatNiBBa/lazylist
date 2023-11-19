
import { MarkedIterator } from "../util";
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

    get fastCount() {
        return this.iter?.done
            ? this.cached.length
            : super.fastCount;
    }
}