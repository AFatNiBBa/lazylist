
/** Utility methods for common error messages */
namespace ErrorMsg {
    /** There are duplicates in the sequence */
    export const duplicates = (subject: string) => new RangeError(`Duplicates are not allowed in ${subject}`);

    /** The index is less than 0 */
    export const beforeBegin = () => new RangeError("The provided index points before the beginning of the sequence");

    /** The index is more than the count minus one */
    export const afterEnd = () => new RangeError("The provided index points after the end of the sequence");
}

export default ErrorMsg;