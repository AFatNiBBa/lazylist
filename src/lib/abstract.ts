
import { COMPARE, IDENTITY, NOT_FOUND, calcIndex, isReadonlyArray } from "../util/util";
import { Combine, Compare, Convert, JoinMode, Predicate, by } from "..";

/** An iterable wrapper with helper functions */
export abstract class AbstractList<T> implements Iterable<T> {
    abstract [Symbol.iterator](): IterableIterator<T>;
    
    /** Calls {@link Promise.all} on the current list */
    async await(this: AbstractList<T>): Promise<AbstractList<Awaited<T>>> { return new FixedList(await Promise.all(this)); }

    /** Outputs an iterable that will contain the current one as its only element */
    wrap() { return new WrapList<T, this>(this); }

    /**
     * Forces the list to have at least one element by adding a default value if the list is empty
     * @param def The value to add if the list is empty
     */
    default(): DefaultList<T | undefined>;
    default(def: T): DefaultList<T>;
    default(def?: T) { return new DefaultList(this, def); }

    /**
     * Repeat the list's elements {@link n} times.
     * The list is calculated each time.
     * Use the {@link cache} method to cache the elements
     * @param n The number of repetitions
     */
    repeat(n: number) { return new RepeatList(this, n); }

    /**
     * Reverses the list.
     * Non lazy
     */
    reverse(): AbstractList<T> { return new ReverseList(this); }

    /**
     * Shuffles the list in a randomic way.
     * Non lazy
     */
    shuffle() { return new ShuffleList(this); }

    /**
     * Like {@link but}, but the function is only executed on the first element
     * The iterator for this list returns the same thing the source returned
     * @param f A function
     */
    init(f: Convert<T, void, InitList<T>>) { return new InitList<T>(this, f); }

    /**
     * Executes {@link f} at the end of the iteration
     * The iterator for this list returns the same thing the source returned
     * @param f The function that will be executed at the end of the iteration
     */
    finally(f: (list: FinallyList<T>) => void) { return new FinallyList<T>(this, f); }

    /**
     * Throws a {@link RangeError} if the list is enumerated more than once
     * The iterator for this list returns the same thing the source returned
     */
    once() { return new OnceList(this); }

    /**
     * Merges the current list to {@link other}.
     * The iterator for this list returns the same thing the source returned
     * @param other An iterable
     * @param flip If it's `true`, {@link other} will be yielded before the current list
     */
    merge(other: Iterable<T>, flip?: boolean) { return new MergeList(this, other, flip); }
    
    /**
     * Combines the current list with {@link other} based on {@link f}
     * @param other An iterable
     * @param f A combination function, if not provided the pairs will be put in a tuple
     * @param mode Different length handling
     */
    zip<O, R = [ T, O ]>(other: Iterable<O>, f?: Combine<T, O, R, ZipList<T, O, R>>, mode?: JoinMode) { return new ZipList<T, O, R>(this, other, f, mode); }

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
     * Filters the list returning only the elements which are instances of {@link ctor}
     * @param ctor A constructor
     */
    ofType<R extends T>(ctor: new (...args: any[]) => R): WhereList<R> { return <any>this.where(x => x instanceof ctor); }

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
    distinct<K = T>(f?: Convert<T, K, DistinctList<T, K>>) { return new DistinctList<T, K>(this, f); }

    /**
     * Ensures only elements of {@link other} show up in the list.
     * Every time the iteration starts, {@link other} is completely calculated
     * @param f A conversion function that returns the the part of the element to check for in the list; If omitted, the element itself will be used
     */
    intersect<K = T>(other: Iterable<K>, f?: Convert<T, K, IntersectList<T, K>>) { return new IntersectList<T, K>(this, other, f); }

    /**
     * Ensures no element of {@link other} shows up in the list.
     * Every time the iteration starts, {@link other} is completely calculated
     * @param f A conversion function that returns the the part of the element to check for in the list; If omitted, the element itself will be used
     */
    except<K = T>(other: Iterable<K>, f?: Convert<T, K, IntersectList<T, K>>) { return new IntersectList<T, K>(this, other, f, true); }

    /**
     * Groups the element of {@link source}.
     * Non lazy
     * @param k A conversion function that gets the key from each element
     * @param h A conversion function that gets the actual grouping value from each key
     */
    groupBy<K, H = K>(k: Convert<T, K, GroupByList<T, K, H>>, h?: Convert<K, H, GroupByList<T, K, H>>) { return new GroupByList<T, K, H>(this, k, h); }

    /**
     * Calls {@link GroupByList.lookup} on the current list
     * @param k A conversion function that gets the key from each element
     * @param h A conversion function that gets the actual grouping value from each key
     */
    lookup<K, H = K>(k: Convert<T, K>, h?: Convert<K, H, AbstractList<T>>) { return GroupByList.lookup(this, k, h, this); }

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
     * Returns a section of the list, starting at {@link start} and with {@link length} elements
     * @param start The index to start at; Can be whatever you can pass as the first argument of {@link skip}
     * @param length The length of the section; Can be whatever you can pass as the first argument of {@link take}
     * @param padEnd If truthy and {@link length} is more than the list length, the output list will be forced to have length {@link length} by concatenating as many {@link def} as needed
     * @param leftOnNegative Usually, if {@link length} is negative, the last -{@link length} elements will be SKIPPED; If `true`, the last -{@link length} elements before {@link start} will be taken instead; Only works if both {@link start} and {@link length} are numbers
     */
    slice(start: Predicate<T, SkipList<T>> | number, length: Predicate<T, TakeList<T>> | number, padEnd?: JoinMode | boolean, def?: T, leftOnNegative = false) {
        if (typeof start === "number" && typeof length === "number" && length < 0 && leftOnNegative)
            start -= (length *= -1);
        return this.skip(start, true).take(length, padEnd, def, true);
    }

    /** Flattens recursively every iterable element of the list */
    flat() { return new FlatList<T>(this); }

    /**
     * For each element yields the element and the children generated by {@link f} and does it all again for each child.
     * Providing the {@link p} parameter is very different to using {@link where}, because not only the element will eventually be filtered out, but also the children.
     * The index provided to the callbacks are the child element index on their parent
     * @param f A conversion function that returns an iterable of the same type as the provided element
     * @param p A predicate function 
     * @param flip If `true` the children will be yielded before the parent
     */
    traverse(f: Convert<T, Iterable<T>, TraverseList<T>>, p?: Predicate<T, TraverseList<T>>, flip?: boolean) { return new TraverseList<T>(this, f, p, flip); }

    /**
     * Sorts the current list.
     * If multiple sorts are done in a row, they will be computed all at once.
     * The current index is {@link NOT_FOUND}.
     * Non lazy
     * @param desc If `true`, reverses the results
     * @param comp A sorting function
     */
    order(desc?: boolean, comp?: Compare<T, OrderList<T>>) { return new OrderList<T>(this, desc, comp); }

    /**
     * Sorts the current list based on the value returned by {@link f} for each element of the current list.
     * If multiple sorts are done in a row, they will be computed all at once.
     * The current index is {@link NOT_FOUND}.
     * Non lazy
     * @param f A conversion function
     * @param comp A sorting function
     * @param desc If `true`, reverses the results
     */
    orderBy<K>(f: Convert<T, K, OrderList<T>>, desc?: boolean, comp?: Compare<K, OrderList<T>>): OrderList<T> { return this.order(desc, by(f, comp)); }

    /**
     * Inserts {@link value} at index {@link i}.
     * If {@link i} is negative, the index will be calculated from the end of the list.
     * If {@link i} is nullish, the value will be inserted AFTER the end of the list.
     * If the index is before the beginning of the list or more than 1 position after the end, it will throw a {@link RangeError}.
     * The iterator for this list returns the same thing the source returned
     * @param i Index at which to insert the value
     * @param value The value to insert
     */
    insert(i: number | null, value: T) { return new InsertList(this, value, i); }

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
     * Removes the element at index {@link i}.
     * If {@link i} is negative, the index will be calculated from the end of the list.
     * If the index is before the beginning of the list or after the end, it will throw a {@link RangeError}.
     * The iterator for this list returns the same thing the source returned
     * @param i Index at which to remove the value
     */
    removeAt(i: number) { return new RemoveAtList(this, i); }

    /**
     * Caches the iterator element one by one before they're yielded.
     * Used to prevent multiple enumeration
     */
    cache() { return new CacheList(this); }

    /**
     * Calculates each element of the list and wraps them in a {@link FixedList}
     * (Non lazy)
     */
    calc() { return new FixedList(this.value); }

    /**
     * Passes `this` to {@link f} and then passes the return value to a new {@link FixedList}
     * @param f A conversion function
     */
    pipe<R>(f: (x: this) => Iterable<R>) { return new FixedList(f(this)); }

    /**
     * Replaces every element of the list with the same exact value
     * @param value The value with which to substitute every element of the list
     */
    fill<R>(value: R) { return this.select(() => value); }

    /**
     * Assigns the properties of {@link prop} to every element of the list
     * @param prop An object
     */
    assign<O>(this: AbstractList<T & object>, prop: O) { return this.select(x => Object.assign(x, prop)); }

    /**
     * Executes {@link f} for every element of the list before yielding it
     * @param f A function
     */
    but(f: Convert<T, void, this>) { return this.select((x, i) => (f(x, i, this), x)); }

    /**
     * Executes {@link f} on each element of the list forcing it to be entirely calculated.
     * If no argument is provided, the list will be just calculated
     * @param f A function
     * @returns The same thing the iterator of the current list returned
     */
    forEach(f?: Convert<T, void, this>) {
        var i = 0;
        const iter = this[Symbol.iterator]()
        for (var value: T; !({ value } = iter.next()).done; )
            f?.(value, i++, this);
        return value as ReturnType<this[typeof Symbol.iterator]>;
    }

    /**
     * Convertes the current list into a {@link Map}
     * @param k A conversion function that gets the key
     * @param v A conversion function that gets the value; If omitted, the whole element will be used as a value
     * @param throwOnDublicate If it's set to `true`, it throws a {@link RangeError} if a key is duplicate
     */
    toMap<K, V = T>(k: Convert<T, K, this>, v: Convert<T, V, this> = IDENTITY, throwOnDublicate = false) {
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

    /**
     * Gets the element at index {@link i}.
     * If {@link i} is negative, the index will be calculated from the end of the list.
     * If the index is before the beginning of the list or after the end, it will throw a {@link RangeError}
     * @param i The index of the desired element
     */
    at(i: number) {
        const [ list ] = [ , i ] = calcIndex(this, i);
        if (i < 0) throw new RangeError("The provided index is before the beginning of the sequence");
        if (isReadonlyArray(list))
            if (i < list.length)
                return list[i];
            else;
        else for (const elm of this)
            if (!i--)
                return elm;
        throw new RangeError("The provided index is after the end of the sequence");
    }

    /**
     * Aggregates the list based on {@link f}.
     * If {@link out} is not provided and the sequence is empty, it throws a {@link RangeError}
     * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration)
     * @param f A combination function
     */
    aggregate(f: Combine<T, T, T, this>): T;
    aggregate<R>(out: R, f: Combine<R, T, R, this>): R;
    aggregate(out: T | Combine<T, T, T>, f?: Combine<T, T, T>): T {
        var i = 0;
        for (const elm of this)
            if (f)
                out = f(<T>out, elm, i++, this);
            else
                f = out as Combine<T, T, T>,
                out = elm,
                i++;
        if (f) return <T>out;
        throw new RangeError("Can't aggregate an empty sequence");
    }

    /**
     * Returns the biggest value in the list
     * @param comp A sorting function
     */
    max(comp: Compare<T, this> = COMPARE) { return this.aggregate((a, b, i, list) => comp(a, b, i, list) > 0 ? a : b); }

    /**
     * Returns the element of the list with which {@link f} has returned the biggest value
     * @param f A conversion function
     * @param comp A sorting function
     */
    maxBy<K>(f: Convert<T, K, this>, comp?: Compare<K, this>): T { return this.max(by(f, comp)); }

    /**
     * Returns the smaller value in the list
     * @param comp A sorting function
     */
    min(comp: Compare<T, this> = COMPARE) { return this.max((a, b, i, list) => -comp(a, b, i, list)); }

    /**
     * Returns the element of the list with which {@link f} has returned the smallest value
     * @param f A conversion function
     * @param comp A sorting function
     */
    minBy<K>(f: Convert<T, K, this>, comp?: Compare<K, this>): T { return this.min(by(f, comp)); }

    /** Returns the length of the iterable if it is easy to compute, otherwise it returns {@link NOT_FOUND} */
    get fastCount() { return NOT_FOUND; }

    /** Calculates each element of the list and puts them inside of an {@link Array} */
    get value() { return [ ...this ]; }

    /** Gets the first element of the list */
    get first() { return this.at(0); }

    /** Gets the last element of the list */
    get last() { return this.at(-1); }

    /** Aggregates the list using the `+` operator (Can both add numbers and concatenate strings) */
    get sum(): T extends number | boolean ? number : string { return <any>this.aggregate((a, b) => <any>a + b); }

    /** Calculates the average of the elements of the list */
    get avg(): number {
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
}

/**
 * Instances of this class are guaranteed to be the modification of an other iterable.
 * The input iterable's elements are of type {@link I} and the output's ones are of type {@link O}.
 * The iterator for this list returns the same thing {@link source} returned
 */
export abstract class SourceList<I, O> extends AbstractList<O> {
    constructor(public source: Iterable<I>) { super(); }

    *[Symbol.iterator](): IterableIterator<O> { return yield* <any>this.source; }
}

// These are needed to be imported AFTER the definition of "AbstractList", because it is needed IMMEDIATELY by all of them
import { DefaultList, FinallyList, FixedList, InitList, MergeList, OnceList, RepeatList, ReverseList, ShuffleList, WrapList } from "./simple";
import { CaseList, DistinctList, IntersectList, WhereList } from "./where";
import { SelectList, SelectManyList, SelectWhereList } from "./select";
import { InsertList, RemoveAtList } from "./element";
import { FlatList, TraverseList } from "./tree";
import { GroupByList } from "./group";
import { OrderList } from "./order";
import { CacheList } from "./cache";
import { TakeList } from "./take";
import { SkipList } from "./skip";
import { ZipList } from "./zip";