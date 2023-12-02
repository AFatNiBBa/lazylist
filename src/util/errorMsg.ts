
/** Utility methods for common error messages */
namespace ErrorMsg {
    /** There are duplicates in the sequence */
    export const duplicates = (subject: string) => new RangeError(`Duplicates are not allowed in ${subject}`);

    /** The current list is always empty */
    export const empty = () => new RangeError("There is no element in an empty list");

    /** The index is less than 0 */
    export const beforeBegin = () => new RangeError("The provided index points before the beginning of the sequence");
}

export default ErrorMsg;