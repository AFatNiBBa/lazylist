/**
 * A function that takes two arguments and combines them.
 */
export declare type UCombine<A, B, TResult = A, T = TResult> = (a: A, b: B, i: number, data: Iterable<T>) => TResult;
/**
 * A function that converts a value.
 */
export declare type UConvert<X, Y, T = Y> = (x: X, i: number, data: Iterable<T>) => Y;
/**
 * A function that indicates the "truthyness" of a value.
 */
export declare type UPredicate<T> = UConvert<T, boolean, T>;
/**
 * An iterator that may have a "done" property.
 * If not present is `false` by default.
 */
export declare type UMarkedIterator<T> = Iterator<T> & {
    done?: boolean;
};
declare namespace LazyList {
    /**
     * Indicates how two iterable should be conbined it they have different lengths.
     */
    enum UMode {
        /** The length of the output is equal to the length of the shorter iterable. */
        inner = 0,
        /** The length of the output is equal to the length of the base iterable. */
        left = 1,
        /** The length of the output is equal to the length of the input iterable. */
        right = 2,
        /** The length of the output is equal to the length of the longer iterable. */
        outer = 3
    }
    /**
     * An iterable wrapper with helper functions.
     */
    abstract class LazyList<O> implements Iterable<O> {
        abstract [Symbol.iterator](): Iterator<O>;
        /**
         * Makes every `Generator` a `LazyList`.
         * It changes the inheritance chain of the `Generator`.
         */
        static attachIterator(): typeof LazyList;
        /**
         * Returns an auto-generated list of numbers.
         * @param end The end of the sequence
         * @param begin The begin of the sequence
         * @param step The difference between each step of the sequence (If `end` is greater than `begin` it will be `-1` by default)
         */
        static range(end?: number, begin?: number, step?: number): LazyRangeList;
        /**
         * Returns a `LazyList` based on an iterable.
         * If `data` is already a `LazyList`, it gets returned directly, otherwise it gets wrapped in a `LazyDataList`.
         * @param data The iterable
         */
        static from<T>(data: Iterable<T>): LazyList<T>;
        /**
         * Concats the current list to `other`.
         * @param other An iterable
         */
        concat(other: Iterable<O>): LazyConcatList<O>;
        /**
         * Combines the current list with `other` based on `f`.
         * @param other An iterable
         * @param f A combination function
         * @param mode Different length handling
         */
        zip<T, TResult>(other: Iterable<T>, f: UCombine<O, T, TResult>, mode?: UMode): LazyZipList<O, T, TResult>;
        /**
         * Joins the current list with `other` based on `f`, where the condition `filter` is met.
         * If no `filter` argument is supplied, the method does the cartesian product of the two lists (And `mode` becomes useless).
         * If `mode` is not "inner", `null` will be supplied as the missing element.
         * The index available in the functions is the one of the "left" part in the "inner" operation, and `-1` in the "outer" part.
         * The "right" part (`other`) will be calculeted one time for each element of the "left" part and must be of the same size each time.
         * Wrap `other` in a `LazyCacheList` (Or use the `list.cache()` method) to cache the elements.
         * @param other An iterable
         * @param filter A filter function
         * @param f A combination function
         * @param mode Different length handling
         */
        join<T, TResult>(other: Iterable<T>, f: UCombine<O, T, TResult>, filter?: UCombine<O, T, boolean, TResult>, mode?: UMode): LazyJoinList<O, T, TResult>;
        /**
         * Converts the list based on `f`.
         * @param f A conversion function
         */
        select<TResult>(f: UConvert<O, TResult>): LazySelectList<O, TResult>;
        /**
         * Converts the current list to an iterables list based on `f` and concat every element.
         * @param f A conversion function; Can be omitted if every element is iterable
         */
        selectMany<TResult>(f?: UConvert<O, Iterable<TResult>, TResult>): LazySelectManyList<O, TResult>;
        /**
         * Filters the list based on `f`.
         * @param f A predicate function
         */
        where(f: UPredicate<O>): LazyWhereList<O>;
        /**
         * Executes the list until `f` returns `false` for the current element.
         * @param f A predicate function
         */
        while(f: UPredicate<O>): LazyWhileList<O>;
        /**
         * Skips the first `n` elements of the list.
         * @param n The elements to skip
         */
        skip(n: number): LazySkipList<O>;
        /**
         * Takes the first `n` elements of the list and skips the rest.
         * @param n The elements to take
         * @param outer If truthy and `n` is more than the list length, the output list will be forced to have length `n` by concatenating as many `undefined` as needed
         */
        take(n: number, outer?: UMode | boolean): LazyTakeList<O>;
        /**
         * Groups the list's elements, `n` at a time.
         * Non lazy by default, but can be made lazy by setting `lazy` as `true`.
         * If the list is set to lazy you should NEVER calculate the parent iterator before the childrens, like:
         *
         *     LazyList.from([1,2,3]).slice(2,false,true).value; // Stops
         * Additionally a lot of unexpected behaviours could occur.
         * @param n The length of each slice
         * @param outer If truthy, every slice will be forced to have `n` elements by concatenating as many `undefined` as needed
         * @param lazy Indicates if the list should be lazy (and unsafe)
         */
        slice(n: number, outer?: UMode | boolean, lazy?: boolean): LazySliceList<O>;
        /**
         * Groups the list's elements based on a provided function.
         * Non lazy.
         * @param f A combination function
         */
        groupBy<K>(f: UConvert<O, K, UGrouping<K, O>>): LazyGroupByList<K, O>;
        /**
         * Orders the list; It counts the element so that it is faster when there are a lot of copies (For that reason, the index is not available on `f` since it would be wrong).
         * Non lazy.
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc Reverses the results
         */
        sort(f?: UCombine<O, O, number, O>, desc?: boolean): LazySortList<O>;
        /**
         * Reverses the list.
         * Non lazy.
         */
        reverse(): LazyReverseList<O>;
        /**
         * Repeat the list's elements n times.
         * @param n The number of repetitions
         */
        repeat(n: number): LazyRepeatList<O>;
        /**
         * Caches the list's calculated elements, this prevent them from passing inside the pipeline again.
         */
        cache(): LazyCacheList<O>;
        /**
         * Outputs a `LazyList` that will contain the current one as its only element.
         */
        wrap(): LazyWrapList<this>;
        /**
         * Utility function that specifies how two iterables of different lengths should be conbined.
         * @param other An iterable
         * @param mode Different length handling
         */
        adjust<T>(other: Iterable<T>, mode?: UMode): LazyZipList<O, T, [O, T]>;
        /**
         * Executes `f` on each element of the list and returns the current element (not the output of `f`).
         * @param f A function
         */
        but(f: UConvert<O, void, O>): LazySelectList<O, O>;
        /**
         * Calculates each element of the list and wraps them in another `LazyList`.
         */
        calc(): LazyDataList<O, O>;
        /**
         * Calculates and awaits each element of the list and wraps them in another `LazyList`.
         */
        await(): Promise<LazyDataList<O, O>>;
        /**
         * Aggregates the list based on `f`.
         * @param f A combination function
         * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration).
         */
        aggregate<TResult = O>(f: UCombine<TResult, O, TResult, O>, out?: TResult): TResult;
        /**
         * Returns the element at the provided index.
         * @param n The index
         * @param def The default value
         */
        at<T = null>(n: number, def?: T): O | T;
        /**
         * Gets the first element of the list or `def` as default if it's empty.
         * @param def The default value
         */
        first<T = null>(def?: T): O | T;
        /**
         * Gets the last element of the list or `def` as default if it's empty.
         * @param def The default value
         */
        last<T = null>(out?: O | T): O | T;
        /**
         * Returns `true` if `f` returns `true` for every element of the list.
         * @param f A predicate function; It defaults to the identity function
         */
        all(f?: UPredicate<O>): boolean;
        /**
         * Returns `true` if `f` returns `true` for at least one element of the list.
         * @param f A predicate function; It defaults to the identity function
         */
        any(f?: UPredicate<O>): boolean;
        /**
         * Returns `true` if a value is in the list.
         * @param v The value
         */
        has(v: O): boolean;
        /**
         * Calculates each element of the list and puts them inside of an `Array`.
         */
        get value(): O[];
        /**
         * Calculates the length of the list.
         */
        get count(): number;
        /**
         * Calculates the average of the elements of the list.
         */
        get avg(): number;
        /**
         * Aggregates the list using the `+` operator (Can both add numbers and concatenate strings).
         */
        get sum(): O;
        /**
         * Returns the biggest number in the list.
         */
        get max(): O;
        /**
         * Returns the smallest number in the list.
         */
        get min(): O;
    }
    /**
     * Output of `LazyList.range()`.
     */
    class LazyRangeList extends LazyList<number> {
        end: number;
        begin: number;
        step: number;
        constructor(end?: number, begin?: number, step?: number);
        [Symbol.iterator](): Iterator<number>;
        has(v: number): boolean;
        get count(): number;
    }
    /**
     * Output of `LazyList.from()`.
     * Instances of this class are guaranteed to have a base iterable.
     * The input iterable's elements are of type `<I>` and the output's ones are of type `<O>`.
     */
    class LazyDataList<I, O> extends LazyList<O> {
        data: Iterable<I>;
        constructor(data: Iterable<I>);
        [Symbol.iterator](): Iterator<O>;
        /**
         * Utility function that calculates the base iterable.
         * If the base iterable is an `Array` it will be returned directly.
         */
        base(): O[];
        get count(): number;
        last<T>(def?: T): O | T;
    }
    /**
     * Output of `list.concat()`.
     */
    class LazyConcatList<T> extends LazyDataList<T, T> {
        other: Iterable<T>;
        constructor(data: Iterable<T>, other: Iterable<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    /**
     * Output of `list.zip()`.
     */
    class LazyZipList<A, B, TResult> extends LazyDataList<A, TResult> {
        other: Iterable<B>;
        f: UCombine<A, B, TResult>;
        mode: UMode;
        constructor(data: Iterable<A>, other: Iterable<B>, f: UCombine<A, B, TResult>, mode?: UMode);
        [Symbol.iterator](): Iterator<TResult>;
    }
    /**
     * Output of `list.join()`.
     */
    class LazyJoinList<A, B, TResult> extends LazyDataList<A, TResult> {
        other: Iterable<B>;
        f: UCombine<A, B, TResult>;
        filter?: UCombine<A, B, boolean, TResult>;
        mode: UMode;
        constructor(data: Iterable<A>, other: Iterable<B>, f: UCombine<A, B, TResult>, filter?: UCombine<A, B, boolean, TResult>, mode?: UMode);
        [Symbol.iterator](): Iterator<TResult>;
    }
    /**
     * Output of `list.select()`.
     */
    class LazySelectList<X, Y> extends LazyDataList<X, Y> {
        f: UConvert<X, Y>;
        constructor(data: Iterable<X>, f: UConvert<X, Y>);
        [Symbol.iterator](): Iterator<Y>;
    }
    /**
     * Output of `list.selectMany()`.
     */
    class LazySelectManyList<X, Y> extends LazyDataList<X, Y> {
        f?: UConvert<X, Iterable<Y>, Y>;
        constructor(data: Iterable<X>, f?: UConvert<X, Iterable<Y>, Y>);
        [Symbol.iterator](): Iterator<Y>;
    }
    /**
     * Output of `list.where()`.
     */
    class LazyWhereList<T> extends LazyDataList<T, T> {
        f: UPredicate<T>;
        constructor(data: Iterable<T>, f: UPredicate<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    /**
     * Output of `list.while()`.
     */
    class LazyWhileList<T> extends LazyDataList<T, T> {
        f: UPredicate<T>;
        constructor(data: Iterable<T>, f: UPredicate<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    /**
     * Output of `list.skip()`.
     */
    class LazySkipList<T> extends LazyDataList<T, T> {
        n: number;
        constructor(data: Iterable<T>, n: number);
        [Symbol.iterator](): Iterator<T>;
    }
    /**
     * Output of `list.take()`.
     */
    class LazyTakeList<T> extends LazyDataList<T, T> {
        n: number;
        outer: UMode | boolean;
        constructor(data: Iterable<T>, n: number, outer?: UMode | boolean);
        /**
         * Utility function that takes `n` elements from `iter`.
         * @param iter The marked iterator
         * @param n The elements to take
         * @param outer If truthy and `n` is more than the iterator length, the output will be forced to have length `n` by yielding as many `undefined` as needed
         */
        static take<T>(iter: UMarkedIterator<T>, n: number, outer?: UMode | boolean): Generator<any, void, unknown>;
        [Symbol.iterator](): Iterator<T>;
    }
    /**
     * Output of `list.slice()`.
     */
    class LazySliceList<T> extends LazyDataList<T, LazyList<T>> {
        n: number;
        outer: UMode | boolean;
        lazy: boolean;
        constructor(data: Iterable<T>, n: number, outer?: UMode | boolean, lazy?: boolean);
        [Symbol.iterator](): Iterator<LazyList<T>>;
    }
    /**
     * Element of the output of `list.groupBy()`.
     * The group common value is contained in the "key" property.
     * The group is a `LazyList` itself.
     */
    class UGrouping<K, V> extends LazyDataList<V, V> {
        key: K;
        constructor(key: K, data: Iterable<V>);
    }
    /**
     * Output of `list.groupBy()`.
     */
    class LazyGroupByList<K, V> extends LazyDataList<V, UGrouping<K, V>> {
        f: UConvert<V, K, UGrouping<K, V>>;
        constructor(data: Iterable<V>, f: UConvert<V, K, UGrouping<K, V>>);
        [Symbol.iterator](): Iterator<UGrouping<K, V>>;
    }
    /**
     * Output of `list.sort()`.
     */
    class LazySortList<T> extends LazyDataList<T, T> {
        f?: UCombine<T, T, number, T>;
        desc: boolean;
        constructor(data: Iterable<T>, f?: UCombine<T, T, number, T>, desc?: boolean);
        [Symbol.iterator](): Iterator<T>;
    }
    /**
     * Output of `list.reverse()`.
     */
    class LazyReverseList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    /**
     * Output of `list.repeat()`.
     */
    class LazyRepeatList<T> extends LazyDataList<T, T> {
        n: number;
        constructor(data: Iterable<T>, n: number);
        [Symbol.iterator](): Iterator<T>;
    }
    /**
     * Output of `list.cache()`.
     */
    class LazyCacheList<O> extends LazyDataList<O, O> {
        result: O[];
        iter: UMarkedIterator<O>;
        constructor(data: Iterable<O>);
        [Symbol.iterator](): Iterator<O>;
        at<T = null>(n: number, def?: T): O | T;
        get count(): number;
    }
    /**
     * Output of `list.wrap()`.
     */
    class LazyWrapList<T> extends LazyList<T> {
        data: T;
        constructor(data: T);
        [Symbol.iterator](): Generator<T, void, unknown>;
        first(): T;
        last(): T;
        has(v: T): boolean;
        get value(): T[];
        get count(): number;
    }
}
declare const _default: typeof LazyList.LazyList & typeof LazyList;
export = _default;
