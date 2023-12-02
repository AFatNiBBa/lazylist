
import { MarkedIterator } from "../util/util";
import { BufferIterator } from "./buffer";
import { FixedList } from "./simple";
import { toGenerator } from "..";

/** Output of {@link cache} */
export class CacheList<T> extends FixedList<T, T> implements Disposable {
    iter: MarkedIterator<T> | undefined;
    cached: T[] = [];

    *[Symbol.iterator]() {
        yield* this.cached;
        yield* this.rest();
    }

    /** Disposes of the eventual internal iterator */
    [Symbol.dispose]() { this.iter?.[Symbol.dispose](); }

    /**
     * -
     * Returns itself
     * @inheritdoc
     */
    cache() { return this; }

    /**
     * -
     * Checks if {@link i} is already in cached
     * @inheritdoc
     */
    inBound(i: number) {
        if (i >= 0)
            if (i < this.cached.length)
                return true;
            else if (this.iter?.done)
                return false;
        return super.inBound(i);
    }

    /**
     * -
     * Allows you to access already cached elements at O(1)
     * @inheritdoc
     */
    at<O = undefined>(i: number, def?: O) {
        if (i >= 0)
            if (i < this.cached.length)
                return this.cached[i];
            else if (this.iter?.done)
                return def!;
            else;
        else if (this.iter?.done)
            if ((i += this.cached.length) >= 0)
                return this.cached[i];
            else
                return def!;
        return super.at(i, def);
    }

    /** Yields the elements of the current list which HAVEN'T already been cached */
    *rest() {
        if (this.iter?.done) return;
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
     * Gets a {@link BufferIterator} that uses this cache as its data source
     * @param load The number of elements to load ahead of time
     */
    iterator(load = 0) {
        return new BufferIterator<T>((i, self) => {
            this.at(i + load);
            self.start = self.offset = 0;
            return this.cached;
        });
    }

    get fastCount() {
        return this.iter?.done
            ? this.cached.length
            : super.fastCount;
    }

    /**
     * -
     * If the iteration is not done, it iterates only the elements which have not already been cached
     * @inheritdoc
     */
    get count() {
        var out = this.cached.length;
        if (this.iter?.done) return out;
        for (const _ of this.rest()) out++;
        return out;
    }
}