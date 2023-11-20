
import linq, { JoinMode, fastCount } from "..";

/**
 * Checks if the sequence returned by {@link source} is equal to the one returned by {@link dest}
 * @param source Sequence to check
 * @param dest The sequence to use as reference
 * @param structural If `true` it compares the JSON representation of the elements of {@link source} and {@link dest}, otherwise it checks by reference
 */
export function check<T>(source: Iterable<T>, dest: Iterable<T>, structural = true) {
    if (structural) expect(JSON.stringify([ ...source ])).toBe(JSON.stringify([ ...dest ]));
    else linq(source)
        .zip(dest, (a, b) => expect(a).toBe(b), JoinMode.outer)
        .forEach();
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