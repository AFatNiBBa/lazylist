
/** Base type of typed arrays */
const TypedArray = Object.getPrototypeOf(Uint8Array) as typeof Array;

/**
 * An iterator that may have a {@link MarkedIterator.done} property.
 * If not present is `false` by default
 */
export type MarkedIterator<T> = Iterator<T> & { done?: boolean };

/** Value returned when it has been impossible to get a numeric result */
export const NOT_FOUND = -1;

/** A function that returns always `true`; Used as default */
export const TRUE = () => true;

/** A function that returns its input; Used as default */
export const IDENTITY = (x: any) => x;

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