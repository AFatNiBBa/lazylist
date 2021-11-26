/*
    [WIP]: slice()
        [WIP]: unsafe (ma più "lazy")
    [WIP]: join()
        [WIP]: outer, inner, left, right
*/
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
         * Returns an auto-generated list of numbers.
         * @param end The end of the sequence
         * @param begin The begin of the sequence
         * @param step The difference between each step of the sequence (If `end` is greater than `begin` it will be `-1` by default)
         */
        static range(end, begin, step) {
            return new LazyRangeList(end, begin, step);
        }
        /**
         * Returns a `LazyList` based on an iterable.
         * If `data` is already a `LazyList`, it gets returned directly.
         * @param data The iterable
         */
        static from(data) {
            return data instanceof LazyList
                ? data
                : new LazyDataList(data);
        }
        /**
         * Concats the current list to `other`.
         * @param other An iterable
         */
        concat(other) {
            return new LazyConcatList(this, other);
        }
        /**
         * Combines the current list with `other` based on `f`.
         * @param other An iterable
         * @param f A combination function
         * @param mode Different length handling
         */
        zip(other, f, mode) {
            return new LazyZipList(this, other, f, mode);
        }
        /**
         * Converts the current list based on `f`.
         * @param f A conversion function
         */
        select(f) {
            return new LazySelectList(this, f);
        }
        /**
         * Converts the current list to an iterables list based on `f` and concat every element.
         * @param f A conversion function; Can be omitted if every element is iterable
         */
        selectMany(f) {
            return new LazySelectManyList(this, f);
        }
        /**
         * Filters the current list based on `f`.
         * @param f A predicate function
         */
        where(f) {
            return new LazyWhereList(this, f);
        }
        /**
         * Skips the first `n` elements of the list.
         * @param n The elements to skip
         */
        skip(n) {
            return new LazySkipList(this, n);
        }
        /**
         * Takes the first `n` elements of the list and skips the rest.
         * @param n The elements to take
         * @param outer If truthy and `n` is more than the list length, the output list will be forced to have length `n` by concatenating as many `undefined` as needed
         */
        take(n, outer) {
            return new LazyTakeList(this, n, outer);
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
         * Orders the list; It counts the element so that it is faster when there are a lot of copies (For that reason, the index is not available on `f` since it would be wrong).
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
         * Repeat the list's elements n times.
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
         *  Utility function that specifies how two iterables of different lengths should be conbined.
         * @param other An iterable
         * @param mode Different length handling
         */
        adjust(other, mode) {
            return new LazyZipList(this, other, (a, b) => [a, b], mode);
        }
        /**
         * Calculates each element of the list and wraps them in another `LazyList`.
         */
        calc() {
            return LazyList.from(this.value);
        }
        /**
         * Aggregates the current list based on `f`.
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
         * Returns the element at the provided index.
         * @param n The index
         */
        at(n) {
            return this.skip(n).first();
        }
        /**
         * Gets the first element of the list or `def` as default if it's empty.
         * @param def The default value
         */
        first(def = null) {
            for (const e of this)
                return e;
            return def;
        }
        /**
         * Gets the last element of the list or `def` as default if it's empty.
         * @param def The default value
         */
        last(out = null) {
            for (const e of this)
                out = e;
            return out;
        }
        /**
         * Returns `true` if `f` returns `true` for at least one element of the list.
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
         * Returns `true` if `f` returns `true` for every element of the list.
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
            for (var i = this.begin; i == this.end || (i < this.end) !== (this.step < 0); i = (i + this.step) || 0)
                yield i;
        }
        get count() {
            return this.take(2).aggregate(Object.is)
                ? Infinity
                : Math.max(0, Math.floor((this.end - this.begin) / this.step) + 1) || 0;
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
         * Calculate the base iterable.
         */
        base() {
            return this.data instanceof Array
                ? this.data
                : Array.from(this.data);
        }
        get count() {
            return this.data instanceof Array
                ? this.data.length
                : super.count;
        }
        last(def = null) {
            return this.data instanceof Array
                ? this.data.length > 0
                    ? this.data[this.data.length - 1]
                    : def
                : super.last(def);
        }
    }
    LazyList_1.LazyDataList = LazyDataList;
    /**
     * Output of `list.concat()`.
     */
    class LazyConcatList extends LazyDataList {
        constructor(data, other) {
            super(data);
            this.other = other;
        }
        *[Symbol.iterator]() {
            yield* this.data;
            yield* this.other;
        }
    }
    LazyList_1.LazyConcatList = LazyConcatList;
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
                if (this.f(e, i++, this))
                    yield e;
        }
    }
    LazyList_1.LazyWhereList = LazyWhereList;
    /**
     * Output of `list.skip()`.
     */
    class LazySkipList extends LazyDataList {
        constructor(data, n) {
            super(data);
            this.n = n;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const e of this.data)
                if (++i > this.n)
                    yield e;
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
        *[Symbol.iterator]() {
            const iter = this.data[Symbol.iterator]();
            for (var i = 0; i < this.n; i++) {
                const e = iter.next();
                if (e.done && !this.outer)
                    break;
                yield e.value;
            }
        }
    }
    LazyList_1.LazyTakeList = LazyTakeList;
    /**
     * Element of the output of `list.groupBy()`.
     * The group common value is contained in the "key" property.
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
        constructor(data, f = (a, b) => a > b ? 1 : a < b ? -1 : 0, desc = false) {
            super(data);
            this.f = f;
            this.desc = desc;
        }
        *[Symbol.iterator]() {
            var _a;
            const map = new Map();
            for (const e of this.data)
                map.set(e, ((_a = map.get(e)) !== null && _a !== void 0 ? _a : 0) + 1);
            while (map.size) {
                var out, n = 0;
                for (const e of map)
                    if (!n || (this.f(e[0], out, -1, this) < 0) !== this.desc)
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
            var _a;
            for (var i = 0; i < this.result.length; i++)
                yield this.result[i];
            while (true)
                if ((this.e = ((_a = this.iter) !== null && _a !== void 0 ? _a : (this.iter = this.data[Symbol.iterator]())).next()).done)
                    break;
                else
                    yield this.result[i++] = this.e.value;
        }
        at(n) {
            return n < this.result.length
                ? this.result[n]
                : super.at(n);
        }
        get count() {
            var _a;
            return ((_a = this.e) === null || _a === void 0 ? void 0 : _a.done)
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
        get value() { return [this.data]; }
        get count() { return 1; }
        first() { return this.data; }
        last() { return this.data; }
    }
    LazyList_1.LazyWrapList = LazyWrapList;
})(LazyList || (LazyList = {}));
if (typeof module !== "object")
    var module = {};
module.exports = LazyList = Object.assign(LazyList.LazyList, LazyList);
//# sourceMappingURL=main.js.map