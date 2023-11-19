
import { EmptyList, RandList, RangeList } from "./lib/generative";
import { COMPARE, NOT_FOUND, hasLength } from "./util";
import { AbstractList } from "./lib/abstract";
import { FixedList } from "./lib/simple";

export default linq;

/** A function that maps a value into another */
export type Convert<I, O, TList = AbstractList<I>> = (x: I, i: number, list: TList) => O;

/** A function that checks if a condition applies to a value */
export type Predicate<T, TList = AbstractList<T>> = Convert<T, boolean, TList>;

/** A function that takes two arguments and combines them */
export type Combine<A, B, R, TList = AbstractList<R>> = (a: A, b: B, i: number, list: TList) => R;

/** A function that compares two values and returns a positive number if the first is greater than the second, 0 if they're equals and a negative value otherwise */
export type Compare<T, TList = AbstractList<T>> = Combine<T, T, number, TList>;

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
 * Returns a {@link AbstractList} based on an iterable or an non-iterable iterator.
 * If the {@link source} is a function, it gets wrapped in a new object that has {@link source} as its {@link Symbol.iterator} method.
 * If the {@link source} is a non-iterable iterator, it gets wrapped in a new object that returns {@link source} in its {@link Symbol.iterator} method.
 * If {@link source} is already a {@link AbstractList}, it gets returned directly, otherwise it gets wrapped in a {@link FixedList}
 * @param source The iterable/iterator
 * @param force If `true`, {@link source} is wrapped even if it is already an {@link AbstractList}
 */
export function linq<T>(source?: Iterable<T> | Iterator<T> | (() => Iterator<T>) | null, force = false): AbstractList<T> {
    return source == null
        ? EmptyList.instance
        : !force && source instanceof AbstractList
            ? <AbstractList<T>>source
            : new FixedList(
                typeof (<any>source)[Symbol.iterator] === "function"
                    ? <Iterable<T>>source
                    : typeof source === "function"
                        ? { [Symbol.iterator]: source }
                        : toGenerator(<Iterator<T>>source)
            );
}

/**
 * Returns the length of the iterable if it is easy to compute, otherwise it returns {@link NOT_FOUND}
 * @param source The iterable from which to get the count
 */
export function fastCount(source?: Iterable<any> | null): number {
    return source == null
        ? 0
        : hasLength(source)
            ? source.length
            : source instanceof Set || source instanceof Map
                ? source.size
                : source instanceof AbstractList
                    ? source.fastCount
                    : NOT_FOUND;
}

/**
 * Makes the provided iterator iterable
 * @param iter The iterator to make iterable
 * @param next The first value to pass as next
 * @returns The same thing {@link iter} returned
 */
export function *toGenerator<T, R = any, N = unknown>(iter: Iterator<T, R, N>, next?: N) {
    for (var value: T | R; !({ value } = iter.next(next!)).done; )
        next = yield <T>value;
    return <R>value;
}

/**
 * Applies a {@link Convert} to a {@link Compare}
 * @param f A conversion function
 * @param comp A sorting function
 */
export function by<I, O>(f: Convert<I, O>, comp: Compare<O, AbstractList<I>> = COMPARE): Compare<I> {
    return (a, b, i, list) => comp(f(a, i, list), f(b, i, list), i, list);
}

/** A sequence with 0 elements */
linq.empty = EmptyList.instance;

/**
 * Returns an INFINITE sequence of random numbers comprised between {@link bottom} and {@link top}, both included.
 * Since the sequence is infinite, it will create problems with non lazy methods.
 * Since the sequence is random, it will not be the same every time you calculate it
 * @param top The highest number in the sequence; If not provided, it will be 1 and the random numbers wont neither be integers, 1 nor bounded by {@link bottom}
 * @param bottom The lowest number in the sequence; If not provided, it will be 0
 */
linq.rand = (top?: number, bottom?: number) => new RandList(top, bottom);

/**
 * Returns an auto-generated list of numbers
 * @param length The length of the sequence
 * @param start The begin of the sequence
 * @param step The difference between each step of the sequence
 */
linq.range = (length?: number, start?: number, step?: number) => new RangeList(length, start, step);