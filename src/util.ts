
import { Combine, Compare, Convert, Predicate, fastCount } from ".";

/** Base type of typed arrays */
const TypedArray = Object.getPrototypeOf(Uint8Array) as typeof Array;

/**
 * An iterator that may have a {@link MarkedIterator.done} property.
 * If not present is `false` by default
 */
export type MarkedIterator<T> = Iterator<T> & { done?: boolean };

/** Value returned when it has been impossible to get a numeric result */
export const NOT_FOUND = -1;

/** The default {@link Predicate}: Returns always `true` */
export const TRUE = () => true;

/** The default {@link Convert}: The identity function */
export const IDENTITY = (x: any) => x;

/** The default {@link Combine}: Creates a tuple */
export const TUPLE = (a: any, b: any) => <any>[ a, b ];

/** The default {@link Compare}: Uses the `<` and `>` operators */
export const COMPARE = (a: any, b: any) => a > b ? 1 : a < b ? -1 : 0;

/**
 * Gets if the provided value has an usable length property
 * @param source The value to check
 */
export function hasLength<T>(source: Iterable<T>): source is readonly T[] {
    return typeof source === "string" || source instanceof String || source instanceof Array || source instanceof TypedArray;
}

/**
 * Checks if the sequence returned by {@link source} is equal to the one returned by {@link dest}
 * @param source Sequence to check
 * @param dest The sequence to use as reference
 */
export function check<T>(source: Iterable<T>, dest: Iterable<T>) {
    expect(JSON.stringify([ ...source ])).toBe(JSON.stringify([ ...dest ]));
}

/**
 * Checks if the sequence returned by {@link source} is equal to the first {@link length} numbers
 * @param source Sequence to check
 * @param length Expected length
 */
export function checkLength(source: Iterable<number>, length = 3) {
    const temp = new Array(length).fill(undefined).map((_, i) => i + 1);
    check(source, temp);
}

/**
 * Runs {@link checkLength} and checks the {@link fastCount} too
 * @param source Sequence to check
 * @param length Expected length
 */
export function checkLengthFastCount(source: Iterable<number>, length = 3) {
    checkLength(source, length);
    expect(fastCount(source)).toBe(length);
}