
/*
    [MAY]: orderBy()
        [WIP]: asc, desc
    [MAY]: join()
        [WIP]: outer, inner, left, right

    [WIP]: doc
    [WIP]: slice()
        [WIP]: unsafe (ma più "lazy")
*/

export type UFunction2<A, B, TResult = A, T = TResult> = (a: A, b: B, i: number, data: Iterable<T>) => TResult;
export type UFunction1<X, Y, T = Y> = (x: X, i: number, data: Iterable<T>) => Y;
export type UPredicate<T> = UFunction1<T, boolean, T>;

namespace LazyList
{
    export enum UMode {
        inner   = 0b00,
        left    = 0b01,
        right   = 0b10,
        outer   = 0b11
    }

    export abstract class LazyList<O> implements Iterable<O> {
        abstract [Symbol.iterator](): Iterator<O>;
    
        static range(end?: number, begin?: number, step?: number): LazyRangeList {
            return new LazyRangeList(end, begin, step);
        }
    
        static from<T>(data: Iterable<T>): LazyList<T> {
            return data instanceof LazyList
                ? data
                : new LazyDataList(data);
        }
    
        concat(other: Iterable<O>): LazyConcatList<O> {
            return new LazyConcatList<O>(this, other);
        }
    
        zip<T, TResult>(other: Iterable<T>, f: UFunction2<O, T, TResult>, mode?: UMode): LazyZipList<O, T, TResult> {
            return new LazyZipList<O, T, TResult>(this, other, f, mode);
        }
    
        select<TResult>(f: UFunction1<O, TResult>): LazySelectList<O, TResult> {
            return new LazySelectList<O, TResult>(this, f);
        }
    
        selectMany<TResult>(f?: UFunction1<O, Iterable<TResult>, TResult>): LazySelectManyList<O, TResult> {
            return new LazySelectManyList<O, TResult>(this, f);
        }
    
        where(f: UPredicate<O>): LazyWhereList<O> {
            return new LazyWhereList<O>(this, f);
        }
    
        skip(n: number): LazySkipList<O> {
            return new LazySkipList<O>(this, n);
        }
    
        take(n: number, outer?: UMode | boolean): LazyTakeList<O> {
            return new LazyTakeList<O>(this, n, outer);
        }

        groupBy<K>(f: UFunction1<O, K, UGrouping<K, O>>): LazyGroupByList<K, O> {
            return new LazyGroupByList<K, O>(this, f);
        }
    
        reverse(): LazyReverseList<O> {
            return new LazyReverseList<O>(this);
        }
    
        repeat(n: number): LazyRepeatList<O> {
            return new LazyRepeatList<O>(this, n);
        }

        cache(): LazyCacheList<O> {
            return new LazyCacheList<O>(this);
        }

        wrap(): LazyWrapList<this> {
            return new LazyWrapList<this>(this);
        }

        adjust<T>(other: Iterable<T>, mode?: UMode): LazyZipList<O, T, [ O, T ]> {
            return new LazyZipList<O, T, [ O, T ]>(this, other, (a, b) => [ a, b ], mode);
        }

        calc(): LazyDataList<O, O> {
            return LazyList.from(this.value) as LazyDataList<O, O>;
        }
    
        aggregate<TResult = O>(f: UFunction2<TResult, O, TResult, O>, out?: TResult): TResult {
            var i = 0;
            for (const e of this)
                out = (!i && arguments.length === 1)
                    ? e as any as TResult
                    : f(out, e, i, this),
                i++;
            return out;
        }
    
        at(n: number): O {
            return this.skip(n).first;
        }
    
        get value(): O[] {
            return Array.from(this);
        }

        get avg(): number {
            var i = 0, sum = 0;
            for (const e of this)
                sum += e as any as number,
                i++;
            return sum / i;
        }
    
        get count(): number {
            var i = 0;
            for (const _ of this)
                i++;
            return i;
        }
    
        get first(): O | null {
            for (const e of this)
                return e;
            return null;
        }

        get last(): O | null {
            var out = null;
            for (const e of this)
                out = e;
            return out;
        }

        get any(): boolean {
            for (const e of this)
                if (e)
                    return true;
            return false;
        }

        get all(): boolean {
            for (const e of this)
                if (!e)
                    return false;
            return true;
        }
    
        get max(): O {
            return this.aggregate((a, b) => a > b ? a : b);
        }
    
        get min(): O {
            return this.aggregate((a, b) => a < b ? a : b);
        }
    
        get sum(): O {
            //@ts-ignore
            return this.aggregate((a, b) => a + b);
        }
    }

    export class LazyRangeList extends LazyList<number> {
        constructor(public end: number = Infinity, public begin: number = 0, public step: number = 1) { super(); }

        *[Symbol.iterator](): Iterator<number> {
            if (this.step < 0)
                for (let i = this.end - 1; i >= this.begin; i += this.step)
                    yield i;
            else
                for (let i = this.begin; i < this.end; i += this.step)
                    yield i;
        }
    }

    export class LazyDataList<I, O> extends LazyList<O> {
        constructor(public data: Iterable<I>) { super(); }

        *[Symbol.iterator](): Iterator<O> {
            yield* this.data as any as Iterable<O>;
        }

        base(): O[] {
            return this.data instanceof Array
                ? this.data
                : Array.from(this.data);
        }

        get count() {
            return this.data instanceof Array
                ? this.data.length
                : super.count;
        }

        get last(): O | null {
            return this.data instanceof Array
                ? this.data[this.data.length - 1]
                : super.last;
        }
    }

    export class LazyConcatList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public other: Iterable<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            yield* this.data;
            yield* this.other;
        }
    }

    export class LazyZipList<A, B, TResult> extends LazyDataList<A, TResult> {
        constructor(data: Iterable<A>, public other: Iterable<B>, public f: UFunction2<A, B, TResult>, public mode: UMode = UMode.inner) { super(data); }

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

    export class LazySelectList<X, Y> extends LazyDataList<X, Y> {
        constructor(data: Iterable<X>, public f: UFunction1<X, Y>) { super(data); }

        *[Symbol.iterator](): Iterator<Y> {
            var i = 0;
            for (const e of this.data)
                yield this.f(e, i++, this);
        }
    }

    export class LazySelectManyList<X, Y> extends LazyDataList<X, Y> {
        constructor(data: Iterable<X>, public f: UFunction1<X, Iterable<Y>, Y> = x => (x as any as Iterable<Y>)) { super(data); }

        *[Symbol.iterator](): Iterator<Y> {
            var i = 0;
            for (const e of this.data)
                yield* this.f(e, i++, this);
        }
    }

    export class LazyWhereList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public f: UPredicate<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            var i = 0;
            for (const e of this.data)
                if (this.f(e, i++, this))
                    yield e;
        }
    }

    export class LazySkipList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public n: number) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            var i = 0;
            for (const e of this.data)
                if (++i > this.n)
                    yield e;
        }
    }

    export class LazyTakeList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public n: number, public outer: UMode | boolean = false) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            const iter = this.data[Symbol.iterator]();
            for (var i = 0; i < this.n; i++)
            {
                const e = iter.next();
                if (e.done && !this.outer)
                    break;
                yield e.value;
            }
        }
    }

    export class UGrouping<K, V> extends LazyDataList<V, V> {
        constructor(public key: K, data: Iterable<V>) { super(data); }
    }

    export class LazyGroupByList<K, V> extends LazyDataList<V, UGrouping<K, V>> {
        constructor(data: Iterable<V>, public f: UFunction1<V, K, UGrouping<K, V>>) { super(data); }

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

    export class LazyReverseList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            const out = this.base();
            for (let i = out.length - 1; i >= 0; i--)
                yield out[i];
        }
    }

    export class LazyRepeatList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>, public n: number) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            for (let i = 0; i < this.n; i++)
                yield* this.data;
        }
    }

    export class LazyCacheList<T> extends LazyDataList<T, T> {
        result: T[] = [];
        iter: Iterator<T>;
        e: IteratorResult<T>;
        constructor(data: Iterable<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            for (var i = 0; i < this.result.length; i++)
                yield this.result[i];
            while (true)
                if ((this.e = (this.iter ??= this.data[Symbol.iterator]()).next()).done)
                    break;
                else 
                    yield this.result[i++] = this.e.value;
        }

        get count(): number {
            return this.e?.done
                ? this.result.length
                : super.count;
        }
    }

    export class LazyWrapList<T> extends LazyList<T> {
        constructor(public data: T) { super(); }

        *[Symbol.iterator]() { yield this.data; }

        get value(): T[] { return [ this.data ]; }
    
        get count(): number { return 1; }
    
        get first(): T { return this.data; }

        get last(): T { return this.data; }
    }
}

if (typeof module !== "object")
    var module = {};
//@ts-ignore
export = LazyList = Object.assign(LazyList.LazyList, LazyList);

const a = LazyList.LazyList.from([ 1, 2, 3, 4, 5, 6, 7 ]).select(x => {
    console.log(":::", x);
    return x + 8;
});
const b = a.cache();
console.log(b.groupBy(x => x % 2).select(x=>x.key).wrap().value);//ritenta