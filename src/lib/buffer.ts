
import { AbstractList } from "./abstract";

/** Iterable that stores only a cached chunk of data at a time */
export class BufferList<T> extends AbstractList<T> {
    buffer: ArrayLike<T> = [];
    start = 0;

    /**
     * Creates an iterable that stores only a chunk of data at the time and changes the loaded chunk when the index is out of range.
     * Can be freely accessed by index
     * @param f A function that generates a chunk of data starting from the given index
     * @param offset If an index is out of range, the loaded chunk will start this amount of elements before the index
     */
    constructor(public f: (i: number, list: BufferList<T>) => ArrayLike<T>, public offset = 0) { super(); }

    *[Symbol.iterator]() {
        for (var i = 0; this.inBound(i); i++)
            yield this.buffer[i - this.start];
    }

    /**
     * -
     * Allows you to access elements in the current buffer at O(1)
     * @inheritdoc
     */
    at<O = undefined>(i: number, def?: O) {
        if (i < 0) return super.at(i, def);
        if (this.inBound(i)) return this.buffer[i - this.start];
        return def!;
    }

    /**
     * @param read If it is `true`, it changes the current buffer if {@link i} is out of bounds
     * @inheritdoc
     */
    inBound(i: number, read = true): boolean {
        if (i < 0) return super.inBound(i);
        const real = i - this.start;
        if (0 <= real && real < this.buffer.length) return true;
        if (!read) return false;

        this.start = Math.max(0, i - this.offset);
        this.buffer = this.f(this.start, this);
        return this.inBound(i, false);
    }

    /**
     * Creates a buffer from a simple list
     * @param list The list from which to create a buffer
     */
    static from<T, Ctor extends typeof BufferList<T>>(this: Ctor, list: ArrayLike<T>): InstanceType<Ctor> {
        return <any>new this((_, self) => {
            self.start = self.offset = 0;
            return list;
        });
    }
}

/** Similiar to {@link BufferList}, but allows the storage of the current position */
export class BufferIterator<T> extends BufferList<T> {
    *[Symbol.iterator]() {
        for (this.next(); this.inBound(this.currentIndex); this.currentIndex++)
            yield this.current!;
    }

    /**
     * Clones the current iterator into another
     * @param target The iterator to clone into; If not provided, a new iterator will be created
     */
    clone(target?: BufferIterator<T>) {
        const out = Object.assign(target ?? new BufferIterator<T>(null!), this);    // The `current` and `currentIndex` properties are not automatically cloned because they are not enumerable
        out.#currentIndex = this.#currentIndex;                                     // The private fields are setted to avoid useless recalculations
        out.#current = this.#current;
        return out;
    }

    /**
     * Moves the current item by {@link i} steps
     * @param i The number of steps to move; If not provided, the iterator will move by `-1`
     * @param absolute If `true`, the {@link currentIndex} will be set exactly to {@link i}
     * @returns The iterator itself
     */
    move(i = -1, absolute = false) {
        this.currentIndex = absolute ? i : this.currentIndex + i;
        return this;
    }

    /**
     * Moves the current item by {@link i} steps
     * @param i The number of steps to move; If not provided, the iterator will move by `1`
     * @returns The new current item
     */
    next(i = 1) {
        this.currentIndex += i;
        return this.current;
    }
    
    /**
     * Reaches the {@link currentIndex} of {@link target}
     * @param target The iterator to reach
     * @returns The new current item
     */
    reach(target: BufferIterator<T>) { return this.move(target.currentIndex, true).current; }

    /**
     * Returns the element at {@link i} steps from the current item
     * @param i The number of steps to move; If not provided, the iterator will move by `1`
     */
    peek(i = 1) { return this.clone().next(i); }

    /** Obtains the index of the current element of the iterator */
    get currentIndex() { return this.#currentIndex; }
    set currentIndex(v) { this.#current = (this.#currentIndex = v) < 0 ? undefined : this.at(this.#currentIndex); }
    #currentIndex = -1;

    /** Obtains the current element of the iterator */
    get current() { return this.#current; }
    set current(v) { this.#currentIndex = this.indexOf(this.#current = v!); }
    #current: T | undefined;    
}