
/** Returns the type of the elements of {@link T} and continues to do so to the output until the type of the element is not iterable */
type RootElementType<T> = T extends Iterable<infer U> ? RootElementType<U> : T;

/**
 * Returns a {@link LazyList.LazyAbstractList} based on an iterable or an non-iterable iterator.
 * If the {@link source} is a function, it gets wrapped in a new object that has {@link source} as its {@link Symbol.iterator} method.
 * If the {@link source} is a non-iterable iterator, it gets wrapped in a new object that returns {@link source} in its {@link Symbol.iterator} method.
 * If {@link source} is already a {@link LazyList.LazyAbstractList}, it gets returned directly, otherwise it gets wrapped in a {@link LazyList.LazyFixedList}
 * @param source The iterable/iterator
 * @param force If `true`, {@link source} is always wrapped
 */
 function LazyList<T = any>(source?: LazyList.Source<T>, force: boolean = false): LazyList.LazyAbstractList<T> {
    return !force && source instanceof LazyList.LazyAbstractList
        ? <any>source
        : new LazyList.LazyFixedList(
            !source || typeof source[Symbol.iterator] === 'function'    // If the source is iterable or nullish
                ? <any>source                                           // Wrap it directly
                : typeof source === "function"                          // Else if the source is a function
                    ? { [Symbol.iterator]: source }                     // Use it as a generator function
                    : LazyList.toGenerator(<any>source)                 // Otherwise try to use it as an iterator
        );
}

namespace LazyList {
    export const from = LazyList;

    /** Represents something which can be converted to a {@link LazyAbstractList} through {@link from} */
    export type Source<T> = Iterable<T> | Iterator<T> | (() => Iterator<T>);

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
    export function injectInto(ctor?: abstract new (...args: any[]) => any): typeof LazyList {
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
     * Makes the provided iterator iterable.
     * If a generator is used in a foreach loop and you break out of it, the generator will be closed (It will stop even if some elements remain), this function prevents that.
     * @param iter The iterator to make iterable
     */
    export function* toGenerator<T>(iter: Iterator<T>) {
        for (var value: T; !({ value } = iter.next()).done; )
            yield value;
    }

    /**
     * Returns an INFINITE sequence of random numbers comprised between {@link bottom} and {@link top}.
     * Since the sequence is infinite, it will create problems with non lazy methods.
     * Since the sequence is random, it will not be the same every time you calculate it
     * @param top The highest number in the sequence; If not provided, it will be `1` and the random numbers will not be integers
     * @param bottom The lowest number in the sequence; If not provided, it will be `0`
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

    /** An iterable wrapper with helper functions */
    export abstract class LazyAbstractList<T> {
        abstract [Symbol.iterator](): Generator<T>;

        /**
         * Ensures every element of the list shows up only once
         * @param f A conversion function that returns the the part of the element to check duplicates for; If omitted, the element itself will be used
         */
        distinct<TKey = T>(f?: Convert<T, TKey, LazyDistinctList<T, TKey>>) {
            return new LazyDistinctList<T, TKey>(this, f);
        }

        /**
         * Ensures no element of {@link other} shows up in the list.
         * Every time the iteration starts, {@link other} is completely calculated
         * @param f A conversion function that returns the the part of the element to check for in the list; If omitted, the element itself will be used
         */
        except<TKey = T>(other: Iterable<TKey>, f?: Convert<T, TKey, LazyExceptList<T, TKey>>) {
            return new LazyExceptList<T, TKey>(this, other, f);
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

        /** Flattens in a single list every iterable element of the list, and the elements of the elements and so on */
        flat() {
            return new LazyFlatList<T>(this);
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
        default(def?: T) {
            return new LazyDefaultList(this, def);
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
         * Shuffles the list in a randomic way.
         * Non lazy
         */
        shuffle() {
            return new LazyShuffleList(this);
        }

        /**
         * Orders the list; It counts the elements so that it is faster when there are a lot of copies (For that reason, the index is not available on {@link comp} since it would be wrong).
         * Non lazy
         * @param comp A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc If `true`, reverses the results
         */
        sort(comp?: Combine<T, T, number, LazySortList<T>>, desc?: boolean) {
            return new LazySortList<T>(this, comp, desc);
        }

        /**
         * Orders the list based on the return value of {@link f}; It counts the elements so that it is faster when there are a lot of copies (For that reason, the index is not available on {@link f} and {@link comp} since it would be wrong).
         * Differs from {@link sort} in that {@link comp} is provided with the return value of {@link f}, and not the element itself.
         * Non lazy
         * @param f A conversion function
         * @param comp A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc If `true`, reverses the results
         */
        orderBy<TKey>(f: Convert<T, TKey, LazySortList<T>>, desc?: boolean, comp: Combine<TKey, TKey, number, LazySortList<T>> = LazySortList.defaultComparer) {
            return new LazySortList<T>(this, (a, b, i, list) => comp(f(a, i, list), f(b, i, list), i, list), desc);
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
         * Throws a {@link RangeError} based on {@link mode}, generally if the list has not exactly {@link n} elements.
         * Notice that if the iteration its stopped before the end the input list could have more than {@link n} elements
         * @param n The number of elements the list must have
         * @param mode Tells the method when to throw errors
         * @param def The default value to return if the list has less than {@link n} elements and {@link mode} is {@link JoinMode.inner} or {@link JoinMode.left}
         */
        fixedCount(n: number, mode?: JoinMode, def?: T) {
            return new LazyFixedCountList(this, n, mode, def);
        }

        /**
         * Moves the first {@link p} elements to the end of the list
         * @param p The elements to rotate (Use a negative number to skip from the end); If a function is given, it will be called for each element and the elements will be skipped until the function returns `false`
         */
        rotate(p: Predicate<T, LazySkipList<T>> | number) {
            return new LazyRotateList<T>(this, p);
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
         * If you want to pad at the end, use {@link take} instead (Be carefull to pass `true` as the second argument).
         * Non lazy
         * @param n The number of desired elements
         * @param def The value to use if the list is too short
         */
        padStart(n: number, def?: T) {
            return new LazyPadStartList(this, n, def);
        }

        /**
         * Aggregates the list based on {@link f}.
         * Similiar to {@link aggregate} but yields the intermediate results
         * @param f A combination function
         * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration)
         */
        accumulate<TResult = T>(f: Combine<TResult, T, TResult, LazyAccumulateList<T, TResult>>, out?: TResult) {
            return new LazyAccumulateList<T, TResult>(this, f, out, arguments.length > 1);
        }

        /**
         * Combines the current list with {@link other} based on {@link f}
         * @param other An iterable
         * @param f A combination function, if not provided the pairs will be put in a tuple
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
         * @param other An iterable
         * @param p A filter function
         * @param f A combination function, if not provided pairs will be put in a tuple
         * @param mode Different length handling
         */
        join<TOther, TResult = [ T, TOther ]>(other: Iterable<TOther>, p?: Combine<T, TOther, boolean, LazyJoinList<T, TOther, TResult>>, f?: Combine<T, TOther, TResult, LazyJoinList<T, TOther, TResult>>, mode?: JoinMode) {
            return new LazyJoinList<T, TOther, TResult>(this, other, p, f, mode);
        }

        /**
         * Generates all the possible combinations of length {@link depth} of the elements of the list.
         * Only one combination will be generated for each pair of elements from the two lists (If there is "(a, b)" there will not be "(b, a)").
         * The index available in the functions is the one of the first element of the group
         * @param depth The length of the each combination
         */
        combinations(depth?: number) {
            return new LazyCombinationsList<T>(this, depth);
        }

        /**
         * Groups the list's elements based on a provided function.
         * Similiar to {@link groupBy}, but the groups cannot be completely iterated until the evalueation is finisced, only what is inside them can.
         * You can use the {@link LazyStore.get} method to get the desired group like so:
         * ```
         * const store = LazyList.from([ 1, 2, 3 ]).storeBy(x => x % 2);
         * store.get(1).value //=> [ 1, 3 ]
         * ```
         * This allows the groups to be lazy.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyStoreByList} could cause unexpected behaviours (Some elements could not be present)
         * @param f A combination function
         */
        storeBy<TKey>(f: Convert<T, TKey, LazyStoreByList<T, TKey>>) {
            return new LazyStore<T, TKey>(this, f);
        }

        /**
         * Groups the list's elements based on a provided function.
         * Non lazy
         * @param f A combination function
         */
        groupBy<TKey>(f: Convert<T, TKey, LazyGroupByList<T, TKey>>) {
            return new LazyGroupByList<T, TKey>(this, f);
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
         * @param p The length of each slice or a predicate that tells if the list should be split by this value, which will be omitted
         * @param mode If truthy, every slice will be forced to have {@link n} elements by concatenating as many {@link def} as needed
         * @param lazy Indicates if the list should be lazy (and unsafe)
         * @param def The value to use if the list is too short
         */
        split(p: Predicate<T, LazySplitList<T>> | number, lazy?: boolean, mode?: JoinMode | boolean, def?: T) {
            return new LazySplitList(this, p, lazy, mode, def);
        }

        /** Outputs an iterable that will contain the current one as its only element */
        wrap() {
            return new LazyWrapList<T, this>(this);
        }

        /**
         * Returns a {@link LazySet} that contains the elements of the list.
         * The set is lazy, this means that the elements are not calculated until it is checked if they are present.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazySet} could cause unexpected behaviours (Some elements could not be present)
         */
        toSet() {
            return new LazySet(this);
        }

        /**
         * Returns a {@link LazyMap} that contains the elements of the list.
         * The map is lazy, this means that the elements are not calculated until it is checked if they are present or the key is requested.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyMap} could cause unexpected behaviours (Some elements could not be present)
         * @param getK The function that will be used to get the key of each element
         * @param getV The function that will be used to get the value of each element; If not provided the element itself will be used
         */
        toMap<K, V = T>(getK: Convert<T, K, LazyMap<T, K, V>>, getV?: Convert<T, V, LazyMap<T, K, V>>) {
            return new LazyMap(this, getK, getV);
        }

        /**
         * Caches the list's calculated elements, this prevent them from passing inside the pipeline again
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyCacheList} could cause unexpected behaviours (Some elements could not be present)
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

        /** Replaces every element of the list with {@link value} */
        fill(value: T) {
            return new LazySelectList(this, () => value);
        }

        /**
         * Returns a section of the list, starting at {@link start} and with {@link length} elements
         * @param start The index to start at; Can be whatever you can pass as the first argument of {@link skip}
         * @param length The length of the section; Can be whatever you can pass as the first argument of {@link take}
         * @param mode If truthy and {@link length} is more than the list length, the output list will be forced to have length {@link length} by concatenating as many {@link def} as needed
         */
        slice(start: Predicate<T, LazySkipList<T>> | number, length: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean, def?: T) {
            return this.skip(start).take(length, mode, def);
        }

        //////////////////////////////////////////////////// AGGREGATE ////////////////////////////////////////////////////

        /**
         * Returns the element at the provided index
         * @param n The index; If negative it starts from the end
         * @param def The default value
         */
        at(n: number, def?: T): T {
            if (n < 0)
            {
                const temp = this.value;
                if (n < -temp.length)
                    return def;
                return temp[temp.length + n];
            }
            return this.skip(n).default(def).first;
        }

        /**
         * Throws a {@link RangeError} based on {@link mode}, generally if the list has not exactly `1` element
         * @param mode Tells the method when to throw errors
         * @param def The default value to return if the list has less than `1` elements and {@link mode} is {@link JoinMode.inner} or {@link JoinMode.left}
         */
        single(mode?: JoinMode, def?: T): T {
            const iter = this.fixedCount(1, mode, def)[Symbol.iterator]();
            const out = iter.next().value;  // Throws if no element
            iter.next();                    // Throws if more than 1 element
            return <T>out;
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
         * Returns `false` if there is an element that is not equal to the first.
         * If the list is empty, it returns `true`
         * @param f A comparison function
         */
        allEquals(f?: Combine<T, T, boolean, LazyAbstractList<T>>): boolean {
            var i = 1, first: T;
            const iter = this[Symbol.iterator]();
            if (!({ value: first } = iter.next()).done)
                for (var value: T; !({ value } = iter.next()).done; )
                    if (f ? !f(value, first, i++, this) : value !== first)
                        return false;
            return true;
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
         * Tells if the element at the given index can be retrieved
         * @param n The index to check; If negative it starts from the end
         */
        inBound(n: number) {
            const temp = this.fastCount;
            return ~temp
                ? n < 0
                    ? (temp + n) >= 0
                    : n < temp
                : this.any((_, i) => i >= n);
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
         * Given multiple predicate functions it returns an array containing for each function the times it returned `true`
         * @param p The predicate functions
         * @returns An array with a function to convert it in a {@link LazyAbstractList} ({@link Laziable.prototype.lazy})
         */
        multiCount(...p: Predicate<T, LazyAbstractList<T>>[]) {
            var i = 0;
            const out = p.map(() => 0);
            for (const elm of this)
            {
                for (var k = 0; k < p.length; k++)
                    if (p[k](elm, i, this))
                        out[k]++;
                i++;
            }
            return <Laziable<number>>Object.setPrototypeOf(out, Laziable.prototype);
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

        /**
         * Gets the first element of the list or {@link def} as default if it's empty.
         * Can be used as `next()` when the source iterable is a generator
         */
        get first(): T {
            return this[Symbol.iterator]().next().value;
        }

        /** Gets the last element of the list or `undefined` as default if it's empty */
        get last() {
            var out: T;
            for (const elm of this)
                out = elm;
            return out;
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

    /** Iterable that stores only a cached chunk of data at a time */
    export class LazyBufferList<T> extends LazyAbstractList<T> {
        start: number = 0;
        buffer: ReadOnlyIndexable<T> = [];

        /**
         * Creates an iterable that stores only a chunk of data at the time and changes the loaded chunk when the index is out of range.
         * Can be freely accessed by index
         * @param f A function that generates a chunk of data starting from the given index
         * @param offset If an index is out of range, the loaded chunk will start this amount of elements before the index
         */
        constructor(public f: (n: number, list: LazyBufferList<T>) => ReadOnlyIndexable<T>, public offset: number = 0) { super(); }

        *[Symbol.iterator]() {
            for (var i = 0; this.inBound(i); i++)
                yield this.buffer[i - this.start];
        }

        at(n: number, def?: T): T {
            return this.inBound(n)
                ? this.buffer[n - this.start]
                : def;
        }

        /**
         * Tells if the element at the given index can be retrieved
         * @param n The index to check; If negative it starts from the end
         * @param read  If false, only the current buffer is checked 
         */
        inBound(n: number, read: boolean = true) {
            if (n < 0)
                return super.inBound(n);
            
            const real = n - this.start;
            if (0 <= real && real < this.buffer.length) return true;
            if (!read) return false;

            this.start = Math.max(0, n - this.offset);
            this.buffer = this.f(this.start, this);
            return this.inBound(n, false);
        }
    }
    
    /** Similiar to {@link LazyBufferList}, but allows the storage of the current position */
    export class BufferIterator<T> extends LazyBufferList<T> {

        *[Symbol.iterator]() {
            for (this.next(); this.inBound(this.#currentIndex); this.currentIndex++)
                yield this.#current;
        }

        /**
         * Clones the current iterator into another
         * @param target The iterator to clone into; If not provided, a new iterator will be created
         */
        clone(target?: BufferIterator<T>) {
            const out = Object.assign(target ?? new BufferIterator<T>(null), this);     // `current` and `currentIndex` are not automatically cloned because they are accessors
            out.#currentIndex = this.#currentIndex;                                     // The private fields are setted to avoid useless recalculations
            out.#current = this.#current;
            return out;
        }
    
        /**
         * Reaches the {@link currentIndex} of {@link target}
         * @param target The iterator to reach
         * @returns The new current item
         */
        reach(target: BufferIterator<T>) {
            return this.move(target.currentIndex, true).current;
        }
    
        /**
         * Moves the current item by {@link n} steps
         * @param n The number of steps to move; If not provided, the iterator will move by `1`
         * @returns The new current item
         */
        next(n: number = 1) {
            this.currentIndex += n;
            return this.current;
        }
    
        /**
         * Moves the current item by {@link n} steps
         * @param n The number of steps to move; If not provided, the iterator will move by `-1`
         * @param absolute If true, the {@link currentIndex} will be set exactly to {@link n}
         * @returns The iterator itself
         */
        move(n: number = -1, absolute: boolean = false) {
            this.currentIndex = absolute ? n : this.currentIndex + n;
            return this;
        }
    
        /**
         * Returns the element at {@link n} steps from the current item
         * @param n The number of steps to move; If not provided, the iterator will move by `1`
         */
        peek(n: number = 1) {
            return this.clone().next(n);
        }
    
        /** Obtains the index of the current element of the iterator */
        get currentIndex() { return this.#currentIndex; }
        set currentIndex(value: number) { this.#current = (this.#currentIndex = value) < 0 ? undefined : this.at(this.#currentIndex); }
        #currentIndex: number = -1;
    
        /** Obtains the current element of the iterator */
        get current(): T { return this.#current; }
        set current(value: T) { this.#currentIndex = this.indexOf(this.#current = value); }
        #current: T;    
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

        get fastCount() {
            return Infinity;
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
     * Represents a list with the same number of elements as {@link source}.
     * It is used even by lists that need the {@link LazyFixedList.fastCount} of the {@link source} to calculate theirs
     */
    export class LazyFixedList<I, O = I> extends LazySourceList<I, O> {
        get fastCount() {
            return fastCount(this.source);
        }
    }

    /** Output of {@link distinct} */
    export class LazyDistinctList<T, TKey = T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public f?: Convert<T, TKey, LazyDistinctList<T, TKey>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            const set = new Set<TKey>();
            for (const elm of this.source)
                if (set.size != set.add(this.f ? this.f(elm, i++, this) : <any>elm).size)
                    yield elm;
        }
    }

    /** Output of {@link except} */
    export class LazyExceptList<T, TKey = T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public other: Iterable<TKey>, public f?: Convert<T, TKey, LazyExceptList<T, TKey>>) { super(source); }

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
    export class LazySelectManyList<I, O = I extends Iterable<infer U> ? U : never> extends LazySourceList<I, O> {
        constructor (source: Iterable<I>, public f?: Convert<I, Iterable<O>, LazySelectManyList<I, O>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                yield* this.f
                    ? this.f(elm, i++, this)
                    : <any>elm;
        }
    }

    /** Output of {@link LazyAbstractList.flat} */
    export class LazyFlatList<T> extends LazySourceList<T, RootElementType<T>> {
        constructor (source: Iterable<T>) { super(source); }

        static *flat(source: Iterable<any>) {
            for (const elm of source)
                if (typeof elm[Symbol.iterator] === "function")
                    yield* LazyFlatList.flat(elm);
                else
                    yield elm;
        }

        [Symbol.iterator]() {
            return LazyFlatList.flat(this.source);
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

    /** Output of {@link default} */
    export class LazyDefaultList<T> extends LazyFixedList<T, T> {
        constructor (source: Iterable<T>, public def?: T) { super(source); }

        *[Symbol.iterator]() {
            var value: T;
            const iter = this.source[Symbol.iterator]();

            if (({ value } = iter.next()).done)
                return yield this.def;
            else 
                yield value;

            yield* toGenerator(iter);
        }

        get fastCount() {
            return super.fastCount || 1;
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

    /** Output of {@link shuffle} */
    export class LazyShuffleList<T> extends LazyFixedList<T, T> {
        *[Symbol.iterator]() {
            const temp = this.base();
            while (temp.length)
                yield temp.splice(Math.floor(Math.random() * temp.length), 1)[0];
        }
    }

    /** Output of {@link sort} and {@link orderBy} */
    export class LazySortList<T> extends LazyFixedList<T, T> {
        static defaultComparer = <T>(a: T, b: T) => a < b ? -1 : a > b ? 1 : 0;
        constructor(source: Iterable<T>, public f: Combine<T, T, number, LazySortList<T>> = LazySortList.defaultComparer, public desc: boolean = false) { super(source); }

        *[Symbol.iterator]() {
            const map = new Map<T, number>();
            for (const elm of this.root)
                map.set(elm, (map.get(elm) ?? 0) + 1);

            while (map.size)
            {
                var out: T, n: number = 0;
                for (const elm of map)
                    if (!n || this.compare(elm[0], out) < 0)
                        [ out, n ] = elm;

                for (var i = 0; i < n; i++)
                    yield out;
                
                map.delete(out);
            }
        }

        /** A sorting function that allows two sorts in a row to be combined */
        compare(a: T, b: T) {
            return this.multiplier * this.f(a, b, -1, this) || this.source instanceof LazySortList && this.source.compare(a, b);
        }

        /** Obtains the {@link source} of the first sort of the current chain */
        get root() {
            return this.source instanceof LazySortList ? this.source.root : this.source;
        }

        /** Gets the number to which the result of {@link f} should be multiplied to be inverted when {@link desc} is true */
        get multiplier() {
            return this.desc ? -1 : 1;
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
            yield* toGenerator(iter);
        }
    }

    /** Output of {@link LazyAbstractList.fixedCount} */
    export class LazyFixedCountList<T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public n: number, public mode: JoinMode = JoinMode.right, public def?: T) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            const iter = this.source[Symbol.iterator]();
            for (const elm of LazyTakeList.take(iter, this.n))
                yield elm,
                i++;

            if (i < this.n)
                if (this.mode === JoinMode.right || this.mode === JoinMode.outer)
                    throw new RangeError(`Fixed count list has less than ${ this.n } element${ this.n - 1 ? 's' : '' }`);
                else while (i++ < this.n)
                    yield this.def;
            else if ((this.mode === JoinMode.right || this.mode === JoinMode.inner) && !iter.next().done)
                throw new RangeError(`Fixed count list has more than ${ this.n } element${ this.n - 1 ? 's' : '' }`);
        }

        get fastCount() {
            return this.n;
        }
    }

    /** Output of {@link LazyAbstractList.rotate} */
    export class LazyRotateList<T> extends LazyFixedList<T, T> {
        constructor (source: Iterable<T>, public p: Predicate<T, LazySkipList<T>> | number) { super(source); }

        static *rotate<T>(iter: MarkedIterator<T>, n: number) {
            const temp = [ ...LazyTakeList.take(iter, n) ];
            if (temp.length < n)
                return yield* LazyRotateList.rotate(temp[Symbol.iterator](), n % temp.length);

            yield* toGenerator(iter);
            yield* temp;
        }

        *[Symbol.iterator]() {
            if (typeof this.p === "number")
            {
                const [ iter, l ] = this.p < 0 ? this.calcLength() : [ this.source, 0 ];
                return yield* LazyRotateList.rotate(iter[Symbol.iterator](), l + this.p);
            }

            var i = 0;
            const temp = [];
            const iter = this.source[Symbol.iterator]();

            for (var value: T; !({ value } = iter.next()).done; ) // Fills the array until the predicate returns `false`
                if (this.p(value, i++, this))
                    temp.push(value);
                else
                    break;
            yield value;                                          // Yields the element that returned `false`
            yield* toGenerator(iter);                             // Yields the rest of the elements
            yield* temp;                                          // Yields the first elements
        }
    }

    /** Output of {@link LazyAbstractList.skip} */
    export class LazySkipList<T> extends LazyFixedList<T, T> {
        constructor (source: Iterable<T>, public p: Predicate<T, LazySkipList<T>> | number) { super(source); }

        static *skip<T>(iter: MarkedIterator<T>, n: number) {
            for (var i = 0; i < n; i++)
                if (iter.done = iter.next().done)
                    return;
            yield* toGenerator(iter);
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

            var i = 0, done = false;
            for (const elm of this.source)
                if (done ||= !this.p(elm, i++, this))
                    yield elm;
        }

        get fastCount() {
            if (typeof this.p === "function")
                return -1;

            const temp = super.fastCount;
            return ~temp
                ? Math.max(0, temp - Math.abs(this.p))
                : -1;
        }
    }

    /** Output of {@link LazyAbstractList.take} */
    export class LazyTakeList<T> extends LazyFixedList<T, T> {
        constructor (source: Iterable<T>, public p: Predicate<T, LazyTakeList<T>> | number, public mode: JoinMode | boolean = false, public def?: T) { super(source); }

        static *take<T>(iter: MarkedIterator<T>, n: number, mode: JoinMode | boolean = false, def?: T) {
            for (var value: T, i = 0; i < n; i++) // If this were a foreach loop the first element after "n" would have been calculated too
                if (iter.done = ({ value } = iter.next()).done)
                    if (!mode)
                        break;
                    else
                        yield def;
                else
                    yield value;
        }

        static *takeWhile<T, TList>(iter: MarkedIterator<T>, p: Predicate<T, TList>, list?: TList) {
            var i = 0;
            for (var value: T; !(iter.done = ({ value } = iter.next()).done); )
                if (p(value, i++, list))
                    yield value;
                else
                    break;
        }

        *[Symbol.iterator]() {
            if (typeof this.p === "number")
            {
                if (this.p < 0)
                {
                    const [ iter, l ] = this.calcLength();
                    yield* LazySkipList.skip(iter[Symbol.iterator](), l + this.p);
                    if (this.mode)
                        for (var i = l; i < -this.p; i++)
                            yield this.def;
                }
                else yield* LazyTakeList.take(this.source[Symbol.iterator](), this.p, this.mode, this.def);
            }
            else yield* LazyTakeList.takeWhile(this.source[Symbol.iterator](), this.p, this);
        }

        get fastCount() {
            if (typeof this.p === "function")
                return -1;

            if (this.mode)
                return Math.abs(this.p);

            const temp = super.fastCount;
            return ~temp
                ? Math.min(Math.abs(this.p), temp)
                : -1;
        }
    }

    /** Output of {@link padStart} */
    export class LazyPadStartList<T> extends LazySourceList<T, T> {
        constructor (source: Iterable<T>, public n: number, public def?: T) { super(source); }

        *[Symbol.iterator]() {
            const [ iter, l ] = this.calcLength();
            for (var i = l; i < this.n; i++)
                yield this.def;
            yield* iter;
        }
    }

    /** Output of {@link accumulate} */
    export class LazyAccumulateList<T, TResult = T> extends LazyFixedList<T, TResult> {
        constructor (source: Iterable<T>, public f: Combine<TResult, T, TResult, LazyAccumulateList<T, TResult>>, public out?: TResult, public hasOut: boolean = arguments.length > 2) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            var out: TResult;

            var value: T;
            const iter = this.source[Symbol.iterator]();
            if (!this.hasOut)
                if (!({ value } = iter.next()).done)
                    yield out = <any>value,
                    i++;
                else return;
            else out = this.out; // The initial value is not yielded if its from input

            for (; !({ value } = iter.next()).done; i++)
                yield out = this.f(out, value, i, this);
        }
    }

    /** Output of {@link zip} */
    export class LazyZipList<A, B, TResult = [ A, B ]> extends LazyFixedList<A, TResult> {
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

        get fastCount() {
            const source = super.fastCount;
            const other = fastCount(this.other);
            switch (this.mode)
            {
                case JoinMode.inner:
                    return ~source && ~other ? Math.min(source, other) : -1;
                case JoinMode.left:
                    return ~source ? source : -1;
                case JoinMode.right:
                    return ~other ? other : -1;
                case JoinMode.outer:
                    return ~source && ~other ? Math.max(source, other) : -1;
            }
        }
    }

    /** Output of {@link join} */
    export class LazyJoinList<A, B, TResult = [ A, B ]> extends LazyFixedList<A, TResult> {
        constructor(source: Iterable<A>, public other: Iterable<B>, public p?: Combine<A, B, boolean, LazyJoinList<A, B, TResult>>, public f?: Combine<A, B, TResult, LazyJoinList<A, B, TResult>>, public mode: JoinMode = JoinMode.inner) { super(source); }

        *[Symbol.iterator]() {
            type State<T> = { v: T, c?: boolean };
            const cacheA: State<A>[] = [];
            const cacheB: State<B>[] = [];

            // Inner
            var i = 0;
            for (const a of this.source)
            {
                const aE = cacheA[i] ??= { v: a };
                for (const bE of (i ? cacheB : new LazySelectList(this.other, (v, i) => cacheB[i] = <State<B>>{ v })))
                {
                    const temp = !this.p || this.p(a, bE.v, i, this);
                    aE.c ||= temp;
                    bE.c ||= temp;
                    if (temp)
                        yield this.f
                            ? this.f(a, bE.v, i, this)
                            : [ a, bE.v ];
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

        get fastCount() {
            if (this.p) return -1;
            const source = super.fastCount;
            if (!~source) return -1;
            const other = fastCount(this.other);
            return ~other
                ? source * other
                : -1;
        }
    }

    /** Output of {@link LazyAbstractList.combinations} */
    export class LazyCombinationsList<T> extends LazyFixedList<T, T[]> {
        constructor(source: Iterable<T>, public depth: number = 2) { super(source); }

        static fact(n: number) {
            var out = 1;
            for (var i = 2; i <= n; i++)
                out *= i;
            return out;
        }

        static *combinations<T>(inp: LazyCacheList<T>, depth = 2, start = 0, stack: T[] = []) {
            if (depth)                                                      // If there is more length to add to the combination
            {
                const { length } = stack;
                for (var i = start; inp.inBound(i); i++)                    // For each element in the input
                    stack[length] = inp.at(i),                              // Add it to the stack
                    yield* this.combinations(inp, depth - 1, i + 1, stack); // Go to the next element of the combination
                stack.pop();                                                // Removes the element added by this level of recursion
            }
            else yield stack.slice();                                       // If there is no more length to add to the combination, yield A COPY of the combination
        }

        *[Symbol.iterator]() {
            yield* LazyCombinationsList.combinations(new LazyCacheList(this.source), this.depth);
        }

        get fastCount() {
            const temp = super.fastCount;
            return ~temp
                ? LazyCombinationsList.fact(temp) / (LazyCombinationsList.fact(temp - this.depth) * LazyCombinationsList.fact(this.depth))
                : -1;
        }
    }

    /** Output of {@link LazyAbstractList.storeBy} */
    export class LazyStore<T, TKey> {
        map: Map<TKey, LazyStoreByList<T, TKey>> = new Map();
        processed: number = 0;
        done: boolean = false;
        #iter: Iterator<T>;
        constructor(public source: Iterable<T>, public f: Convert<T, TKey, LazyStoreByList<T, TKey>>) { }

        /**
         * Returns the list of the elements with the given key.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyStoreByList} could cause unexpected behaviours (Some elements could not be present)
         * @param k The key to search for
         */
        get(k: TKey) {
            var out = this.map.get(k);
            if (!out)
                this.map.set(k, out = new LazyStoreByList<T, TKey>(k, this, this.f));
            return out;
        }

        /** The iterator to cache */
        get iter() {
            return this.#iter ??= this.source[Symbol.iterator]();
        }
    }

    /** Output of {@link LazyStore.get} */
    export class LazyStoreByList<T, TKey> extends LazyAbstractList<T> {
        processed: number = 0;
        cached: T[] = [];
        constructor(public key: TKey, public store: LazyStore<T, TKey>, public f: Convert<T, TKey, LazyStoreByList<T, TKey>>) { super(); }

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
    export class Grouping<T, TKey> extends LazyFixedList<T, T> {
        constructor(public key: TKey, source: Iterable<T>) { super(source); }
    }

    /** Output of {@link groupBy} */
    export class LazyGroupByList<T, TKey> extends LazySourceList<T, Grouping<T, TKey>> {
        constructor(source: Iterable<T>, public f: Convert<T, TKey, LazyGroupByList<T, TKey>>) { super(source); }

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
                yield new Grouping<T, TKey>(k, v);
        }
    }

    /** Output of {@link split} */
    export class LazySplitList<T> extends LazySourceList<T, LazyAbstractList<T>> {
        constructor(source: Iterable<T>, public p: Predicate<T, LazySplitList<T>> | number, public lazy: boolean = false, public mode: JoinMode | boolean = false, public def?: T) { super(source); }

        *[Symbol.iterator]() {
            const numeric = typeof this.p === "number";
            const iter: MarkedIterator<T> = this.source[Symbol.iterator]();
            const next = numeric
                ? () => LazyTakeList.take(iter, <any>this.p, this.mode, this.def)
                : () => LazyTakeList.takeWhile(iter, (x, i) => !(<any>this.p)(x, i, this));
            
            while (!iter.done)
            {
                const lazy = new LazyFixedList(next());
                if (!this.lazy)
                {
                    const temp = lazy.calc();
                    if (!numeric || temp.has()) // If the list is not lazy, it can be checked for emptyness
                        yield temp;
                }
                else yield lazy;
            }
        }
    }

    /** Output of {@link wrap} */
    export class LazyWrapList<T, TList extends Iterable<T>> extends LazySourceList<T, TList> {
        constructor(source: TList) { super(source); }

        *[Symbol.iterator]() {
            yield this.source;
        }

        get fastCount() {
            return 1;
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

        has(value?: O) {
            if (!arguments.length)
                return this.done ? this.saved > 0 : super.has();
            return super.has(value);
        }

        /** Calculates the remaining elements one at a time */
        *calcRest(): Generator<O> {
            for (var value: I; !({ value, done: this.done } = this.iter.next()).done; )
                yield this.save(value);
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
    
        save(value: T) {
            this.cached.add(value);
            return value;
        }

        /**
         * Adds a value to the set
         * @param value The value to add
         */
        add(value: T) {
            this.save(value);
            return this;
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
    
        save(value: T) {
            const k = this.getK(value, this.processed, this);
            const v = this.getV ? this.getV(value, this.processed, this) : <any>value;
            this.cached.set(k, v);
            this.processed++;
            return <[ K, V ]>[ k, v ];
        }

        /**
         * Gets if the map contains the given key
         * @param value The key to check
         */
        hasKey(value: K) {
            if (this.cached.has(value))
                return true;
    
            for (const [ k ] of this.calcRest())
                if (k === value)
                    return true;
    
            return false;
        }

        /**
         * Gets the value for the given key
         * @param key The key to get the value for
         * @param def The default value to return if the key is not found
         */
        get(key: K, def?: V) {
            if (this.cached.has(key))
                return this.cached.get(key);
    
            for (const [ k, v ] of this.calcRest())
                if (k === key)
                    return v;
    
            return def;
        }
    
        /**
         * Adds a new key-value pair to the map
         * @param key The key to add
         * @param value The value to add
         */
        set(key: K, value: V) {
            this.cached.set(key, value);
            return this;
        }
    
        get saved() {
            return this.cached.size;
        }
    }

    /** Output of {@link cache} */
    export class LazyCacheList<T> extends LazyAbstractCacheList<T, T, T[]> {
        cached: T[] = [];

        at(n: number, def?: T) {
            return n < 0
                ? this.done
                    ? this.at(this.saved + n, def)
                    : super.at(n, def)
                : n < this.saved
                    ? this.cached[n]
                : this.done
                    ? def
                    : super.at(n, def);
        }

        inBound(n: number) {
            if (n < 0)
                return this.done
                    ? (this.saved + n) >= 0
                    : super.inBound(n);
            if (n < this.saved)
                return true;
            for (const _ of this.calcRest())
                if (n < this.saved)
                    return true;
            return false;
        }

        save(value: T) {
            this.cached.push(value);
            return value;
        }

        get last() {
            return this.done
                ? this.cached[this.cached.length - 1]
                : super.last;
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

    /** Array that can be converted to a {@link LazyAbstractList} with a convenient method ({@link lazy}) */
    export class Laziable<T> extends Array<T> {
        /** Converts {@link this} into a {@link LazyAbstractList} */
        lazy<T = any>(this: Source<T>) {
            return from(this);
        }
    }
}

if (typeof module !== "object")
    var module = {};
export = LazyList;