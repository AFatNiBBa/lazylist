/** Returns the type of the elements of {@link T} and continues to do so to the output until the type of the element is not iterable */
declare type RootElementType<T> = T extends Iterable<infer U> ? RootElementType<U> : T;
/**
 * Returns a {@link LazyAbstractList} based on an iterable or an non-iterable iterator.
 * If the {@link source} is a function, it gets wrapped in a new object that has {@link source} as its {@link Symbol.iterator} method.
 * If the {@link source} is a non-iterable iterator, it gets wrapped in a new object that returns {@link source} in its {@link Symbol.iterator} method.
 * If {@link source} is already a {@link LazyAbstractList}, it gets returned directly, otherwise it gets wrapped in a {@link LazyFixedList}
 * @param source The iterable/iterator
 * @param force If `true`, {@link source} is always wrapped
 */
export declare function from<T = any>(source?: Source<T>, force?: boolean): LazyAbstractList<T>;
/** Represents something which can be converted to a {@link LazyAbstractList} through {@link from} */
export declare type Source<T> = Iterable<T> | Iterator<T> | (() => Iterator<T>);
/** Represents data structure with a numeric indexer and a length that do not need to be writable */
export declare type ReadOnlyIndexable<T> = {
    readonly [k: number]: T;
    readonly length: number;
};
/** A function that indicates the "truthyness" of a value */
export declare type Predicate<T, TList = Iterable<T>> = (x: T, i: number, list: TList) => boolean | any;
/** A function that converts a value */
export declare type Convert<X, Y, TList = Iterable<Y>> = (x: X, i: number, list: TList) => Y;
/** A function that takes two arguments and combines them */
export declare type Combine<A, B, TResult = A, TList = Iterable<TResult>> = (a: A, b: B, i: number, list: TList) => TResult;
/**
 * An iterator that may have a {@link MarkedIterator.done} property.
 * If not present is `false` by default
 */
export declare type MarkedIterator<T> = Iterator<T> & {
    done?: boolean;
};
/** Indicates how two iterable should be conbined it they have different sizes */
export declare enum JoinMode {
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
 * Makes {@link ctor} extend from {@link LazyAbstractList}
 * @param ctor The constructor to which you want to change the base class; If not provided, it will apply the functionalities to {@link Generator}
 * @returns The library itself
 */
export declare function injectInto(ctor?: abstract new (...args: any[]) => any): typeof from;
/**
 * Returns the length of the iterable if it is easy to compute, otherwise it returns `-1`
 * @param source The iterable from which to get the count
 */
export declare function fastCount(source: Iterable<any>): number;
/**
 * Makes the provided iterator iterable.
 * If a generator is used in a foreach loop and you break out of it, the generator will be closed (It will stop even if some elements remain), this function prevents that.
 * @param iter The iterator to make iterable
 */
export declare function toGenerator<T>(iter: Iterator<T>): Generator<T, void, unknown>;
/**
 * Returns an INFINITE sequence of random numbers comprised between {@link bottom} and {@link top}.
 * Since the sequence is infinite, it will create problems with non lazy methods.
 * Since the sequence is random, it will not be the same every time you calculate it
 * @param top The highest number in the sequence; If not provided, it will be `1` and the random numbers will not be integers
 * @param bottom The lowest number in the sequence; If not provided, it will be `0`
 */
export declare function rand(top?: number, bottom?: number): LazyRandList;
/**
 * Returns an auto-generated list of numbers
 * @param end The end of the sequence
 * @param start The begin of the sequence
 * @param step The difference between each step of the sequence
 * @param flip If `true` the sequence will be reversed (If {@link end} is less than `0` it will be `true` by default)
 */
export declare function range(end?: number, start?: number, step?: number, flip?: boolean): LazyRangeList;
/** An iterable wrapper with helper functions */
export declare abstract class LazyAbstractList<T> {
    abstract [Symbol.iterator](): Generator<T>;
    /**
     * Ensures every element of the list shows up only once
     * @param f A conversion function that returns the the part of the element to check duplicates for; If omitted, the element itself will be used
     */
    distinct<TKey = T>(f?: Convert<T, TKey, LazyDistinctList<T, TKey>>): LazyDistinctList<T, TKey>;
    /**
     * Ensures no element of {@link other} shows up in the list.
     * Every time the iteration starts, {@link other} is completely calculated
     * @param f A conversion function that returns the the part of the element to check for in the list; If omitted, the element itself will be used
     */
    except<TKey = T>(other: Iterable<TKey>, f?: Convert<T, TKey, LazyExceptList<T, TKey>>): LazyExceptList<T, TKey>;
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
     * If {@link p} does NOT match on an element, it gets yielded, otherwise it gets passed into {@link f} and it gets filtered out
     * @param p A predicate function
     * @param f A function
     */
    case(p: Predicate<T, LazyCaseList<T>>, f: Convert<T, void, LazyCaseList<T>>): LazyCaseList<T>;
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
    selectWhere<TResult>(f: Predicate<{
        value: T;
        result?: TResult;
    }, LazySelectWhereList<T, TResult>>): LazySelectWhereList<T, TResult>;
    /**
     * Converts the list based on {@link f}
     * @param f A conversion function
     */
    select<TResult>(f: Convert<T, TResult, LazySelectList<T, TResult>>): LazySelectList<T, TResult>;
    /**
     * Converts the current list to a list of iterables based on {@link f} and concats every element
     * @param f A conversion function; Can be omitted if every element is iterable
     */
    selectMany<TResult = T extends Iterable<infer U> ? U : never>(f?: Convert<T, Iterable<TResult>, LazySelectManyList<T, TResult>>): LazySelectManyList<T, TResult>;
    /**
     * For each element yields the element and the children generated by {@link f} and does it all again for each child.
     * Providing the {@link p} parameter is very different to using {@link where}, because not only the element will eventually be filtered out, but also the children.
     * The index provided to the callbacks are the child element index on their parent
     * @param f A conversion function that returns an iterable of the same type as the provided element (Or a nullish value)
     * @param p A predicate function
     * @param flip If `true` the children will be yielded before the parent
     */
    traverse(f: Convert<T, Iterable<T>, LazyTraverseList<T>>, p?: Predicate<T, LazyTraverseList<T>>, flip?: boolean): LazyTraverseList<T>;
    /** Flattens in a single list every iterable element of the list, and the elements of the elements and so on */
    flat(): LazyFlatList<T>;
    /**
     * Merges the current list to {@link other}
     * @param other An iterable
     */
    merge(other: Iterable<T>, flip?: boolean): LazyMergeList<T>;
    /**
     * Inserts {@link value} at index {@link n}.
     * If {@link n} is not provided, the value will be inserted at the end of the list
     * @param value The value to insert
     * @param n Index at which to insert the value (Use a negative number to insert from the end)
     */
    insert(value: T, n?: number): LazyInsertList<T>;
    /**
     * Adds a value at the beginning of the list.
     * Is the same as passing {@link value} to {@link insert} with `0` as the second argument
     * @param value The value to add
     */
    prepend(value: T): LazyInsertList<T>;
    /**
     * Adds a value at the end of the list.
     * Is the same as passing {@link value} to {@link insert} with `null` as the second argument
     * @param value The value to add
     */
    append(value: T): LazyInsertList<T>;
    /**
     * Removes the first {@link n} occurences of {@link value} from the list
     * @param value The value to remove
     * @param n The number of times to remove the value (Use {@link Infinity} to remove all the occurrences); It defaults to 1
     */
    remove(value: T, n?: number): LazyRemoveList<T>;
    /**
     * Forces the list to have at least one element by adding a default value if the list is empty
     * @param def The value to add if the list is empty
     */
    default(def?: T): LazyDefaultList<T>;
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
     * Shuffles the list in a randomic way.
     * Non lazy
     */
    shuffle(): LazyShuffleList<T>;
    /**
     * Orders the list using selection sort, so that it computes the entire list all at once but sorts it lazily.
     * The current index of the "inner" iteration is available inside of {@link comp}.
     * Non lazy
     * @param comp A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
     * @param desc If `true`, reverses the results
     */
    sort(comp?: Combine<T, T, number, LazySortList<T>>, desc?: boolean): LazySortList<T>;
    /**
     * Orders the list based on the return value of {@link f} using selection sort, so that it computes the entire list all at once but sorts it lazily.
     * Differs from {@link sort} in that {@link comp} is provided with the return value of {@link f}, and not the element itself.
     * The current index of the "inner" iteration is available inside of {@link comp}.
     * Non lazy
     * @param f A conversion function
     * @param comp A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
     * @param desc If `true`, reverses the results
     */
    orderBy<TKey>(f: Convert<T, TKey, LazySortList<T>>, desc?: boolean, comp?: Combine<TKey, TKey, number, LazySortList<T>>): LazySortList<T>;
    /**
     * Replaces a section of the list with a new one based on {@link f}, which will be provided with the original section
     * @param start The start index of the section
     * @param length The length of the section
     * @param f The function that will provide the new section
     * @param lazy If `true` the section will be lazy but mono-use, and each element not taken will be appended after the new section
     */
    splice(start: number, length?: number, f?: (x: LazyFixedList<T, T>) => Iterable<T>, lazy?: boolean): LazySpliceList<T>;
    /**
     * Throws a {@link RangeError} based on {@link mode}, generally if the list has not exactly {@link n} elements.
     * Notice that if the iteration its stopped before the end the input list could have more than {@link n} elements
     * @param n The number of elements the list must have
     * @param mode Tells the method when to throw errors
     * @param def The default value to return if the list has less than {@link n} elements and {@link mode} is {@link JoinMode.inner} or {@link JoinMode.left}
     */
    fixedCount(n: number, mode?: JoinMode, def?: T): LazyFixedCountList<T>;
    /**
     * Moves the first {@link p} elements to the end of the list
     * @param p The elements to rotate (Use a negative number to skip from the end); If a function is given, it will be called for each element and the elements will be skipped until the function returns `false`
     */
    rotate(p: Predicate<T, LazySkipList<T>> | number): LazyRotateList<T>;
    /**
     * Skips the first {@link p} elements of the list
     * @param p The elements to skip (Use a negative number to skip from the end); If a function is given, it will be called for each element and the elements will be skipped until the function returns `false`
     * @param leftOnNegative Usually, if {@link p} is negative, the LAST -{@link p} elements will be skipped; If `true`, the elements will be skipped from the beginning
     */
    skip(p: Predicate<T, LazySkipList<T>> | number, leftOnNegative?: boolean): LazySkipList<T>;
    /**
     * Takes the first {@link p} elements of the list and skips the rest
     * @param p The elements to take (Use a negative number to take from the end); If a function is given, it will be called for each element and the elements will be taken until the function returns `false`
     * @param mode If truthy and {@link p} is more than the list length, the output list will be forced to have length {@link p} by concatenating as many {@link def} as needed
     * @param def The value to use if the list is too short
     * @param leftOnNegative Usually, if {@link p} is negative, the output will be the LAST -{@link p} elements; If `true`, the output will be taken from the beginning
     */
    take(p: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean, def?: T, leftOnNegative?: boolean): LazyTakeList<T>;
    /**
     * Force the list to have at least {@link n} elements by concatenating as many {@link def} as needed at the beginning of the list.
     * If you want to pad at the end, use {@link take} instead (Be carefull to pass `true` as the second argument).
     * Non lazy
     * @param n The number of desired elements
     * @param def The value to use if the list is too short
     */
    padStart(n: number, def?: T): LazyPadStartList<T>;
    /**
     * Aggregates the list based on {@link f}.
     * Similiar to {@link aggregate} but yields the intermediate results
     * @param f A combination function
     * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration)
     */
    accumulate<TResult = T>(f: Combine<TResult, T, TResult, LazyAccumulateList<T, TResult>>, out?: TResult): LazyAccumulateList<T, TResult>;
    /**
     * Combines the current list with {@link other} based on {@link f}
     * @param other An iterable
     * @param f A combination function, if not provided the pairs will be put in a tuple
     * @param mode Different length handling
     */
    zip<TOther, TResult = [T, TOther]>(other: Iterable<TOther>, f?: Combine<T, TOther, TResult, LazyZipList<T, TOther, TResult>>, mode?: JoinMode): LazyZipList<T, TOther, TResult>;
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
    join<TOther, TResult = [T, TOther]>(other: Iterable<TOther>, p?: Combine<T, TOther, boolean, LazyJoinList<T, TOther, TResult>>, f?: Combine<T, TOther, TResult, LazyJoinList<T, TOther, TResult>>, mode?: JoinMode): LazyJoinList<T, TOther, TResult>;
    /**
     * Generates all the possible combinations of length {@link depth} of the elements of the list.
     * Only one combination will be generated for each pair of elements from the two lists (If there is "(a, b)" there will not be "(b, a)").
     * The index available in the functions is the one of the first element of the group
     * @param depth The length of the each combination
     */
    combinations(depth?: number): LazyCombinationsList<T>;
    /**
     * Groups the list's elements based on a provided function.
     * Non lazy
     * @param f A combination function
     */
    groupBy<TKey>(f: Convert<T, TKey, LazyGroupByList<T, TKey>>): LazyGroupByList<T, TKey>;
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
    storeBy<TKey>(f: Convert<T, TKey, LazyStoreByList<T, TKey>>): LazyStore<T, TKey>;
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
    split(p: Predicate<T, LazySplitList<T>> | number, lazy?: boolean, mode?: JoinMode | boolean, def?: T): any;
    /** Outputs an iterable that will contain the current one as its only element */
    wrap(): LazyWrapList<T, this>;
    /**
     * Like {@link but}, but the function is only executed on the first element
     * @param f A function
     */
    onFirst(f: Convert<T, void, LazyOnFirstList<T>>): LazyOnFirstList<T>;
    /**
     * Returns a {@link LazySet} that contains the elements of the list.
     * The set is lazy, this means that the elements are not calculated until it is checked if they are present.
     * WARNING: Having more than 1 active iterator at same time on the same {@link LazySet} could cause unexpected behaviours (Some elements could not be present)
     */
    toSet(): LazySet<T>;
    /**
     * Returns a {@link LazyMap} that contains the elements of the list.
     * The map is lazy, this means that the elements are not calculated until it is checked if they are present or the key is requested.
     * WARNING: Having more than 1 active iterator at same time on the same {@link LazyMap} could cause unexpected behaviours (Some elements could not be present)
     * @param getK The function that will be used to get the key of each element
     * @param getV The function that will be used to get the value of each element; If not provided the element itself will be used
     */
    toMap<K, V = T>(getK: Convert<T, K, LazyMap<T, K, V>>, getV?: Convert<T, V, LazyMap<T, K, V>>): any;
    /**
     * Caches the list's calculated elements, this prevent them from passing inside the pipeline again
     * WARNING: Having more than 1 active iterator at same time on the same {@link LazyCacheList} could cause unexpected behaviours (Some elements could not be present)
     */
    cache(): LazyCacheList<T>;
    /** Calculates each element of the list and wraps them in a {@link LazyFixedList} */
    calc(): LazyFixedList<T, T>;
    /** Calculates and awaits each element of the list and wraps them in a {@link LazyFixedList} */
    await<TAwaited>(this: LazyAbstractList<PromiseLike<TAwaited>>): Promise<LazyFixedList<TAwaited, TAwaited>>;
    /**
     * Converts the list based on {@link f}.
     * It is not named "then" because otherwise it would have been automatically executed if you await {@link await}
     * @param f A conversion function, to which values of the awaited type of {@link T} will be passed
     */
    thenDo<TAwaited, TResult>(this: LazyAbstractList<PromiseLike<TAwaited>>, f: Convert<TAwaited, TResult, LazySelectList<PromiseLike<TAwaited>, Promise<TResult>>>): LazySelectList<PromiseLike<TAwaited>, Promise<TResult>>;
    /**
     * Catches the promise errors using the {@link f} function
     * @param f A conversion function, to which errors of the list's promises will be passed
     */
    catch<TAwaited>(this: LazyAbstractList<PromiseLike<TAwaited>>, f: Convert<any, TAwaited, LazySelectList<PromiseLike<TAwaited>, Promise<TAwaited>>>): LazySelectList<PromiseLike<TAwaited>, Promise<TAwaited>>;
    /**
     * Filters the list returning only the elements which are instances of {@link ctor}
     * @param ctor A constructor
     */
    ofType<TResult extends T>(ctor: new (...args: any[]) => TResult): LazyWhereList<TResult>;
    /**
     * Executes {@link Object.assign} on each element passing {@link obj} as the second parameter
     * @param obj An object
     */
    assign<TMap>(obj: TMap): LazySelectList<T, T & TMap>;
    /**
     * Executes {@link f} on each element of the list and returns the current element (not the output of {@link f})
     * @param f A function
     */
    but(f: Convert<T, void, LazySelectList<T, T>>): LazySelectList<T, T>;
    /**
     * Executes {@link f} on each element of the list forcing it to be entirely calculated.
     * If no argument is provided, the list will be just calculated
     * @param f A function
     */
    forEach(f?: Convert<T, void, LazyAbstractList<T>>): void;
    /** Replaces every element of the list with {@link value} */
    fill(value: T): LazySelectList<T, T>;
    /**
     * Returns a section of the list, starting at {@link start} and with {@link length} elements
     * @param start The index to start at; Can be whatever you can pass as the first argument of {@link skip}
     * @param length The length of the section; Can be whatever you can pass as the first argument of {@link take}
     * @param mode If truthy and {@link length} is more than the list length, the output list will be forced to have length {@link length} by concatenating as many {@link def} as needed
     * @param leftOnNegative Usually, if {@link length} is negative, the last -{@link length} elements will be SKIPPED; If `true`, the last -{@link length} elements before {@link start} will be taken instead; Only works if both {@link start} and {@link length} are numbers
     */
    slice(start: Predicate<T, LazySkipList<T>> | number, length: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean, def?: T, leftOnNegative?: boolean): LazyTakeList<T>;
    /**
     * Returns the element at the provided index
     * @param n The index; If negative it starts from the end
     * @param def The default value
     */
    at(n: number, def?: T): T;
    /**
     * Throws a {@link RangeError} based on {@link mode}, generally if the list has not exactly `1` element
     * @param mode Tells the method when to throw errors
     * @param def The default value to return if the list has less than `1` elements and {@link mode} is {@link JoinMode.inner} or {@link JoinMode.left}
     */
    single(mode?: JoinMode, def?: T): T;
    /**
     * Aggregates the list based on {@link f}
     * @param f A combination function
     * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration)
     */
    aggregate<TResult = T>(f: Combine<TResult, T, TResult, LazyAbstractList<T>>, out?: TResult): TResult;
    /**
     * Returns `false` if there is an element that is not equal to the first.
     * If the list is empty, it returns `true`
     * @param f A comparison function
     */
    allEquals(f?: Combine<T, T, boolean, LazyAbstractList<T>>): boolean;
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
     * Tells if the element at the given index can be retrieved
     * @param n The index to check; If negative it starts from the end
     */
    inBound(n: number): boolean;
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
     * Given multiple predicate functions it returns an array containing for each function the times it returned `true`
     * @param p The predicate functions
     * @returns An array with a function to convert it in a {@link LazyAbstractList} ({@link Laziable.prototype.lazy})
     */
    multiCount(...p: Predicate<T, LazyAbstractList<T>>[]): Laziable<number>;
    /**
     * Joins the list elements using {@link sep} as the separator
     * @param sep The separator
     */
    concat(sep?: string): string;
    /**
     * Returns the smallest value in the list
     * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
     */
    min(f?: Combine<T, T, number, LazyAbstractList<T>>): any;
    /**
     * Returns the biggest value in the list
     * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
     */
    max(f?: Combine<T, T, number, LazyAbstractList<T>>): T;
    /**
     * Gets the first element of the list or {@link def} as default if it's empty.
     * Can be used as `next()` when the source iterable is a generator
     */
    get first(): T;
    /** Gets the last element of the list or `undefined` as default if it's empty */
    get last(): T;
    /** Aggregates the list using the `+` operator (Can both add numbers and concatenate strings) */
    get sum(): T extends number ? number : string;
    /** Calculates the average of the elements of the list */
    get avg(): T extends number ? number : typeof NaN;
    /** Calculates the length of the list */
    get count(): number;
    /** Calculates each element of the list and puts them inside of an {@link Array} */
    get value(): T[];
    /** Returns the length of the iterable if it is easy to compute, otherwise it returns `-1` */
    get fastCount(): number;
}
/** Iterable that stores only a cached chunk of data at a time */
export declare class LazyBufferList<T> extends LazyAbstractList<T> {
    f: (n: number, list: LazyBufferList<T>) => ReadOnlyIndexable<T>;
    offset: number;
    start: number;
    buffer: ReadOnlyIndexable<T>;
    /**
     * Creates an iterable that stores only a chunk of data at the time and changes the loaded chunk when the index is out of range.
     * Can be freely accessed by index
     * @param f A function that generates a chunk of data starting from the given index
     * @param offset If an index is out of range, the loaded chunk will start this amount of elements before the index
     */
    constructor(f: (n: number, list: LazyBufferList<T>) => ReadOnlyIndexable<T>, offset?: number);
    [Symbol.iterator](): Generator<T, void, unknown>;
    at(n: number, def?: T): T;
    /**
     * Tells if the element at the given index can be retrieved
     * @param n The index to check; If negative it starts from the end
     * @param read  If false, only the current buffer is checked
     */
    inBound(n: number, read?: boolean): any;
}
/** Similiar to {@link LazyBufferList}, but allows the storage of the current position */
export declare class BufferIterator<T> extends LazyBufferList<T> {
    #private;
    [Symbol.iterator](): Generator<T, void, unknown>;
    /**
     * Clones the current iterator into another
     * @param target The iterator to clone into; If not provided, a new iterator will be created
     */
    clone(target?: BufferIterator<T>): BufferIterator<T> & this;
    /**
     * Reaches the {@link currentIndex} of {@link target}
     * @param target The iterator to reach
     * @returns The new current item
     */
    reach(target: BufferIterator<T>): T;
    /**
     * Moves the current item by {@link n} steps
     * @param n The number of steps to move; If not provided, the iterator will move by `1`
     * @returns The new current item
     */
    next(n?: number): T;
    /**
     * Moves the current item by {@link n} steps
     * @param n The number of steps to move; If not provided, the iterator will move by `-1`
     * @param absolute If true, the {@link currentIndex} will be set exactly to {@link n}
     * @returns The iterator itself
     */
    move(n?: number, absolute?: boolean): this;
    /**
     * Returns the element at {@link n} steps from the current item
     * @param n The number of steps to move; If not provided, the iterator will move by `1`
     */
    peek(n?: number): T;
    /** Obtains the index of the current element of the iterator */
    get currentIndex(): number;
    set currentIndex(value: number);
    /** Obtains the current element of the iterator */
    get current(): T;
    set current(value: T);
}
/** Output of {@link rand} */
export declare class LazyRandList extends LazyAbstractList<number> {
    top?: number;
    bottom?: number;
    constructor(top?: number, bottom?: number);
    [Symbol.iterator](): Generator<number, void, unknown>;
    get fastCount(): number;
}
/** Output of {@link range} */
export declare class LazyRangeList extends LazyAbstractList<number> {
    end: number;
    start: number;
    step: number;
    flip?: boolean;
    constructor(end?: number, start?: number, step?: number, flip?: boolean);
    [Symbol.iterator](): Generator<number, void, unknown>;
    reverse(): LazyAbstractList<number>;
}
/**
 * Instances of this class are guaranteed to have a base iterable.
 * The input iterable's elements are of type {@link I} and the output's ones are of type {@link O}
 */
export declare abstract class LazySourceList<I, O> extends LazyAbstractList<O> {
    source?: Iterable<I>;
    constructor(source?: Iterable<I>);
    [Symbol.iterator](): Generator<any, void, any>;
    /** Obtains the calculated version of {@link source} */
    base(): I[];
    /**
     * Returns an iterable containing the elements of {@link source} and its length.
     * If computing the length is expensive, it will calculate {@link source}, so its returned to prevent computing it twice
     */
    calcLength(): [Iterable<I>, number];
}
/**
 * Output of {@link from}.
 * Represents a list with the same number of elements as {@link source}.
 * It is used even by lists that need the {@link LazyFixedList.fastCount} of the {@link source} to calculate theirs
 */
export declare class LazyFixedList<I, O = I> extends LazySourceList<I, O> {
    get fastCount(): number;
}
/** Output of {@link distinct} */
export declare class LazyDistinctList<T, TKey = T> extends LazySourceList<T, T> {
    f?: Convert<T, TKey, LazyDistinctList<T, TKey>>;
    constructor(source: Iterable<T>, f?: Convert<T, TKey, LazyDistinctList<T, TKey>>);
    [Symbol.iterator](): Generator<T, void, unknown>;
}
/** Output of {@link except} */
export declare class LazyExceptList<T, TKey = T> extends LazySourceList<T, T> {
    other: Iterable<TKey>;
    f?: Convert<T, TKey, LazyExceptList<T, TKey>>;
    constructor(source: Iterable<T>, other: Iterable<TKey>, f?: Convert<T, TKey, LazyExceptList<T, TKey>>);
    [Symbol.iterator](): Generator<T, void, unknown>;
}
/** Output of {@link where} */
export declare class LazyWhereList<T> extends LazySourceList<T, T> {
    p?: Predicate<T, LazyWhereList<T>>;
    constructor(source: Iterable<T>, p?: Predicate<T, LazyWhereList<T>>);
    [Symbol.iterator](): Generator<T, void, unknown>;
}
/** Output of {@link when} */
export declare class LazyWhenList<T> extends LazyFixedList<T, T> {
    p: Predicate<T, LazyWhenList<T>>;
    f: Convert<T, T, LazyWhenList<T>>;
    e?: Convert<T, T, LazyWhenList<T>>;
    constructor(source: Iterable<T>, p: Predicate<T, LazyWhenList<T>>, f: Convert<T, T, LazyWhenList<T>>, e?: Convert<T, T, LazyWhenList<T>>);
    [Symbol.iterator](): Generator<T, void, unknown>;
}
/** Output of {@link case} */
export declare class LazyCaseList<T> extends LazySourceList<T, T> {
    p: Predicate<T, LazyCaseList<T>>;
    f: Convert<T, void, LazyCaseList<T>>;
    constructor(source: Iterable<T>, p: Predicate<T, LazyCaseList<T>>, f: Convert<T, void, LazyCaseList<T>>);
    [Symbol.iterator](): Generator<T, void, unknown>;
}
/** Output of {@link selectWhere} */
export declare class LazySelectWhereList<I, O> extends LazySourceList<I, O> {
    f: Predicate<{
        value: I;
        result?: O;
    }, LazySelectWhereList<I, O>>;
    constructor(source: Iterable<I>, f: Predicate<{
        value: I;
        result?: O;
    }, LazySelectWhereList<I, O>>);
    [Symbol.iterator](): Generator<any, void, unknown>;
}
/** Output of {@link select} */
export declare class LazySelectList<I, O> extends LazyFixedList<I, O> {
    f: Convert<I, O, LazySelectList<I, O>>;
    constructor(source: Iterable<I>, f: Convert<I, O, LazySelectList<I, O>>);
    [Symbol.iterator](): Generator<O, void, unknown>;
}
/** Output of {@link selectMany} */
export declare class LazySelectManyList<I, O = I extends Iterable<infer U> ? U : never> extends LazySourceList<I, O> {
    f?: Convert<I, Iterable<O>, LazySelectManyList<I, O>>;
    constructor(source: Iterable<I>, f?: Convert<I, Iterable<O>, LazySelectManyList<I, O>>);
    [Symbol.iterator](): Generator<any, void, any>;
}
/** Output of {@link LazyAbstractList.traverse} */
export declare class LazyTraverseList<T> extends LazySourceList<T, T> {
    f: Convert<T, Iterable<T>, LazyTraverseList<T>>;
    p?: Predicate<T, LazyTraverseList<T>>;
    flip?: boolean;
    constructor(source: Iterable<T>, f: Convert<T, Iterable<T>, LazyTraverseList<T>>, p?: Predicate<T, LazyTraverseList<T>>, flip?: boolean);
    static traverse<T, TList>(source: Iterable<T>, f: Convert<T, Iterable<T>, TList>, p?: Predicate<T, TList>, flip?: boolean, list?: TList): any;
    [Symbol.iterator](): any;
}
/** Output of {@link LazyAbstractList.flat} */
export declare class LazyFlatList<T> extends LazySourceList<T, RootElementType<T>> {
    constructor(source: Iterable<T>);
    static flat(source: Iterable<any>): any;
    [Symbol.iterator](): any;
}
/** Output of {@link merge} */
export declare class LazyMergeList<T> extends LazySourceList<T, T> {
    other: Iterable<T>;
    flip: boolean;
    constructor(source: Iterable<T>, other: Iterable<T>, flip?: boolean);
    [Symbol.iterator](): Generator<T, void, undefined>;
}
/** Output of {@link insert}, {@link prepend} and {@link append} */
export declare class LazyInsertList<T> extends LazyFixedList<T, T> {
    v: T;
    i?: number;
    constructor(source: Iterable<T>, v: T, i?: number);
    [Symbol.iterator](): Generator<T, any, undefined>;
    get fastCount(): number;
}
/** Output of {@link remove} */
export declare class LazyRemoveList<T> extends LazySourceList<T, T> {
    v: T;
    i: number;
    constructor(source: Iterable<T>, v: T, i?: number);
    [Symbol.iterator](): Generator<T, void, unknown>;
}
/** Output of {@link default} */
export declare class LazyDefaultList<T> extends LazyFixedList<T, T> {
    def?: T;
    constructor(source: Iterable<T>, def?: T);
    [Symbol.iterator](): Generator<T, any, unknown>;
    get fastCount(): number;
}
/** Output of {@link repeat} */
export declare class LazyRepeatList<T> extends LazyFixedList<T, T> {
    n: number;
    constructor(source: Iterable<T>, n: number);
    [Symbol.iterator](): Generator<T, void, undefined>;
    get fastCount(): number;
}
/** Output of {@link reverse} */
export declare class LazyReverseList<T> extends LazyFixedList<T, T> {
    [Symbol.iterator](): Generator<T, void, unknown>;
}
/** Output of {@link shuffle} */
export declare class LazyShuffleList<T> extends LazyFixedList<T, T> {
    [Symbol.iterator](): Generator<T, void, unknown>;
}
/** Output of {@link sort} and {@link orderBy} */
export declare class LazySortList<T> extends LazyFixedList<T, T> {
    f: Combine<T, T, number, LazySortList<T>>;
    desc: boolean;
    static defaultComparer: <T_1>(a: T_1, b: T_1) => 1 | -1 | 0;
    constructor(source: Iterable<T>, f?: Combine<T, T, number, LazySortList<T>>, desc?: boolean);
    [Symbol.iterator](): Generator<T, void, unknown>;
    /** A sorting function that allows two sorts in a row to be combined */
    compare(a: T, b: T, i: number): any;
    /** Obtains the {@link source} of the first sort of the current chain */
    get root(): Iterable<T>;
    /** Gets the number to which the result of {@link f} should be multiplied to be inverted when {@link desc} is true */
    get multiplier(): 1 | -1;
}
/** Output of {@link splice} */
export declare class LazySpliceList<T> extends LazySourceList<T, T> {
    start: number;
    length: number;
    f?: (x: LazyFixedList<T, T>) => Iterable<T>;
    lazy: boolean;
    constructor(source: Iterable<T>, start: number, length?: number, f?: (x: LazyFixedList<T, T>) => Iterable<T>, lazy?: boolean);
    [Symbol.iterator](): Generator<T, void, undefined>;
}
/** Output of {@link LazyAbstractList.fixedCount} */
export declare class LazyFixedCountList<T> extends LazySourceList<T, T> {
    n: number;
    mode: JoinMode;
    def?: T;
    constructor(source: Iterable<T>, n: number, mode?: JoinMode, def?: T);
    [Symbol.iterator](): Generator<T, void, unknown>;
    get fastCount(): number;
}
/** Output of {@link LazyAbstractList.rotate} */
export declare class LazyRotateList<T> extends LazyFixedList<T, T> {
    p: Predicate<T, LazySkipList<T>> | number;
    constructor(source: Iterable<T>, p: Predicate<T, LazySkipList<T>> | number);
    static rotate<T>(iter: MarkedIterator<T>, n: number): any;
    [Symbol.iterator](): Generator<any, any, any>;
}
/** Output of {@link LazyAbstractList.skip} */
export declare class LazySkipList<T> extends LazyFixedList<T, T> {
    p: Predicate<T, LazySkipList<T>> | number;
    leftOnNegative?: boolean;
    constructor(source: Iterable<T>, p: Predicate<T, LazySkipList<T>> | number, leftOnNegative?: boolean);
    static skip<T>(iter: MarkedIterator<T>, n: number): Generator<T, void, unknown>;
    [Symbol.iterator](): Generator<T, void, unknown>;
    get fastCount(): number;
}
/** Output of {@link LazyAbstractList.take} */
export declare class LazyTakeList<T> extends LazyFixedList<T, T> {
    p: Predicate<T, LazyTakeList<T>> | number;
    mode: JoinMode | boolean;
    def?: T;
    leftOnNegative?: boolean;
    constructor(source: Iterable<T>, p: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean, def?: T, leftOnNegative?: boolean);
    static take<T>(iter: MarkedIterator<T>, n: number, mode?: JoinMode | boolean, def?: T): Generator<T, void, unknown>;
    static takeWhile<T, TList>(iter: MarkedIterator<T>, p: Predicate<T, TList>, list?: TList): Generator<T, void, unknown>;
    [Symbol.iterator](): Generator<T, void, unknown>;
    get fastCount(): number;
}
/** Output of {@link padStart} */
export declare class LazyPadStartList<T> extends LazySourceList<T, T> {
    n: number;
    def?: T;
    constructor(source: Iterable<T>, n: number, def?: T);
    [Symbol.iterator](): Generator<T, void, undefined>;
}
/** Output of {@link accumulate} */
export declare class LazyAccumulateList<T, TResult = T> extends LazyFixedList<T, TResult> {
    f: Combine<TResult, T, TResult, LazyAccumulateList<T, TResult>>;
    out?: TResult;
    hasOut: boolean;
    constructor(source: Iterable<T>, f: Combine<TResult, T, TResult, LazyAccumulateList<T, TResult>>, out?: TResult, hasOut?: boolean);
    [Symbol.iterator](): Generator<TResult>;
}
/** Output of {@link zip} */
export declare class LazyZipList<A, B, TResult = [A, B]> extends LazyFixedList<A, TResult> {
    other: Iterable<B>;
    f?: Combine<A, B, TResult, LazyZipList<A, B, TResult>>;
    mode: JoinMode;
    constructor(source: Iterable<A>, other: Iterable<B>, f?: Combine<A, B, TResult, LazyZipList<A, B, TResult>>, mode?: JoinMode);
    [Symbol.iterator](): Generator<TResult>;
    get fastCount(): number;
}
/** Output of {@link join} */
export declare class LazyJoinList<A, B, TResult = [A, B]> extends LazyFixedList<A, TResult> {
    other: Iterable<B>;
    p?: Combine<A, B, boolean, LazyJoinList<A, B, TResult>>;
    f?: Combine<A, B, TResult, LazyJoinList<A, B, TResult>>;
    mode: JoinMode;
    constructor(source: Iterable<A>, other: Iterable<B>, p?: Combine<A, B, boolean, LazyJoinList<A, B, TResult>>, f?: Combine<A, B, TResult, LazyJoinList<A, B, TResult>>, mode?: JoinMode);
    [Symbol.iterator](): Generator<TResult>;
    get fastCount(): number;
}
/** Output of {@link LazyAbstractList.combinations} */
export declare class LazyCombinationsList<T> extends LazyFixedList<T, T[]> {
    depth: number;
    constructor(source: Iterable<T>, depth?: number);
    static fact(n: number): number;
    static combinations<T>(inp: LazyCacheList<T>, depth?: number, start?: number, stack?: T[]): any;
    [Symbol.iterator](): any;
    get fastCount(): number;
}
/**
 * Element of the output of {@link groupBy}.
 * The group common value is contained in the {@link key} property.
 * The group is a {@link LazyAbstractList} itself
 */
export declare class Grouping<T, TKey> extends LazyFixedList<T, T> {
    key: TKey;
    constructor(key: TKey, source: Iterable<T>);
}
/** Output of {@link reGroup} */
export declare class LazyGroupList<T, TKey, I = Grouping<T, TKey>> extends LazySourceList<I, Grouping<T, TKey>> {
    /**
     * Converts each group of the list based on {@link f}, and reapplies the keys to the output elements
     * @param f A conversion function
     */
    reGroup<TResult>(f: Convert<Grouping<T, TKey>, Iterable<TResult>, LazyGroupList<T, TKey, I>>): LazyGroupList<TResult, TKey>;
}
/** Output of {@link groupBy} */
export declare class LazyGroupByList<T, TKey> extends LazyGroupList<T, TKey, T> {
    f: Convert<T, TKey, LazyGroupByList<T, TKey>>;
    constructor(source: Iterable<T>, f: Convert<T, TKey, LazyGroupByList<T, TKey>>);
    [Symbol.iterator](): Generator<Grouping<T, TKey>, void, unknown>;
}
/** Output of {@link LazyStore.get} */
export declare class LazyStoreByList<T, TKey> extends LazyAbstractList<T> {
    key: TKey;
    store: LazyStore<T, TKey>;
    processed: number;
    cached: T[];
    constructor(key: TKey, store: LazyStore<T, TKey>);
    [Symbol.iterator](): Generator<T, void, unknown>;
    /** Yields the elements that have been cached by other lists in {@link store} */
    flush(): Generator<T, void, unknown>;
}
/** Output of {@link LazyAbstractList.storeBy} */
export declare class LazyStore<T, TKey> {
    #private;
    source: Iterable<T>;
    f: Convert<T, TKey, LazyStoreByList<T, TKey>>;
    map: Map<TKey, LazyStoreByList<T, TKey>>;
    processed: number;
    done: boolean;
    constructor(source: Iterable<T>, f: Convert<T, TKey, LazyStoreByList<T, TKey>>);
    /**
     * Returns the list of the elements with the given key.
     * WARNING: Having more than 1 active iterator at same time on the same {@link LazyStoreByList} could cause unexpected behaviours (Some elements could not be present)
     * @param k The key to search for
     */
    get(k: TKey): LazyStoreByList<T, TKey>;
    /** The iterator to cache */
    get iter(): Iterator<T, any, undefined>;
}
/** Output of {@link split} */
export declare class LazySplitList<T> extends LazySourceList<T, LazyAbstractList<T>> {
    p: Predicate<T, LazySplitList<T>> | number;
    lazy: boolean;
    mode: JoinMode | boolean;
    def?: T;
    constructor(source: Iterable<T>, p: Predicate<T, LazySplitList<T>> | number, lazy?: boolean, mode?: JoinMode | boolean, def?: T);
    [Symbol.iterator](): Generator<LazyFixedList<T, T>, void, unknown>;
}
/** Output of {@link wrap} */
export declare class LazyWrapList<T, TList extends Iterable<T>> extends LazySourceList<T, TList> {
    constructor(source: TList);
    [Symbol.iterator](): Generator<Iterable<T>, void, unknown>;
    get fastCount(): number;
}
/** Output of {@link onFirst} */
export declare class LazyOnFirstList<T> extends LazyFixedList<T> {
    f: Convert<T, void, LazyOnFirstList<T>>;
    constructor(source: Iterable<T>, f: Convert<T, void, LazyOnFirstList<T>>);
    [Symbol.iterator](): Generator<any, void, unknown>;
}
/** Common functionalities of cached lists */
export declare abstract class LazyAbstractCacheList<I, O, TCache extends Iterable<O>> extends LazySourceList<I, O> {
    #private;
    done: boolean;
    [Symbol.iterator](): Generator<O, void, undefined>;
    has(value?: O): boolean;
    /** Calculates the remaining elements one at a time */
    calcRest(): Generator<O>;
    /** Completes the cache and returns it */
    complete(): TCache;
    /** Saves an element to the cache */
    abstract save(value: I): O;
    get fastCount(): number;
    /** The iterator to cache */
    get iter(): Iterator<I, any, undefined>;
    /** The cached elements */
    abstract get cached(): TCache;
    /** The number of elements in the cache */
    abstract get saved(): number;
}
/** Output of {@link toSet} */
export declare class LazySet<T> extends LazyAbstractCacheList<T, T, Set<T>> {
    cached: Set<T>;
    has(value?: T): boolean;
    save(value: T): T;
    /**
     * Adds a value to the set
     * @param value The value to add
     */
    add(value: T): this;
    get saved(): number;
}
/** Output of {@link toMap} */
export declare class LazyMap<T, K, V> extends LazyAbstractCacheList<T, [K, V], Map<K, V>> {
    getK: Convert<T, K, LazyMap<T, K, V>>;
    getV?: Convert<T, V, LazyMap<T, K, V>>;
    processed: number;
    cached: Map<K, V>;
    constructor(source: Iterable<T>, getK: Convert<T, K, LazyMap<T, K, V>>, getV?: Convert<T, V, LazyMap<T, K, V>>);
    save(value: T): [K, V];
    /**
     * Gets if the map contains the given key
     * @param value The key to check
     */
    hasKey(value: K): boolean;
    /**
     * Gets the value for the given key
     * @param key The key to get the value for
     * @param def The default value to return if the key is not found
     */
    get(key: K, def?: V): V;
    /**
     * Adds a new key-value pair to the map
     * @param key The key to add
     * @param value The value to add
     */
    set(key: K, value: V): this;
    get saved(): number;
}
/** Output of {@link cache} */
export declare class LazyCacheList<T> extends LazyAbstractCacheList<T, T, T[]> {
    cached: T[];
    at(n: number, def?: T): any;
    inBound(n: number): boolean;
    save(value: T): T;
    /**
     * Gets a function that can be used as a {@link LazyBufferList} data source
     * @param load The number of elements to load ahead of time
     */
    getBufferFunc(load?: number): (n: number, list: LazyBufferList<T>) => ReadOnlyIndexable<T>;
    /**
     * Gets a {@link BufferIterator} that uses this cache as its data source
     * @param load The number of elements to load ahead of time
     */
    getIterator(load?: number): BufferIterator<T>;
    get last(): T;
    get fastCount(): number;
    get saved(): number;
}
/** Array that can be converted to a {@link LazyAbstractList} with a convenient method ({@link lazy}) */
export declare class Laziable<T> extends Array<T> {
    /** Converts {@link this} into a {@link LazyAbstractList} */
    lazy<T = any>(this: Source<T>): LazyAbstractList<T>;
}
export default from;
