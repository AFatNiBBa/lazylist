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
 * Returns a {@link LazyList.LazyAbstractList} based on an iterable or an non-iterable iterator.
 * If the {@link source} is a function, it gets wrapped in a new object that has {@link source} as its {@link Symbol.iterator} method.
 * If the {@link source} is a non-iterable iterator, it gets wrapped in a new object that returns {@link source} in its {@link Symbol.iterator} method.
 * If {@link source} is already a {@link LazyList.LazyAbstractList}, it gets returned directly, otherwise it gets wrapped in a {@link LazyList.LazyFixedList}
 * @param source The iterable/iterator
 * @param force If `true`, {@link source} is always wrapped
 */
function LazyList(source, force = false) {
    return !force && source instanceof LazyList.LazyAbstractList
        ? source
        : new LazyList.LazyFixedList(!source || typeof source[Symbol.iterator] === 'function' // If the source is iterable or nullish
            ? source // Wrap it directly
            : typeof source === "function" // Else if the source is a function
                ? { [Symbol.iterator]: source } // Use it as a generator function
                : LazyList.toGenerator(source) // Otherwise try to use it as an iterator
        );
}
(function (LazyList) {
    var _BufferIterator_currentIndex, _BufferIterator_current, _LazyStore_iter, _LazyAbstractCacheList_iter;
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
    function injectInto(ctor) {
        //@ts-ignore
        (ctor?.prototype ?? (function* () { })().__proto__.__proto__.__proto__).__proto__ = LazyAbstractList.prototype;
        return LazyList;
    }
    LazyList.injectInto = injectInto;
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
     * Makes the provided iterator iterable.
     * If a generator is used in a foreach loop and you break out of it, the generator will be closed (It will stop even if some elements remain), this function prevents that.
     * @param iter The iterator to make iterable
     */
    function* toGenerator(iter) {
        for (var value; !({ value } = iter.next()).done;)
            yield value;
    }
    LazyList.toGenerator = toGenerator;
    /**
     * Returns an INFINITE sequence of random numbers comprised between {@link bottom} and {@link top}.
     * Since the sequence is infinite, it will create problems with non lazy methods.
     * Since the sequence is random, it will not be the same every time you calculate it
     * @param top The highest number in the sequence; If not provided, it will be `1` and the random numbers will not be integers
     * @param bottom The lowest number in the sequence; If not provided, it will be `0`
     */
    function rand(top, bottom) {
        return new LazyRandList(top, bottom);
    }
    LazyList.rand = rand;
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
         * Converts and filters the list based on {@link f} at the same time.
         * Usage:
         * ```
         * LazyList.from([ 1, 2, 3 ]).selectWhere(x => {
         *    if (x.value % 2) {
         *        x.result = x.value + 2;
         *        return true;
         *    }
         *    return false;
         * }).value //=> [ 3, 5 ]
         * ```
         * @param f A predicate function that gets a box object containing the element in the `value` field; If the function returns `true`, the content of the box's `result` field will be yielded
         */
        selectWhere(f) {
            return new LazySelectWhereList(this, f);
        }
        /**
         * Converts the list based on {@link f}
         * @param f A conversion function
         */
        select(f) {
            return new LazySelectList(this, f);
        }
        /**
         * Converts the current list to a list of iterables based on {@link f} and concats every element
         * @param f A conversion function; Can be omitted if every element is iterable
         */
        selectMany(f) {
            return new LazySelectManyList(this, f);
        }
        /**
         * For each element yields the element and the children generated by {@link f} and does it all again for each child.
         * Providing the {@link p} parameter is very different to using {@link where}, because not only the element will eventually be filtered out, but also the children.
         * The index provided to the callbacks are the child element index on their parent
         * @param f A conversion function that returns an iterable of the same type as the provided element (Or a nullish value)
         * @param p A predicate function
         * @param flip If `true` the children will be yielded before the parent
         */
        traverse(f, p, flip) {
            return new LazyTraverseList(this, f, p, flip);
        }
        /** Flattens in a single list every iterable element of the list, and the elements of the elements and so on */
        flat() {
            return new LazyFlatList(this);
        }
        /**
         * Merges the current list to {@link other}
         * @param other An iterable
         */
        merge(other, flip) {
            return new LazyMergeList(this, other, flip);
        }
        /**
         * Inserts {@link value} at index {@link n}.
         * If {@link n} is not provided, the value will be inserted at the end of the list
         * @param value The value to insert
         * @param n Index at which to insert the value (Use a negative number to insert from the end)
         */
        insert(value, n) {
            return new LazyInsertList(this, value, n);
        }
        /**
         * Adds a value at the beginning of the list.
         * Is the same as passing {@link value} to {@link insert} with `0` as the second argument
         * @param value The value to add
         */
        prepend(value) {
            return new LazyInsertList(this, value, 0);
        }
        /**
         * Adds a value at the end of the list.
         * Is the same as passing {@link value} to {@link insert} with `null` as the second argument
         * @param value The value to add
         */
        append(value) {
            return new LazyInsertList(this, value, null);
        }
        /**
         * Removes the first {@link n} occurences of {@link value} from the list
         * @param value The value to remove
         * @param n The number of times to remove the value (Use {@link Infinity} to remove all the occurrences); It defaults to 1
         */
        remove(value, n) {
            return new LazyRemoveList(this, value, n);
        }
        /**
         * Forces the list to have at least one element by adding a default value if the list is empty
         * @param def The value to add if the list is empty
         */
        default(def) {
            return new LazyDefaultList(this, def);
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
         * Shuffles the list in a randomic way.
         * Non lazy
         */
        shuffle() {
            return new LazyShuffleList(this);
        }
        /**
         * Orders the list; It counts the elements so that it is faster when there are a lot of copies (For that reason, the index is not available on {@link comp} since it would be wrong).
         * Non lazy
         * @param comp A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc If `true`, reverses the results
         */
        sort(comp, desc) {
            return new LazySortList(this, comp, desc);
        }
        /**
         * Orders the list based on the return value of {@link f}; It counts the elements so that it is faster when there are a lot of copies (For that reason, the index is not available on {@link f} and {@link comp} since it would be wrong).
         * Differs from {@link sort} in that {@link comp} is provided with the return value of {@link f}, and not the element itself.
         * Non lazy
         * @param f A conversion function
         * @param comp A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         * @param desc If `true`, reverses the results
         */
        orderBy(f, desc, comp = LazySortList.defaultComparer) {
            return new LazySortList(this, (a, b, i, list) => comp(f(a, i, list), f(b, i, list), i, list), desc);
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
         * Throws a {@link RangeError} based on {@link mode}, generally if the list has not exactly {@link n} elements.
         * Notice that if the iteration its stopped before the end the input list could have more than {@link n} elements
         * @param n The number of elements the list must have
         * @param mode Tells the method when to throw errors
         * @param def The default value to return if the list has less than {@link n} elements and {@link mode} is {@link JoinMode.inner} or {@link JoinMode.left}
         */
        fixedCount(n, mode, def) {
            return new LazyFixedCountList(this, n, mode, def);
        }
        /**
         * Moves the first {@link p} elements to the end of the list
         * @param p The elements to rotate (Use a negative number to skip from the end); If a function is given, it will be called for each element and the elements will be skipped until the function returns `false`
         */
        rotate(p) {
            return new LazyRotateList(this, p);
        }
        /**
         * Skips the first {@link p} elements of the list
         * @param p The elements to skip (Use a negative number to skip from the end); If a function is given, it will be called for each element and the elements will be skipped until the function returns `false`
         * @param leftOnNegative Usually, if {@link p} is negative, the LAST -{@link p} elements will be skipped; If `true`, the elements will be skipped from the beginning
         */
        skip(p, leftOnNegative) {
            return new LazySkipList(this, p, leftOnNegative);
        }
        /**
         * Takes the first {@link p} elements of the list and skips the rest
         * @param p The elements to take (Use a negative number to take from the end); If a function is given, it will be called for each element and the elements will be taken until the function returns `false`
         * @param mode If truthy and {@link p} is more than the list length, the output list will be forced to have length {@link p} by concatenating as many {@link def} as needed
         * @param def The value to use if the list is too short
         * @param leftOnNegative Usually, if {@link p} is negative, the output will be the LAST -{@link p} elements; If `true`, the output will be taken from the beginning
         */
        take(p, mode, def, leftOnNegative) {
            return new LazyTakeList(this, p, mode, def, leftOnNegative);
        }
        /**
         * Force the list to have at least {@link n} elements by concatenating as many {@link def} as needed at the beginning of the list.
         * If you want to pad at the end, use {@link take} instead (Be carefull to pass `true` as the second argument).
         * Non lazy
         * @param n The number of desired elements
         * @param def The value to use if the list is too short
         */
        padStart(n, def) {
            return new LazyPadStartList(this, n, def);
        }
        /**
         * Aggregates the list based on {@link f}.
         * Similiar to {@link aggregate} but yields the intermediate results
         * @param f A combination function
         * @param out The initial state of the aggregation; It defaults to the first element (Which will be skipped in the iteration)
         */
        accumulate(f, out) {
            return new LazyAccumulateList(this, f, out, arguments.length > 1);
        }
        /**
         * Combines the current list with {@link other} based on {@link f}
         * @param other An iterable
         * @param f A combination function, if not provided the pairs will be put in a tuple
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
         * @param other An iterable
         * @param p A filter function
         * @param f A combination function, if not provided pairs will be put in a tuple
         * @param mode Different length handling
         */
        join(other, p, f, mode) {
            return new LazyJoinList(this, other, p, f, mode);
        }
        /**
         * Generates all the possible combinations of length {@link depth} of the elements of the list.
         * Only one combination will be generated for each pair of elements from the two lists (If there is "(a, b)" there will not be "(b, a)").
         * The index available in the functions is the one of the first element of the group
         * @param depth The length of the each combination
         */
        combinations(depth) {
            return new LazyCombinationsList(this, depth);
        }
        /**
         * Groups the list's elements based on a provided function.
         * Similiar to {@link groupBy}, but the groups cannot be completely iterated until the evalueation is finisced, only what is inside them can.
         * You can use the {@link LazyStore.get} method to get the desired group like so:
         * ```
         * const store = LazyList.from([ 1, 2, 3 ]).storeBy(x => x % 2);
         * store.get(1).value //=> [ 1, 3 ]
         * ```
         * This allows the groups to be lazy.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyStoreByList} could cause unexpected behaviours (Some elements could not be present)
         * @param f A combination function
         */
        storeBy(f) {
            return new LazyStore(this, f);
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
         * If the list is set to lazy there could be an empty (Even if {@link mode} is truthy) group at the end of the list, this is because there is no way of checking if the iteration has finisced at that point.
         * If the list is set to lazy you should NEVER calculate the parent iterator before the childrens, like:
         * ```
         * LazyList.from([ 1, 2, 3 ]).split(2, false, true).value; // Stops
         * ```
         * Additionally a lot of unexpected behaviours could occur
         * @param p The length of each slice or a predicate that tells if the list should be split by this value, which will be omitted
         * @param mode If truthy, every slice will be forced to have {@link n} elements by concatenating as many {@link def} as needed
         * @param lazy Indicates if the list should be lazy (and unsafe)
         * @param def The value to use if the list is too short
         */
        split(p, lazy, mode, def) {
            return new LazySplitList(this, p, lazy, mode, def);
        }
        /** Outputs an iterable that will contain the current one as its only element */
        wrap() {
            return new LazyWrapList(this);
        }
        /**
         * Returns a {@link LazySet} that contains the elements of the list.
         * The set is lazy, this means that the elements are not calculated until it is checked if they are present.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazySet} could cause unexpected behaviours (Some elements could not be present)
         */
        toSet() {
            return new LazySet(this);
        }
        /**
         * Returns a {@link LazyMap} that contains the elements of the list.
         * The map is lazy, this means that the elements are not calculated until it is checked if they are present or the key is requested.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyMap} could cause unexpected behaviours (Some elements could not be present)
         * @param getK The function that will be used to get the key of each element
         * @param getV The function that will be used to get the value of each element; If not provided the element itself will be used
         */
        toMap(getK, getV) {
            return new LazyMap(this, getK, getV);
        }
        /**
         * Caches the list's calculated elements, this prevent them from passing inside the pipeline again
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyCacheList} could cause unexpected behaviours (Some elements could not be present)
         */
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
        /** Replaces every element of the list with {@link value} */
        fill(value) {
            return new LazySelectList(this, () => value);
        }
        /**
         * Returns a section of the list, starting at {@link start} and with {@link length} elements
         * @param start The index to start at; Can be whatever you can pass as the first argument of {@link skip}
         * @param length The length of the section; Can be whatever you can pass as the first argument of {@link take}
         * @param mode If truthy and {@link length} is more than the list length, the output list will be forced to have length {@link length} by concatenating as many {@link def} as needed
         * @param leftOnNegative Usually, if {@link length} is negative, the last -{@link length} elements will be SKIPPED; If `true`, the last -{@link length} elements before {@link start} will be taken instead; Only works if both {@link start} and {@link length} are numbers
         */
        slice(start, length, mode, def, leftOnNegative) {
            if (typeof start === "number" && typeof length === "number" && length < 0 && leftOnNegative)
                start -= (length *= -1);
            return this.skip(start, true).take(length, mode, def, true);
        }
        //////////////////////////////////////////////////// AGGREGATE ////////////////////////////////////////////////////
        /**
         * Returns the element at the provided index
         * @param n The index; If negative it starts from the end
         * @param def The default value
         */
        at(n, def) {
            if (n < 0) {
                const temp = this.value;
                if (n < -temp.length)
                    return def;
                return temp[temp.length + n];
            }
            return this.skip(n).default(def).first;
        }
        /**
         * Throws a {@link RangeError} based on {@link mode}, generally if the list has not exactly `1` element
         * @param mode Tells the method when to throw errors
         * @param def The default value to return if the list has less than `1` elements and {@link mode} is {@link JoinMode.inner} or {@link JoinMode.left}
         */
        single(mode, def) {
            const iter = this.fixedCount(1, mode, def)[Symbol.iterator]();
            const out = iter.next().value; // Throws if no element
            iter.next(); // Throws if more than 1 element
            return out;
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
         * Returns `false` if there is an element that is not equal to the first.
         * If the list is empty, it returns `true`
         * @param f A comparison function
         */
        allEquals(f) {
            var i = 1, first;
            const iter = this[Symbol.iterator]();
            if (!({ value: first } = iter.next()).done)
                for (var value; !({ value } = iter.next()).done;)
                    if (f ? !f(value, first, i++, this) : value !== first)
                        return false;
            return true;
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
         * Tells if the element at the given index can be retrieved
         * @param n The index to check; If negative it starts from the end
         */
        inBound(n) {
            const temp = this.fastCount;
            return ~temp
                ? n < 0
                    ? (temp + n) >= 0
                    : n < temp
                : this.any((_, i) => i >= n);
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
         * Given multiple predicate functions it returns an array containing for each function the times it returned `true`
         * @param p The predicate functions
         * @returns An array with a function to convert it in a {@link LazyAbstractList} ({@link Laziable.prototype.lazy})
         */
        multiCount(...p) {
            var i = 0;
            const out = p.map(() => 0);
            for (const elm of this) {
                for (var k = 0; k < p.length; k++)
                    if (p[k](elm, i, this))
                        out[k]++;
                i++;
            }
            return Object.setPrototypeOf(out, Laziable.prototype);
        }
        /**
         * Joins the list elements using {@link sep} as the separator
         * @param sep The separator
         */
        concat(sep = ",") {
            return this.aggregate((a, b) => `${a}${sep}${b}`);
        }
        /**
         * Returns the smallest value in the list
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         */
        min(f) {
            return this.aggregate((a, b, i, list) => (f ? f(a, b, i, list) < 0 : a < b) ? a : b);
        }
        /**
         * Returns the biggest value in the list
         * @param f A sorting function (Return `1` if the first argument is greater than the second, `-1` if it is less, `0` if they are equal)
         */
        max(f) {
            return this.aggregate((a, b, i, list) => (f ? f(a, b, i, list) > 0 : a > b) ? a : b);
        }
        /**
         * Gets the first element of the list or {@link def} as default if it's empty.
         * Can be used as `next()` when the source iterable is a generator
         */
        get first() {
            return this[Symbol.iterator]().next().value;
        }
        /** Gets the last element of the list or `undefined` as default if it's empty */
        get last() {
            var out;
            for (const elm of this)
                out = elm;
            return out;
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
    /** Iterable that stores only a cached chunk of data at a time */
    class LazyBufferList extends LazyAbstractList {
        /**
         * Creates an iterable that stores only a chunk of data at the time and changes the loaded chunk when the index is out of range.
         * Can be freely accessed by index
         * @param f A function that generates a chunk of data starting from the given index
         * @param offset If an index is out of range, the loaded chunk will start this amount of elements before the index
         */
        constructor(f, offset = 0) {
            super();
            this.f = f;
            this.offset = offset;
            this.start = 0;
            this.buffer = [];
        }
        *[Symbol.iterator]() {
            for (var i = 0; this.inBound(i); i++)
                yield this.buffer[i - this.start];
        }
        at(n, def) {
            return this.inBound(n)
                ? this.buffer[n - this.start]
                : def;
        }
        /**
         * Tells if the element at the given index can be retrieved
         * @param n The index to check; If negative it starts from the end
         * @param read  If false, only the current buffer is checked
         */
        inBound(n, read = true) {
            if (n < 0)
                return super.inBound(n);
            const real = n - this.start;
            if (0 <= real && real < this.buffer.length)
                return true;
            if (!read)
                return false;
            this.start = Math.max(0, n - this.offset);
            this.buffer = this.f(this.start, this);
            return this.inBound(n, false);
        }
    }
    LazyList.LazyBufferList = LazyBufferList;
    /** Similiar to {@link LazyBufferList}, but allows the storage of the current position */
    class BufferIterator extends LazyBufferList {
        constructor() {
            super(...arguments);
            _BufferIterator_currentIndex.set(this, -1);
            _BufferIterator_current.set(this, void 0);
        }
        *[(_BufferIterator_currentIndex = new WeakMap(), _BufferIterator_current = new WeakMap(), Symbol.iterator)]() {
            for (this.next(); this.inBound(__classPrivateFieldGet(this, _BufferIterator_currentIndex, "f")); this.currentIndex++)
                yield __classPrivateFieldGet(this, _BufferIterator_current, "f");
        }
        /**
         * Clones the current iterator into another
         * @param target The iterator to clone into; If not provided, a new iterator will be created
         */
        clone(target) {
            const out = Object.assign(target ?? new BufferIterator(null), this); // `current` and `currentIndex` are not automatically cloned because they are accessors
            __classPrivateFieldSet(out, _BufferIterator_currentIndex, __classPrivateFieldGet(this, _BufferIterator_currentIndex, "f"), "f"); // The private fields are setted to avoid useless recalculations
            __classPrivateFieldSet(out, _BufferIterator_current, __classPrivateFieldGet(this, _BufferIterator_current, "f"), "f");
            return out;
        }
        /**
         * Reaches the {@link currentIndex} of {@link target}
         * @param target The iterator to reach
         * @returns The new current item
         */
        reach(target) {
            return this.move(target.currentIndex, true).current;
        }
        /**
         * Moves the current item by {@link n} steps
         * @param n The number of steps to move; If not provided, the iterator will move by `1`
         * @returns The new current item
         */
        next(n = 1) {
            this.currentIndex += n;
            return this.current;
        }
        /**
         * Moves the current item by {@link n} steps
         * @param n The number of steps to move; If not provided, the iterator will move by `-1`
         * @param absolute If true, the {@link currentIndex} will be set exactly to {@link n}
         * @returns The iterator itself
         */
        move(n = -1, absolute = false) {
            this.currentIndex = absolute ? n : this.currentIndex + n;
            return this;
        }
        /**
         * Returns the element at {@link n} steps from the current item
         * @param n The number of steps to move; If not provided, the iterator will move by `1`
         */
        peek(n = 1) {
            return this.clone().next(n);
        }
        /** Obtains the index of the current element of the iterator */
        get currentIndex() { return __classPrivateFieldGet(this, _BufferIterator_currentIndex, "f"); }
        set currentIndex(value) { __classPrivateFieldSet(this, _BufferIterator_current, (__classPrivateFieldSet(this, _BufferIterator_currentIndex, value, "f")) < 0 ? undefined : this.at(__classPrivateFieldGet(this, _BufferIterator_currentIndex, "f")), "f"); }
        /** Obtains the current element of the iterator */
        get current() { return __classPrivateFieldGet(this, _BufferIterator_current, "f"); }
        set current(value) { __classPrivateFieldSet(this, _BufferIterator_currentIndex, this.indexOf(__classPrivateFieldSet(this, _BufferIterator_current, value, "f")), "f"); }
    }
    LazyList.BufferIterator = BufferIterator;
    /** Output of {@link rand} */
    class LazyRandList extends LazyAbstractList {
        constructor(top, bottom) {
            super();
            this.top = top;
            this.bottom = bottom;
        }
        *[Symbol.iterator]() {
            while (true)
                yield this.top != null
                    ? this.bottom != null
                        ? Math.floor(Math.random() * (this.top - this.bottom + 1)) + this.bottom
                        : Math.floor(Math.random() * (this.top + 1))
                    : Math.random();
        }
        get fastCount() {
            return Infinity;
        }
    }
    LazyList.LazyRandList = LazyRandList;
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
        /** Obtains the calculated version of {@link source} */
        base() {
            return this.source == null
                ? []
                : typeof this.source === "string" || this.source instanceof String || this.source instanceof Array
                    ? this.source
                    : Array.from(this.source);
        }
        /**
         * Returns an iterable containing the elements of {@link source} and its length.
         * If computing the length is expensive, it will calculate {@link source}, so its returned to prevent computing it twice
         */
        calcLength() {
            const l = fastCount(this.source);
            if (~l)
                return [this.source, l];
            const temp = this.base();
            return [temp, temp.length];
        }
    }
    LazyList.LazySourceList = LazySourceList;
    /**
     * Output of {@link LazyList}.
     * Represents a list with the same number of elements as {@link source}.
     * It is used even by lists that need the {@link LazyFixedList.fastCount} of the {@link source} to calculate theirs
     */
    class LazyFixedList extends LazySourceList {
        get fastCount() {
            return fastCount(this.source);
        }
    }
    LazyList.LazyFixedList = LazyFixedList;
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
    /** Output of {@link selectWhere} */
    class LazySelectWhereList extends LazySourceList {
        constructor(source, f) {
            super(source);
            this.f = f;
        }
        *[Symbol.iterator]() {
            var i = 0;
            for (const value of this.source) {
                const box = { value, result: undefined };
                if (this.f(box, i++, this))
                    yield box.result;
            }
        }
    }
    LazyList.LazySelectWhereList = LazySelectWhereList;
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
    /** Output of {@link LazyAbstractList.traverse} */
    class LazyTraverseList extends LazySourceList {
        constructor(source, f, p, flip) {
            super(source);
            this.f = f;
            this.p = p;
            this.flip = flip;
        }
        static *traverse(source, f, p, flip = false, list) {
            var i = 0;
            if (source == null)
                return;
            for (const elm of source) {
                if (!p || p(elm, i, list)) {
                    if (!flip)
                        yield elm;
                    yield* LazyTraverseList.traverse(f(elm, i, list), f, p, flip, list);
                    if (flip)
                        yield elm;
                }
                i++;
            }
        }
        [Symbol.iterator]() {
            return LazyTraverseList.traverse(this.source, this.f, this.p, this.flip, this);
        }
    }
    LazyList.LazyTraverseList = LazyTraverseList;
    /** Output of {@link LazyAbstractList.flat} */
    class LazyFlatList extends LazySourceList {
        constructor(source) { super(source); }
        static *flat(source) {
            for (const elm of source)
                if (typeof elm[Symbol.iterator] === "function")
                    yield* LazyFlatList.flat(elm);
                else
                    yield elm;
        }
        [Symbol.iterator]() {
            return LazyFlatList.flat(this.source);
        }
    }
    LazyList.LazyFlatList = LazyFlatList;
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
    /** Output of {@link insert}, {@link prepend} and {@link append} */
    class LazyInsertList extends LazyFixedList {
        constructor(source, v, i) {
            super(source);
            this.v = v;
            this.i = i;
        }
        *[Symbol.iterator]() {
            if (this.i == null) {
                yield* this.source;
                return yield this.v;
            }
            const [list, l] = this.i < 0 ? this.calcLength() : [this.source, 0];
            const iter = list[Symbol.iterator]();
            const i = l + this.i;
            if (i >= 0) {
                yield* LazyTakeList.take(iter, i);
                if (iter.done)
                    return; // This is able to add in the end because the iterator doesn't know if it is done until it advances PAST the end
                yield this.v;
            }
            yield* toGenerator(iter);
        }
        get fastCount() {
            const temp = super.fastCount;
            return ~temp
                ? temp + +(this.i == null || (this.i < 0 ? temp + this.i >= 0 : this.i <= temp))
                : -1;
        }
    }
    LazyList.LazyInsertList = LazyInsertList;
    /** Output of {@link remove} */
    class LazyRemoveList extends LazySourceList {
        constructor(source, v, i = 1) {
            super(source);
            this.v = v;
            this.i = i;
        }
        *[Symbol.iterator]() {
            var { i } = this;
            for (const elm of this.source)
                if (elm !== this.v || --i < 0)
                    yield elm;
        }
    }
    LazyList.LazyRemoveList = LazyRemoveList;
    /** Output of {@link default} */
    class LazyDefaultList extends LazyFixedList {
        constructor(source, def) {
            super(source);
            this.def = def;
        }
        *[Symbol.iterator]() {
            var value;
            const iter = this.source[Symbol.iterator]();
            if (({ value } = iter.next()).done)
                return yield this.def;
            else
                yield value;
            yield* toGenerator(iter);
        }
        get fastCount() {
            return super.fastCount || 1;
        }
    }
    LazyList.LazyDefaultList = LazyDefaultList;
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
    /** Output of {@link shuffle} */
    class LazyShuffleList extends LazyFixedList {
        *[Symbol.iterator]() {
            const temp = this.base();
            while (temp.length)
                yield temp.splice(Math.floor(Math.random() * temp.length), 1)[0];
        }
    }
    LazyList.LazyShuffleList = LazyShuffleList;
    /** Output of {@link sort} and {@link orderBy} */
    class LazySortList extends LazyFixedList {
        constructor(source, f = LazySortList.defaultComparer, desc = false) {
            super(source);
            this.f = f;
            this.desc = desc;
        }
        *[Symbol.iterator]() {
            const map = new Map();
            for (const elm of this.root)
                map.set(elm, (map.get(elm) ?? 0) + 1);
            while (map.size) {
                var out, n = 0;
                for (const elm of map)
                    if (!n || this.compare(elm[0], out) < 0)
                        [out, n] = elm;
                for (var i = 0; i < n; i++)
                    yield out;
                map.delete(out);
            }
        }
        /** A sorting function that allows two sorts in a row to be combined */
        compare(a, b) {
            return this.multiplier * this.f(a, b, -1, this) || this.source instanceof LazySortList && this.source.compare(a, b);
        }
        /** Obtains the {@link source} of the first sort of the current chain */
        get root() {
            return this.source instanceof LazySortList ? this.source.root : this.source;
        }
        /** Gets the number to which the result of {@link f} should be multiplied to be inverted when {@link desc} is true */
        get multiplier() {
            return this.desc ? -1 : 1;
        }
    }
    LazySortList.defaultComparer = (a, b) => a < b ? -1 : a > b ? 1 : 0;
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
            yield* toGenerator(iter);
        }
    }
    LazyList.LazySpliceList = LazySpliceList;
    /** Output of {@link LazyAbstractList.fixedCount} */
    class LazyFixedCountList extends LazySourceList {
        constructor(source, n, mode = JoinMode.right, def) {
            super(source);
            this.n = n;
            this.mode = mode;
            this.def = def;
        }
        *[Symbol.iterator]() {
            var i = 0;
            const iter = this.source[Symbol.iterator]();
            for (const elm of LazyTakeList.take(iter, this.n))
                yield elm,
                    i++;
            if (i < this.n)
                if (this.mode === JoinMode.right || this.mode === JoinMode.outer)
                    throw new RangeError(`Fixed count list has less than ${this.n} element${this.n - 1 ? 's' : ''}`);
                else
                    while (i++ < this.n)
                        yield this.def;
            else if ((this.mode === JoinMode.right || this.mode === JoinMode.inner) && !iter.next().done)
                throw new RangeError(`Fixed count list has more than ${this.n} element${this.n - 1 ? 's' : ''}`);
        }
        get fastCount() {
            return this.n;
        }
    }
    LazyList.LazyFixedCountList = LazyFixedCountList;
    /** Output of {@link LazyAbstractList.rotate} */
    class LazyRotateList extends LazyFixedList {
        constructor(source, p) {
            super(source);
            this.p = p;
        }
        static *rotate(iter, n) {
            const temp = [...LazyTakeList.take(iter, n)];
            if (temp.length < n)
                return yield* LazyRotateList.rotate(temp[Symbol.iterator](), n % temp.length);
            yield* toGenerator(iter);
            yield* temp;
        }
        *[Symbol.iterator]() {
            if (typeof this.p === "number") {
                const [iter, l] = this.p < 0 ? this.calcLength() : [this.source, 0];
                return yield* LazyRotateList.rotate(iter[Symbol.iterator](), l + this.p);
            }
            var i = 0;
            const temp = [];
            const iter = this.source[Symbol.iterator]();
            for (var value; !({ value } = iter.next()).done;) // Fills the array until the predicate returns `false`
                if (this.p(value, i++, this))
                    temp.push(value);
                else
                    break;
            yield value; // Yields the element that returned `false`
            yield* toGenerator(iter); // Yields the rest of the elements
            yield* temp; // Yields the first elements
        }
    }
    LazyList.LazyRotateList = LazyRotateList;
    /** Output of {@link LazyAbstractList.skip} */
    class LazySkipList extends LazyFixedList {
        constructor(source, p, leftOnNegative) {
            super(source);
            this.p = p;
            this.leftOnNegative = leftOnNegative;
        }
        static *skip(iter, n) {
            for (var i = 0; i < n; i++)
                if (iter.done = iter.next().done)
                    return;
            yield* toGenerator(iter);
        }
        *[Symbol.iterator]() {
            if (typeof this.p === "number") {
                if (this.p < 0) {
                    const [iter, l] = this.calcLength();
                    return yield* (this.leftOnNegative ? LazySkipList.skip : LazyTakeList.take)(iter[Symbol.iterator](), l + this.p);
                }
                return yield* LazySkipList.skip(this.source[Symbol.iterator](), this.p);
            }
            var i = 0, done = false;
            for (const elm of this.source)
                if (done || (done = !this.p(elm, i++, this)))
                    yield elm;
        }
        get fastCount() {
            if (typeof this.p === "function")
                return -1;
            const temp = super.fastCount;
            return ~temp
                ? this.leftOnNegative && this.p < 0
                    ? Math.min(-this.p, temp)
                    : Math.max(0, temp - Math.abs(this.p))
                : -1;
        }
    }
    LazyList.LazySkipList = LazySkipList;
    /** Output of {@link LazyAbstractList.take} */
    class LazyTakeList extends LazyFixedList {
        constructor(source, p, mode = false, def, leftOnNegative) {
            super(source);
            this.p = p;
            this.mode = mode;
            this.def = def;
            this.leftOnNegative = leftOnNegative;
        }
        static *take(iter, n, mode = false, def) {
            for (var value, i = 0; i < n; i++) // If this were a foreach loop the first element after "n" would have been calculated too
                if (iter.done = ({ value } = iter.next()).done)
                    if (!mode)
                        break;
                    else
                        yield def;
                else
                    yield value;
        }
        static *takeWhile(iter, p, list) {
            var i = 0;
            for (var value; !(iter.done = ({ value } = iter.next()).done);)
                if (p(value, i++, list))
                    yield value;
                else
                    break;
        }
        *[Symbol.iterator]() {
            if (typeof this.p === "number") {
                if (this.p < 0) {
                    const [iter, l] = this.calcLength();
                    if (this.leftOnNegative)
                        return yield* LazyTakeList.take(iter[Symbol.iterator](), l + this.p, this.mode, this.def);
                    yield* LazySkipList.skip(iter[Symbol.iterator](), l + this.p);
                    if (this.mode)
                        for (var i = l; i < -this.p; i++)
                            yield this.def;
                }
                else
                    yield* LazyTakeList.take(this.source[Symbol.iterator](), this.p, this.mode, this.def);
            }
            else
                yield* LazyTakeList.takeWhile(this.source[Symbol.iterator](), this.p, this);
        }
        get fastCount() {
            if (typeof this.p === "function")
                return -1;
            const excludingFromEnd = this.leftOnNegative && this.p < 0;
            if (this.mode && !excludingFromEnd)
                return Math.abs(this.p);
            const temp = super.fastCount;
            return ~temp
                ? excludingFromEnd
                    ? Math.max(0, temp + this.p)
                    : Math.min(Math.abs(this.p), temp)
                : -1;
        }
    }
    LazyList.LazyTakeList = LazyTakeList;
    /** Output of {@link padStart} */
    class LazyPadStartList extends LazySourceList {
        constructor(source, n, def) {
            super(source);
            this.n = n;
            this.def = def;
        }
        *[Symbol.iterator]() {
            const [iter, l] = this.calcLength();
            for (var i = l; i < this.n; i++)
                yield this.def;
            yield* iter;
        }
    }
    LazyList.LazyPadStartList = LazyPadStartList;
    /** Output of {@link accumulate} */
    class LazyAccumulateList extends LazyFixedList {
        constructor(source, f, out, hasOut = arguments.length > 2) {
            super(source);
            this.f = f;
            this.out = out;
            this.hasOut = hasOut;
        }
        *[Symbol.iterator]() {
            var i = 0;
            var out;
            var value;
            const iter = this.source[Symbol.iterator]();
            if (!this.hasOut)
                if (!({ value } = iter.next()).done)
                    yield out = value,
                        i++;
                else
                    return;
            else
                out = this.out; // The initial value is not yielded if its from input
            for (; !({ value } = iter.next()).done; i++)
                yield out = this.f(out, value, i, this);
        }
    }
    LazyList.LazyAccumulateList = LazyAccumulateList;
    /** Output of {@link zip} */
    class LazyZipList extends LazyFixedList {
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
        get fastCount() {
            const source = super.fastCount;
            const other = fastCount(this.other);
            switch (this.mode) {
                case JoinMode.inner:
                    return ~source && ~other ? Math.min(source, other) : -1;
                case JoinMode.left:
                    return ~source ? source : -1;
                case JoinMode.right:
                    return ~other ? other : -1;
                case JoinMode.outer:
                    return ~source && ~other ? Math.max(source, other) : -1;
            }
        }
    }
    LazyList.LazyZipList = LazyZipList;
    /** Output of {@link join} */
    class LazyJoinList extends LazyFixedList {
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
                const aE = cacheA[i] ?? (cacheA[i] = { v: a });
                for (const bE of (i ? cacheB : new LazySelectList(this.other, (v, i) => cacheB[i] = { v }))) {
                    const temp = !this.p || this.p(a, bE.v, i, this);
                    aE.c || (aE.c = temp);
                    bE.c || (bE.c = temp);
                    if (temp)
                        yield this.f
                            ? this.f(a, bE.v, i, this)
                            : [a, bE.v];
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
        get fastCount() {
            if (this.p)
                return -1;
            const source = super.fastCount;
            if (!~source)
                return -1;
            const other = fastCount(this.other);
            return ~other
                ? source * other
                : -1;
        }
    }
    LazyList.LazyJoinList = LazyJoinList;
    /** Output of {@link LazyAbstractList.combinations} */
    class LazyCombinationsList extends LazyFixedList {
        constructor(source, depth = 2) {
            super(source);
            this.depth = depth;
        }
        static fact(n) {
            var out = 1;
            for (var i = 2; i <= n; i++)
                out *= i;
            return out;
        }
        static *combinations(inp, depth = 2, start = 0, stack = []) {
            if (depth) // If there is more length to add to the combination
             {
                const { length } = stack;
                for (var i = start; inp.inBound(i); i++) // For each element in the input
                    stack[length] = inp.at(i), // Add it to the stack
                        yield* this.combinations(inp, depth - 1, i + 1, stack); // Go to the next element of the combination
                stack.pop(); // Removes the element added by this level of recursion
            }
            else
                yield stack.slice(); // If there is no more length to add to the combination, yield A COPY of the combination
        }
        *[Symbol.iterator]() {
            yield* LazyCombinationsList.combinations(new LazyCacheList(this.source), this.depth);
        }
        get fastCount() {
            const temp = super.fastCount;
            return ~temp
                ? LazyCombinationsList.fact(temp) / (LazyCombinationsList.fact(temp - this.depth) * LazyCombinationsList.fact(this.depth))
                : -1;
        }
    }
    LazyList.LazyCombinationsList = LazyCombinationsList;
    /** Output of {@link LazyAbstractList.storeBy} */
    class LazyStore {
        constructor(source, f) {
            this.source = source;
            this.f = f;
            this.map = new Map();
            this.processed = 0;
            this.done = false;
            _LazyStore_iter.set(this, void 0);
        }
        /**
         * Returns the list of the elements with the given key.
         * WARNING: Having more than 1 active iterator at same time on the same {@link LazyStoreByList} could cause unexpected behaviours (Some elements could not be present)
         * @param k The key to search for
         */
        get(k) {
            var out = this.map.get(k);
            if (!out)
                this.map.set(k, out = new LazyStoreByList(k, this, this.f));
            return out;
        }
        /** The iterator to cache */
        get iter() {
            return __classPrivateFieldSet(this, _LazyStore_iter, __classPrivateFieldGet(this, _LazyStore_iter, "f") ?? this.source[Symbol.iterator](), "f");
        }
    }
    _LazyStore_iter = new WeakMap();
    LazyList.LazyStore = LazyStore;
    /** Output of {@link LazyStore.get} */
    class LazyStoreByList extends LazyAbstractList {
        constructor(key, store, f) {
            super();
            this.key = key;
            this.store = store;
            this.f = f;
            this.processed = 0;
            this.cached = [];
        }
        *[Symbol.iterator]() {
            // Pre-cached elements
            for (var i = 0; i < this.processed; i++)
                yield this.cached[i];
            // Elements added by other lists before that this starts
            yield* this.flush();
            // Elements added by this list
            for (var value; !({ value, done: this.store.done } = this.store.iter.next()).done;) {
                const k = this.f(value, this.store.processed++, this);
                if (k === this.key) {
                    yield this.cached[this.processed++] = value;
                    yield* this.flush(); // Flushes only in this case because the elements can be added by other lists only during yields
                }
                else
                    this.store.get(k).cached.push(value);
            }
        }
        /** Yields the elements that have been cached by other lists in {@link store} */
        *flush() {
            for (; this.processed < this.cached.length; this.processed++)
                yield this.cached[this.processed];
        }
    }
    LazyList.LazyStoreByList = LazyStoreByList;
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
        constructor(source, p, lazy = false, mode = false, def) {
            super(source);
            this.p = p;
            this.lazy = lazy;
            this.mode = mode;
            this.def = def;
        }
        *[Symbol.iterator]() {
            const numeric = typeof this.p === "number";
            const iter = this.source[Symbol.iterator]();
            const next = numeric
                ? () => LazyTakeList.take(iter, this.p, this.mode, this.def)
                : () => LazyTakeList.takeWhile(iter, (x, i) => !this.p(x, i, this));
            while (!iter.done) {
                const lazy = new LazyFixedList(next());
                if (!this.lazy) {
                    const temp = lazy.calc();
                    if (!numeric || temp.has()) // If the list is not lazy, it can be checked for emptyness
                        yield temp;
                }
                else
                    yield lazy;
            }
        }
    }
    LazyList.LazySplitList = LazySplitList;
    /** Output of {@link wrap} */
    class LazyWrapList extends LazySourceList {
        constructor(source) { super(source); }
        *[Symbol.iterator]() {
            yield this.source;
        }
        get fastCount() {
            return 1;
        }
    }
    LazyList.LazyWrapList = LazyWrapList;
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
        has(value) {
            if (!arguments.length)
                return this.done ? this.saved > 0 : super.has();
            return super.has(value);
        }
        /** Calculates the remaining elements one at a time */
        *calcRest() {
            for (var value; !({ value, done: this.done } = this.iter.next()).done;)
                yield this.save(value);
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
        save(value) {
            this.cached.add(value);
            return value;
        }
        /**
         * Adds a value to the set
         * @param value The value to add
         */
        add(value) {
            this.save(value);
            return this;
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
        save(value) {
            const k = this.getK(value, this.processed, this);
            const v = this.getV ? this.getV(value, this.processed, this) : value;
            this.cached.set(k, v);
            this.processed++;
            return [k, v];
        }
        /**
         * Gets if the map contains the given key
         * @param value The key to check
         */
        hasKey(value) {
            if (this.cached.has(value))
                return true;
            for (const [k] of this.calcRest())
                if (k === value)
                    return true;
            return false;
        }
        /**
         * Gets the value for the given key
         * @param key The key to get the value for
         * @param def The default value to return if the key is not found
         */
        get(key, def) {
            if (this.cached.has(key))
                return this.cached.get(key);
            for (const [k, v] of this.calcRest())
                if (k === key)
                    return v;
            return def;
        }
        /**
         * Adds a new key-value pair to the map
         * @param key The key to add
         * @param value The value to add
         */
        set(key, value) {
            this.cached.set(key, value);
            return this;
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
        at(n, def) {
            return n < 0
                ? this.done
                    ? this.at(this.saved + n, def)
                    : super.at(n, def)
                : n < this.saved
                    ? this.cached[n]
                    : this.done
                        ? def
                        : super.at(n, def);
        }
        inBound(n) {
            if (n < 0)
                return this.done
                    ? (this.saved + n) >= 0
                    : super.inBound(n);
            if (n < this.saved)
                return true;
            for (const _ of this.calcRest())
                if (n < this.saved)
                    return true;
            return false;
        }
        save(value) {
            this.cached.push(value);
            return value;
        }
        get last() {
            return this.done
                ? this.cached[this.cached.length - 1]
                : super.last;
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
    /** Array that can be converted to a {@link LazyAbstractList} with a convenient method ({@link lazy}) */
    class Laziable extends Array {
        /** Converts {@link this} into a {@link LazyAbstractList} */
        lazy() {
            return LazyList.from(this);
        }
    }
    LazyList.Laziable = Laziable;
})(LazyList || (LazyList = {}));
if (typeof module !== "object")
    var module = {};
module.exports = LazyList;
//# sourceMappingURL=main.js.map