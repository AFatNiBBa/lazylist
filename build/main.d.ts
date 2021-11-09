export declare type UFunction2<A, B, TResult = A, T = TResult> = (a: A, b: B, i: number, data: Iterable<T>) => TResult;
export declare type UFunction1<X, Y, T = Y> = (x: X, i: number, data: Iterable<T>) => Y;
export declare type UPredicate<T> = UFunction1<T, boolean, T>;
declare namespace LazyList {
    enum UMode {
        inner = 0,
        left = 1,
        right = 2,
        outer = 3
    }
    abstract class LazyList<O> implements Iterable<O> {
        abstract [Symbol.iterator](): Iterator<O>;
        static range(end?: number, begin?: number, step?: number): LazyRangeList;
        static from<T>(data: Iterable<T>): LazyList<T>;
        concat(other: Iterable<O>): LazyConcatList<O>;
        zip<T, TResult>(other: Iterable<T>, f: UFunction2<O, T, TResult>, mode?: UMode): LazyZipList<O, T, TResult>;
        select<TResult>(f: UFunction1<O, TResult>): LazySelectList<O, TResult>;
        selectMany<TResult>(f?: UFunction1<O, Iterable<TResult>, TResult>): LazySelectManyList<O, TResult>;
        where(f: UPredicate<O>): LazyWhereList<O>;
        skip(n: number): LazySkipList<O>;
        take(n: number, outer?: UMode | boolean): LazyTakeList<O>;
        groupBy<K>(f: UFunction1<O, K, UGrouping<K, O>>): LazyGroupByList<K, O>;
        reverse(): LazyReverseList<O>;
        repeat(n: number): LazyRepeatList<O>;
        cache(): LazyCacheList<O>;
        wrap(): LazyWrapList<this>;
        adjust<T>(other: Iterable<T>, mode?: UMode): LazyZipList<O, T, [O, T]>;
        calc(): LazyDataList<O, O>;
        aggregate<TResult = O>(f: UFunction2<TResult, O, TResult, O>, out?: TResult): TResult;
        at(n: number): O;
        get value(): O[];
        get avg(): number;
        get count(): number;
        get first(): O | null;
        get last(): O | null;
        get any(): boolean;
        get all(): boolean;
        get max(): O;
        get min(): O;
        get sum(): O;
    }
    class LazyRangeList extends LazyList<number> {
        end: number;
        begin: number;
        step: number;
        constructor(end?: number, begin?: number, step?: number);
        [Symbol.iterator](): Iterator<number>;
    }
    class LazyDataList<I, O> extends LazyList<O> {
        data: Iterable<I>;
        constructor(data: Iterable<I>);
        [Symbol.iterator](): Iterator<O>;
        base(): O[];
        get count(): number;
        get last(): O | null;
    }
    class LazyConcatList<T> extends LazyDataList<T, T> {
        other: Iterable<T>;
        constructor(data: Iterable<T>, other: Iterable<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazyZipList<A, B, TResult> extends LazyDataList<A, TResult> {
        other: Iterable<B>;
        f: UFunction2<A, B, TResult>;
        mode: UMode;
        constructor(data: Iterable<A>, other: Iterable<B>, f: UFunction2<A, B, TResult>, mode?: UMode);
        [Symbol.iterator](): Iterator<TResult>;
    }
    class LazySelectList<X, Y> extends LazyDataList<X, Y> {
        f: UFunction1<X, Y>;
        constructor(data: Iterable<X>, f: UFunction1<X, Y>);
        [Symbol.iterator](): Iterator<Y>;
    }
    class LazySelectManyList<X, Y> extends LazyDataList<X, Y> {
        f: UFunction1<X, Iterable<Y>, Y>;
        constructor(data: Iterable<X>, f?: UFunction1<X, Iterable<Y>, Y>);
        [Symbol.iterator](): Iterator<Y>;
    }
    class LazyWhereList<T> extends LazyDataList<T, T> {
        f: UPredicate<T>;
        constructor(data: Iterable<T>, f: UPredicate<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazySkipList<T> extends LazyDataList<T, T> {
        n: number;
        constructor(data: Iterable<T>, n: number);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazyTakeList<T> extends LazyDataList<T, T> {
        n: number;
        outer: UMode | boolean;
        constructor(data: Iterable<T>, n: number, outer?: UMode | boolean);
        [Symbol.iterator](): Iterator<T>;
    }
    class UGrouping<K, V> extends LazyDataList<V, V> {
        key: K;
        constructor(key: K, data: Iterable<V>);
    }
    class LazyGroupByList<K, V> extends LazyDataList<V, UGrouping<K, V>> {
        f: UFunction1<V, K, UGrouping<K, V>>;
        constructor(data: Iterable<V>, f: UFunction1<V, K, UGrouping<K, V>>);
        [Symbol.iterator](): Iterator<UGrouping<K, V>>;
    }
    class LazyReverseList<T> extends LazyDataList<T, T> {
        constructor(data: Iterable<T>);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazyRepeatList<T> extends LazyDataList<T, T> {
        n: number;
        constructor(data: Iterable<T>, n: number);
        [Symbol.iterator](): Iterator<T>;
    }
    class LazyCacheList<T> extends LazyDataList<T, T> {
        result: T[];
        iter: Iterator<T>;
        e: IteratorResult<T>;
        constructor(data: Iterable<T>);
        [Symbol.iterator](): Iterator<T>;
        get count(): number;
    }
    class LazyWrapList<T> extends LazyList<T> {
        data: T;
        constructor(data: T);
        [Symbol.iterator](): Generator<T, void, unknown>;
        get value(): T[];
        get count(): number;
        get first(): T;
        get last(): T;
    }
}
declare const _default: typeof LazyList.LazyList & typeof LazyList;
export = _default;
