/*
    [MAY]: orderBy()
        [WIP]: asc, desc
    [MAY]: join()
        [WIP]: outer, inner, left, right

    [WIP]: doc
    [WIP]: slice()
        [WIP]: unsafe (ma più "lazy")
*/
var LazyList;
(function (LazyList_1) {
    let UMode;
    (function (UMode) {
        UMode[UMode["inner"] = 0] = "inner";
        UMode[UMode["left"] = 1] = "left";
        UMode[UMode["right"] = 2] = "right";
        UMode[UMode["outer"] = 3] = "outer";
    })(UMode = LazyList_1.UMode || (LazyList_1.UMode = {}));
    class LazyList {
        static range(end, begin, step) {
            return new LazyRangeList(end, begin, step);
        }
        static from(data) {
            return data instanceof LazyList
                ? data
                : new LazyDataList(data);
        }
        concat(other) {
            return new LazyConcatList(this, other);
        }
        zip(other, f, mode) {
            return new LazyZipList(this, other, f, mode);
        }
        select(f) {
            return new LazySelectList(this, f);
        }
        selectMany(f) {
            return new LazySelectManyList(this, f);
        }
        where(f) {
            return new LazyWhereList(this, f);
        }
        skip(n) {
            return new LazySkipList(this, n);
        }
        take(n, outer) {
            return new LazyTakeList(this, n, outer);
        }
        groupBy(f) {
            return new LazyGroupByList(this, f);
        }
        reverse() {
            return new LazyReverseList(this);
        }
        repeat(n) {
            return new LazyRepeatList(this, n);
        }
        cache() {
            return new LazyCacheList(this);
        }
        wrap() {
            return new LazyWrapList(this);
        }
        adjust(other, mode) {
            return new LazyZipList(this, other, (a, b) => [a, b], mode);
        }
        calc() {
            return LazyList.from(this.value);
        }
        aggregate(f, out) {
            var i = 0;
            for (const e of this)
                out = (!i && arguments.length === 1)
                    ? e
                    : f(out, e, i, this),
                    i++;
            return out;
        }
        at(n) {
            return this.skip(n).first;
        }
        get value() {
            return Array.from(this);
        }
        get avg() {
            var i = 0, sum = 0;
            for (const e of this)
                sum += e,
                    i++;
            return sum / i;
        }
        get count() {
            var i = 0;
            for (const _ of this)
                i++;
            return i;
        }
        get first() {
            for (const e of this)
                return e;
            return null;
        }
        get last() {
            var out = null;
            for (const e of this)
                out = e;
            return out;
        }
        get any() {
            for (const e of this)
                if (e)
                    return true;
            return false;
        }
        get all() {
            for (const e of this)
                if (!e)
                    return false;
            return true;
        }
        get max() {
            return this.aggregate((a, b) => a > b ? a : b);
        }
        get min() {
            return this.aggregate((a, b) => a < b ? a : b);
        }
        get sum() {
            //@ts-ignore
            return this.aggregate((a, b) => a + b);
        }
    }
    LazyList_1.LazyList = LazyList;
    class LazyRangeList extends LazyList {
        constructor(end = Infinity, begin = 0, step = 1) {
            super();
            this.end = end;
            this.begin = begin;
            this.step = step;
        }
        *[Symbol.iterator]() {
            if (this.step < 0)
                for (let i = this.end - 1; i >= this.begin; i += this.step)
                    yield i;
            else
                for (let i = this.begin; i < this.end; i += this.step)
                    yield i;
        }
    }
    LazyList_1.LazyRangeList = LazyRangeList;
    class LazyDataList extends LazyList {
        constructor(data) {
            super();
            this.data = data;
        }
        *[Symbol.iterator]() {
            yield* this.data;
        }
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
        get last() {
            return this.data instanceof Array
                ? this.data[this.data.length - 1]
                : super.last;
        }
    }
    LazyList_1.LazyDataList = LazyDataList;
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
    class LazySelectManyList extends LazyDataList {
        constructor(data, f = x => x) {
            super(data);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const e of this.data)
                yield* this.f(e, i++, this);
        }
    }
    LazyList_1.LazySelectManyList = LazySelectManyList;
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
    class UGrouping extends LazyDataList {
        constructor(key, data) {
            super(data);
            this.key = key;
        }
    }
    LazyList_1.UGrouping = UGrouping;
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
    class LazyReverseList extends LazyDataList {
        constructor(data) { super(data); }
        *[Symbol.iterator]() {
            const out = this.base();
            for (let i = out.length - 1; i >= 0; i--)
                yield out[i];
        }
    }
    LazyList_1.LazyReverseList = LazyReverseList;
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
        get count() {
            var _a;
            return ((_a = this.e) === null || _a === void 0 ? void 0 : _a.done)
                ? this.result.length
                : super.count;
        }
    }
    LazyList_1.LazyCacheList = LazyCacheList;
    class LazyWrapList extends LazyList {
        constructor(data) {
            super();
            this.data = data;
        }
        *[Symbol.iterator]() { yield this.data; }
        get value() { return [this.data]; }
        get count() { return 1; }
        get first() { return this.data; }
        get last() { return this.data; }
    }
    LazyList_1.LazyWrapList = LazyWrapList;
})(LazyList || (LazyList = {}));
if (typeof module !== "object")
    var module = {};
const a = LazyList.LazyList.from([1, 2, 3, 4, 5, 6, 7]).select(x => {
    console.log(":::", x);
    return x + 8;
});
const b = a.cache();
console.log(b.groupBy(x => x % 2).select(x => x.key).wrap().value); //ritenta
module.exports = LazyList = Object.assign(LazyList.LazyList, LazyList);
//# sourceMappingURL=main.js.map