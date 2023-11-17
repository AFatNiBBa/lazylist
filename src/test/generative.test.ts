
import linq from "..";
import { EmptyList } from "../lib/generative";
import { checkLength } from "../util";

test("empty", () => {
    const list = linq<number>();
    expect(list).toBeInstanceOf(EmptyList);
    checkLength(list, 0);
    expect(list.fastCount).toBe(0);
});

test("rand", () => {
    expect("serve il take").toBe(null);
});

test("range", () => {
    expect("serve il take").toBe(null);
});