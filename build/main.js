/*
    [MAY]: orderBy()
        [WIP]: asc, desc
    [MAY]: join()
        [WIP]: outer, inner, left, right

    [WIP]: doc
    [WIP]: groupBy()
    [WIP]: slice()
*/
var LazyList;
(function (LazyList_1) {
    class LazyList {
        static range(end, begin, step) {
            return new LazyRangeList(end, begin, step);
        }
        static from(data) {
            return new LazyWrapList(data);
        }
        concat(other) {
            return new LazyConcatList(this, other);
        }
        zip(other, f, outer) {
            return new LazyZipList(this, other, f, outer);
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
        reverse() {
            return new LazyReverseList(this);
        }
        repeat(n) {
            return new LazyRepeatList(this, n);
        }
        wrap() {
            return LazyList.from([this]);
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
        get count() {
            var i = 0;
            for (const e of this)
                i++;
            return i;
        }
        get first() {
            for (const e of this)
                return e;
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
    class LazyWrapList extends LazyList {
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
    }
    LazyList_1.LazyWrapList = LazyWrapList;
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
    class LazyConcatList extends LazyWrapList {
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
    class LazyZipList extends LazyWrapList {
        constructor(data, other, f, outer = false) {
            super(data);
            this.other = other;
            this.f = f;
            this.outer = outer;
        }
        *[Symbol.iterator]() {
            var i = 0;
            const a = this.data[Symbol.iterator]();
            const b = this.other[Symbol.iterator]();
            while (true) {
                const e = a.next();
                const f = b.next();
                if (this.outer ? (e.done && f.done) : (e.done || f.done))
                    break;
                yield this.f(e.value, f.value, i++, this);
            }
        }
    }
    LazyList_1.LazyZipList = LazyZipList;
    class LazySelectList extends LazyWrapList {
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
    class LazySelectManyList extends LazyWrapList {
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
    class LazyWhereList extends LazyWrapList {
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
    class LazySkipList extends LazyWrapList {
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
    class LazyTakeList extends LazyWrapList {
        constructor(data, n, outer = false) {
            super(data);
            this.n = n;
            this.outer = outer;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const e of this.data)
                if (i++ < this.n)
                    yield e;
                else
                    break;
            if (this.outer)
                while (i++ < this.n)
                    yield undefined;
        }
    }
    LazyList_1.LazyTakeList = LazyTakeList;
    class LazyReverseList extends LazyWrapList {
        constructor(data) { super(data); }
        *[Symbol.iterator]() {
            const out = this.base();
            for (let i = out.length - 1; i >= 0; i--)
                yield out[i];
        }
    }
    LazyList_1.LazyReverseList = LazyReverseList;
    class LazyRepeatList extends LazyWrapList {
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
})(LazyList || (LazyList = {}));
if (typeof module !== "object")
    var module = {};
module.exports = LazyList = Object.assign(LazyList.LazyList, LazyList);
//# sourceMappingURL=main.js.map