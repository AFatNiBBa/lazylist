var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
/**
 * Returns a {@link LazyList.LazyAbstractList} based on an iterable.
 * If {@link source} is already a {@link LazyList.LazyAbstractList}, it gets returned directly, otherwise it gets wrapped in a {@link LazyList.LazyFixedList}
 * @param source The iterable
 */
function LazyList(source) {
    return source instanceof LazyList.LazyAbstractList
        ? source
        : new LazyList.LazyFixedList(source);
}
(function (LazyList) {
    var _LazyAbstractCacheList_iter;
    LazyList.from = LazyList;
    /** Indicates how two iterable should be conbined it they have different sizes */
    let JoinMode;
    (function (JoinMode) {
        /** The length of the output is equal to the length of the shorter iterable */
        JoinMode[JoinMode["inner"] = 0] = "inner";
        /** The length of the output is equal to the length of the base iterable */
        JoinMode[JoinMode["left"] = 1] = "left";
        /** The length of the output is equal to the length of the input iterable */
        JoinMode[JoinMode["right"] = 2] = "right";
        /** The length of the output is equal to the length of the longer iterable */
        JoinMode[JoinMode["outer"] = 3] = "outer";
    })(JoinMode = LazyList.JoinMode || (LazyList.JoinMode = {}));
    /**
     * Makes {@link ctor} extend from {@link LazyList.LazyAbstractList}
     * @param ctor The constructor to which you want to change the base class; If not provided, it will apply the functionalities to {@link Generator}
     * @returns The library itself
     */
    function attachIterator(ctor) {
        //@ts-ignore
        (ctor?.prototype ?? (function* () { })().__proto__.__proto__.__proto__).__proto__ = LazyAbstractList.prototype;
        return LazyList;
    }
    LazyList.attachIterator = attachIterator;
    /**
     * Returns the length of the iterable if it is easy to compute, otherwise it returns `-1`
     * @param source The iterable from which to get the count
     */
    function fastCount(source) {
        return source == null
            ? 0
            : typeof source === "string" || source instanceof String || source instanceof Array
                ? source.length
                : source instanceof Set || source instanceof Map
                    ? source.size
                    : source instanceof LazyList.LazyAbstractList
                        ? source.fastCount
                        : -1;
    }
    LazyList.fastCount = fastCount;
    /**
     * Returns an auto-generated list of numbers
     * @param end The end of the sequence
     * @param start The begin of the sequence
     * @param step The difference between each step of the sequence
     * @param flip If `true` the sequence will be reversed (If {@link end} is less than `0` it will be `true` by default)
     */
    function range(end, start, step, flip) {
        return new LazyRangeList(end, start, step, flip);
    }
    LazyList.range = range;
    /** An iterable wrapper with helper functions */
    class LazyAbstractList {
        /**
         * Ensures every element of the list shows up only once
         * @param f A conversion function that returns the the part of the element to check duplicates for; If omitted, the element itself will be used
         */
        distinct(f) {
            return new LazyDistinctList(this, f);
        }
        /**
         * Ensures no element of {@link other} shows up in the list.
         * Every time the iteration starts, {@link other} is completely calculated
         * @param f A conversion function that returns the the part of the element to check for in the list; If omitted, the element itself will be used
         */
        except(other, f) {
            return new LazyExceptList(this, other, f);
        }
        /**
         * Filters the list based on {@link f}
         * @param p A predicate function; If no function is given, falsy elements will be filtered out
         */
        where(p) {
            return new LazyWhereList(this, p);
        }
        /**
         * If {@link p} matches on an element, it gets converted by {@link f}, otherwise it gets converted by {@link e}
         * @param p A predicate function
         * @param f A conversion function
         * @param e A conversion function; If no function is given, the current element will be yielded without modifications
         */
        when(p, f, e) {
            return new LazyWhenList(this, p, f, e);
        }
        /**
         * If {@link p} does NOT match on an element, it gets yielded, otherwise it gets passed into {@link f} and it gets filtered out
         * @param p A predicate function
         * @param f A function
         */
        case(p, f) {
            return new LazyCaseList(this, p, f);
        }
        /**
         * Converts the list based on {@link f}
         * @param f A conversion function
         */
        select(f) {
            return new LazySelectList(this, f);
        }
        /**
         * Converts the current list to an iterables list based on {@link f} and concats every element
         * @param f A conversion function; Can be omitted if every element is iterable
         */
        selectMany(f) {
            return new LazySelectManyList(this, f);
        }
        /**
         * Merges the current list to {@link other}
         * @param other An iterable
         */
        merge(other, flip) {
            return new LazyMergeList(this, other, flip);
        }
        /**
         * Adds a value at the end of the list
         * @param value The value to add
         * @param flip If `true` the value will be added at the beginning of the list
         */
        append(value, flip) {
            return new LazyAppendList(this, value, flip);
        }
        /**
         * Adds a value at the beginning of the list.
         * Is the same as passing the value to {@link append} with `true` as the second argument
         * @param value The value to add
         */
        prepend(value) {
            return new LazyAppendList(this, value, true);
        }
        /**
         * Forces the list to have at least one element by adding a default value if the list is empty
         * @param def The value to add if the list is empty
         */
        defaultIfEmpty(def) {
            return new LazyDefaultIfEmptyList(this, def);
        }
        /**
         * Repeat the list's elements {@link n} times.
         * The list is calculated each time.
         * Wrap the list in a {@link LazyCacheList} (Or use the {@link cache} method) to cache the elements
         * @param n The number of repetitions
         */
        repeat(n) {
            return new LazyRepeatList(this, n);
        }
        /**
         * Reverses the list.
         * Non lazy
         */
        reverse() {
            return new LazyReverseList(this);
        }
        /**
         * Orders the list; It counts the elements so that it is faster when there are a lot of copies (For that reason, the index is not available on {@link f} since it would be wrong).
         * Non lazy
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc If `true`, reverses the results
         */
        sort(f, desc) {
            return new LazySortList(this, f, desc);
        }
        /**
         * Replaces a section of the list with a new one based on {@link f}, which will be provided with the original section
         * @param start The start index of the section
         * @param length The length of the section
         * @param f The function that will provide the new section
         * @param lazy If `true` the section will be lazy but mono-use, and each element not taken will be appended after the new section
         */
        splice(start, length, f, lazy) {
            return new LazySpliceList(this, start, length, f, lazy);
        }
        /**
         * Throws a {@link RangeError} if the list has not exactly {@link n} elements.
         * Notice that if the iteration its stopped before the end the input list could have more than {@link n} elements
         * @param n The number of elements the list must have
         */
        fixedCount(n) {
            return new LazyFixedCountList(this, n);
        }
        /**
         * Skips the first {@link p} elements of the list
         * @param p The elements to skip (Use a negative number to skip from the end); If a function is given, it will be called for each element and the elements will be skipped until the function returns `false`
         */
        skip(p) {
            return new LazySkipList(this, p);
        }
        /**
         * Takes the first {@link p} elements of the list and skips the rest
         * @param p The elements to take (Use a negative number to take from the end); If a function is given, it will be called for each element and the elements will be taken until the function returns `false`
         * @param mode If truthy and {@link p} is more than the list length, the output list will be forced to have length {@link p} by concatenating as many `undefined` as needed
         */
        take(p, mode) {
            return new LazyTakeList(this, p, mode);
        }
        /**
         * Combines the current list with {@link other} based on {@link f}
         * @param other An iterable
         * @param f A combination function
         * @param mode Different length handling
         */
        zip(other, f, mode) {
            return new LazyZipList(this, other, f, mode);
        }
        /**
         * Joins the current list with {@link other} based on {@link f}, where the condition {@link p} is met.
         * If no {@link p} argument is supplied, the method does the cartesian product of the two lists (And {@link mode} becomes useless).
         * If {@link mode} is not {@link JoinMode.inner}, `undefined` will be supplied as the missing element.
         * The index available in the functions is the one of the "left" part in the {@link JoinMode.inner} operation, and `-1` in the {@link JoinMode.outer} part.
         * The {@link JoinMode.right} part ({@link other}) will be calculeted one time for each element of the {@link JoinMode.left} part and must be of the same size each time.
         * Wrap {@link other} in a {@link LazyCacheList} (Or use the {@link cache} method) to cache the elements
         * @param other An iterable
         * @param p A filter function
         * @param f A combination function
         * @param mode Different length handling
         */
        join(other, p, f, mode) {
            return new LazyJoinList(this, other, p, f, mode);
        }
        /**
         * Groups the list's elements based on a provided function.
         * Non lazy
         * @param f A combination function
         */
        groupBy(f) {
            return new LazyGroupByList(this, f);
        }
        /**
         * Groups the list's elements, {@link n} at a time.
         * Non lazy by default (It calculates {@link n} elements at a time), but can be made lazy by setting {@link lazy} as `true`.
         * If the list is set to lazy you should NEVER calculate the parent iterator before the childrens, like:
         * ```
         * LazyList.from([ 1, 2, 3 ]).split(2, false, true).value; // Stops
         * ```
         * Additionally a lot of unexpected behaviours could occur
         * @param n The length of each slice
         * @param mode If truthy, every slice will be forced to have {@link n} elements by concatenating as many `undefined` as needed
         * @param lazy Indicates if the list should be lazy (and unsafe)
         */
        split(n, mode, lazy) {
            return new LazySplitList(this, n, mode, lazy);
        }
        /**
         * Returns a {@link LazySet} that contains the elements of the list.
         * The set is lazy, this means that the elements are not calculated until it is checked if they are present
         */
        toSet() {
            return new LazySet(this);
        }
        /**
         * Returns a {@link LazyMap} that contains the elements of the list.
         * The map is lazy, this means that the elements are not calculated until it is checked if they are present or the key is requested
         * @param getK The function that will be used to get the key of each element
         * @param getV The function that will be used to get the value of each element; If not provided the element itself will be used
         */
        toMap(getK, getV) {
            return new LazyMap(this, getK, getV);
        }
        /** Caches the list's calculated elements, this prevent them from passing inside the pipeline again */
        cache() {
            return new LazyCacheList(this);
        }
        /** Calculates each element of the list and wraps them in a {@link LazyFixedList} */
        calc() {
            return new LazyFixedList(this.value);
        }
        /** Calculates and awaits each element of the list and wraps them in a {@link LazyFixedList} */
        async await() {
            return new LazyFixedList(await Promise.all(this));
        }
        /**
         * Converts the list based on {@link f}
         * @param f A conversion function, to which values of the awaited type of {@link T} will be passed
         */
        then(f) {
            return new LazySelectList(this, async (x, i, list) => f(await x, i, list));
        }
        /**
         * Catches the promise errors using the {@link f} function
         * @param f A conversion function, to which errors of the list's promises will be passed
         */
        catch(f) {
            return new LazySelectList(this, (x, i, list) => Promise.resolve(x).catch(e => f(e, i, list)));
        }
        /** Outputs a {@link LazyFixedList} that will contain the current one as its only element */
        wrap() {
            return new LazyFixedList([this]);
        }
        /**
         * Filters the list returning only the elements which are instances of {@link ctor}
         * @param ctor A constructor
         */
        ofType(ctor) {
            return new LazyWhereList(this, x => x instanceof ctor);
        }
        /**
         * Executes {@link Object.assign} on each element passing {@link obj} as the second parameter
         * @param obj An object
         */
        assign(obj) {
            return new LazySelectList(this, x => Object.assign(x, obj));
        }
        /**
         * Executes {@link f} on each element of the list and returns the current element (not the output of {@link f})
         * @param f A function
         */
        but(f) {
            return new LazySelectList(this, (x, i, list) => (f(x, i, list), x));
        }
        /**
         * Executes {@link f} on each element of the list forcing it to be entirely calculated.
         * If no argument is provided, the list will be just calculated
         * @param f A function
         */
        forEach(f) {
            var i = 0;
            for (const elm of this)
                f?.(elm, i, this);
        }
        /**
         * Returns a section of the list, starting at {@link start} and with {@link length} elements
         * @param start The index to start at; Can be whatever you can pass as the first argument of {@link skip}
         * @param length The length of the section; Can be whatever you can pass as the first argument of {@link take}
         * @param mode If truthy and {@link length} is more than the list length, the output list will be forced to have length {@link length} by concatenating as many `undefined` as needed
         */
        slice(start, length, mode) {
            return this.skip(start).take(length, mode);
        }
        //////////////////////////////////////////////////// AGGREGATE ////////////////////////////////////////////////////
        /**
         * Returns the element at the provided index
         * @param n The index; If negative it starts from the end
         * @param def The default value
         */
        at(n, def = null) {
            if (n < 0) {
                const temp = this.value;
                if (n < -temp.length)
                    return def;
                return temp[temp.length + n];
            }
            return this.skip(n).first(def);
        }
        /**
         * Gets the last element of the list or {@link def} as default if it's empty
         * @param def The default value
         */
        last(def = null) {
            for (const elm of this)
                def = elm;
            return def;
        }
        /**
         * Gets the first element of the list or {@link def} as default if it's empty.
         * Can be used as `next()` when the source iterable is a generator
         * @param def The default value
         */
        first(def = null) {
            const temp = this[Symbol.iterator]().next();
            return temp.done
                ? def
                : temp.value;
        }
        /**
         * Gets the first element of the list if it has exactly `1` element, otherwise the provided value as default, unless none is passed, in that case it throws a `RangeError`
         * @param def The default value; If provided, it will be returned instead of throwing an error
         */
        single(def) {
            const temp = this.take(2).value;
            if (temp.length === 1)
                return temp[0];
            if (arguments.length === 0)
                throw new RangeError("List has not exactly 1 element");
            return def;
        }
        /**
         * Aggregates the list based on {@link f}
         * @param f A combination function
         * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration)
         */
        aggregate(f, out) {
            var i = 0;
            for (const e of this)
                out = !i && arguments.length === 1
                    ? e
                    : f(out, e, i, this),
                    i++;
            return out;
        }
        /**
         * Returns `true` if {@link f} returns `true` for every element of the list
         * @param f A predicate function; It defaults to the identity function
         */
        all(f) {
            var i = 0;
            for (const elm of this)
                if (!(f ? f(elm, i++, this) : elm))
                    return false;
            return true;
        }
        /**
         * Returns `true` if {@link f} returns `true` for at least one element of the list
         * @param f A predicate function; It defaults to the identity function
         */
        any(f) {
            var i = 0;
            for (const elm of this)
                if (f ? f(elm, i++, this) : elm)
                    return true;
            return false;
        }
        /**
         * Returns `true` if a value is in the list; If {@link value} is not provided, it will return `true` if there is at least an element in the list
         * @param value The value
         */
        has(value) {
            return arguments.length
                ? this.any(x => Object.is(x, value))
                : !this[Symbol.iterator]().next().done;
        }
        /**
         * Returns the index of {@link value} in the list if found, `-1` otherwise
         * @param value The value to search for
         */
        indexOf(value) {
            return this.find(x => Object.is(x, value))[0];
        }
        /**
         * Executes the predicate function on each element of the list and returns the first element for which it returns `true` and its index
         * @param p A predicate function
         * @returns The index of the first element for which the predicate returns `true` end the element itself
         */
        find(p) {
            var i = 0;
            for (const elm of this)
                if (p(elm, i, this))
                    return [i, elm];
                else
                    i++;
            return [-1, null];
        }
        /**
         * Joins the list elements using {@link sep} as the separator
         * @param sep The separator
         */
        concat(sep = ",") {
            return this.aggregate((a, b) => `${a}${sep}${b}`);
        }
        /** Aggregates the list using the `+` operator (Can both add numbers and concatenate strings) */
        get sum() {
            //@ts-ignore
            return this.aggregate((a, b) => a + b);
        }
        /** Calculates the average of the elements of the list */
        get avg() {
            var i = 0, sum = 0;
            for (const e of this)
                sum += e,
                    i++;
            return sum / i;
        }
        /** Calculates the length of the list */
        get count() {
            var i = 0;
            for (const _ of this)
                i++;
            return i;
        }
        /** Returns the biggest number in the list */
        get max() {
            return this.aggregate((a, b) => a > b ? a : b);
        }
        /** Returns the smallest number in the list */
        get min() {
            return this.aggregate((a, b) => a < b ? a : b);
        }
        /** Calculates each element of the list and puts them inside of an {@link Array} */
        get value() {
            return Array.from(this);
        }
        /** Returns the length of the iterable if it is easy to compute, otherwise it returns `-1` */
        get fastCount() {
            return -1;
        }
    }
    LazyList.LazyAbstractList = LazyAbstractList;
    /**
     * Instances of this class are guaranteed to have a base iterable.
     * The input iterable's elements are of type {@link I} and the output's ones are of type {@link O}
     */
    class LazySourceList extends LazyAbstractList {
        constructor(source) {
            super();
            this.source = source;
        }
        *[Symbol.iterator]() {
            if (this.source != null)
                yield* this.source;
        }
        base() {
            return this.source == null
                ? []
                : typeof this.source === "string" || this.source instanceof String || this.source instanceof Array
                    ? this.source
                    : Array.from(this.source);
        }
    }
    LazyList.LazySourceList = LazySourceList;
    /**
     * Output of {@link LazyList}.
     * Represents a list with the same number of elements as {@link source}
     */
    class LazyFixedList extends LazySourceList {
        get fastCount() {
            return fastCount(this.source);
        }
    }
    LazyList.LazyFixedList = LazyFixedList;
    /** Output of {@link range} */
    class LazyRangeList extends LazyAbstractList {
        constructor(end = Infinity, start = 0, step = 1, flip) {
            super();
            this.end = end;
            this.start = start;
            this.step = step;
            this.flip = flip;
            // If `flip` is not specified it will default to `true` if `end` is less than 0; In that case `end` will be flipped
            if (arguments.length < 4 && (this.flip = this.end < 0))
                this.end *= -1;
        }
        *[Symbol.iterator]() {
            if (this.flip)
                for (let i = this.end - 1; i >= this.start; i -= this.step)
                    yield i;
            else
                for (let i = this.start; i < this.end; i += this.step)
                    yield i;
        }
        reverse() {
            return new LazyRangeList(this.end, this.start, this.step, true);
        }
    }
    LazyList.LazyRangeList = LazyRangeList;
    /** Output of {@link distinct} */
    class LazyDistinctList extends LazySourceList {
        constructor(source, f) {
            super(source);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            const set = new Set();
            for (const elm of this.source)
                if (set.size != set.add(this.f ? this.f(elm, i++, this) : elm).size)
                    yield elm;
        }
    }
    LazyList.LazyDistinctList = LazyDistinctList;
    /** Output of {@link except} */
    class LazyExceptList extends LazySourceList {
        constructor(source, other, f) {
            super(source);
            this.other = other;
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            const set = new Set(this.other);
            for (const elm of this.source)
                if (!set.has(this.f ? this.f(elm, i++, this) : elm))
                    yield elm;
        }
    }
    LazyList.LazyExceptList = LazyExceptList;
    /** Output of {@link where} */
    class LazyWhereList extends LazySourceList {
        constructor(source, p) {
            super(source);
            this.p = p;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                if (this.p ? this.p(elm, i++, this) : elm)
                    yield elm;
        }
    }
    LazyList.LazyWhereList = LazyWhereList;
    /** Output of {@link when} */
    class LazyWhenList extends LazyFixedList {
        constructor(source, p, f, e) {
            super(source);
            this.p = p;
            this.f = f;
            this.e = e;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                yield this.p(elm, i, this)
                    ? this.f(elm, i, this)
                    : this.e
                        ? this.e(elm, i, this)
                        : elm,
                    i++;
        }
    }
    LazyList.LazyWhenList = LazyWhenList;
    /** Output of {@link case} */
    class LazyCaseList extends LazySourceList {
        constructor(source, p, f) {
            super(source);
            this.p = p;
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                this.p(elm, i, this)
                    ? this.f(elm, i, this)
                    : yield elm,
                    i++;
        }
    }
    LazyList.LazyCaseList = LazyCaseList;
    /** Output of {@link select} */
    class LazySelectList extends LazyFixedList {
        constructor(source, f) {
            super(source);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                yield this.f(elm, i++, this);
        }
    }
    LazyList.LazySelectList = LazySelectList;
    /** Output of {@link selectMany} */
    class LazySelectManyList extends LazySourceList {
        constructor(source, f) {
            super(source);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const elm of this.source)
                yield* this.f
                    ? this.f(elm, i++, this)
                    : elm;
        }
    }
    LazyList.LazySelectManyList = LazySelectManyList;
    /** Output of {@link merge} */
    class LazyMergeList extends LazySourceList {
        constructor(source, other, flip = false) {
            super(source);
            this.other = other;
            this.flip = flip;
            if (flip)
                [this.source, this.other] = [this.other, this.source];
        }
        *[Symbol.iterator]() {
            yield* this.source;
            yield* this.other;
        }
    }
    LazyList.LazyMergeList = LazyMergeList;
    /** Output of {@link append} and {@link prepend} */
    class LazyAppendList extends LazyFixedList {
        constructor(source, v, flip = false) {
            super(source);
            this.v = v;
            this.flip = flip;
        }
        *[Symbol.iterator]() {
            if (this.flip)
                yield this.v;
            yield* this.source;
            if (!this.flip)
                yield this.v;
        }
        get fastCount() {
            const temp = super.fastCount;
            return ~temp
                ? temp + 1
                : -1;
        }
    }
    LazyList.LazyAppendList = LazyAppendList;
    /** Output of {@link defaultIfEmpty} */
    class LazyDefaultIfEmptyList extends LazyFixedList {
        constructor(source, def = null) {
            super(source);
            this.def = def;
        }
        *[Symbol.iterator]() {
            var empty = true;
            for (const elm of this.source)
                (empty = false),
                    yield elm;
            if (empty)
                yield this.def;
        }
    }
    LazyList.LazyDefaultIfEmptyList = LazyDefaultIfEmptyList;
    /** Output of {@link repeat} */
    class LazyRepeatList extends LazyFixedList {
        constructor(source, n) {
            super(source);
            this.n = n;
        }
        *[Symbol.iterator]() {
            for (var i = 0; i < this.n; i++)
                yield* this.source;
        }
        get fastCount() {
            const temp = super.fastCount;
            return ~temp
                ? temp * Math.max(0, this.n)
                : -1;
        }
    }
    LazyList.LazyRepeatList = LazyRepeatList;
    /** Output of {@link reverse} */
    class LazyReverseList extends LazyFixedList {
        *[Symbol.iterator]() {
            const temp = this.base();
            for (var i = temp.length - 1; i >= 0; i--)
                yield temp[i];
        }
    }
    LazyList.LazyReverseList = LazyReverseList;
    /** Output of {@link sort} */
    class LazySortList extends LazyFixedList {
        constructor(source, f, desc = false) {
            super(source);
            this.f = f;
            this.desc = desc;
        }
        *[Symbol.iterator]() {
            const map = new Map();
            for (const elm of this.source)
                map.set(elm, (map.get(elm) ?? 0) + 1);
            while (map.size) {
                var out, n = 0;
                for (const elm of map)
                    if (!n || (this.f ? this.f(elm[0], out, -1, this) < 0 : elm[0] < out) !== this.desc)
                        [out, n] = elm;
                for (var i = 0; i < n; i++)
                    yield out;
                map.delete(out);
            }
        }
    }
    LazyList.LazySortList = LazySortList;
    /** Output of {@link splice} */
    class LazySpliceList extends LazySourceList {
        constructor(source, start, length = 1, f, lazy = false) {
            super(source);
            this.start = start;
            this.length = length;
            this.f = f;
            this.lazy = lazy;
        }
        *[Symbol.iterator]() {
            const iter = this.source[Symbol.iterator]();
            yield* LazyTakeList.take(iter, this.start);
            const temp = new LazyFixedList(LazyTakeList.take(iter, this.length));
            if (this.f)
                yield* this.f(this.lazy ? temp : temp.calc());
            else
                temp.calc(); // Forces the evaluation if there is no function, otherwise the selected part would not be removed
            for (var value; !({ value } = iter.next()).done;)
                yield value;
        }
    }
    LazyList.LazySpliceList = LazySpliceList;
    /** Output of {@link LazyAbstractList.fixedCount} */
    class LazyFixedCountList extends LazyFixedList {
        constructor(source, n) {
            super(source);
            this.n = n;
        }
        *[Symbol.iterator]() {
            const iter = this.source[Symbol.iterator]();
            for (var value, i = 0; i < this.n; i++)
                if (({ value } = iter.next()).done)
                    throw new RangeError(`Fixed count list has less than ${this.n} element${this.n - 1 ? 's' : ''}`);
                else
                    yield value;
            if (!iter.next().done)
                throw new RangeError(`Fixed count list has more than ${this.n} elements${this.n - 1 ? 's' : ''}`);
        }
        get fastCount() {
            return this.n;
        }
    }
    LazyList.LazyFixedCountList = LazyFixedCountList;
    /** Output of {@link LazyAbstractList.skip} */
    class LazySkipList extends LazySourceList {
        constructor(source, p) {
            super(source);
            this.p = p;
        }
        static *skip(iter, n) {
            for (var i = 0; i < n; i++)
                if (iter.done = iter.next().done)
                    return;
            for (var value; !({ value } = iter.next()).done;)
                yield value;
        }
        *[Symbol.iterator]() {
            if (typeof this.p === "number") {
                if (this.p < 0) {
                    const temp = this.base();
                    yield* LazyTakeList.take(temp[Symbol.iterator](), temp.length + this.p);
                }
                else
                    yield* LazySkipList.skip(this.source[Symbol.iterator](), this.p);
                return;
            }
            let i = 0, done = false;
            for (const elm of this.source)
                if (done || (done = !this.p(elm, i++, this)))
                    yield elm;
        }
    }
    LazyList.LazySkipList = LazySkipList;
    /** Output of {@link LazyAbstractList.take} */
    class LazyTakeList extends LazySourceList {
        constructor(source, p, mode = false) {
            super(source);
            this.p = p;
            this.mode = mode;
        }
        static *take(iter, n, mode = false) {
            for (var value, i = 0; i < n; i++) // If this were a foreach loop the first element after "n" would have been calculated too
                if ((iter.done = ({ value } = iter.next()).done) && !mode)
                    break;
                else
                    yield value;
        }
        *[Symbol.iterator]() {
            if (typeof this.p === "number") {
                if (this.p < 0) {
                    const temp = this.base();
                    yield* LazySkipList.skip(temp[Symbol.iterator](), temp.length + this.p);
                }
                else
                    yield* LazyTakeList.take(this.source[Symbol.iterator](), this.p, this.mode);
                return;
            }
            let i = 0;
            for (const elm of this.source)
                if (this.p(elm, i++, this))
                    yield elm;
                else
                    break;
        }
    }
    LazyList.LazyTakeList = LazyTakeList;
    /** Output of {@link zip} */
    class LazyZipList extends LazySourceList {
        constructor(source, other, f, mode = JoinMode.inner) {
            super(source);
            this.other = other;
            this.f = f;
            this.mode = mode;
        }
        *[Symbol.iterator]() {
            var i = 0;
            const source = this.source[Symbol.iterator]();
            const other = this.other[Symbol.iterator]();
            while (true) {
                const a = source.next();
                const b = other.next();
                if (a.done && b.done || a.done && !(this.mode & JoinMode.right) || b.done && !(this.mode & JoinMode.left))
                    break;
                yield this.f
                    ? this.f(a.value, b.value, i++, this)
                    : [a.value, b.value];
            }
        }
    }
    LazyList.LazyZipList = LazyZipList;
    /** Output of {@link join} */
    class LazyJoinList extends LazySourceList {
        constructor(source, other, p, f, mode = JoinMode.inner) {
            super(source);
            this.other = other;
            this.p = p;
            this.f = f;
            this.mode = mode;
        }
        *[Symbol.iterator]() {
            const cacheA = [];
            const cacheB = [];
            // Inner
            var i = 0;
            for (const a of this.source) {
                var k = 0;
                const aE = cacheA[i] ?? (cacheA[i] = { v: a });
                for (const b of this.other) {
                    const bE = cacheB[k] ?? (cacheB[k] = { v: b });
                    const temp = !this.p || this.p(a, b, i, this);
                    aE.c || (aE.c = temp);
                    bE.c || (bE.c = temp);
                    if (temp)
                        yield this.f
                            ? this.f(a, b, i, this)
                            : [a, b];
                    k++;
                }
                i++;
            }
            // Outer (left)
            if (this.mode & JoinMode.left)
                for (const elm of cacheA)
                    if (!elm.c)
                        yield this.f
                            ? this.f(elm.v, undefined, -1, this)
                            : [elm.v, undefined];
            // Outer (right)
            if (this.mode & JoinMode.right)
                for (const elm of cacheB)
                    if (!elm.c)
                        yield this.f
                            ? this.f(undefined, elm.v, -1, this)
                            : [undefined, elm.v];
        }
    }
    LazyList.LazyJoinList = LazyJoinList;
    /**
     * Element of the output of {@link groupBy}.
     * The group common value is contained in the {@link key} property.
     * The group is a {@link LazyAbstractList} itself
     */
    class Grouping extends LazyFixedList {
        constructor(key, source) {
            super(source);
            this.key = key;
        }
    }
    LazyList.Grouping = Grouping;
    /** Output of {@link groupBy} */
    class LazyGroupByList extends LazySourceList {
        constructor(source, f) {
            super(source);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            const cache = new Map();
            for (const e of this.source) {
                const k = this.f(e, i++, this);
                if (cache.has(k))
                    cache.get(k).push(e);
                else
                    cache.set(k, [e]);
            }
            for (const [k, v] of cache)
                yield new Grouping(k, v);
        }
    }
    LazyList.LazyGroupByList = LazyGroupByList;
    /** Output of {@link split} */
    class LazySplitList extends LazySourceList {
        constructor(source, n, mode = false, lazy = false) {
            super(source);
            this.n = n;
            this.mode = mode;
            this.lazy = lazy;
        }
        *[Symbol.iterator]() {
            const iter = this.source[Symbol.iterator]();
            while (!iter.done) {
                const temp = new LazyFixedList(LazyTakeList.take(iter, this.n, this.mode)); // This doesn't use the normal `list.take()` because I would have reconverted "iter" into an iterable
                yield this.lazy
                    ? temp
                    : temp.calc();
            }
        }
    }
    LazyList.LazySplitList = LazySplitList;
    /** Common functionalities of cached lists */
    class LazyAbstractCacheList extends LazySourceList {
        constructor() {
            super(...arguments);
            _LazyAbstractCacheList_iter.set(this, void 0);
            this.done = false;
        }
        *[(_LazyAbstractCacheList_iter = new WeakMap(), Symbol.iterator)]() {
            yield* this.cached;
            yield* this.calcRest();
        }
        /** Calculates the remaining elements one at a time */
        *calcRest() {
            for (var value; !({ value, done: this.done } = this.iter.next()).done;)
                yield this.save(value);
        }
        has(value) {
            if (!arguments.length)
                return this.done ? this.saved > 0 : super.has();
            return super.has(value);
        }
        /** Completes the cache and returns it */
        complete() {
            for (const _ of this.calcRest())
                ;
            return this.cached;
        }
        get fastCount() {
            return this.done
                ? this.saved
                : -1;
        }
        /** The iterator to cache */
        get iter() {
            return __classPrivateFieldSet(this, _LazyAbstractCacheList_iter, __classPrivateFieldGet(this, _LazyAbstractCacheList_iter, "f") ?? this.source[Symbol.iterator](), "f");
        }
    }
    LazyList.LazyAbstractCacheList = LazyAbstractCacheList;
    /** Output of {@link toSet} */
    class LazySet extends LazyAbstractCacheList {
        constructor() {
            super(...arguments);
            this.cached = new Set();
        }
        has(value) {
            if (!arguments.length)
                return super.has();
            if (this.cached.has(value))
                return true;
            for (const elm of this.calcRest())
                if (elm === value)
                    return true;
            return false;
        }
        add(value) {
            this.save(value);
            return this;
        }
        save(value) {
            this.cached.add(value);
            return value;
        }
        get saved() {
            return this.cached.size;
        }
    }
    LazyList.LazySet = LazySet;
    /** Output of {@link toMap} */
    class LazyMap extends LazyAbstractCacheList {
        constructor(source, getK, getV) {
            super(source);
            this.getK = getK;
            this.getV = getV;
            this.processed = 0;
            this.cached = new Map();
        }
        hasKey(value) {
            if (this.cached.has(value))
                return true;
            for (const [k] of this.calcRest())
                if (k === value)
                    return true;
            return false;
        }
        get(key) {
            if (this.cached.has(key))
                return this.cached.get(key);
            for (const [k, v] of this.calcRest())
                if (k === key)
                    return v;
            return undefined;
        }
        set(key, value) {
            this.cached.set(key, value);
            return this;
        }
        save(value) {
            const k = this.getK(value, this.processed, this);
            const v = this.getV ? this.getV(value, this.processed, this) : value;
            this.cached.set(k, v);
            this.processed++;
            return [k, v];
        }
        get saved() {
            return this.cached.size;
        }
    }
    LazyList.LazyMap = LazyMap;
    /** Output of {@link cache} */
    class LazyCacheList extends LazyAbstractCacheList {
        constructor() {
            super(...arguments);
            this.cached = [];
        }
        at(n, def = null) {
            return n < 0
                ? this.done
                    ? this.at(this.cached.length + n, def)
                    : super.at(n, def)
                : n < this.cached.length
                    ? this.cached[n]
                    : this.done
                        ? def
                        : super.at(n, def);
        }
        last(def = null) {
            return this.done
                ? this.cached[this.cached.length - 1]
                : super.last(def);
        }
        save(value) {
            this.cached.push(value);
            return value;
        }
        get fastCount() {
            return this.done
                ? this.saved
                : fastCount(this.source);
        }
        get saved() {
            return this.cached.length;
        }
    }
    LazyList.LazyCacheList = LazyCacheList;
})(LazyList || (LazyList = {}));
if (typeof module !== "object")
    var module = {};
module.exports = LazyList;
//# sourceMappingURL=main.js.map