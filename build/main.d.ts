export declare type IFunction2<A, B, TResult = A, T = TResult> = (a: A, b: B, i: number, data: Iterable<T>) => TResult;
export declare type IFunction1<X, Y, T = Y> = (x: X, i: number, data: Iterable<T>) => Y;
export declare type IPredicate<T> = IFunction1<T, boolean, T>;
declare namespace LazyList {
    abstract class LazyList<O> implements Iterable<O> {
        abstract [Symbol.iterator](): Iterator<O>;
        static range(end?: number, begin?: number, step?: number): LazyRangeList;
        static from<T>(data: Iterable<T>): LazyWrapList<T, T>;
        concat(other: Iterable<O>): LazyConcatList<O>;
        zip<T, TResult>(other: Iterable<T>, f: IFunction2<O, T, TResult>, outer?: boolean): LazyZipList<O, T, TResult>;
        select<TResult>(f: IFunction1<O, TResult>): LazySelectList<O, TResult>;
        selectMany<TResult>(f?: IFunction1<O, Iterable<TResult>, TResult>): LazySelectManyList<O, TResult>;
        where(f: IPredicate<O>): LazyWhereList<O>;
        skip(n: number): LazySkipList<O>;
        take(n: number, outer?: boolean): LazyTakeList<O>;
        reverse(): LazyReverseList<O>;
        repeat(n: number): LazyRepeatList<O>;
        wrap(): LazyWrapList<this, this>;
        calc(): LazyWrapList<O, O>;
        aggregate<TResult = O>(f: IFunction2<TResult, O, TResult, O>, out?: TResult): TResult;
        at(n: number): O;
        get value(): O[];
        get count(): number;
        get first(): O;
        get any(): boolean;
        get all(): boolean;
        get max(): O;
        get min(): O;
        get sum(): O;
    }
    class LazyWrapList<I, O> extends LazyList<O> {
        data: Iterable<I>;
        constructor(data: Iterable<I>);
        [Symbol.iterator](): Iterator<O>;
        base(): O[];
        get count(): number;
    }
    class LazyRangeList extends LazyList<number> {
        end: number;
        begin: number;
        step: number;
        constructor(end?: number, begin?: number, step?: number);
        [Symbol.iterator](): Iterator<number>;
    }
    class LazyConcatList<T> extends LazyWrapList<T, T> {
        other: Iterable<T>;
        constructor(data: Iterable<T>, other: Iterable<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazyZipList<A, B, TResult> extends LazyWrapList<A, TResult> {
        other: Iterable<B>;
        f: IFunction2<A, B, TResult>;
        outer: boolean;
        constructor(data: Iterable<A>, other: Iterable<B>, f: IFunction2<A, B, TResult>, outer?: boolean);
        [Symbol.iterator](): Iterator<TResult>;
    }
    class LazySelectList<X, Y> extends LazyWrapList<X, Y> {
        f: IFunction1<X, Y>;
        constructor(data: Iterable<X>, f: IFunction1<X, Y>);
        [Symbol.iterator](): Iterator<Y>;
    }
    class LazySelectManyList<X, Y> extends LazyWrapList<X, Y> {
        f: IFunction1<X, Iterable<Y>, Y>;
        constructor(data: Iterable<X>, f?: IFunction1<X, Iterable<Y>, Y>);
        [Symbol.iterator](): Iterator<Y>;
    }
    class LazyWhereList<T> extends LazyWrapList<T, T> {
        f: IPredicate<T>;
        constructor(data: Iterable<T>, f: IPredicate<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazySkipList<T> extends LazyWrapList<T, T> {
        n: number;
        constructor(data: Iterable<T>, n: number);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazyTakeList<T> extends LazyWrapList<T, T> {
        n: number;
        outer: boolean;
        constructor(data: Iterable<T>, n: number, outer?: boolean);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazyReverseList<T> extends LazyWrapList<T, T> {
        constructor(data: Iterable<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazyRepeatList<T> extends LazyWrapList<T, T> {
        n: number;
        constructor(data: Iterable<T>, n: number);
        [Symbol.iterator](): Iterator<T>;
    }
}
declare const _default: typeof LazyList.LazyList & typeof LazyList;
export = _default;
