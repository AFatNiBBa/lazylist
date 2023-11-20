
import { AbstractList, SourceList } from "./abstract";
import { IDENTITY } from "../util/util";
import { FixedList } from "./simple";
import { Convert } from "..";

/**
 * Element of the output of {@link groupBy}.
 * The group common value is contained in the {@link key} property.
 * The group is an {@link AbstractList} itself
 */
export class Grouping<T, K> extends FixedList<T, T> {
    constructor(public key: K, source: Iterable<T>) { super(source); }

    /**
     * -
     * The output is wrapped in a {@link Grouping} to keep the {@link key}
     * @inheritdoc
     */
    pipe<R>(f: (x: this) => Iterable<R>) { return new Grouping(this.key, f(this)); }
}

/** Output of {@link groupBy} */
export class GroupByList<T, K, H = K> extends SourceList<T, Grouping<T, K>> {
    constructor(source: Iterable<T>, public k: Convert<T, K, GroupByList<T, K, H>>, public h?: Convert<K, H, GroupByList<T, K, H>>) { super(source); }

    [Symbol.iterator]() { return GroupByList.lookup(this.source, this.k, this.h, this).values(); }

    /**
     * Core of {@link GroupByList}.
     * Keeps the return as a {@link Map} for easy retrieval of a specific group
     * @param source The source iterable
     * @param fK A conversion function that gets the key from each element
     * @param fH A conversion function that gets the actual grouping value from each key
     * @param list The list to eventually pass to {@link p}
     */
    static lookup<T, K, H = K, TList = undefined>(source: Iterable<T>, fK: Convert<T, K, TList>, fH: Convert<K, H, TList> = IDENTITY, list?: TList) {
        var i = 0;
        const map = new Map<H, Grouping<T, K>>();
        for (const elm of source)
        {
            const k = fK(elm, i, list!);
            const h = fH(k, i++, list!);
            const group = map.get(h);
            if (group) (group.source as T[]).push(elm);
            else map.set(h, new Grouping(k, [ elm ]));
        }
        return map;
    }
}