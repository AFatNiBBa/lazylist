/**
 * Returns a {@link LazyList.LazyAbstractList} based on an iterable.
 * If {@link source} is already a {@link LazyList.LazyAbstractList}, it gets returned directly, otherwise it gets wrapped in a {@link LazyList.LazyFixedList}
 * @param source The iterable
 */
declare function LazyList<T = any>(source?: Iterable<T>): LazyList.LazyAbstractList<T>;
declare namespace LazyList {
    const from: typeof LazyList;
    /** A function that indicates the "truthyness" of a value */
    type Predicate<T, TList = Iterable<T>> = (x: T, i: number, list: TList) => boolean | any;
    /** A function that converts a value */
    type Convert<X, Y, TList = Iterable<Y>> = (x: X, i: number, list: TList) => Y;
    /** A function that takes two arguments and combines them */
    type Combine<A, B, TResult = A, TList = Iterable<TResult>> = (a: A, b: B, i: number, list: TList) => TResult;
    /**
     * An iterator that may have a {@link MarkedIterator.done} property.
     * If not present is `false` by default
     */
    type MarkedIterator<T> = Iterator<T> & {
        done?: boolean;
    };
    /** Indicates how two iterable should be conbined it they have different sizes */
    enum JoinMode {
        /** The length of the output is equal to the length of the shorter iterable */
        inner = 0,
        /** The length of the output is equal to the length of the base iterable */
        left = 1,
        /** The length of the output is equal to the length of the input iterable */
        right = 2,
        /** The length of the output is equal to the length of the longer iterable */
        outer = 3
    }
    /**
     * Makes every {@link Generator} extend from {@link LazyList.LazyAbstractList}
     * @returns The library itself
     */
    function attachIterator(): typeof LazyList;
    /**
     * Returns an auto-generated list of numbers
     * @param end The end of the sequence
     * @param start The begin of the sequence
     * @param step The difference between each step of the sequence
     * @param flip If `true` the sequence will be reversed (If {@link end} is less than `0` it will be `true` by default)
     */
    function range(end?: number, start?: number, step?: number, flip?: boolean): LazyRangeList;
    /** An iterable wrapper with helper functions */
    abstract class LazyAbstractList<T> {
        abstract [Symbol.iterator](): Iterator<T>;
        /**
         * Ensures every element of the list shows up only once
         * @param f A conversion function that returns the the part of the element to check duplicates for; If omitted, the element itself will be used
         */
        distinct<TKey>(f?: Convert<T, TKey, LazyDistinctList<TKey, T>>): LazyDistinctList<TKey, T>;
        /**
         * Filters the list based on {@link f}
         * @param p A predicate function; If no function is given, falsy elements will be filtered out
         */
        where(p?: Predicate<T, LazyWhereList<T>>): LazyWhereList<T>;
        /**
         * If {@link p} matches on an element, it gets converted by {@link f}, otherwise it gets converted by {@link e}
         * @param p A predicate function
         * @param f A conversion function
         * @param e A conversion function; If no function is given, the current element will be yielded without modifications
         */
        when(p: Predicate<T, LazyWhenList<T>>, f: Convert<T, T, LazyWhenList<T>>, e?: Convert<T, T, LazyWhenList<T>>): LazyWhenList<T>;
        /**
         * Converts the list based on {@link f}
         * @param f A conversion function
         */
        select<TResult>(f: Convert<T, TResult, LazySelectList<T, TResult>>): LazySelectList<T, TResult>;
        /**
         * Converts the current list to an iterables list based on {@link f} and concats every element
         * @param f A conversion function; Can be omitted if every element is iterable
         */
        selectMany<TResult>(f?: Convert<T, Iterable<TResult>, LazySelectManyList<T, TResult>>): LazySelectManyList<T, TResult>;
        /**
         * Merges the current list to {@link other}
         * @param other An iterable
         */
        merge(other: Iterable<T>, flip?: boolean): LazyMergeList<T>;
        /**
         * Adds a value at the end of the list
         * @param value The value to add
         * @param flip If `true` the value will be added at the beginning of the list
         */
        append(value: T, flip?: boolean): LazyAppendList<T>;
        /**
         * Adds a value at the beginning of the list.
         * Is the same as passing the value to {@link append} with `true` as the second argument
         * @param value The value to add
         */
        prepend(value: T): LazyAppendList<T>;
        /**
         * Forces the list to have at least one element by adding a default value if the list is empty
         * @param def The value to add if the list is empty
         */
        defaultIfEmpty(def?: T): LazyDefaultIfEmptyList<T>;
        /**
         * Repeat the list's elements {@link n} times.
         * The list is calculated each time.
         * Wrap the list in a {@link LazyCacheList} (Or use the {@link cache} method) to cache the elements
         * @param n The number of repetitions
         */
        repeat(n: number): LazyRepeatList<T>;
        /**
         * Reverses the list.
         * Non lazy
         */
        reverse(): LazyAbstractList<T>;
        /**
         * Orders the list; It counts the elements so that it is faster when there are a lot of copies (For that reason, the index is not available on {@link f} since it would be wrong).
         * Non lazy
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc If `true`, reverses the results
         */
        sort(f?: Combine<T, T, number, LazySortList<T>>, desc?: boolean): LazySortList<T>;
        /**
         * Replaces a section of the list with a new one based on {@link f}, which will be provided with the original section
         * @param start The start index of the section
         * @param length The length of the section
         * @param f The function that will provide the new section
         * @param lazy If `true` the section will be lazy but mono-use, and each element not taken will be appended after the new section
         */
        splice(start: number, length?: number, f?: (x: LazyFixedList<T, T>) => Iterable<T>, lazy?: boolean): LazySpliceList<T>;
        /**
         * Throws a {@link RangeError} if the list has not exactly {@link n} elements.
         * Notice that if the iteration its stopped before the end the input list could have more than {@link n} elements
         * @param n The number of elements the list must have
         */
        fixedCount(n: number): LazyFixedCountList<T>;
        /**
         * Skips the first {@link p} elements of the list
         * @param p The elements to skip (Use a negative number to skip from the end); If a function is given, it will be called for each element and the elements will be skipped until the function returns `false`
         */
        skip(p: Predicate<T, LazySkipList<T>> | number): LazySkipList<T>;
        /**
         * Takes the first {@link p} elements of the list and skips the rest
         * @param p The elements to take (Use a negative number to take from the end); If a function is given, it will be called for each element and the elements will be taken until the function returns `false`
         * @param mode If truthy and {@link p} is more than the list length, the output list will be forced to have length {@link p} by concatenating as many `undefined` as needed
         */
        take(p: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean): LazyTakeList<T>;
        /**
         * Combines the current list with {@link other} based on {@link f}
         * @param other An iterable
         * @param f A combination function
         * @param mode Different length handling
         */
        zip<TOther, TResult>(other: Iterable<TOther>, f?: Combine<T, TOther, TResult, LazyZipList<T, TOther, TResult>>, mode?: JoinMode): LazyZipList<T, TOther, TResult>;
        /**
         * Joins the current list with {@link other} based on {@link f}, where the condition {@link p} is met.
         * If no {@link p} argument is supplied, the method does the cartesian product of the two lists (And {@link mode} becomes useless).
         * If {@link mode} is not {@link JoinMode.inner}, `undefined` will be supplied as the missing element.
         * The index available in the functions is the one of the "left" part in the {@link JoinMode.inner} operation, and `-1` in the {@link JoinMode.outer} part.
         * The {@link JoinMode.right} part ({@link other}) will be calculeted one time for each element of the {@link JoinMode.left} part and must be of the same size each time.
         * Wrap {@link other} in a {@link LazyCacheList} (Or use the {@link cache} method) to cache the elements
         * @param other An iterable
         * @param p A filter function
         * @param f A combination function
         * @param mode Different length handling
         */
        join<TOther, TResult>(other: Iterable<TOther>, p?: Combine<T, TOther, boolean, LazyJoinList<T, TOther, TResult>>, f?: Combine<T, TOther, TResult, LazyJoinList<T, TOther, TResult>>, mode?: JoinMode): LazyJoinList<T, TOther, TResult>;
        /**
         * Groups the list's elements based on a provided function.
         * Non lazy
         * @param f A combination function
         */
        groupBy<TKey>(f: Convert<T, TKey, LazyGroupByList<TKey, T>>): LazyGroupByList<TKey, T>;
        /**
         * Groups the list's elements, {@link n} at a time.
         * Non lazy by default (It calculates {@link n} elements at a time), but can be made lazy by setting {@link lazy} as `true`.
         * If the list is set to lazy you should NEVER calculate the parent iterator before the childrens, like:
         * ```
         * LazyList.from([ 1, 2, 3 ]).split(2, false, true).value; // Stops
         * ```
         * Additionally a lot of unexpected behaviours could occur
         * @param n The length of each slice
         * @param mode If truthy, every slice will be forced to have {@link n} elements by concatenating as many `undefined` as needed
         * @param lazy Indicates if the list should be lazy (and unsafe)
         */
        split(n: number, mode?: JoinMode | boolean, lazy?: boolean): LazySplitList<T>;
        /** Caches the list's calculated elements, this prevent them from passing inside the pipeline again */
        cache(): LazyCacheList<T>;
        /** Calculates each element of the list and wraps them in a {@link LazyFixedList} */
        calc(): LazyFixedList<T, T>;
        /** Calculates and awaits each element of the list and wraps them in a {@link LazyFixedList} */
        await<TAwaited>(this: LazyAbstractList<PromiseLike<TAwaited>>): Promise<LazyFixedList<TAwaited, TAwaited>>;
        /**
         * Converts the list based on {@link f}
         * @param f A conversion function, to which values of the awaited type of {@link T} will be passed
         */
        then<TAwaited, TResult>(this: LazyAbstractList<PromiseLike<TAwaited>>, f: Convert<TAwaited, TResult, LazySelectList<PromiseLike<TAwaited>, Promise<TResult>>>): LazySelectList<PromiseLike<TAwaited>, Promise<TResult>>;
        /**
         * Catches the promise errors using the {@link f} function
         * @param f A conversion function, to which errors of the list's promises will be passed
         */
        catch<TAwaited>(this: LazyAbstractList<PromiseLike<TAwaited>>, f: Convert<any, TAwaited, LazySelectList<PromiseLike<TAwaited>, Promise<TAwaited>>>): LazySelectList<PromiseLike<TAwaited>, Promise<TAwaited>>;
        /** Outputs a {@link LazyFixedList} that will contain the current one as its only element */
        wrap(): LazyFixedList<this, this>;
        /**
         * Filters the list returning only the elements which are instances of {@link ctor}
         * @param ctor A constructor
         */
        ofType<TResult extends T>(ctor: new (...args: any[]) => TResult): LazyWhereList<TResult>;
        /**
         * Executes {@link f} on each element of the list and returns the current element (not the output of {@link f})
         * @param f A function
         */
        but(f: Convert<T, void, LazySelectList<T, T>>): LazySelectList<T, T>;
        /**
         * Executes {@link Object.assign} on each element passing {@link obj} as the second parameter
         * @param obj An object
         */
        assign<TMap>(obj: TMap): LazySelectList<T, T & TMap>;
        /**
         * Returns a section of the list, starting at {@link start} and with {@link length} elements
         * @param start The index to start at; Can be whatever you can pass as the first argument of {@link skip}
         * @param length The length of the section; Can be whatever you can pass as the first argument of {@link take}
         * @param mode If truthy and {@link length} is more than the list length, the output list will be forced to have length {@link length} by concatenating as many `undefined` as needed
         */
        slice(start: Predicate<T, LazySkipList<T>> | number, length: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean): LazyTakeList<T>;
        /**
         * Returns the element at the provided index
         * @param n The index; If negative it starts from the end
         * @param def The default value
         */
        at(n: number, def?: T): T;
        /**
         * Gets the last element of the list or {@link def} as default if it's empty
         * @param def The default value
         */
        last(def?: T): T;
        /**
         * Gets the first element of the list or {@link def} as default if it's empty.
         * Can be used as `next()` when the source iterable is a generator
         * @param def The default value
         */
        first(def?: T): T;
        /**
         * Gets the first element of the list if it has exactly `1` element, otherwise the provided value as default, unless none is passed, in that case it throws a `RangeError`
         * @param def The default value; If provided, it will be returned instead of throwing an error
         */
        single(def?: T): T;
        /**
         * Aggregates the list based on {@link f}
         * @param f A combination function
         * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration)
         */
        aggregate<TResult = T>(f: Combine<TResult, T, TResult, LazyAbstractList<T>>, out?: TResult): TResult;
        /**
         * Returns `true` if {@link f} returns `true` for every element of the list
         * @param f A predicate function; It defaults to the identity function
         */
        all<TResult>(f?: Convert<T, TResult, LazyAbstractList<T>>): boolean;
        /**
         * Returns `true` if {@link f} returns `true` for at least one element of the list
         * @param f A predicate function; It defaults to the identity function
         */
        any<TResult>(f?: Convert<T, TResult, LazyAbstractList<T>>): boolean;
        /**
         * Returns `true` if a value is in the list; If {@link value} is not provided, it will return `true` if there is at least an element in the list
         * @param value The value
         */
        has(value?: T): boolean;
        /**
         * Returns the index of {@link value} in the list if found, `-1` otherwise
         * @param value The value to search for
         */
        indexOf(value: T): number;
        /**
         * Executes the predicate function on each element of the list and returns the first element for which it returns `true` and its index
         * @param p A predicate function
         * @returns The index of the first element for which the predicate returns `true` end the element itself
         */
        find(p: Predicate<T, LazyAbstractList<T>>): [number, T];
        /**
         * Joins the list elements using {@link sep} as the separator
         * @param sep The separator
         */
        concat(sep?: string): string;
        /** Aggregates the list using the `+` operator (Can both add numbers and concatenate strings) */
        get sum(): T extends number ? number : string;
        /** Calculates the average of the elements of the list */
        get avg(): T extends number ? number : typeof NaN;
        /** Calculates the length of the list */
        get count(): number;
        /** Returns the biggest number in the list */
        get max(): T;
        /** Returns the smallest number in the list */
        get min(): T;
        /** Calculates each element of the list and puts them inside of an {@link Array} */
        get value(): T[];
    }
    /**
     * Instances of this class are guaranteed to have a base iterable.
     * The input iterable's elements are of type {@link I} and the output's ones are of type {@link O}
     */
    abstract class LazySourceList<I, O> extends LazyAbstractList<O> {
        source?: Iterable<I>;
        constructor(source?: Iterable<I>);
        [Symbol.iterator](): Generator<any, void, any>;
        base(): I[];
    }
    /**
     * Output of {@link LazyList}.
     * Instances of this class have the {@link fastCount} property, which returns the length of the iterable if it is easy to compute, otherwise it returns `-1`
     */
    class LazyFixedList<I, O = I> extends LazySourceList<I, O> {
        get fastCount(): number;
    }
    /** Output of {@link range} */
    class LazyRangeList extends LazyAbstractList<number> {
        end: number;
        start: number;
        step: number;
        flip?: boolean;
        constructor(end?: number, start?: number, step?: number, flip?: boolean);
        [Symbol.iterator](): Iterator<number>;
        reverse(): LazyAbstractList<number>;
    }
    /** Output of {@link distinct} */
    class LazyDistinctList<TKey, T> extends LazySourceList<T, T> {
        f?: Convert<T, TKey, LazyDistinctList<TKey, T>>;
        constructor(source: Iterable<T>, f?: Convert<T, TKey, LazyDistinctList<TKey, T>>);
        [Symbol.iterator](): Generator<T, void, unknown>;
    }
    /** Output of {@link where} */
    class LazyWhereList<T> extends LazySourceList<T, T> {
        p?: Predicate<T, LazyWhereList<T>>;
        constructor(source: Iterable<T>, p?: Predicate<T, LazyWhereList<T>>);
        [Symbol.iterator](): Generator<T, void, unknown>;
    }
    /** Output of {@link when} */
    class LazyWhenList<T> extends LazyFixedList<T, T> {
        p: Predicate<T, LazyWhenList<T>>;
        f: Convert<T, T, LazyWhenList<T>>;
        e?: Convert<T, T, LazyWhenList<T>>;
        constructor(source: Iterable<T>, p: Predicate<T, LazyWhenList<T>>, f: Convert<T, T, LazyWhenList<T>>, e?: Convert<T, T, LazyWhenList<T>>);
        [Symbol.iterator](): Generator<T, void, unknown>;
    }
    /** Output of {@link select} */
    class LazySelectList<I, O> extends LazyFixedList<I, O> {
        f: Convert<I, O, LazySelectList<I, O>>;
        constructor(source: Iterable<I>, f: Convert<I, O, LazySelectList<I, O>>);
        [Symbol.iterator](): Generator<O, void, unknown>;
    }
    /** Output of {@link selectMany} */
    class LazySelectManyList<I, O> extends LazySourceList<I, O> {
        f?: Convert<I, Iterable<O>, LazySelectManyList<I, O>>;
        constructor(source: Iterable<I>, f?: Convert<I, Iterable<O>, LazySelectManyList<I, O>>);
        [Symbol.iterator](): Generator<any, void, any>;
    }
    /** Output of {@link merge} */
    class LazyMergeList<T> extends LazySourceList<T, T> {
        other: Iterable<T>;
        flip: boolean;
        constructor(source: Iterable<T>, other: Iterable<T>, flip?: boolean);
        [Symbol.iterator](): Generator<T, void, undefined>;
    }
    /** Output of {@link append} */
    class LazyAppendList<T> extends LazyFixedList<T, T> {
        v: T;
        flip: boolean;
        constructor(source: Iterable<T>, v: T, flip?: boolean);
        [Symbol.iterator](): Generator<T, void, undefined>;
        get fastCount(): number;
    }
    /** Output of {@link defaultIfEmpty} */
    class LazyDefaultIfEmptyList<T> extends LazyFixedList<T, T> {
        def: T;
        constructor(source: Iterable<T>, def?: T);
        [Symbol.iterator](): Generator<T, void, unknown>;
    }
    /** Output of {@link repeat} */
    class LazyRepeatList<T> extends LazyFixedList<T, T> {
        n: number;
        constructor(source: Iterable<T>, n: number);
        [Symbol.iterator](): Generator<T, void, undefined>;
        get fastCount(): number;
    }
    /** Output of {@link reverse} */
    class LazyReverseList<T> extends LazyFixedList<T, T> {
        constructor(source: Iterable<T>);
        [Symbol.iterator](): Generator<T, void, unknown>;
    }
    /** Output of {@link sort} */
    class LazySortList<T> extends LazyFixedList<T, T> {
        f?: Combine<T, T, number, LazySortList<T>>;
        desc: boolean;
        constructor(source: Iterable<T>, f?: Combine<T, T, number, LazySortList<T>>, desc?: boolean);
        [Symbol.iterator](): Generator<T, void, unknown>;
    }
    /** Output of {@link splice} */
    class LazySpliceList<T> extends LazySourceList<T, T> {
        start: number;
        length: number;
        f?: (x: LazyFixedList<T, T>) => Iterable<T>;
        lazy: boolean;
        constructor(source: Iterable<T>, start: number, length?: number, f?: (x: LazyFixedList<T, T>) => Iterable<T>, lazy?: boolean);
        [Symbol.iterator](): Generator<T, void, undefined>;
    }
    /** Output of {@link LazyAbstractList.fixedCount} */
    class LazyFixedCountList<T> extends LazyFixedList<T, T> {
        n: number;
        constructor(source: Iterable<T>, n: number);
        [Symbol.iterator](): Generator<T, void, unknown>;
        get fastCount(): number;
    }
    /** Output of {@link LazyAbstractList.skip} */
    class LazySkipList<T> extends LazySourceList<T, T> {
        p: Predicate<T, LazySkipList<T>> | number;
        constructor(source: Iterable<T>, p: Predicate<T, LazySkipList<T>> | number);
        static skip<T>(iter: MarkedIterator<T>, n: number): Generator<T, void, unknown>;
        [Symbol.iterator](): Generator<T, void, unknown>;
    }
    /** Output of {@link LazyAbstractList.take} */
    class LazyTakeList<T> extends LazySourceList<T, T> {
        p: Predicate<T, LazyTakeList<T>> | number;
        mode: JoinMode | boolean;
        constructor(source: Iterable<T>, p: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean);
        static take<T>(iter: MarkedIterator<T>, n: number, mode?: JoinMode | boolean): Generator<T, void, unknown>;
        [Symbol.iterator](): Generator<T, void, unknown>;
    }
    /** Output of {@link zip} */
    class LazyZipList<A, B, TResult> extends LazySourceList<A, TResult> {
        other: Iterable<B>;
        f?: Combine<A, B, TResult, LazyZipList<A, B, TResult>>;
        mode: JoinMode;
        constructor(source: Iterable<A>, other: Iterable<B>, f?: Combine<A, B, TResult, LazyZipList<A, B, TResult>>, mode?: JoinMode);
        [Symbol.iterator](): Generator<any[] | TResult, void, unknown>;
    }
    /** Output of {@link join} */
    class LazyJoinList<A, B, TResult> extends LazySourceList<A, TResult> {
        other: Iterable<B>;
        p?: Combine<A, B, boolean, LazyJoinList<A, B, TResult>>;
        f?: Combine<A, B, TResult, LazyJoinList<A, B, TResult>>;
        mode: JoinMode;
        constructor(source: Iterable<A>, other: Iterable<B>, p?: Combine<A, B, boolean, LazyJoinList<A, B, TResult>>, f?: Combine<A, B, TResult, LazyJoinList<A, B, TResult>>, mode?: JoinMode);
        [Symbol.iterator](): Generator<TResult | (A | B)[], void, unknown>;
    }
    /**
     * Element of the output of {@link groupBy}.
     * The group common value is contained in the {@link key} property.
     * The group is a {@link LazyAbstractList} itself
     */
    class Grouping<K, V> extends LazyFixedList<V, V> {
        key: K;
        constructor(key: K, source: Iterable<V>);
    }
    /** Output of {@link groupBy} */
    class LazyGroupByList<K, V> extends LazySourceList<V, Grouping<K, V>> {
        f: Convert<V, K, LazyGroupByList<K, V>>;
        constructor(source: Iterable<V>, f: Convert<V, K, LazyGroupByList<K, V>>);
        [Symbol.iterator](): Generator<Grouping<K, V>, void, unknown>;
    }
    /** Output of {@link split} */
    class LazySplitList<T> extends LazySourceList<T, LazyAbstractList<T>> {
        n: number;
        mode: JoinMode | boolean;
        lazy: boolean;
        constructor(source: Iterable<T>, n: number, mode?: JoinMode | boolean, lazy?: boolean);
        [Symbol.iterator](): Generator<LazyFixedList<T, T>, void, unknown>;
    }
    /** Output of {@link cache} */
    class LazyCacheList<T> extends LazyFixedList<T, T> {
        #private;
        result: T[];
        done: boolean;
        constructor(source: Iterable<T>);
        [Symbol.iterator](): Generator<T, void, unknown>;
        at(n: number, def?: T): any;
        last(def?: T): T;
        get fastCount(): number;
        get iter(): Iterator<T, any, undefined>;
    }
}
export = LazyList;
