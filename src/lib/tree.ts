
import { AbstractList, SourceList } from "./abstract";
import { Convert, Predicate } from "..";
import { TRUE } from "../util/util";

/** The type of {@link T} or the one of its elements if it has any */
type RootElement<T> = T extends Iterable<infer U> ? RootElement<U> : T;

/** Output of {@link AbstractList.flat} */
export class FlatList<T> extends SourceList<T, RootElement<T>> { [Symbol.iterator]() { return flat(this.source); } }

/** Output of {@link AbstractList.traverse} */
export class TraverseList<T> extends SourceList<T, T> {
    constructor (source: Iterable<T>, public f: Convert<T, Iterable<T>, TraverseList<T>>, public p: Predicate<T, TraverseList<T>> = TRUE, public flip = false) { super(source); }

    [Symbol.iterator]() { return traverse(this); }
}

/**
 * Recursive part of the flattening made by {@link FlatList}
 * @param source The list to flatten
 */
function *flat(source: Iterable<any>): Generator<any> {
    for (const elm of source as Iterable<any>)
        if (typeof elm[Symbol.iterator] === "function")
            yield* flat(elm);
        else
            yield elm;
}

/**
 * Recursive part of the traversing
 * @param source The list to traverse
 */
function *traverse<T>(list: TraverseList<T>, source = list.source): Generator<T> {
    var i = 0;
    for (const elm of source) {
        if (list.p(elm, i++, list)) {
            if (!list.flip) yield elm;
            yield* traverse(list, list.f(elm, i - 1, list));
            if (list.flip) yield elm;
        }
    }
}