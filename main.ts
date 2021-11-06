
/*
    [MAY]: ottimizza condizione `zip(outer)`
    [MAY]: orderBy()
        [WIP]: asc, desc
    [MAY]: join()
        [WIP]: outer, inner, left, right

    [WIP]: doc
    [WIP]: groupBy()
    [WIP]: slice()

    [???]: `zip(outer)` è outer da entrambi i versi
        [WIP]: standard {outer, inner, left, right} (take per resize)
*/

export type IFunction2<A, B, TResult = A, T = TResult> = (a: A, b: B, i: number, data: Iterable<T>) => TResult;
export type IFunction1<X, Y, T = Y> = (x: X, i: number, data: Iterable<T>) => Y;
export type IPredicate<T> = IFunction1<T, boolean, T>;

namespace LazyList
{
    export abstract class LazyList<O> implements Iterable<O> {
        abstract [Symbol.iterator](): Iterator<O>;
    
        static range(end?: number, begin?: number, step?: number): LazyRangeList {
            return new LazyRangeList(end, begin, step);
        }
    
        static from<T>(data: Iterable<T>): LazyWrapList<T, T> {
            return new LazyWrapList(data);
        }
    
        concat(other: Iterable<O>): LazyConcatList<O> {
            return new LazyConcatList<O>(this, other);
        }
    
        zip<T, TResult>(other: Iterable<T>, f: IFunction2<O, T, TResult>, outer?: boolean): LazyZipList<O, T, TResult> {
            return new LazyZipList<O, T, TResult>(this, other, f, outer);
        }
    
        select<TResult>(f: IFunction1<O, TResult>): LazySelectList<O, TResult> {
            return new LazySelectList<O, TResult>(this, f);
        }
    
        selectMany<TResult>(f?: IFunction1<O, Iterable<TResult>, TResult>): LazySelectManyList<O, TResult> {
            return new LazySelectManyList<O, TResult>(this, f);
        }
    
        where(f: IPredicate<O>): LazyWhereList<O> {
            return new LazyWhereList<O>(this, f);
        }
    
        skip(n: number): LazySkipList<O> {
            return new LazySkipList<O>(this, n);
        }
    
        take(n: number, outer?: boolean): LazyTakeList<O> {
            return new LazyTakeList<O>(this, n, outer);
        }
    
        reverse(): LazyReverseList<O> {
            return new LazyReverseList<O>(this);
        }
    
        repeat(n: number): LazyRepeatList<O> {
            return new LazyRepeatList<O>(this, n);
        }
    
        wrap(): LazyWrapList<this, this>  {
            return LazyList.from([ this ]);
        }
    
        calc(): LazyWrapList<O, O> {
            return LazyList.from(this.value);
        }
    
        aggregate<TResult = O>(f: IFunction2<TResult, O, TResult, O>, out?: TResult): TResult {
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
    
        get count(): number {
            var i = 0;
            for (const e of this)
                i++;
            return i;
        }
    
        get first(): O {
            for (const e of this)
                return e;
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

    export class LazyWrapList<I, O> extends LazyList<O> {
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

    export class LazyConcatList<T> extends LazyWrapList<T, T> {
        constructor(data: Iterable<T>, public other: Iterable<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            yield* this.data;
            yield* this.other;
        }
    }

    export class LazyZipList<A, B, TResult> extends LazyWrapList<A, TResult> {
        constructor(data: Iterable<A>, public other: Iterable<B>, public f: IFunction2<A, B, TResult>, public outer: boolean = false) { super(data); }

        *[Symbol.iterator](): Iterator<TResult> {
            var i = 0;
            const a = this.data[Symbol.iterator]();
            const b = this.other[Symbol.iterator]();
            while(true)
            {
                const e = a.next();
                const f = b.next();
                if (this.outer ? (e.done && f.done) : (e.done || f.done))
                    break;
                yield this.f(e.value, f.value, i++, this);
            }
        }
    }

    export class LazySelectList<X, Y> extends LazyWrapList<X, Y> {
        constructor(data: Iterable<X>, public f: IFunction1<X, Y>) { super(data); }

        *[Symbol.iterator](): Iterator<Y> {
            var i = 0;
            for (const e of this.data)
                yield this.f(e, i++, this);
        }
    }

    export class LazySelectManyList<X, Y> extends LazyWrapList<X, Y> {
        constructor(data: Iterable<X>, public f: IFunction1<X, Iterable<Y>, Y> = x => (x as any as Iterable<Y>)) { super(data); }

        *[Symbol.iterator](): Iterator<Y> {
            var i = 0;
            for (const e of this.data)
                yield* this.f(e, i++, this);
        }
    }

    export class LazyWhereList<T> extends LazyWrapList<T, T> {
        constructor(data: Iterable<T>, public f: IPredicate<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            var i = 0;
            for (const e of this.data)
                if (this.f(e, i++, this))
                    yield e;
        }
    }

    export class LazySkipList<T> extends LazyWrapList<T, T> {
        constructor(data: Iterable<T>, public n: number) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            var i = 0;
            for (const e of this.data)
                if (++i > this.n)
                    yield e;
        }
    }

    export class LazyTakeList<T> extends LazyWrapList<T, T> {
        constructor(data: Iterable<T>, public n: number, public outer: boolean = false) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
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

    export class LazyReverseList<T> extends LazyWrapList<T, T> {
        constructor(data: Iterable<T>) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            const out = this.base();
            for (let i = out.length - 1; i >= 0; i--)
                yield out[i];
        }
    }

    export class LazyRepeatList<T> extends LazyWrapList<T, T> {
        constructor(data: Iterable<T>, public n: number) { super(data); }

        *[Symbol.iterator](): Iterator<T> {
            for (let i = 0; i < this.n; i++)
                yield* this.data;
        }
    }
}

if (typeof module !== "object")
    var module = {};
//@ts-ignore
export = LazyList = Object.assign(LazyList.LazyList, LazyList);