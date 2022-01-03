
/**
 * A function that takes two arguments and combines them.
 */
export type UCombine<A, B, TResult = A, T = TResult> = (a: A, b: B, i: number, data: Iterable<T>) => TResult;

/**
 * A function that converts a value.
 */
export type UConvert<X, Y, T = Y> = (x: X, i: number, data: Iterable<T>) => Y;

/**
 * A function that indicates the "truthyness" of a value.
 */
export type UPredicate<T> = UConvert<T, boolean, T>;

/**
 * An iterator that may have a "done" property.
 * If not present is `false` by default.
 */
export type UMarkedIterator<T> = Iterator<T> & { done?: boolean };

namespace LazyList
{
    /**
     * Indicates how two iterable should be conbined it they have different lengths.
     */
    export enum UMode {
        /** The length of the output is equal to the length of the shorter iterable. */
        inner   = 0b00,

        /** The length of the output is equal to the length of the base iterable. */
        left    = 0b01,

        /** The length of the output is equal to the length of the input iterable. */
        right   = 0b10,

        /** The length of the output is equal to the length of the longer iterable. */
        outer   = left | right
    }

    /**
     * An iterable wrapper with helper functions.
     */
    export abstract class LazyList<O> implements Iterable<O> {
        abstract [Symbol.iterator](): Iterator<O>;

        /**
         * Makes every `Generator` a `LazyList`.
         * It changes the inheritance chain of the `Generator`.
         */
        static attachIterator() {
            //@ts-ignore
            (function*(){})().__proto__.__proto__.__proto__.__proto__ = LazyList.prototype;
            return LazyList;
        }
    
        /**
         * Returns an auto-generated list of numbers.
         * @param end The end of the sequence
         * @param begin The begin of the sequence
         * @param step The difference between each step of the sequence (If `end` is greater than `begin` it will be `-1` by default)
         */
        static range(end?: number, begin?: number, step?: number): LazyRangeList {
            return new LazyRangeList(end, begin, step);
        }
    
        /**
         * Returns a `LazyList` based on an iterable.
         * If `data` is already a `LazyList`, it gets returned directly, otherwise it gets wrapped in a `LazyDataList`.
         * @param data The iterable
         */
        static from<T>(data: Iterable<T>): LazyList<T> {
            return data instanceof LazyList
                ? data
                : new LazyDataList(data);
        }
    
        /**
         * Merges the current list to `other`.
         * @param other An iterable
         */
        merge(other: Iterable<O>): LazyMergeList<O> {
            return new LazyMergeList<O>(this, other);
        }
    
        /**
         * Combines the current list with `other` based on `f`.
         * @param other An iterable
         * @param f A combination function
         * @param mode Different length handling
         */
        zip<T, TResult>(other: Iterable<T>, f: UCombine<O, T, TResult>, mode?: UMode): LazyZipList<O, T, TResult> {
            return new LazyZipList<O, T, TResult>(this, other, f, mode);
        }

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
        join<T, TResult>(other: Iterable<T>, f: UCombine<O, T, TResult>, filter?: UCombine<O, T, boolean, TResult>, mode?: UMode): LazyJoinList<O, T, TResult> {
            return new LazyJoinList<O, T, TResult>(this, other, f, filter, mode);
        }
    
        /**
         * Converts the list based on `f`.
         * @param f A conversion function
         */
        select<TResult>(f: UConvert<O, TResult>): LazySelectList<O, TResult> {
            return new LazySelectList<O, TResult>(this, f);
        }
    
        /**
         * Converts the current list to an iterables list based on `f` and concats every element.
         * @param f A conversion function; Can be omitted if every element is iterable
         */
        selectMany<TResult>(f?: UConvert<O, Iterable<TResult>, TResult>): LazySelectManyList<O, TResult> {
            return new LazySelectManyList<O, TResult>(this, f);
        }

        /**
         * If `p` matches on an element, it gets converted by `f`.
         * @param p A predicate function
         * @param f A conversion function
         */
        when(p: UPredicate<O>, f: UConvert<O, O>): LazyWhenList<O> {
            return new LazyWhenList<O>(this, p, f);
        }
    
        /**
         * Filters the list based on `f`.
         * @param f A predicate function
         */
        where(f: UPredicate<O>): LazyWhereList<O> {
            return new LazyWhereList<O>(this, f);
        }

        /**
         * Executes the list until `f` returns `false` for the current element.
         * @param f A predicate function
         */
        while(f: UPredicate<O>): LazyWhileList<O> {
            return new LazyWhileList<O>(this, f);
        }
    
        /**
         * Skips the first `n` elements of the list.
         * @param n The elements to skip
         */
        skip(n: number): LazySkipList<O> {
            return new LazySkipList<O>(this, n);
        }
    
        /**
         * Takes the first `n` elements of the list and skips the rest.
         * @param n The elements to take
         * @param outer If truthy and `n` is more than the list length, the output list will be forced to have length `n` by concatenating as many `undefined` as needed
         */
        take(n: number, outer?: UMode | boolean): LazyTakeList<O> {
            return new LazyTakeList<O>(this, n, outer);
        }

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
        slice(n: number, outer?: UMode | boolean, lazy?: boolean): LazySliceList<O> {
            return new LazySliceList<O>(this, n, outer, lazy);
        }

        /**
         * Groups the list's elements based on a provided function.
         * Non lazy.
         * @param f A combination function
         */
        groupBy<K>(f: UConvert<O, K, UGrouping<K, O>>): LazyGroupByList<K, O> {
            return new LazyGroupByList<K, O>(this, f);
        }

        /**
         * Orders the list; It counts the element so that it is faster when there are a lot of copies (For that reason, the index is not available on `f` since it would be wrong).
         * Non lazy.
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc Reverses the results
         */
        sort(f?: UCombine<O, O, number, O>, desc?: boolean): LazySortList<O> {
            return new LazySortList<O>(this, f, desc);
        }
    
        /**
         * Reverses the list.
         * Non lazy.
         */
        reverse(): LazyReverseList<O> {
            return new LazyReverseList<O>(this);
        }
    
        /**
         * Repeat the list's elements n times.
         * @param n The number of repetitions
         */
        repeat(n: number): LazyRepeatList<O> {
            return new LazyRepeatList<O>(this, n);
        }

        /**
         * Caches the list's calculated elements, this prevent them from passing inside the pipeline again.
         */
        cache(): LazyCacheList<O> {
            return new LazyCacheList<O>(this);
        }

        /**
         * Outputs a `LazyList` that will contain the current one as its only element.
         */
        wrap(): LazyWrapList<this> {
            return new LazyWrapList<this>(this);
        }

        /**
         * Executes `f` on each element of the list and returns the current element (not the output of `f`).
         * @param f A function
         */
        but(f: UConvert<O, void, O>): LazySelectList<O, O> {
            return new LazySelectList<O, O>(this, (e, i, data) => (f(e, i, data), e));
        }

        /**
         * Executes `Object.assign()` on each element passing `obj` as the second parameter.
         * @param obj An object
         */
        assign<T>(obj: T): LazySelectList<O, O & T> {
            return new LazySelectList<O, O & T>(this, x => Object.assign(x, obj));
        }

        /**
         * Filters the list returning only the elements which are instances of `f`.
         * @param f A constructor
         */
        ofType<T extends O>(f: new (...args: any[]) => T): LazyWhereList<T> {
            return new LazyWhereList<O>(this, x => x instanceof f) as LazyWhereList<T>;
        }

        /**
         * Calculates each element of the list and wraps them in another `LazyList`.
         */
        calc(): LazyDataList<O, O> {
            return new LazyDataList<O, O>(this.value);
        }

        /**
         * Calculates and awaits each element of the list and wraps them in another `LazyList`.
         */
        async await(): Promise<LazyDataList<O, O>> {
            return new LazyDataList<O, O>(await Promise.all(this));
        }
    
        /**
         * Aggregates the list based on `f`.
         * @param f A combination function
         * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration).
         */
        aggregate<TResult = O>(f: UCombine<TResult, O, TResult, O>, out?: TResult): TResult {
            var i = 0;
            for (const e of this)
                out = (!i && arguments.length === 1)
                    ? e as any as TResult
                    : f(out, e, i, this),
                i++;
            return out;
        }
    
        /**
         * Returns the element at the provided index.
         * @param n The index
         * @param def The default value
         */
        at<T = null>(n: number, def?: T): O | T {
            return this.skip(n).first(def);
        }

        /**
         * Gets the first element of the list or `def` as default if it's empty.
         * @param def The default value
         */
        first<T = null>(def: T = null): O | T {
            for (const e of this)
                return e;
            return def;
        }

        /**
         * Gets the last element of the list or `def` as default if it's empty.
         * @param def The default value
         */
        last<T = null>(out: O | T = null): O | T {
            for (const e of this)
                out = e;
            return out;
        }

        /**
         * Returns `true` if `f` returns `true` for every element of the list.
         * @param f A predicate function; It defaults to the identity function
         */
        all(f?: UPredicate<O>): boolean {
            var i = 0;
            for (const e of this)
                if (!(f ? f(e, i++, this) : e))
                    return false;
            return true;
        }

        /**
         * Returns `true` if `f` returns `true` for at least one element of the list.
         * @param f A predicate function; It defaults to the identity function
         */
        any(f?: UPredicate<O>): boolean {
            var i = 0;
            for (const e of this)
                if (f ? f(e, i++, this) : e)
                    return true;
            return false;
        }

        /**
         * Returns `true` if a value is in the list.
         * @param v The value
         */
        has(v: O): boolean {
            return this.any(x => Object.is(x, v));
        }

        /**
         * Joins the list elements using `sep` as the separator.
         * @param sep The separator
         */
        concat(sep: string = ""): string {
            return this.aggregate((a, b) => a + sep + b);
        }
    
        /**
         * Calculates each element of the list and puts them inside of an `Array`.
         */
        get value(): O[] {
            return Array.from(this);
        }

        /**
         * Calculates the length of the list.
         */
        get count(): number {
            var i = 0;
            for (const _ of this)
                i++;
            return i;
        }

        /**
         * Calculates the average of the elements of the list.
         */
        get avg(): number {
            var i = 0, sum = 0;
            for (const e of this)
                sum += e as any as number,
                i++;
            return sum / i;
        }

        /**
         * Aggregates the list using the `+` operator (Can both add numbers and concatenate strings).
         */
        get sum(): O {
            //@ts-ignore
            return this.aggregate((a, b) => a + b);
        }
    
        /**
         * Returns the biggest number in the list.
         */
        get max(): O {
            return this.aggregate((a, b) => a > b ? a : b);
        }
    
        /**
         * Returns the smallest number in the list.
         */
        get min(): O {
            return this.aggregate((a, b) => a < b ? a : b);
        }
    }

    /**
     * Output of `LazyList.range()`.
     */
    export class LazyRangeList extends LazyList<number> {
        constructor(public end: number = Infinity, public begin: number = 0, public step: number = Math.sign(end - begin) || 1) { super(); }

        *[Symbol.iterator](): Iterator<number> {
            for (var i = this.begin; this.has(i); i = (i + this.step) || 0)
                yield i;
        }

        has(v: number): boolean {
            return v == this.end || (v < this.end) !== (this.step < 0);
        }

        get count(): number {
            return this.step
            ? (Math.max(0, Math.floor((this.end - this.begin) / this.step)) || 0) + +this.has(this.begin)
            : Infinity;
        }
    }

    /**
     * Output of `LazyList.from()`.
     * Instances of this class are guaranteed to have a base iterable.
     * The input iterable's elements are of type `<I>` and the output's ones are of type `<O>`.
     */
    export class LazyDataList<I, O> extends LazyList<O> {
        constructor(public data: Iterable<I>) { super(); }

        *[Symbol.iterator](): Iterator<O> {
            if (this.data)
                yield* this.data as any as Iterable<O>;
        }

        /**
         * Utility function that calculates the base iterable.
         * If the base iterable is an `Array` it will be returned directly.
         */
        base(): O[] {
            return this.data instanceof Array
                ? this.data
                : Array.from(this.data);
        }

        last<T>(def: T = null): O | T {
            return this.data instanceof Array
                ? this.data.length > 0
                    ? this.data[this.data.length - 1]
                    : def
                : super.last(def);
        }

        get count() {
            return this.data instanceof Array
                ? this.data.length
                : super.count;
        }
    }

    /**
     * Output of `list.merge()`.
     */
    export class LazyMergeList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public other: Iterable<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            yield* this.data;
            yield* this.other;
        }
    }

    /**
     * Output of `list.zip()`.
     */
    export class LazyZipList<A, B, TResult> extends LazyDataList<A, TResult> {
        constructor(data: Iterable<A>, public other: Iterable<B>, public f: UCombine<A, B, TResult>, public mode: UMode = UMode.inner) { super(data); }

        *[Symbol.iterator](): Iterator<TResult> {
            var i = 0;
            const a = this.data[Symbol.iterator]();
            const b = this.other[Symbol.iterator]();
            while(true)
            {
                const e = a.next();
                const f = b.next();
                if (e.done && f.done || e.done && !(this.mode & UMode.right) || f.done && !(this.mode & UMode.left))
                    break;
                yield this.f(e.value, f.value, i++, this);
            }
        }
    }

    /**
     * Output of `list.join()`.
     */
    export class LazyJoinList<A, B, TResult> extends LazyDataList<A, TResult> {
        constructor(data: Iterable<A>, public other: Iterable<B>, public f: UCombine<A, B, TResult>, public filter?: UCombine<A, B, boolean, TResult>, public mode: UMode = UMode.inner) { super(data); }

        *[Symbol.iterator](): Iterator<TResult> {
            type hasList<T> = { v: T, c?: boolean }[];
            const aCache: hasList<A> = [];
            const bCache: hasList<B> = [];

            // [ Inner ]
            var i = 0;
            for (const a of this.data)
            {
                var k = 0;
                const aE = aCache[i] ??= { v: a };
                for (const b of this.other)
                {
                    const bE = bCache[k] ??= { v: b };
                    const temp = !this.filter || this.filter(a, b, i, this);
                    aE.c ||= temp;
                    bE.c ||= temp;
                    if (temp)
                        yield this.f(a, b, i, this);
                    k++;
                }
                i++;
            }

            // [ Outer ]
            if (this.mode & UMode.left)
                for (const e of aCache)
                    if (!e.c)
                        yield this.f(e.v, null, -1, this);
            if (this.mode & UMode.right)
                for (const e of bCache)
                    if (!e.c)
                        yield this.f(null, e.v, -1, this);
        }
    }

    /**
     * Output of `list.select()`.
     */
    export class LazySelectList<X, Y> extends LazyDataList<X, Y> {
        constructor(data: Iterable<X>, public f: UConvert<X, Y>) { super(data); }

        *[Symbol.iterator](): Iterator<Y> {
            var i = 0;
            for (const e of this.data)
                yield this.f(e, i++, this);
        }
    }

    /**
     * Output of `list.selectMany()`.
     */
    export class LazySelectManyList<X, Y> extends LazyDataList<X, Y> {
        constructor(data: Iterable<X>, public f?: UConvert<X, Iterable<Y>, Y>) { super(data); }

        *[Symbol.iterator](): Iterator<Y> {
            var i = 0;
            for (const e of this.data)
                yield* this.f
                    ? this.f(e, i++, this)
                    : (e as any as Iterable<Y>);
        }
    }

    /**
     * Output of `list.when()`.
     */
    export class LazyWhenList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public p: UPredicate<T>, public f: UConvert<T, T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            var i = 0;
            for (const e of this.data)
            {
                yield this.p(e, i, this)
                    ? this.f(e, i, this)
                    : e;
                i++;
            }
        }
    }

    /**
     * Output of `list.where()`.
     */
    export class LazyWhereList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public f: UPredicate<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            var i = 0;
            for (const e of this.data)
                if (this.f(e, i++, this))
                    yield e;
        }
    }

    /**
     * Output of `list.while()`.
     */
    export class LazyWhileList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public f: UPredicate<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            var i = 0;
            for (const e of this.data)
                if (this.f(e, i++, this))
                    yield e;
                else
                    break;
        }
    }

    /**
     * Output of `list.skip()`.
     */
    export class LazySkipList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public n: number) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            var i = 0;
            for (const e of this.data)
                if (++i > this.n)
                    yield e;
        }
    }

    /**
     * Output of `list.take()`.
     */
    export class LazyTakeList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public n: number, public outer: UMode | boolean = false) { super(data); }

        /**
         * Utility function that takes `n` elements from `iter`.
         * @param iter The marked iterator
         * @param n The elements to take
         * @param outer If truthy and `n` is more than the iterator length, the output will be forced to have length `n` by yielding as many `undefined` as needed
         */
        static *take<T>(iter: UMarkedIterator<T>, n: number, outer: UMode | boolean = false) {
            for (var i = 0; i < n; i++) // If this were a foreach loop the first element after `n` would be calculated too
            {
                const e = iter.next();
                if ((iter.done = e.done) && !outer)
                    break;
                yield e.value;
            }
        }

        [Symbol.iterator](): Iterator<T> {
            return LazyTakeList.take<T>(this.data[Symbol.iterator](), this.n, this.outer);
        }
    }

    /**
     * Output of `list.slice()`.
     */
    export class LazySliceList<T> extends LazyDataList<T, LazyList<T>> {
        constructor(data: Iterable<T>, public n: number, public outer: UMode | boolean = false, public lazy: boolean = false) { super(data); }

        *[Symbol.iterator](): Iterator<LazyList<T>> {
            const iter: UMarkedIterator<T> = this.data[Symbol.iterator]();                  // The same iterator is used to exclude previous outputs
            while (!iter.done)
            {
                const e = LazyList.from(LazyTakeList.take<T>(iter, this.n, this.outer));    // This doesn't use the normal `list.take()` because I would have reconverted `iter` into an iterable
                yield this.lazy
                    ? e
                    : e.calc();
            }
        }
    }

    /**
     * Element of the output of `list.groupBy()`.
     * The group common value is contained in the "key" property.
     * The group is a `LazyList` itself.
     */
    export class UGrouping<K, V> extends LazyDataList<V, V> {
        constructor(public key: K, data: Iterable<V>) { super(data); }
    }

    /**
     * Output of `list.groupBy()`.
     */
    export class LazyGroupByList<K, V> extends LazyDataList<V, UGrouping<K, V>> {
        constructor(data: Iterable<V>, public f: UConvert<V, K, UGrouping<K, V>>) { super(data); }

        *[Symbol.iterator](): Iterator<UGrouping<K, V>> {
            var i = 0;
            const cache = new Map<K, V[]>();
            for (const e of this.data)
            {
                const k = this.f(e, i++, this);
                if (cache.has(k))
                    cache.get(k).push(e);
                else
                    cache.set(k, [ e ]);           
            }
            for (const [ k, v ] of cache)
                yield new UGrouping<K, V>(k, v);
        }
    }

    /**
     * Output of `list.sort()`.
     */
    export class LazySortList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public f?: UCombine<T, T, number, T>, public desc: boolean = false) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            const map = new Map<T, number>();
            for (const e of this.data)
                map.set(e, (map.get(e) ?? 0) + 1);

            while (map.size)
            {
                var out: T, n: number = 0;
                for (const e of map)
                    if (!n || (this.f ? this.f(e[0], out, -1, this) < 0 : e[0] < out) !== this.desc)
                        [ out, n ] = e;

                for (var i = 0; i < n; i++)
                    yield out;
                
                map.delete(out);
            }
        }
    }

    /**
     * Output of `list.reverse()`.
     */
    export class LazyReverseList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            const out = this.base();
            for (let i = out.length - 1; i >= 0; i--)
                yield out[i];
        }
    }

    /**
     * Output of `list.repeat()`.
     */
    export class LazyRepeatList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public n: number) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            for (let i = 0; i < this.n; i++)
                yield* this.data;
        }
    }

    /**
     * Output of `list.cache()`.
     */
    export class LazyCacheList<O> extends LazyDataList<O, O> {
        result: O[] = [];
        iter: UMarkedIterator<O>;
        constructor(data: Iterable<O>) { super(data); }

        *[Symbol.iterator](): Iterator<O> {
            for (var i = 0; i < this.result.length; i++)
                yield this.result[i];
            while (true)
            {
                const e = (this.iter ??= this.data[Symbol.iterator]()).next();
                if (this.iter.done = e.done)
                    break;
                yield this.result[i++] = e.value;
            }
        }

        at<T = null>(n: number, def?: T): O | T {
            return n < this.result.length
                ? this.result[n]
                : super.at(n, def);
        }

        last<T = null>(def: O | T = null): O | T {
            return this.iter?.done
                ? this.result[this.result.length - 1]
                : super.last(def);
        }

        get count(): number {
            return this.iter?.done
                ? this.result.length
                : super.count;
        }
    }

    /**
     * Output of `list.wrap()`.
     */
    export class LazyWrapList<T> extends LazyList<T> {
        constructor(public data: T) { super(); }

        *[Symbol.iterator]() { yield this.data; }

        first(): T { return this.data; }

        last(): T { return this.data; }

        has(v: T): boolean { return this.data === v; }

        get value(): T[] { return [ this.data ]; }
    
        get count(): number { return 1; }
    }
}

if (typeof module !== "object")
    var module = {};
//@ts-ignore
export = LazyList = Object.assign(LazyList.LazyList, LazyList);