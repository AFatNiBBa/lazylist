
import { Convert, JoinMode, Predicate, fastCount } from "..";
import { IDENTITY, NOT_FOUND, hasLength } from "../util";

/** An iterable wrapper with helper functions */
export abstract class AbstractList<T> implements Iterable<T> {
    abstract [Symbol.iterator](): Generator<T>;

    /** Outputs an iterable that will contain the current one as its only element */
    wrap() { return new WrapList<T, this>(this); }

    /**
     * Reverses the list.
     * Non lazy
     */
    reverse(): AbstractList<T> { return new ReverseList(this); }

    /**
     * Merges the current list to {@link other}
     * @param other An iterable
     */
    merge(other: Iterable<T>, flip?: boolean) { return new MergeList(this, other, flip); }

    /**
     * Like {@link but}, but the function is only executed on the first element
     * @param f A function
     */
    init(f: Convert<T, void, InitList<T>>) { return new InitList<T>(this, f); }

    /**
     * Converts the list based on {@link f}
     * @param f A conversion function
     */
    select<R>(f: Convert<T, R, SelectList<T, R>>) { return new SelectList<T, R>(this, f); }

    /**
     * Converts the current list to a list of iterables based on {@link f} and concats every element
     * @param f A conversion function; If omitted, the element itself will be used
     */
    selectMany<R = T extends Iterable<infer U> ? U : never>(f?: Convert<T, Iterable<R>, SelectManyList<T, R>>) { return new SelectManyList<T, R>(this, f); }

    /**
     * Converts and filters the list based on {@link f} at the same time.
     * The same box object is used for each element.
     * The default value of the `result` field of the box is the input value itself.
     * Usage:
     * ```
     * linq([ 1, 2, 3 ]).selectWhere(x => {
     *    if (x.value % 2) {
     *        x.result = x.value + 2;
     *        return true;
     *    }
     *    return false;
     * }).value //=> [ 3, 5 ]
     * ```
     * @param f A predicate function that gets a box object containing the element in the `value` field; If the function returns `true`, the content of the box's `result` field will be yielded
     */
    selectWhere<R = T>(f: Predicate<{ value: T, result?: R }, SelectWhereList<T, R>>) { return new SelectWhereList<T, R>(this, f); }

    /**
     * Filters the list based on {@link p}
     * @param p A predicate function; If omitted, falsish elements will be filtered out
     */
    where(p?: Predicate<T, WhereList<T>>) { return new WhereList<T>(this, p); }

    /**
     * If {@link p} does NOT match on an element, it gets yielded, otherwise it gets passed into {@link f} and it gets filtered out
     * @param p A predicate function
     * @param f A function
     */
    case(p: Predicate<T, CaseList<T>>, f: Convert<T, void, CaseList<T>>) { return new CaseList<T>(this, p, f); }

    /**
     * Ensures every element of the list shows up only once
     * @param f A conversion function that returns the the part of the element to check duplicates for; If omitted, the element itself will be used
     */
    distinct<TKey = T>(f?: Convert<T, TKey, DistinctList<T, TKey>>) { return new DistinctList<T, TKey>(this, f); }

    /**
     * Ensures no element of {@link other} shows up in the list.
     * Every time the iteration starts, {@link other} is completely calculated
     * @param f A conversion function that returns the the part of the element to check for in the list; If omitted, the element itself will be used
     */
    except<TKey = T>(other: Iterable<TKey>, f?: Convert<T, TKey, ExceptList<T, TKey>>) { return new ExceptList<T, TKey>(this, other, f); }

    /**
     * Takes the first {@link p} elements of the list and skips the rest
     * @param p The elements to take (Use a negative number to take from the end); If a function is given, it will be called for each element and the elements will be taken until the function returns `false`
     * @param padEnd If truthy and {@link p} is more than the list length, the output list will be forced to have length {@link p} by concatenating as many {@link def} as needed
     * @param def The value to use if the list is too short
     * @param leftOnNegative Usually, if {@link p} is negative, the output will be the LAST -{@link p} elements; If `true`, the output will be all the elements, except for the last -{@link p}
     */
    take(p: Predicate<T, TakeList<T>> | number, padEnd?: JoinMode | boolean, def?: T, leftOnNegative?: boolean) { return new TakeList<T>(this, p, padEnd, def, leftOnNegative); }

    /**
     * Skips the first {@link p} elements of the list
     * @param p The elements to skip (Use a negative number to skip from the end); If a function is given, it will be called for each element and the elements will be skipped until the function returns `false`
     * @param leftOnNegative Usually, if {@link p} is negative, the LAST -{@link p} elements will be skipped; If `true`, the output will be only the last -{@link p} elements
     */
    skip(p: Predicate<T, SkipList<T>> | number, leftOnNegative?: boolean) { return new SkipList<T>(this, p, leftOnNegative); }

    /**
     * For each element yields the element and the children generated by {@link f} and does it all again for each child.
     * Providing the {@link p} parameter is very different to using {@link where}, because not only the element will eventually be filtered out, but also the children.
     * The index provided to the callbacks are the child element index on their parent
     * @param f A conversion function that returns an iterable of the same type as the provided element
     * @param p A predicate function 
     * @param flip If `true` the children will be yielded before the parent
     */
    traverse(f: Convert<T, Iterable<T>, TraverseList<T>>, p?: Predicate<T, TraverseList<T>>, flip?: boolean) { return new TraverseList<T>(this, f, p, flip); }

    /** Flattens recursively every iterable element of the list */
    flat() { return new FlatList<T>(this); }

    /**
     * Inserts {@link value} at index {@link n}.
     * If {@link n} is negative, the index will be calculated from the end of the list.
     * If {@link n} is nullish, the value will be inserted AFTER the end of the list.
     * If the insertion index is before the beginning of the list or more than 1 position after the end, it will throw a {@link RangeError}
     * @param n Index at which to insert the value
     * @param value The value to insert
     */
    insert(n: number | null, value: T) { return new InsertList(this, value, n); }

    /**
     * Adds a value at the beginning of the list.
     * Is the same as passing {@link value} to {@link insert} with `0` as the index
     * @param value The value to add
     */
    prepend(value: T) { return new InsertList(this, value, 0); }

    /**
     * Adds a value at the end of the list.
     * Is the same as passing {@link value} to {@link insert} with `null` as the index
     * @param value The value to add
     */
    append(value: T) { return new InsertList(this, value); }

    /**
     * Convertes the current list into a {@link Map}
     * @param k A conversion function that gets the key
     * @param v A conversion function that gets the value; If omitted, the whole element will be used as a value
     * @param throwOnDublicate If it's set to `true`, it throws a {@link RangeError} if a key is duplicate
     */
    toMap<K, V = T>(k: Convert<T, K>, v: Convert<T, V> = IDENTITY, throwOnDublicate = false) {
        var i = 0;
        const map = new Map<K, V>();
        for (const elm of this)
            if (map.size === map.set(k(elm, i, this), v(elm, i++, this)).size && throwOnDublicate)
                throw new RangeError("Duplicates are not allowed in this map");
        return map;
    }

    /**
     * Convertes the current list into a {@link Set}
     * @param throwOnDublicate If it's set to `true`, it throws a {@link RangeError} if an element is duplicate
     */
    toSet(throwOnDublicate = false) {
        const set = new Set<T>();
        for (const elm of this)
            if (set.size === set.add(elm).size && throwOnDublicate)
                throw new RangeError("Duplicates are not allowed in this set");
        return set;
    }

    /** Returns the length of the iterable if it is easy to compute, otherwise it returns {@link NOT_FOUND} */
    get fastCount() { return NOT_FOUND; }

    /** Calculates each element of the list and puts them inside of an {@link Array} */
    get value() { return [ ...this ]; }
}

/**
 * Instances of this class are guaranteed to be the modification of an other iterable.
 * The input iterable's elements are of type {@link I} and the output's ones are of type {@link O}
 */
export abstract class SourceList<I, O> extends AbstractList<O> {
    constructor(public source: Iterable<I>) { super(); }

    *[Symbol.iterator](): Generator<O> { yield* <any>this.source; }

    /** Obtains the calculated version of {@link source} */
    protected $sourceAsArray() { return hasLength(this.source) ? this.source : [ ...this.source ]; }

    /**
     * Returns an iterable containing the elements of {@link source} and its length.
     * If computing the length is expensive, it will calculate {@link source}, so its returned to prevent computing it twice
     */
    protected $calcLength(): [ Iterable<I>, number ] {
        const l = fastCount(this.source);
        if (~l) return [ this.source, l ];
        const temp = this.$sourceAsArray();
        return [ temp, temp.length ];
    }
}

// These are needed to be imported AFTER the definition of "AbstractList", because it is needed IMMEDIATELY by all of them
import { CaseList, DistinctList, ExceptList, WhereList } from "./where";
import { SelectList, SelectManyList, SelectWhereList } from "./select";
import { InitList, MergeList, ReverseList, WrapList } from "./simple";
import { FlatList, TraverseList } from "./tree";
import { InsertList } from "./element";
import { TakeList } from "./take";
import { SkipList } from "./skip";