var LazyList;
(function (LazyList_1) {
    /**
     * Indicates how two iterable should be conbined it they have different lengths.
     */
    let UMode;
    (function (UMode) {
        /** The length of the output is equal to the length of the shorter iterable. */
        UMode[UMode["inner"] = 0] = "inner";
        /** The length of the output is equal to the length of the base iterable. */
        UMode[UMode["left"] = 1] = "left";
        /** The length of the output is equal to the length of the input iterable. */
        UMode[UMode["right"] = 2] = "right";
        /** The length of the output is equal to the length of the longer iterable. */
        UMode[UMode["outer"] = 3] = "outer";
    })(UMode = LazyList_1.UMode || (LazyList_1.UMode = {}));
    /**
     * An iterable wrapper with helper functions.
     */
    class LazyList {
        /**
         * Makes every `Generator` a `LazyList`.
         * It changes the inheritance chain of the `Generator`.
         */
        static attachIterator() {
            //@ts-ignore
            (function* () { })().__proto__.__proto__.__proto__.__proto__ = LazyList.prototype;
            return LazyList;
        }
        /**
         * Returns an auto-generated list of numbers.
         * @param end The end of the sequence
         * @param begin The begin of the sequence
         * @param step The difference between each step of the sequence (If {@link end} is greater than {@link begin} it will be `-1` by default)
         */
        static range(end, begin, step) {
            return new LazyRangeList(end, begin, step);
        }
        /**
         * Returns a `LazyList` based on an iterable.
         * If {@link data} is already a `LazyList`, it gets returned directly, otherwise it gets wrapped in a `LazyDataList`.
         * @param data The iterable
         */
        static from(data) {
            return data instanceof LazyList
                ? data
                : new LazyDataList(data);
        }
        /**
         * Merges the current list to {@link other}.
         * @param other An iterable
         */
        merge(other) {
            return new LazyMergeList(this, other);
        }
        /**
         * Combines the current list with {@link other} based on {@link f}.
         * @param other An iterable
         * @param f A combination function
         * @param mode Different length handling
         */
        zip(other, f, mode) {
            return new LazyZipList(this, other, f, mode);
        }
        /**
         * Joins the current list with {@link other} based on {@link f}, where the condition {@link filter} is met.
         * If no {@link filter} argument is supplied, the method does the cartesian product of the two lists (And {@link mode} becomes useless).
         * If {@link mode} is not `UMode.inner`, `null` will be supplied as the missing element.
         * The index available in the functions is the one of the "left" part in the `UMode.inner` operation, and `-1` in the {@link outer} part.
         * The "right" part ({@link other}) will be calculeted one time for each element of the "left" part and must be of the same size each time.
         * Wrap {@link other} in a `LazyCacheList` (Or use the `list.cache()` method) to cache the elements.
         * @param other An iterable
         * @param filter A filter function
         * @param f A combination function
         * @param mode Different length handling
         */
        join(other, f, filter, mode) {
            return new LazyJoinList(this, other, f, filter, mode);
        }
        /**
         * Filters the list based on {@link f}.
         * @param f A predicate function; If no function is given, falsy elements will be filtered out
         */
        where(f) {
            return new LazyWhereList(this, f);
        }
        /**
         * Executes the list until {@link f} returns `false` for the current element.
         * @param f A predicate function; If no function is given, it stops executing the list as soon as the current element is falsy
         */
        while(f) {
            return new LazyWhileList(this, f);
        }
        /**
         * If {@link $if} matches on an element, it gets converted by {@link $then}, otherwise it gets converted by {@link $else}.
         * @param $if A predicate function
         * @param $then A conversion function
         * @param $else A conversion function; If no function is given, the current element will be yielded without modifications
         */
        when($if, $then, $else) {
            return new LazyWhenList(this, $if, $then, $else);
        }
        /**
         * Converts the list based on {@link f}.
         * @param f A conversion function
         */
        select(f) {
            return new LazySelectList(this, f);
        }
        /**
         * Converts the current list to an iterables list based on {@link f} and concats every element.
         * @param f A conversion function; Can be omitted if every element is iterable
         */
        selectMany(f) {
            return new LazySelectManyList(this, f);
        }
        /**
         * Replaces a section of the list with a new one based on {@link f}, which will be provided with the original section.
         * @param x The start index of the section
         * @param y The length of the section
         * @param f The function that will provide the new section
         * @param lazy If `true` the section will be lazy but mono-use, and each element not taken will be appended after the new section
         */
        replace(x, y, f, lazy) {
            return new LazyReplaceList(this, x, y, f, lazy);
        }
        /**
         * Skips the first {@link n} elements of the list.
         * @param n The elements to skip (Use a negative number to skip from the end)
         */
        skip(n) {
            return new LazySkipList(this, n);
        }
        /**
         * Takes the first {@link n} elements of the list and skips the rest.
         * @param n The elements to take (Use a negative number to take from the end)
         * @param outer If truthy and {@link n} is more than the list length, the output list will be forced to have length {@link n} by concatenating as many `undefined` as needed
         */
        take(n, outer) {
            return new LazyTakeList(this, n, outer);
        }
        /**
         * Groups the list's elements, {@link n} at a time.
         * Non lazy by default, but can be made lazy by setting {@link lazy} as `true`.
         * If the list is set to lazy you should NEVER calculate the parent iterator before the childrens, like:
         *
         *     LazyList.from([1,2,3]).slice(2,false,true).value; // Stops
         * Additionally a lot of unexpected behaviours could occur.
         * @param n The length of each slice
         * @param outer If truthy, every slice will be forced to have {@link n} elements by concatenating as many `undefined` as needed
         * @param lazy Indicates if the list should be lazy (and unsafe)
         */
        slice(n, outer, lazy) {
            return new LazySliceList(this, n, outer, lazy);
        }
        /**
         * Groups the list's elements based on a provided function.
         * Non lazy.
         * @param f A combination function
         */
        groupBy(f) {
            return new LazyGroupByList(this, f);
        }
        /**
         * Orders the list; It counts the element so that it is faster when there are a lot of copies (For that reason, the index is not available on {@link f} since it would be wrong).
         * Non lazy.
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc Reverses the results
         */
        sort(f, desc) {
            return new LazySortList(this, f, desc);
        }
        /**
         * Reverses the list.
         * Non lazy.
         */
        reverse() {
            return new LazyReverseList(this);
        }
        /**
         * Repeat the list's elements {@link n} times.
         * @param n The number of repetitions
         */
        repeat(n) {
            return new LazyRepeatList(this, n);
        }
        /**
         * Caches the list's calculated elements, this prevent them from passing inside the pipeline again.
         */
        cache() {
            return new LazyCacheList(this);
        }
        /**
         * Outputs a `LazyList` that will contain the current one as its only element.
         */
        wrap() {
            return new LazyWrapList(this);
        }
        /**
         * Executes {@link f} on each element of the list and returns the current element (not the output of {@link f}).
         * @param f A function
         */
        but(f) {
            return new LazySelectList(this, (e, i, data) => (f(e, i, data), e));
        }
        /**
         * Executes `Object.assign()` on each element passing {@link obj} as the second parameter.
         * @param obj An object
         */
        assign(obj) {
            return new LazySelectList(this, x => Object.assign(x, obj));
        }
        /**
         * Filters the list returning only the elements which are instances of {@link f}.
         * @param f A constructor
         */
        ofType(f) {
            return new LazyWhereList(this, x => x instanceof f);
        }
        /**
         * Calculates each element of the list and wraps them in another `LazyList`.
         */
        calc() {
            return new LazyDataList(this.value);
        }
        /**
         * Calculates and awaits each element of the list and wraps them in another `LazyList`.
         */
        async await() {
            return new LazyDataList(await Promise.all(this));
        }
        /**
         * Aggregates the list based on {@link f}.
         * @param f A combination function
         * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration).
         */
        aggregate(f, out) {
            var i = 0;
            for (const e of this)
                out = (!i && arguments.length === 1)
                    ? e
                    : f(out, e, i, this),
                    i++;
            return out;
        }
        /**
         * Returns the index of {@link value} in the list if found, `-1` otherwise.
         * @param value The value to search inside the list
         */
        indexOf(value) {
            var i = 0;
            for (const e of this)
                if (e === value)
                    return i;
                else
                    i++;
            return -1;
        }
        /**
         * Returns the element at the provided index.
         * @param n The index
         * @param def The default value
         */
        at(n, def) {
            return this.skip(n).first(def);
        }
        /**
         * Gets the first element of the list or {@link def} as default if it's empty.
         * Can be used as `next()` when the source iterable is a generator.
         * @param def The default value
         */
        first(def = null) {
            const temp = this[Symbol.iterator]().next();
            return temp.done ? def : temp.value;
        }
        /**
         * Gets the last element of the list or {@link out} as default if it's empty.
         * @param out The default value
         */
        last(out = null) {
            for (const e of this)
                out = e;
            return out;
        }
        /**
         * Returns `true` if {@link f} returns `true` for every element of the list.
         * @param f A predicate function; It defaults to the identity function
         */
        all(f) {
            var i = 0;
            for (const e of this)
                if (!(f ? f(e, i++, this) : e))
                    return false;
            return true;
        }
        /**
         * Returns `true` if {@link f} returns `true` for at least one element of the list.
         * @param f A predicate function; It defaults to the identity function
         */
        any(f) {
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
        has(v) {
            return this.any(x => Object.is(x, v));
        }
        /**
         * Joins the list elements using {@link sep} as the separator.
         * @param sep The separator
         */
        concat(sep = "") {
            return this.aggregate((a, b) => a + sep + b);
        }
        /**
         * Calculates each element of the list and puts them inside of an `Array`.
         */
        get value() {
            return Array.from(this);
        }
        /**
         * Calculates the length of the list.
         */
        get count() {
            var i = 0;
            for (const _ of this)
                i++;
            return i;
        }
        /**
         * Calculates the average of the elements of the list.
         */
        get avg() {
            var i = 0, sum = 0;
            for (const e of this)
                sum += e,
                    i++;
            return sum / i;
        }
        /**
         * Aggregates the list using the `+` operator (Can both add numbers and concatenate strings).
         */
        get sum() {
            //@ts-ignore
            return this.aggregate((a, b) => a + b);
        }
        /**
         * Returns the biggest number in the list.
         */
        get max() {
            return this.aggregate((a, b) => a > b ? a : b);
        }
        /**
         * Returns the smallest number in the list.
         */
        get min() {
            return this.aggregate((a, b) => a < b ? a : b);
        }
    }
    LazyList_1.LazyList = LazyList;
    /**
     * Output of `LazyList.range()`.
     */
    class LazyRangeList extends LazyList {
        constructor(end = Infinity, begin = 0, step = Math.sign(end - begin) || 1) {
            super();
            this.end = end;
            this.begin = begin;
            this.step = step;
        }
        *[Symbol.iterator]() {
            for (var i = this.begin; this.has(i); i = (i + this.step) || 0)
                yield i;
        }
        has(v) {
            return v == this.end || (v < this.end) !== (this.step < 0);
        }
        get count() {
            return this.step
                ? (Math.max(0, Math.floor((this.end - this.begin) / this.step)) || 0) + +this.has(this.begin)
                : Infinity;
        }
    }
    LazyList_1.LazyRangeList = LazyRangeList;
    /**
     * Output of `LazyList.from()`.
     * Instances of this class are guaranteed to have a base iterable.
     * The input iterable's elements are of type `<I>` and the output's ones are of type `<O>`.
     */
    class LazyDataList extends LazyList {
        constructor(data) {
            super();
            this.data = data;
        }
        *[Symbol.iterator]() {
            if (this.data)
                yield* this.data;
        }
        /**
         * Utility function that calculates the base iterable.
         * If the base iterable is an `Array` it will be returned directly.
         */
        base() {
            return this.data instanceof Array
                ? this.data
                : Array.from(this.data);
        }
        last(def = null) {
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
    LazyList_1.LazyDataList = LazyDataList;
    /**
     * Output of `list.merge()`.
     */
    class LazyMergeList extends LazyDataList {
        constructor(data, other) {
            super(data);
            this.other = other;
        }
        *[Symbol.iterator]() {
            yield* this.data;
            yield* this.other;
        }
    }
    LazyList_1.LazyMergeList = LazyMergeList;
    /**
     * Output of `list.zip()`.
     */
    class LazyZipList extends LazyDataList {
        constructor(data, other, f, mode = UMode.inner) {
            super(data);
            this.other = other;
            this.f = f;
            this.mode = mode;
        }
        *[Symbol.iterator]() {
            var i = 0;
            const a = this.data[Symbol.iterator]();
            const b = this.other[Symbol.iterator]();
            while (true) {
                const e = a.next();
                const f = b.next();
                if (e.done && f.done || e.done && !(this.mode & UMode.right) || f.done && !(this.mode & UMode.left))
                    break;
                yield this.f(e.value, f.value, i++, this);
            }
        }
    }
    LazyList_1.LazyZipList = LazyZipList;
    /**
     * Output of `list.join()`.
     */
    class LazyJoinList extends LazyDataList {
        constructor(data, other, f, filter, mode = UMode.inner) {
            super(data);
            this.other = other;
            this.f = f;
            this.filter = filter;
            this.mode = mode;
        }
        *[Symbol.iterator]() {
            const aCache = [];
            const bCache = [];
            // [ Inner ]
            var i = 0;
            for (const a of this.data) {
                var k = 0;
                const aE = aCache[i] ?? (aCache[i] = { v: a });
                for (const b of this.other) {
                    const bE = bCache[k] ?? (bCache[k] = { v: b });
                    const temp = !this.filter || this.filter(a, b, i, this);
                    aE.c || (aE.c = temp);
                    bE.c || (bE.c = temp);
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
    LazyList_1.LazyJoinList = LazyJoinList;
    /**
     * Output of `list.where()`.
     */
    class LazyWhereList extends LazyDataList {
        constructor(data, f) {
            super(data);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const e of this.data)
                if (this.f ? this.f(e, i++, this) : e)
                    yield e;
        }
    }
    LazyList_1.LazyWhereList = LazyWhereList;
    /**
     * Output of `list.while()`.
     */
    class LazyWhileList extends LazyDataList {
        constructor(data, f) {
            super(data);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const e of this.data)
                if (this.f ? this.f(e, i++, this) : e)
                    yield e;
                else
                    break;
        }
    }
    LazyList_1.LazyWhileList = LazyWhileList;
    /**
     * Output of `list.when()`.
     */
    class LazyWhenList extends LazyDataList {
        constructor(data, $if, $then, $else) {
            super(data);
            this.$if = $if;
            this.$then = $then;
            this.$else = $else;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const e of this.data) {
                yield this.$if(e, i, this)
                    ? this.$then(e, i, this)
                    : this.$else
                        ? this.$else(e, i, this)
                        : e;
                i++;
            }
        }
    }
    LazyList_1.LazyWhenList = LazyWhenList;
    /**
     * Output of `list.select()`.
     */
    class LazySelectList extends LazyDataList {
        constructor(data, f) {
            super(data);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const e of this.data)
                yield this.f(e, i++, this);
        }
    }
    LazyList_1.LazySelectList = LazySelectList;
    /**
     * Output of `list.selectMany()`.
     */
    class LazySelectManyList extends LazyDataList {
        constructor(data, f) {
            super(data);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const e of this.data)
                yield* this.f
                    ? this.f(e, i++, this)
                    : e;
        }
    }
    LazyList_1.LazySelectManyList = LazySelectManyList;
    /**
     * Output of `list.replace()`.
     */
    class LazyReplaceList extends LazyDataList {
        constructor(data, x, y, f, lazy = false) {
            super(data);
            this.x = x;
            this.y = y;
            this.f = f;
            this.lazy = lazy;
        }
        *[Symbol.iterator]() {
            const iter = this.data[Symbol.iterator]();
            yield* LazyTakeList.take(iter, this.x);
            const temp = LazyList.from(LazyTakeList.take(iter, this.y));
            yield* this.f(this.lazy ? temp : temp.calc()) ?? [];
            yield* iter;
        }
    }
    LazyList_1.LazyReplaceList = LazyReplaceList;
    /**
     * Output of `list.skip()`.
     */
    class LazySkipList extends LazyDataList {
        constructor(data, n) {
            super(data);
            this.n = n;
        }
        /**
         * Utility function that skips {@link n} elements from {@link data}.
         * @param data An iterable
         * @param n The elements to skip
         */
        static *skip(data, n) {
            var i = 0;
            for (const e of data)
                if (++i > n)
                    yield e;
        }
        [Symbol.iterator]() {
            if (this.n >= 0)
                return LazySkipList.skip(this.data, this.n);
            const temp = this.base();
            return LazyTakeList.take(temp[Symbol.iterator](), temp.length + this.n);
        }
    }
    LazyList_1.LazySkipList = LazySkipList;
    /**
     * Output of `list.take()`.
     */
    class LazyTakeList extends LazyDataList {
        constructor(data, n, outer = false) {
            super(data);
            this.n = n;
            this.outer = outer;
        }
        /**
         * Utility function that takes {@link n} elements from {@link iter}.
         * @param iter A marked iterator
         * @param n The elements to take
         * @param outer If truthy and {@link n} is more than the iterator length, the output will be forced to have length {@link n} by yielding as many `undefined` as needed
         */
        static *take(iter, n, outer = false) {
            for (var i = 0; i < n; i++) // If this were a foreach loop the first element after {@link n} would be calculated too
             {
                const e = iter.next();
                if ((iter.done = e.done) && !outer)
                    break;
                yield e.value;
            }
        }
        [Symbol.iterator]() {
            if (this.n >= 0)
                return LazyTakeList.take(this.data[Symbol.iterator](), this.n, this.outer);
            const temp = this.base();
            return LazySkipList.skip(temp, temp.length + this.n);
        }
    }
    LazyList_1.LazyTakeList = LazyTakeList;
    /**
     * Output of `list.slice()`.
     */
    class LazySliceList extends LazyDataList {
        constructor(data, n, outer = false, lazy = false) {
            super(data);
            this.n = n;
            this.outer = outer;
            this.lazy = lazy;
        }
        *[Symbol.iterator]() {
            const iter = this.data[Symbol.iterator](); // The same iterator is used to exclude previous outputs
            while (!iter.done) {
                const e = LazyList.from(LazyTakeList.take(iter, this.n, this.outer)); // This doesn't use the normal `list.take()` because I would have reconverted "iter" into an iterable
                yield this.lazy
                    ? e
                    : e.calc();
            }
        }
    }
    LazyList_1.LazySliceList = LazySliceList;
    /**
     * Element of the output of `list.groupBy()`.
     * The group common value is contained in the {@link key} property.
     * The group is a `LazyList` itself.
     */
    class UGrouping extends LazyDataList {
        constructor(key, data) {
            super(data);
            this.key = key;
        }
    }
    LazyList_1.UGrouping = UGrouping;
    /**
     * Output of `list.groupBy()`.
     */
    class LazyGroupByList extends LazyDataList {
        constructor(data, f) {
            super(data);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            const cache = new Map();
            for (const e of this.data) {
                const k = this.f(e, i++, this);
                if (cache.has(k))
                    cache.get(k).push(e);
                else
                    cache.set(k, [e]);
            }
            for (const [k, v] of cache)
                yield new UGrouping(k, v);
        }
    }
    LazyList_1.LazyGroupByList = LazyGroupByList;
    /**
     * Output of `list.sort()`.
     */
    class LazySortList extends LazyDataList {
        constructor(data, f, desc = false) {
            super(data);
            this.f = f;
            this.desc = desc;
        }
        *[Symbol.iterator]() {
            const map = new Map();
            for (const e of this.data)
                map.set(e, (map.get(e) ?? 0) + 1);
            while (map.size) {
                var out, n = 0;
                for (const e of map)
                    if (!n || (this.f ? this.f(e[0], out, -1, this) < 0 : e[0] < out) !== this.desc)
                        [out, n] = e;
                for (var i = 0; i < n; i++)
                    yield out;
                map.delete(out);
            }
        }
    }
    LazyList_1.LazySortList = LazySortList;
    /**
     * Output of `list.reverse()`.
     */
    class LazyReverseList extends LazyDataList {
        constructor(data) { super(data); }
        *[Symbol.iterator]() {
            const out = this.base();
            for (let i = out.length - 1; i >= 0; i--)
                yield out[i];
        }
    }
    LazyList_1.LazyReverseList = LazyReverseList;
    /**
     * Output of `list.repeat()`.
     */
    class LazyRepeatList extends LazyDataList {
        constructor(data, n) {
            super(data);
            this.n = n;
        }
        *[Symbol.iterator]() {
            for (let i = 0; i < this.n; i++)
                yield* this.data;
        }
    }
    LazyList_1.LazyRepeatList = LazyRepeatList;
    /**
     * Output of `list.cache()`.
     */
    class LazyCacheList extends LazyDataList {
        constructor(data) {
            super(data);
            this.result = [];
        }
        *[Symbol.iterator]() {
            for (var i = 0; i < this.result.length; i++)
                yield this.result[i];
            while (true) {
                const e = (this.iter ?? (this.iter = this.data[Symbol.iterator]())).next();
                if (this.iter.done = e.done)
                    break;
                yield this.result[i++] = e.value;
            }
        }
        at(n, def) {
            return n < this.result.length
                ? this.result[n]
                : super.at(n, def);
        }
        last(def = null) {
            return this.iter?.done
                ? this.result[this.result.length - 1]
                : super.last(def);
        }
        get count() {
            return this.iter?.done
                ? this.result.length
                : super.count;
        }
    }
    LazyList_1.LazyCacheList = LazyCacheList;
    /**
     * Output of `list.wrap()`.
     */
    class LazyWrapList extends LazyList {
        constructor(data) {
            super();
            this.data = data;
        }
        *[Symbol.iterator]() { yield this.data; }
        first() { return this.data; }
        last() { return this.data; }
        has(v) { return this.data === v; }
        get value() { return [this.data]; }
        get count() { return 1; }
    }
    LazyList_1.LazyWrapList = LazyWrapList;
})(LazyList || (LazyList = {}));
if (typeof module !== "object")
    var module = {};
module.exports = LazyList = Object.assign(LazyList.LazyList, LazyList);
//# sourceMappingURL=main.js.map