
/**
 * Returns a {@link LazyList.LazyAbstractList} based on an iterable.
 * If {@link source} is already a {@link LazyList.LazyAbstractList}, it gets returned directly, otherwise it gets wrapped in a {@link LazyList.LazyFixedList}
 * @param source The iterable
 */
function LazyList<T = any>(source?: Iterable<T>): LazyList.LazyAbstractList<T> {
    return source instanceof LazyList.LazyAbstractList
        ? source
        : new LazyList.LazyFixedList(source);
}

namespace LazyList {
    export const from = LazyList;

    /** Represents data structure with a numeric indexer and a length that do not need to be writable */
    export type ReadOnlyIndexable<T> = { readonly [k: number]: T, readonly length: number };

    /** A function that indicates the "truthyness" of a value */
    export type Predicate<T, TList = Iterable<T>> = (x: T, i: number, list: TList) => boolean | any;

    /** A function that converts a value */
    export type Convert<X, Y, TList = Iterable<Y>> = (x: X, i: number, list: TList) => Y;

    /** A function that takes two arguments and combines them */
    export type Combine<A, B, TResult = A, TList = Iterable<TResult>> = (a: A, b: B, i: number, list: TList) => TResult;

    /**
     * An iterator that may have a {@link MarkedIterator.done} property.
     * If not present is `false` by default
     */
    export type MarkedIterator<T> = Iterator<T> & { done?: boolean };

    /** Indicates how two iterable should be conbined it they have different sizes */
    export enum JoinMode {
        /** The length of the output is equal to the length of the shorter iterable */
        inner = 0b00,
        /** The length of the output is equal to the length of the base iterable */
        left =  0b01,
        /** The length of the output is equal to the length of the input iterable */
        right = 0b10,
        /** The length of the output is equal to the length of the longer iterable */
        outer = left | right
    }

    /**
     * Makes {@link ctor} extend from {@link LazyList.LazyAbstractList}
     * @param ctor The constructor to which you want to change the base class; If not provided, it will apply the functionalities to {@link Generator}
     * @returns The library itself
     */
    export function attachIterator(ctor?: abstract new (...args: any[]) => any): typeof LazyList {
        //@ts-ignore
        (ctor?.prototype ?? (function*(){})().__proto__.__proto__.__proto__).__proto__ = LazyAbstractList.prototype;
        return LazyList;
    }

    /**
     * Returns the length of the iterable if it is easy to compute, otherwise it returns `-1`
     * @param source The iterable from which to get the count
     */
    export function fastCount(source: Iterable<any>): number {
        return source == null
            ? 0
            : typeof source === "string" || source instanceof String || source instanceof Array
                ? source.length
                : source instanceof Set || source instanceof Map
                    ? source.size
                    : source instanceof LazyList.LazyAbstractList
                        ? source.fastCount
                        : -1;
    }

    /**
     * Creates a {@link LazyFixedList} based on a non-iterable iterator
     * @param iter The iterator
     */
    export function fromIterator<T>(iter: Iterator<T>): LazyFixedList<T> {
        return new LazyFixedList({ [Symbol.iterator]: () => iter });
    }

    /**
     * Returns an INFINITE sequence of random numbers comprised between {@link bottom} and {@link top}.
     * Since the sequence is infinite, it will create problems with non lazy methods.
     * Since the sequence is random, it will not be the same every time you calculate it
     * @param top The highest number in the sequence
     * @param bottom The lowest number in the sequence
     */
    export function rand(top?: number, bottom?: number) {
        return new LazyRandList(top, bottom);
    }

    /**
     * Returns an auto-generated list of numbers
     * @param end The end of the sequence
     * @param start The begin of the sequence
     * @param step The difference between each step of the sequence
     * @param flip If `true` the sequence will be reversed (If {@link end} is less than `0` it will be `true` by default)
     */
    export function range(end?: number, start?: number, step?: number, flip?: boolean) {
        return new LazyRangeList(end, start, step, flip);
    }

    /**
     * Creates an iterable that stores only a chunk of data at the time and changes the loaded chunk when the index is out of range.
     * Can be freely accessed by index
     * @param f A function that generates a chunk of data starting from the given index
     * @param offset If an index is out of range, the loaded chunk will start this amount of elements before the index
     */
    export function buffer<T>(f: (n: number, list: LazyBufferList<T>) => ReadOnlyIndexable<T>, offset?: number) {
        return new LazyBufferList(f, offset);
    }

    /** An iterable wrapper with helper functions */
    export abstract class LazyAbstractList<T> {
        abstract [Symbol.iterator](): Generator<T>;

        /**
         * Ensures every element of the list shows up only once
         * @param f A conversion function that returns the the part of the element to check duplicates for; If omitted, the element itself will be used
         */
        distinct<TKey = T>(f?: Convert<T, TKey, LazyDistinctList<TKey, T>>) {
            return new LazyDistinctList<TKey, T>(this, f);
        }

        /**
         * Ensures no element of {@link other} shows up in the list.
         * Every time the iteration starts, {@link other} is completely calculated
         * @param f A conversion function that returns the the part of the element to check for in the list; If omitted, the element itself will be used
         */
        except<TKey = T>(other: Iterable<TKey>, f?: Convert<T, TKey, LazyDistinctList<TKey, T>>) {
            return new LazyExceptList<TKey, T>(this, other, f);
        }

        /**
         * Filters the list based on {@link f}
         * @param p A predicate function; If no function is given, falsy elements will be filtered out
         */
        where(p?: Predicate<T, LazyWhereList<T>>) {
            return new LazyWhereList<T>(this, p);
        }

        /**
         * If {@link p} matches on an element, it gets converted by {@link f}, otherwise it gets converted by {@link e}
         * @param p A predicate function
         * @param f A conversion function
         * @param e A conversion function; If no function is given, the current element will be yielded without modifications
         */
        when(p: Predicate<T, LazyWhenList<T>>, f: Convert<T, T, LazyWhenList<T>>, e?: Convert<T, T, LazyWhenList<T>>) {
            return new LazyWhenList<T>(this, p, f, e);
        }

        /**
         * If {@link p} does NOT match on an element, it gets yielded, otherwise it gets passed into {@link f} and it gets filtered out
         * @param p A predicate function
         * @param f A function
         */
        case(p: Predicate<T, LazyCaseList<T>>, f: Convert<T, void, LazyCaseList<T>>) {
            return new LazyCaseList<T>(this, p, f);
        }

        /**
         * Converts and filters the list based on {@link f} at the same time.
         * Usage:
         * ```
         * LazyList.from([ 1, 2, 3 ]).selectWhere(x => {
         *    if (x.value % 2) {
         *        x.result = x.value + 2;
         *        return true;
         *    }
         *    return false;
         * }).value //=> [ 3, 5 ]
         * ```
         * @param f A predicate function that gets a box object containing the element in the `value` field; If the function returns `true`, the content of the box's `result` field will be yielded
         */
        selectWhere<TResult>(f: Predicate<{ value: T, result?: TResult }, LazySelectWhereList<T, TResult>>) {
            return new LazySelectWhereList<T, TResult>(this, f);
        }

        /**
         * Converts the list based on {@link f}
         * @param f A conversion function
         */
        select<TResult>(f: Convert<T, TResult, LazySelectList<T, TResult>>) {
            return new LazySelectList<T, TResult>(this, f);
        }

        /**
         * Converts the current list to an iterables list based on {@link f} and concats every element
         * @param f A conversion function; Can be omitted if every element is iterable
         */
        selectMany<TResult = T extends Iterable<infer U> ? U : never>(f?: Convert<T, Iterable<TResult>, LazySelectManyList<T, TResult>>) {
            return new LazySelectManyList<T, TResult>(this, f);
        }
 
        /**
         * Merges the current list to {@link other}
         * @param other An iterable
         */
        merge(other: Iterable<T>, flip?: boolean) {
            return new LazyMergeList(this, other, flip);
        }

        /**
         * Adds a value at the end of the list
         * @param value The value to add
         * @param flip If `true` the value will be added at the beginning of the list
         */
        append(value: T, flip?: boolean) {
            return new LazyAppendList(this, value, flip);
        }

        /**
         * Adds a value at the beginning of the list.
         * Is the same as passing the value to {@link append} with `true` as the second argument
         * @param value The value to add
         */
        prepend(value: T) {
            return new LazyAppendList(this, value, true);
        }

        /**
         * Forces the list to have at least one element by adding a default value if the list is empty
         * @param def The value to add if the list is empty
         */
        defaultIfEmpty(def?: T) {
            return new LazyDefaultIfEmptyList(this, def);
        }

        /**
         * Repeat the list's elements {@link n} times.
         * The list is calculated each time.
         * Wrap the list in a {@link LazyCacheList} (Or use the {@link cache} method) to cache the elements
         * @param n The number of repetitions
         */
        repeat(n: number) {
            return new LazyRepeatList(this, n);
        }

        /**
         * Reverses the list.
         * Non lazy
         */
        reverse(): LazyAbstractList<T> {
            return new LazyReverseList(this);
        }

        /**
         * Orders the list; It counts the elements so that it is faster when there are a lot of copies (For that reason, the index is not available on {@link f} since it would be wrong).
         * Non lazy
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc If `true`, reverses the results
         */
        sort(f?: Combine<T, T, number, LazySortList<T>>, desc?: boolean) {
            return new LazySortList<T>(this, f, desc);
        }

        /**
         * Replaces a section of the list with a new one based on {@link f}, which will be provided with the original section
         * @param start The start index of the section
         * @param length The length of the section
         * @param f The function that will provide the new section
         * @param lazy If `true` the section will be lazy but mono-use, and each element not taken will be appended after the new section
         */
        splice(start: number, length?: number, f?: (x: LazyFixedList<T, T>) => Iterable<T>, lazy?: boolean) {
            return new LazySpliceList<T>(this, start, length, f, lazy);
        }

        /**
         * Throws a {@link RangeError} if the list has not exactly {@link n} elements.
         * Notice that if the iteration its stopped before the end the input list could have more than {@link n} elements
         * @param n The number of elements the list must have
         */
        fixedCount(n: number) {
            return new LazyFixedCountList(this, n);
        }

        /**
         * Skips the first {@link p} elements of the list
         * @param p The elements to skip (Use a negative number to skip from the end); If a function is given, it will be called for each element and the elements will be skipped until the function returns `false`
         */
        skip(p: Predicate<T, LazySkipList<T>> | number) {
            return new LazySkipList<T>(this, p);
        }

        /**
         * Takes the first {@link p} elements of the list and skips the rest
         * @param p The elements to take (Use a negative number to take from the end); If a function is given, it will be called for each element and the elements will be taken until the function returns `false`
         * @param mode If truthy and {@link p} is more than the list length, the output list will be forced to have length {@link p} by concatenating as many {@link def} as needed
         * @param def The value to use if the list is too short
         */
        take(p: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean, def?: T) {
            return new LazyTakeList<T>(this, p, mode, def);
        }

        /**
         * Force the list to have at least {@link n} elements by concatenating as many {@link def} as needed at the beginning of the list.
         * If you want to pad at the end, use {@link take} instead (Be carefull to pass `true` as the second argument)
         * @param n The number of desired elements
         * @param def The value to use if the list is too short
         */
        padStart(n: number, def?: T) {
            return new LazyPadStartList(this, n, def);
        }

        /**
         * Combines the current list with {@link other} based on {@link f}
         * @param other An iterable
         * @param f A combination function
         * @param mode Different length handling
         */
        zip<TOther, TResult = [ T, TOther ]>(other: Iterable<TOther>, f?: Combine<T, TOther, TResult, LazyZipList<T, TOther, TResult>>, mode?: JoinMode) {
            return new LazyZipList<T, TOther, TResult>(this, other, f, mode);
        }

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
        join<TOther, TResult = [ T, TOther ]>(other: Iterable<TOther>, p?: Combine<T, TOther, boolean, LazyJoinList<T, TOther, TResult>>, f?: Combine<T, TOther, TResult, LazyJoinList<T, TOther, TResult>>, mode?: JoinMode) {
            return new LazyJoinList<T, TOther, TResult>(this, other, p, f, mode);
        }

        /**
         * Groups the list's elements based on a provided function.
         * Similiar to {@link groupBy}, but the groups cannot be completely iterated until the evalueation is finisced, only what is inside them can.
         * You can use the {@link LazyStore.get} method to get the desired group like so:
         * ```
         * const store = LazyList.from([ 1, 2, 3 ]).storeBy(x => x % 2);
         * store.get(1).value //=> [ 1, 3 ]
         * ```
         * This allows the groups to be lazy
         * @param f A combination function
         */
        storeBy<TKey>(f: Convert<T, TKey, LazyStoreByList<TKey, T>>) {
            return new LazyStore<TKey, T>(this, f);
        }

        /**
         * Groups the list's elements based on a provided function.
         * Non lazy
         * @param f A combination function
         */
        groupBy<TKey>(f: Convert<T, TKey, LazyGroupByList<TKey, T>>) {
            return new LazyGroupByList<TKey, T>(this, f);
        }

        /**
         * Groups the list's elements, {@link n} at a time.
         * Non lazy by default (It calculates {@link n} elements at a time), but can be made lazy by setting {@link lazy} as `true`.
         * If the list is set to lazy there could be an empty (Even if {@link mode} is truthy) group at the end of the list, this is because there is no way of checking if the iteration has finisced at that point.
         * If the list is set to lazy you should NEVER calculate the parent iterator before the childrens, like:
         * ```
         * LazyList.from([ 1, 2, 3 ]).split(2, false, true).value; // Stops
         * ```
         * Additionally a lot of unexpected behaviours could occur
         * @param n The length of each slice
         * @param mode If truthy, every slice will be forced to have {@link n} elements by concatenating as many {@link def} as needed
         * @param lazy Indicates if the list should be lazy (and unsafe)
         * @param def The value to use if the list is too short
         */
        split(n: number, mode?: JoinMode | boolean, lazy?: boolean, def?: T) {
            return new LazySplitList(this, n, mode, lazy, def);
        }

        /**
         * Returns a {@link LazySet} that contains the elements of the list.
         * The set is lazy, this means that the elements are not calculated until it is checked if they are present.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazySet} will cause unexpected behaviours (Some elements will not be present)
         */
        toSet() {
            return new LazySet(this);
        }

        /**
         * Returns a {@link LazyMap} that contains the elements of the list.
         * The map is lazy, this means that the elements are not calculated until it is checked if they are present or the key is requested.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyMap} will cause unexpected behaviours (Some elements will not be present)
         * @param getK The function that will be used to get the key of each element
         * @param getV The function that will be used to get the value of each element; If not provided the element itself will be used
         */
        toMap<K, V = T>(getK: Convert<T, K, LazyMap<T, K, V>>, getV?: Convert<T, V, LazyMap<T, K, V>>) {
            return new LazyMap(this, getK, getV);
        }

        /**
         * Caches the list's calculated elements, this prevent them from passing inside the pipeline again
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyCacheList} will cause unexpected behaviours (Some elements will not be present)
         */
        cache() {
            return new LazyCacheList(this);
        }

        /** Calculates each element of the list and wraps them in a {@link LazyFixedList} */
        calc() {
            return new LazyFixedList(this.value);
        }

        /** Calculates and awaits each element of the list and wraps them in a {@link LazyFixedList} */
        async await<TAwaited>(this: LazyAbstractList<PromiseLike<TAwaited>>): Promise<LazyFixedList<TAwaited, TAwaited>> {
            return new LazyFixedList<TAwaited, TAwaited>(await Promise.all(this));
        }

        /**
         * Converts the list based on {@link f}
         * @param f A conversion function, to which values of the awaited type of {@link T} will be passed 
         */
        then<TAwaited, TResult>(this: LazyAbstractList<PromiseLike<TAwaited>>, f: Convert<TAwaited, TResult, LazySelectList<PromiseLike<TAwaited>, Promise<TResult>>>) {
            return new LazySelectList<PromiseLike<TAwaited>, Promise<TResult>>(this, async (x, i, list) => f(await x, i, list));
        }

        /**
         * Catches the promise errors using the {@link f} function
         * @param f A conversion function, to which errors of the list's promises will be passed 
         */
        catch<TAwaited>(this: LazyAbstractList<PromiseLike<TAwaited>>, f: Convert<any, TAwaited, LazySelectList<PromiseLike<TAwaited>, Promise<TAwaited>>>) {
            return new LazySelectList<PromiseLike<TAwaited>, Promise<TAwaited>>(this, (x, i, list) => Promise.resolve(x).catch(e => f(e, i, list)));
        }

        /** Outputs a {@link LazyFixedList} that will contain the current one as its only element */
        wrap() {
            return new LazyFixedList([ this ]);
        }

        /**
         * Filters the list returning only the elements which are instances of {@link ctor}
         * @param ctor A constructor
         */
        ofType<TResult extends T>(ctor: new (...args: any[]) => TResult): LazyWhereList<TResult> {
            return new LazyWhereList(this, x => x instanceof ctor) as any;
        }

        /**
         * Executes {@link Object.assign} on each element passing {@link obj} as the second parameter
         * @param obj An object
         */
        assign<TMap>(obj: TMap) {
            return new LazySelectList(this, x => Object.assign(x, obj));
        }

        /**
         * Executes {@link f} on each element of the list and returns the current element (not the output of {@link f})
         * @param f A function
         */
        but(f: Convert<T, void, LazySelectList<T, T>>) {
            return new LazySelectList<T, T>(this, (x, i, list) => (f(x, i, list), x));
        }

        /**
         * Executes {@link f} on each element of the list forcing it to be entirely calculated.
         * If no argument is provided, the list will be just calculated
         * @param f A function
         */
        forEach(f?: Convert<T, void, LazyAbstractList<T>>) {
            var i = 0;
            for (const elm of this)
                f?.(elm, i, this);
        }

        /**
         * Returns a section of the list, starting at {@link start} and with {@link length} elements
         * @param start The index to start at; Can be whatever you can pass as the first argument of {@link skip}
         * @param length The length of the section; Can be whatever you can pass as the first argument of {@link take}
         * @param mode If truthy and {@link length} is more than the list length, the output list will be forced to have length {@link length} by concatenating as many `undefined` as needed
         */
        slice(start: Predicate<T, LazySkipList<T>> | number, length: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean) {
            return this.skip(start).take(length, mode);
        }

        //////////////////////////////////////////////////// AGGREGATE ////////////////////////////////////////////////////

        /**
         * Returns the element at the provided index
         * @param n The index; If negative it starts from the end
         * @param def The default value
         */
        at(n: number, def: T = null): T {
            if (n < 0)
            {
                const temp = this.value;
                if (n < -temp.length)
                    return def;
                return temp[temp.length + n];
            }
            return this.skip(n).first(def);
        }

        /**
         * Gets the last element of the list or {@link def} as default if it's empty
         * @param def The default value
         */
        last(def: T = null) {
            for (const elm of this)
                def = elm;
            return def;
        }

        /**
         * Gets the first element of the list or {@link def} as default if it's empty.
         * Can be used as `next()` when the source iterable is a generator
         * @param def The default value
         */
        first(def: T = null): T {
            const temp = this[Symbol.iterator]().next();
            return temp.done
                ? def
                : temp.value;
        }

        /**
         * Gets the first element of the list if it has exactly `1` element, otherwise the provided value as default, unless none is passed, in that case it throws a `RangeError`
         * @param def The default value; If provided, it will be returned instead of throwing an error
         */
        single(def?: T): T {
            const temp = this.take(2).value;

            if (temp.length === 1)
                return temp[0];

            if (arguments.length === 0)
                throw new RangeError("List has not exactly 1 element");

            return def;
        }

        /**
         * Aggregates the list based on {@link f}
         * @param f A combination function
         * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration)
         */
        aggregate<TResult = T>(f: Combine<TResult, T, TResult, LazyAbstractList<T>>, out?: TResult): TResult {
            var i = 0;
            for (const e of this)
                out = !i && arguments.length === 1
                    ? e as any as TResult
                    : f(out, e, i, this),
                i++;
            return out;
        }

        /**
         * Returns `true` if {@link f} returns `true` for every element of the list
         * @param f A predicate function; It defaults to the identity function
         */
        all<TResult>(f?: Convert<T, TResult, LazyAbstractList<T>>) {
            var i = 0;
            for (const elm of this)
                if (!(f ? f(elm, i++, this) : elm))
                    return false;
            return true;
        }

        /**
         * Returns `true` if {@link f} returns `true` for at least one element of the list
         * @param f A predicate function; It defaults to the identity function
         */
        any<TResult>(f?: Convert<T, TResult, LazyAbstractList<T>>) {
            var i = 0;
            for (const elm of this)
                if (f ? f(elm, i++, this) : elm)
                    return true;
            return false;
        }

        /**
         * Returns `true` if a value is in the list; If {@link value} is not provided, it will return `true` if there is at least an element in the list
         * @param value The value
         */
        has(value?: T) {
            return arguments.length
                ? this.any(x => Object.is(x, value))
                : !this[Symbol.iterator]().next().done;
        }

        /**
         * Returns the index of {@link value} in the list if found, `-1` otherwise
         * @param value The value to search for
         */
        indexOf(value: T) {
            return this.find(x => Object.is(x, value))[0];
        }

        /**
         * Executes the predicate function on each element of the list and returns the first element for which it returns `true` and its index
         * @param p A predicate function
         * @returns The index of the first element for which the predicate returns `true` end the element itself
         */
        find(p: Predicate<T, LazyAbstractList<T>>): [ number, T ] {
            var i = 0;
            for (const elm of this)
                if (p(elm, i, this))
                    return [ i, elm ];
                else i++;
            return [ -1, null ];
        }

        /**
         * Joins the list elements using {@link sep} as the separator
         * @param sep The separator
         */
        concat(sep: string = ",") {
            return this.aggregate<string>((a, b) => `${ a }${ sep }${ b }`);
        }

        /**
         * Returns the smallest value in the list
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         */
        min(f?: Combine<T, T, number, LazyAbstractList<T>>) {
            return this.aggregate((a, b, i, list) => (f ? f(a, b, i, list) < 0 : a < b) ? a : b);
        }

        /**
         * Returns the biggest value in the list
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         */
        max(f?: Combine<T, T, number, LazyAbstractList<T>>) {
            return this.aggregate((a, b, i, list) => (f ? f(a, b, i, list) > 0 : a > b) ? a : b);
        }

        /** Aggregates the list using the `+` operator (Can both add numbers and concatenate strings) */
        get sum(): T extends number ? number : string {
            //@ts-ignore
            return this.aggregate((a, b) => a + b);
        }

        /** Calculates the average of the elements of the list */
        get avg(): T extends number ? number : typeof NaN {
            var i = 0, sum = 0;
            for (const e of this)
                sum += <any>e,
                i++;
            return sum / i as any;
        }

        /** Calculates the length of the list */
        get count() {
            var i = 0;
            for (const _ of this)
                i++;
            return i;
        }       

        /** Calculates each element of the list and puts them inside of an {@link Array} */
        get value() {
            return Array.from(this);
        }

        /** Returns the length of the iterable if it is easy to compute, otherwise it returns `-1` */
        get fastCount() {
            return -1;
        }
    }

    /**
     * Instances of this class are guaranteed to have a base iterable.
     * The input iterable's elements are of type {@link I} and the output's ones are of type {@link O}
     */
    export abstract class LazySourceList<I, O> extends LazyAbstractList<O> {
        constructor(public source?: Iterable<I>) { super(); }

        *[Symbol.iterator]() {
            if (this.source != null)
                yield* <any>this.source;
        }

        /** Obtains the calculated version of {@link source} */
        base(): I[] {
            return this.source == null
                    ? []
                : typeof this.source === "string" || this.source instanceof String || this.source instanceof Array
                    ? this.source
                    : Array.from(this.source) as any;
        }

        /**
         * Returns an iterable containing the elements of {@link source} and its length.
         * If computing the length is expensive, it will calculate {@link source}, so its returned to prevent computing it twice
         */
        calcLength(): [ Iterable<I>, number ] {
            const l = fastCount(this.source);
            if (~l) return [ this.source, l ];
            
            const temp = this.base();
            return [ temp, temp.length ];
        }
    }

    /**
     * Output of {@link LazyList}.
     * Represents a list with the same number of elements as {@link source}
     */
    export class LazyFixedList<I, O = I> extends LazySourceList<I, O> {
        get fastCount(): number {
            return fastCount(this.source);
        }
    }

    /** Output of {@link rand} */
    export class LazyRandList extends LazyAbstractList<number> {
        constructor(public top?: number, public bottom?: number) { super(); }

        *[Symbol.iterator]() {
            while (true)
                yield this.top != null
                    ? this.bottom != null
                        ? Math.floor(Math.random() * (this.top - this.bottom + 1)) + this.bottom
                        : Math.floor(Math.random() * (this.top + 1))
                    : Math.random();
        }
    }

    /** Output of {@link range} */
    export class LazyRangeList extends LazyAbstractList<number> {
        constructor(public end: number = Infinity, public start: number = 0, public step: number = 1, public flip?: boolean) {
            super();

            // If `flip` is not specified it will default to `true` if `end` is less than 0; In that case `end` will be flipped
            if (arguments.length < 4 && (this.flip = this.end < 0))
                this.end *= -1;
        }

        *[Symbol.iterator]() {
            if (this.flip)
                for (let i = this.end - 1; i >= this.start; i -= this.step)
                    yield i;
            else
                for (let i = this.start; i < this.end; i += this.step)
                    yield i;
        }

        reverse(): LazyAbstractList<number> {
            return new LazyRangeList(this.end, this.start, this.step, true);
        }
    }

    /** Output of {@link buffer} */
    export class LazyBufferList<T> extends LazyAbstractList<T> {
        start: number = 0;
        buffer: ReadOnlyIndexable<T> = [];
        constructor(public f: (n: number, list: LazyBufferList<T>) => ReadOnlyIndexable<T>, public offset: number = 0) { super(); }

        *[Symbol.iterator]() {
            for (var i = 0; this.tryBuffer(i); i++)
                yield this.buffer[i - this.start];
        }

        at(n: number, def?: T): T {
            return this.tryBuffer(n)
                ? this.buffer[n - this.start]
                : def;
        }

        /**
         * Tells if the element at the index can be retrieved
         * @param n The index to check
         * @param read If false, only the current buffer is checked
         */
        tryBuffer(n: number, read: boolean = true) {
            const real = n - this.start;
            if (0 <= real && real < this.buffer.length) return true;
            if (!read) return false;

            this.start = Math.max(0, n - this.offset);
            this.buffer = this.f(this.start, this);
            return this.tryBuffer(n, false);
        }
    }

    /** Output of {@link distinct} */
    export class LazyDistinctList<TKey, T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public f?: Convert<T, TKey, LazyDistinctList<TKey, T>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            const set = new Set<TKey>();
            for (const elm of this.source)
                if (set.size != set.add(this.f ? this.f(elm, i++, this) : <any>elm).size)
                    yield elm;
        }
    }

    /** Output of {@link except} */
    export class LazyExceptList<TKey, T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public other: Iterable<TKey>, public f?: Convert<T, TKey, LazyDistinctList<TKey, T>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            const set = new Set<TKey>(this.other);
            for (const elm of this.source)
                if (!set.has(this.f ? this.f(elm, i++, this) : <any>elm))
                    yield elm;
        }
    }

    /** Output of {@link where} */
    export class LazyWhereList<T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public p?: Predicate<T, LazyWhereList<T>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                if (this.p ? this.p(elm, i++, this) : elm)
                    yield elm;
        }
    }

    /** Output of {@link when} */
    export class LazyWhenList<T> extends LazyFixedList<T, T> {
        constructor (source: Iterable<T>, public p: Predicate<T, LazyWhenList<T>>, public f: Convert<T, T, LazyWhenList<T>>, public e?: Convert<T, T, LazyWhenList<T>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                yield this.p(elm, i, this)
                    ? this.f(elm, i, this)
                    : this.e
                        ? this.e(elm, i, this)
                        : elm,
                i++;
        }
    }

    /** Output of {@link case} */
    export class LazyCaseList<T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public p: Predicate<T, LazyCaseList<T>>, public f: Convert<T, void, LazyCaseList<T>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                this.p(elm, i, this)
                    ? this.f(elm, i, this)
                    : yield elm,
                i++;
        }
    }

    /** Output of {@link selectWhere} */
    export class LazySelectWhereList<I, O> extends LazySourceList<I, O> {
        constructor (source: Iterable<I>, public f: Predicate<{ value: I, result?: O }, LazySelectWhereList<I, O>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            for (const value of this.source)
            {
                const box = { value, result: undefined };
                if (this.f(box, i++, this))
                    yield box.result;
            }
        }
    }

    /** Output of {@link select} */
    export class LazySelectList<I, O> extends LazyFixedList<I, O> {
        constructor (source: Iterable<I>, public f: Convert<I, O, LazySelectList<I, O>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                yield this.f(elm, i++, this);
        }
    }

    /** Output of {@link selectMany} */
    export class LazySelectManyList<I, O> extends LazySourceList<I, O> {
        constructor (source: Iterable<I>, public f?: Convert<I, Iterable<O>, LazySelectManyList<I, O>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                yield* this.f
                    ? this.f(elm, i++, this)
                    : <any>elm;
        }
    }

    /** Output of {@link merge} */
    export class LazyMergeList<T> extends LazySourceList<T, T> {
        constructor(source: Iterable<T>, public other: Iterable<T>, public flip: boolean = false) {
            super(source);
            if (flip)
                [ this.source, this.other ] = [ this.other, this.source ];
        }

        *[Symbol.iterator]() {
            yield* this.source;
            yield* this.other;
        }
    }

    /** Output of {@link append} and {@link prepend} */
    export class LazyAppendList<T> extends LazyFixedList<T, T> {
        constructor (source: Iterable<T>, public v: T, public flip: boolean = false) { super(source); }

        *[Symbol.iterator]() {
            if (this.flip)
                yield this.v;
            yield* this.source;
            if (!this.flip)
                yield this.v;
        }

        get fastCount() {
            const temp = super.fastCount;
            return ~temp
                ? temp + 1
                : -1;
        }
    }

    /** Output of {@link defaultIfEmpty} */
    export class LazyDefaultIfEmptyList<T> extends LazyFixedList<T, T> {
        constructor (source: Iterable<T>, public def: T = null) { super(source); }

        *[Symbol.iterator]() {
            var empty = true;
            for (const elm of this.source)
                (empty = false),
                yield elm;
            if (empty)
                yield this.def;
        }
    }

    /** Output of {@link repeat} */
    export class LazyRepeatList<T> extends LazyFixedList<T, T> {
        constructor (source: Iterable<T>, public n: number) { super(source); }

        *[Symbol.iterator]() {
            for (var i = 0; i < this.n; i++)
                yield* this.source;
        }

        get fastCount() {
            const temp = super.fastCount;
            return ~temp
                ? temp * Math.max(0, this.n)
                : -1;
        }
    }

    /** Output of {@link reverse} */
    export class LazyReverseList<T> extends LazyFixedList<T, T> {
        *[Symbol.iterator]() {
            const temp = this.base();
            for (var i = temp.length - 1; i >= 0; i--)
                yield temp[i];
        }
    }

    /** Output of {@link sort} */
    export class LazySortList<T> extends LazyFixedList<T, T> {
        constructor(source: Iterable<T>, public f?: Combine<T, T, number, LazySortList<T>>, public desc: boolean = false) { super(source); }

        *[Symbol.iterator]() {
            const map = new Map<T, number>();
            for (const elm of this.source)
                map.set(elm, (map.get(elm) ?? 0) + 1);

            while (map.size)
            {
                var out: T, n: number = 0;
                for (const elm of map)
                    if (!n || (this.f ? this.f(elm[0], out, -1, this) < 0 : elm[0] < out) !== this.desc)
                        [ out, n ] = elm;

                for (var i = 0; i < n; i++)
                    yield out;
                
                map.delete(out);
            }
        }
    }

    /** Output of {@link splice} */
    export class LazySpliceList<T> extends LazySourceList<T, T> {
        constructor(source: Iterable<T>, public start: number, public length: number = 1, public f?: (x: LazyFixedList<T, T>) => Iterable<T>, public lazy: boolean = false) { super(source); }

        *[Symbol.iterator]() {
            const iter = this.source[Symbol.iterator]();
            yield* LazyTakeList.take(iter, this.start);

            const temp = new LazyFixedList(LazyTakeList.take(iter, this.length));
            if (this.f) yield* this.f(this.lazy ? temp : temp.calc());
            else temp.calc(); // Forces the evaluation if there is no function, otherwise the selected part would not be removed

            for (var value: T; !({ value } = iter.next()).done; )
                yield value;
        }
    }

    /** Output of {@link LazyAbstractList.fixedCount} */
    export class LazyFixedCountList<T> extends LazyFixedList<T, T> {
        constructor (source: Iterable<T>, public n: number) { super(source); }

        *[Symbol.iterator]() {
            const iter = this.source[Symbol.iterator]();
            
            for (var value: T, i = 0; i < this.n; i++)
                if (({ value } = iter.next()).done)
                    throw new RangeError(`Fixed count list has less than ${ this.n } element${ this.n - 1 ? 's' : '' }`);
                else
                    yield value;

            if (!iter.next().done)
                throw new RangeError(`Fixed count list has more than ${ this.n } elements${ this.n - 1 ? 's' : '' }`);
        }

        get fastCount() {
            return this.n;
        }
    }

    /** Output of {@link LazyAbstractList.skip} */
    export class LazySkipList<T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public p: Predicate<T, LazySkipList<T>> | number) { super(source); }

        static *skip<T>(iter: MarkedIterator<T>, n: number) {
            for (var i = 0; i < n; i++)
                if (iter.done = iter.next().done)
                    return;

            for (var value: T; !({ value } = iter.next()).done; )
                yield value;
        }

        *[Symbol.iterator]() {
            if (typeof this.p === "number")
            {
                if (this.p < 0)
                {
                    const [ iter, l ] = this.calcLength();
                    yield* LazyTakeList.take(iter[Symbol.iterator](), l + this.p);
                }
                else yield* LazySkipList.skip(this.source[Symbol.iterator](), this.p);
                return;
            }

            let i = 0, done = false;
            for (const elm of this.source)
                if (done ||= !this.p(elm, i++, this))
                    yield elm;
        }
    }

    /** Output of {@link LazyAbstractList.take} */
    export class LazyTakeList<T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public p: Predicate<T, LazyTakeList<T>> | number, public mode: JoinMode | boolean = false, public def: T = undefined) { super(source); }

        static *take<T>(iter: MarkedIterator<T>, n: number, mode: JoinMode | boolean = false, def: T = undefined) {
            for (var value: T, i = 0; i < n; i++) // If this were a foreach loop the first element after "n" would have been calculated too
                if (iter.done = ({ value } = iter.next()).done)
                    if (!mode)
                        break;
                    else
                        yield def;
                else
                    yield value;
        }

        *[Symbol.iterator]() {
            if (typeof this.p === "number")
            {
                if (this.p < 0)
                {
                    const [ iter, l ] = this.calcLength();
                    yield* LazySkipList.skip(iter[Symbol.iterator](), l + this.p);
                }
                else yield* LazyTakeList.take(this.source[Symbol.iterator](), this.p, this.mode, this.def);
                return;
            }

            let i = 0;
            for (const elm of this.source)
                if (this.p(elm, i++, this))   
                    yield elm;
                else
                    break;
        }
    }

    /** Output of {@link padStart} */
    export class LazyPadStartList<T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public n: number, public def: T = undefined) { super(source); }

        *[Symbol.iterator]() {
            const [ iter, l ] = this.calcLength();
            for (var i = l; i < this.n; i++)
                yield this.def;
            yield* iter;
        }
    }

    /** Output of {@link zip} */
    export class LazyZipList<A, B, TResult> extends LazySourceList<A, TResult> {
        constructor(source: Iterable<A>, public other: Iterable<B>, public f?: Combine<A, B, TResult, LazyZipList<A, B, TResult>>, public mode: JoinMode = JoinMode.inner) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            const source = this.source[Symbol.iterator]();
            const other = this.other[Symbol.iterator]();
            while(true)
            {
                const a = source.next();
                const b = other.next();
                if (a.done && b.done || a.done && !(this.mode & JoinMode.right) || b.done && !(this.mode & JoinMode.left))
                    break;
                yield this.f
                    ? this.f(a.value, b.value, i++, this)
                    : [ a.value, b.value ];
            }
        }
    }

    /** Output of {@link join} */
    export class LazyJoinList<A, B, TResult> extends LazySourceList<A, TResult> {
        constructor(source: Iterable<A>, public other: Iterable<B>, public p?: Combine<A, B, boolean, LazyJoinList<A, B, TResult>>, public f?: Combine<A, B, TResult, LazyJoinList<A, B, TResult>>, public mode: JoinMode = JoinMode.inner) { super(source); }

        *[Symbol.iterator]() {
            type stateList<T> = { v: T, c?: boolean }[];
            const cacheA: stateList<A> = [];
            const cacheB: stateList<B> = [];

            // Inner
            var i = 0;
            for (const a of this.source)
            {
                var k = 0;
                const aE = cacheA[i] ??= { v: a };
                for (const b of this.other)
                {
                    const bE = cacheB[k] ??= { v: b };
                    const temp = !this.p || this.p(a, b, i, this);
                    aE.c ||= temp;
                    bE.c ||= temp;
                    if (temp)
                        yield this.f
                            ? this.f(a, b, i, this)
                            : [ a, b ];
                    k++;
                }
                i++;
            }

            // Outer (left)
            if (this.mode & JoinMode.left)
                for (const elm of cacheA)
                    if (!elm.c)
                        yield this.f
                            ? this.f(elm.v, undefined, -1, this)
                            : [ elm.v, undefined ];

            // Outer (right)
            if (this.mode & JoinMode.right)
                for (const elm of cacheB)
                    if (!elm.c)
                        yield this.f
                            ? this.f(undefined, elm.v, -1, this)
                            : [ undefined, elm.v ];
        }
    }

    /** Output of {@link LazyAbstractList.storeBy} */
    export class LazyStore<TKey, T> {
        map: Map<TKey, LazyStoreByList<TKey, T>> = new Map();
        processed: number = 0;
        done: boolean = false;
        #iter: Iterator<T>;
        constructor(public source: Iterable<T>, public f: Convert<T, TKey, LazyStoreByList<TKey, T>>) { }

        /**
         * Returns the list of the elements with the given key.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyStoreByList} will cause unexpected behaviours (Some elements will not be present)
         * @param k The key to search for
         */
        get(k: TKey) {
            var out = this.map.get(k);
            if (!out)
                this.map.set(k, out = new LazyStoreByList<TKey, T>(k, this, this.f));
            return out;
        }

        /** The iterator to cache */
        get iter() {
            return this.#iter ??= this.source[Symbol.iterator]();
        }
    }

    /** Output of {@link LazyStore.get} */
    export class LazyStoreByList<TKey, T> extends LazyAbstractList<T> {
        processed: number = 0;
        cached: T[] = [];
        constructor(public key: TKey, public store: LazyStore<TKey, T>, public f: Convert<T, TKey, LazyStoreByList<TKey, T>>) { super(); }

        *[Symbol.iterator]() {
            // Pre-cached elements
            for (var i = 0; i < this.processed; i++)
                yield this.cached[i];

            // Elements added by other lists before that this starts
            yield* this.flush();

            // Elements added by this list
            for (var value: T; !({ value, done: this.store.done } = this.store.iter.next()).done; )
            {
                const k = this.f(value, this.store.processed++, this);
                if (k === this.key)
                {
                    yield this.cached[this.processed++] = value;
                    yield* this.flush(); // Flushes only in this case because the elements can be added by other lists only during yields
                }
                else this.store.get(k).cached.push(value);
            }
        }

        /** Yields the elements that have been cached by other lists in {@link store} */
        *flush() {
            for (; this.processed < this.cached.length; this.processed++)
                yield this.cached[this.processed];
        }
    }

    /**
     * Element of the output of {@link groupBy}.
     * The group common value is contained in the {@link key} property.
     * The group is a {@link LazyAbstractList} itself
     */
    export class Grouping<TKey, T> extends LazyFixedList<T, T> {
        constructor(public key: TKey, source: Iterable<T>) { super(source); }
    }

    /** Output of {@link groupBy} */
    export class LazyGroupByList<TKey, T> extends LazySourceList<T, Grouping<TKey, T>> {
        constructor(source: Iterable<T>, public f: Convert<T, TKey, LazyGroupByList<TKey, T>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            const cache = new Map<TKey, T[]>();
            for (const e of this.source)
            {
                const k = this.f(e, i++, this);
                if (cache.has(k))
                    cache.get(k).push(e);
                else
                    cache.set(k, [ e ]);           
            }
            for (const [ k, v ] of cache)
                yield new Grouping<TKey, T>(k, v);
        }
    }

    /** Output of {@link split} */
    export class LazySplitList<T> extends LazySourceList<T, LazyAbstractList<T>> {
        constructor(source: Iterable<T>, public n: number, public mode: JoinMode | boolean = false, public lazy: boolean = false, public def: T = undefined) { super(source); }

        *[Symbol.iterator]() {
            const iter: MarkedIterator<T> = this.source[Symbol.iterator]();
            while (!iter.done)
            {
                const lazy = new LazyFixedList(LazyTakeList.take(iter, this.n, this.mode, this.def));  // This doesn't use the normal `list.take()` because I would have reconverted "iter" into an iterable
                if (!this.lazy)
                {
                    const temp = lazy.calc();
                    if (temp.has()) // If the list is not lazy, it can be checked for emptyness
                        yield temp;
                }
                else yield lazy;
            }
        }
    }

    /** Common functionalities of cached lists */
    export abstract class LazyAbstractCacheList<I, O, TCache extends Iterable<O>> extends LazySourceList<I, O> {
        #iter: Iterator<I>;
        done: boolean = false;

        *[Symbol.iterator]() {
            yield* this.cached;
            yield* this.calcRest();
        }

        /** Calculates the remaining elements one at a time */
        *calcRest(): Generator<O> {
            for (var value: I; !({ value, done: this.done } = this.iter.next()).done; )
                yield this.save(value);
        }

        has(value?: O) {
            if (!arguments.length)
                return this.done ? this.saved > 0 : super.has();
            return super.has(value);
        }

        /** Completes the cache and returns it */
        complete() {
            for (const _ of this.calcRest());
            return this.cached;
        }

        /** Saves an element to the cache */
        abstract save(value: I): O;

        get fastCount() {
            return this.done
                ? this.saved
                : -1;
        }

        /** The iterator to cache */
        get iter() {
            return this.#iter ??= this.source[Symbol.iterator]();
        }

        /** The cached elements */
        abstract get cached(): TCache;
        
        /** The number of elements in the cache */
        abstract get saved(): number;
    }

    /** Output of {@link toSet} */
    export class LazySet<T> extends LazyAbstractCacheList<T, T, Set<T>> {
        cached: Set<T> = new Set();
    
        has(value?: T) {
            if (!arguments.length)
                return super.has();
    
            if (this.cached.has(value))
                return true;
    
            for (const elm of this.calcRest())
                if (elm === value)
                    return true;
    
            return false;
        }
    
        add(value: T) {
            this.save(value);
            return this;
        }
    
        save(value: T) {
            this.cached.add(value);
            return value;
        }
    
        get saved() {
            return this.cached.size;
        }
    }
    
    /** Output of {@link toMap} */
    export class LazyMap<T, K, V> extends LazyAbstractCacheList<T, [ K, V ], Map<K, V>> {
        processed: number = 0;
        cached: Map<K, V> = new Map();
        constructor (source: Iterable<T>, public getK: Convert<T, K, LazyMap<T, K, V>>, public getV?: Convert<T, V, LazyMap<T, K, V>>) { super(source); }
    
        hasKey(value: K) {
            if (this.cached.has(value))
                return true;
    
            for (const [ k ] of this.calcRest())
                if (k === value)
                    return true;
    
            return false;
        }
    
        get(key: K) {
            if (this.cached.has(key))
                return this.cached.get(key);
    
            for (const [ k, v ] of this.calcRest())
                if (k === key)
                    return v;
    
            return undefined;
        }
    
        set(key: K, value: V) {
            this.cached.set(key, value);
            return this;
        }
    
        save(value: T) {
            const k = this.getK(value, this.processed, this);
            const v = this.getV ? this.getV(value, this.processed, this) : <any>value;
            this.cached.set(k, v);
            this.processed++;
            return <[ K, V ]>[ k, v ];
        }
    
        get saved() {
            return this.cached.size;
        }
    }

    /** Output of {@link cache} */
    export class LazyCacheList<T> extends LazyAbstractCacheList<T, T, T[]> {
        cached: T[] = [];

        at(n: number, def: T = null) {
            return n < 0
                ? this.done
                    ? this.at(this.cached.length + n, def)
                    : super.at(n, def)
                : n < this.cached.length
                    ? this.cached[n]
                : this.done
                    ? def
                    : super.at(n, def);
        }

        last(def: T = null) {
            return this.done
                ? this.cached[this.cached.length - 1]
                : super.last(def);
        }

        save(value: T) {
            this.cached.push(value);
            return value;
        }

        get fastCount() {
            return this.done
                ? this.saved
                : fastCount(this.source);
        }

        get saved() {
            return this.cached.length;
        }
    }
}

if (typeof module !== "object")
    var module = {};
export = LazyList;