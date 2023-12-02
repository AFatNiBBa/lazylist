
import { Combinator, Comparer, Converter, Predicate, fastCount } from "..";

/** Base type of typed arrays */
const TypedArray = Object.getPrototypeOf(Uint8Array) as typeof Array;

/**
 * An iterator that may have a {@link MarkedIterator.done} property.
 * If not present is `false` by default
 */
export type MarkedIterator<T> = Iterator<T> & { done?: boolean };

/** Value returned when it has been impossible to get a numeric result */
export const NOT_FOUND = NaN;

/** A {@link Predicate}: Returns always `true` */
export const TRUE = () => true;

/** A {@link Converter}: The identity function */
export const IDENTITY = (x: any) => x;

/** A {@link Combinator}: Creates a tuple */
export const TUPLE = (a: any, b: any) => <any>[ a, b ];

/** A {@link Combinator}: Checks for strict equality */
export const EQUALS = (a: any, b: any) => a === b;

/** A {@link Comparer}: Uses the `<` and `>` operators */
export const COMPARE = (a: any, b: any) => a > b ? 1 : a < b ? -1 : 0;

/**
 * Gets if the provided value has an usable length property
 * @param source The value to check
 */
export function isReadonlyArray<T>(source: Iterable<T>): source is readonly T[] {
    return typeof source === "string" || Array.isArray(source) || source instanceof Array || source instanceof String || source instanceof TypedArray;
}

/**
 * Obtains the calculated version of a list
 * @param source The list to calculate
 */
export function calcArray<T>(source: Iterable<T>) {
    return isReadonlyArray(source) ? source : [ ...source ];
}


/**
 * Returns an iterable containing the elements of {@link source} and its length.
 * If computing the length is expensive, it will calculate {@link source}, so its returned to prevent computing it twice
 * @param source The list to which to calculate the length
 */
export function calcLength<T>(source: Iterable<T>): [ Iterable<T>, number ] {
    const l = fastCount(source);
    if (!isNaN(l)) return [ source, l ];
    const temp = calcArray(source);
    return [ temp, temp.length ];
}

/**
 * Returns an iterable containing the elements of {@link source} and the absolute value of {@link i}, which can be negative.
 * It will use {@link calcLength} to calculate the length if the index is negative
 * @param source The list from which to get the length if {@link i} is negative
 * @param i The index to make absolute
 */
export function calcIndex<T>(source: Iterable<T>, i: number) {
    if (i >= 0) return [ source, i ] as const;
    const out = calcLength(source);
    out[1] += i;
    return out;
}