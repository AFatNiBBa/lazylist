
if (typeof Symbol.dispose !== "symbol")
    Object.defineProperty(Symbol, "dispose", { value: Symbol("Symbol.dispose"), enumerable: false, writable: false, configurable: false });

const proto: Iterator<unknown> = (<any>globalThis).Iterator.prototype ?? Object.getPrototypeOf(Object.getPrototypeOf(Array.prototype[Symbol.iterator]()));
proto[Symbol.dispose] ??= function(this: Iterator<unknown>) { this.return?.(); };

declare global {
    interface Iterator<T, TReturn> {
        [Symbol.dispose](): void;
    }
}

export { };