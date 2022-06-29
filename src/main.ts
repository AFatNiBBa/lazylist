
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
     * Makes every {@link Generator} extend from {@link LazyList.LazyAbstractList}
     * @returns The library itself
     */
    export function attachIterator() {
        //@ts-ignore
        (function*(){})().__proto__.__proto__.__proto__.__proto__ = LazyAbstractList.prototype;
        return LazyList;
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
        abstract [Symbol.iterator](): Iterator<T>;

        /**
         * Ensures every element of the list shows up only once
         * @param f A conversion function that returns the the part of the element to check duplicates for; If omitted, the element itself will be used
         */
        distinct<TKey>(f?: Convert<T, TKey, LazyDistinctList<TKey, T>>) {
            return new LazyDistinctList<TKey, T>(this, f);
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
        selectMany<TResult>(f?: Convert<T, Iterable<TResult>, LazySelectManyList<T, TResult>>) {
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
         * @param mode If truthy and {@link p} is more than the list length, the output list will be forced to have length {@link p} by concatenating as many `undefined` as needed
         */
        take(p: Predicate<T, LazyTakeList<T>> | number, mode?: JoinMode | boolean) {
            return new LazyTakeList<T>(this, p, mode);
        }

        /**
         * Combines the current list with {@link other} based on {@link f}
         * @param other An iterable
         * @param f A combination function
         * @param mode Different length handling
         */
        zip<TOther, TResult>(other: Iterable<TOther>, f?: Combine<T, TOther, TResult, LazyZipList<T, TOther, TResult>>, mode?: JoinMode) {
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
        join<TOther, TResult>(other: Iterable<TOther>, p?: Combine<T, TOther, boolean, LazyJoinList<T, TOther, TResult>>, f?: Combine<T, TOther, TResult, LazyJoinList<T, TOther, TResult>>, mode?: JoinMode) {
            return new LazyJoinList<T, TOther, TResult>(this, other, p, f, mode);
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
         * If the list is set to lazy you should NEVER calculate the parent iterator before the childrens, like:
         * ```
         * LazyList.from([ 1, 2, 3 ]).split(2, false, true).value; // Stops
         * ```
         * Additionally a lot of unexpected behaviours could occur
         * @param n The length of each slice
         * @param mode If truthy, every slice will be forced to have {@link n} elements by concatenating as many `undefined` as needed
         * @param lazy Indicates if the list should be lazy (and unsafe)
         */
        split(n: number, mode?: JoinMode | boolean, lazy?: boolean) {
            return new LazySplitList(this, n, mode, lazy);
        }

        /** Caches the list's calculated elements, this prevent them from passing inside the pipeline again */
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
         * Executes {@link f} on each element of the list and returns the current element (not the output of {@link f})
         * @param f A function
         */
        but(f: Convert<T, void, LazySelectList<T, T>>) {
            return new LazySelectList<T, T>(this, (x, i, list) => (f(x, i, list), x));
        }

        /**
         * Executes {@link Object.assign} on each element passing {@link obj} as the second parameter
         * @param obj An object
         */
        assign<TMap>(obj: TMap) {
            return new LazySelectList(this, x => Object.assign(x, obj));
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

        /** Returns the biggest number in the list */
        get max() {
            return this.aggregate((a, b) => a > b ? a : b);
        }

        /** Returns the smallest number in the list */
        get min() {
            return this.aggregate((a, b) => a < b ? a : b);
        }        

        /** Calculates each element of the list and puts them inside of an {@link Array} */
        get value() {
            return Array.from(this);
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

        base(): I[] {
            return this.source == null
                    ? []
                : typeof this.source === "string" || this.source instanceof String || this.source instanceof Array
                    ? this.source as any
                    : Array.from(this.source) as any;
        }
    }

    /**
     * Output of {@link LazyList}.
     * Instances of this class have the {@link fastCount} property, which returns the length of the iterable if it is easy to compute, otherwise it returns `-1`
     */
    export class LazyFixedList<I, O = I> extends LazySourceList<I, O> {
        get fastCount(): number {
            return this.source == null
                    ? 0
                : typeof this.source === "string" || this.source instanceof String || this.source instanceof Array
                    ? this.source.length
                : this.source instanceof LazyFixedList
                    ? this.source.fastCount
                    : -1;
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

        *[Symbol.iterator](): Iterator<number> {
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

    /** Output of {@link append} */
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
        constructor (source: Iterable<T>) { super(source); }

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
                    const temp = this.base();
                    yield* LazyTakeList.take(temp[Symbol.iterator](), temp.length + this.p);
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
        constructor (source: Iterable<T>, public p: Predicate<T, LazyTakeList<T>> | number, public mode: JoinMode | boolean = false) { super(source); }

        static *take<T>(iter: MarkedIterator<T>, n: number, mode: JoinMode | boolean = false) {
            for (var value: T, i = 0; i < n; i++) // If this were a foreach loop the first element after "n" would have been calculated too
                if ((iter.done = ({ value } = iter.next()).done) && !mode)
                    break;
                else
                    yield value;
        }

        *[Symbol.iterator]() {
            if (typeof this.p === "number")
            {
                if (this.p < 0)
                {
                    const temp = this.base();
                    yield* LazySkipList.skip(temp[Symbol.iterator](), temp.length + this.p);
                }
                else yield* LazyTakeList.take(this.source[Symbol.iterator](), this.p, this.mode);
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

    /**
     * Element of the output of {@link groupBy}.
     * The group common value is contained in the {@link key} property.
     * The group is a {@link LazyAbstractList} itself
     */
    export class Grouping<K, V> extends LazyFixedList<V, V> {
        constructor(public key: K, source: Iterable<V>) { super(source); }
    }

    /** Output of {@link groupBy} */
    export class LazyGroupByList<K, V> extends LazySourceList<V, Grouping<K, V>> {
        constructor(source: Iterable<V>, public f: Convert<V, K, LazyGroupByList<K, V>>) { super(source); }

        *[Symbol.iterator]() {
            var i = 0;
            const cache = new Map<K, V[]>();
            for (const e of this.source)
            {
                const k = this.f(e, i++, this);
                if (cache.has(k))
                    cache.get(k).push(e);
                else
                    cache.set(k, [ e ]);           
            }
            for (const [ k, v ] of cache)
                yield new Grouping<K, V>(k, v);
        }
    }

    /** Output of {@link split} */
    export class LazySplitList<T> extends LazySourceList<T, LazyAbstractList<T>> {
        constructor(source: Iterable<T>, public n: number, public mode: JoinMode | boolean = false, public lazy: boolean = false) { super(source); }

        *[Symbol.iterator]() {
            const iter: MarkedIterator<T> = this.source[Symbol.iterator]();
            while (!iter.done)
            {
                const temp = new LazyFixedList(LazyTakeList.take(iter, this.n, this.mode));  // This doesn't use the normal `list.take()` because I would have reconverted "iter" into an iterable
                yield this.lazy
                    ? temp
                    : temp.calc();
            }
        }
    }    

    /** Output of {@link cache} */
    export class LazyCacheList<T> extends LazyFixedList<T, T> {
        #iter: Iterator<T>;
        result: T[] = [];
        done: boolean = false;
        constructor (source: Iterable<T>) { super(source); }

        *[Symbol.iterator]() {
            for (var i = 0; i < this.result.length; i++)
                yield this.result[i];

            for (var value: T; !({ value, done: this.done } = this.iter.next()).done; )
                yield this.result[i++] = value;
        }

        at(n: number, def: T = null) {
            return n < 0
                ? this.done
                    ? this.at(this.result.length + n, def)
                    : super.at(n, def)
                : n < this.result.length
                    ? this.result[n]
                : this.done
                    ? def
                    : super.at(n, def);
        }

        last(def: T = null) {
            return this.done
                ? this.result[this.result.length - 1]
                : super.last(def);
        }

        get fastCount() {
            return this.done
                ? this.result.length
                : super.fastCount;
        }

        get iter() {
            return this.#iter ??= this.source[Symbol.iterator]();
        }
    }
}

if (typeof module !== "object")
    var module = {};
export = LazyList;