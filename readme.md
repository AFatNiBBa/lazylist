
# lazylist.js
Data structures that compute their elements only when needed <br>
Even in the browser! Just add this to your HTML code...
```html
<script src="https://cdn.jsdelivr.net/npm/lazylist.js@latest"></script>
```
...or this to your JavaScript
```js
document.head.append(Object.assign(document.createElement("script"), { src: "https://cdn.jsdelivr.net/npm/lazylist.js@latest" }));
```

## Usage
You can both import the package like this...
```js
const from = require("lazylist.js");
```
...and like this
```js
const { from } = require("lazylist.js");
```
Simply pass an iterable object to the static method `from()` to create a `LazyList`.
```js
var i = 0;
const list = from([ 1, 2, 3 ]).select(x => (i++) + x);
for (const e of list)
    console.log(i, e); // Notice that since the elements of `list` are calculated only when needed, their side-effects on `i` are applied one at a time
```
> Note that if the iterable object is the result of a generator function you will be able to iterate over it only one time. <br>
Call the `cache()` method on the list to fix this issue.

## Methods
Each `LazyList` allows you to execute these methods. <br>
For the details look at the JSDocs.

### **Aggregate**
- **`at`**: Returns the element at the provided index
- **`single`**: Gets the first element of the current list if it has exactly `1` element, otherwise throws a `RangeError` according to the provided error mode
- **`aggregate`**: Aggregates the current list based on a provided function
- **`allEquals`**: Returns `true` if every element is equal to every other
- **`all`**: Returns `true` if the provided predicate returns `true` for every element of the list
- **`any`**: Returns `true` if the provided predicate returns `true` for at least one element of the list
- **`inBound`**: Returns `true` if the element at the given index can be retrieved
- **`has`**: Returns `true` if a value is in the list; If nothing is provided returns `true` if the list has at list one element
- **`indexOf`**: Returns the index of the provided value in the list if found, `-1` otherwise
- **`find`**: Returns the index of the first element of the current list for which the provided function returns `true` end the element itself; If nothing is found returns `[ -1, null ]`
- **`multiCount`**: Given multiple predicate functions it returns an array containing for each function the times it returned `true`
- **`concat`**: Joins the list elements using the given separator
- **`min`**: Returns the smallest number in the list based on a provided function
- **`max`**: Returns the biggest number in the list based on a provided function
- (getter) **`first`**: Gets the first element of the list
- (getter) **`last`**: Gets the last element of the list
- (getter) **`sum`**: Aggregates the list using the `+` operator (Can both add numbers and concatenate strings)
- (getter) **`avg`**: Calculates the average of the elements of the list
- (getter) **`count`**: Calculates the length of the list
- (getter) **`value`**: Calculates each element of the list and puts them inside of an `Array`
- (getter) **`fastCount`**: Returns the length of the current list if it is easy to compute, `-1` otherwise

### **Lists**
Classes without methods:
- **`LazyBufferList`**: Creates an iterable that stores only a chunk of data at the time and changes the loaded chunk when the index is out of range
- **`BufferIterator`**: Similiar to `LazyBufferList`, but allows the storage of the current position
- **`Laziable`**: Array that can be converted to a `LazyList` with a convenient method
Methods that generate other `LazyList`s:
- (static & hack) **`injectInto`**: Makes every instance of the provided class a `LazyList` and returns the module for chaining; If the class is not provided `Generator` will be used
- (static) **`fastCount`**: Returns the length of the provided arbitrary object if it is easy to compute, `-1` otherwise
- (static) **`toGenerator`**: Makes the provided iterator iterable
- (static) **`rand`**: Returns an INFINITE sequence of random numbers comprised between the provided boundaries
- (static) **`range`**: Creates a new list that will iterate through the specified boundaries
- (static) **`from`**: Returns a new `LazyFixedList` that wraps the provided iterable object, unless the object is a `LazyList` itself, in that case it gets returned directly
- **`distinct`**: Ensures every element of the current list shows up only once
- **`except`**: Ensures no element of the given iterable shows up in the current list
- **`where`**: Filters the list based on a provided function
- **`when`**: If a given predicate matches on an element, it gets converted by a convertion function, otherwise by an (eventual) other
- **`case`**: If a given predicate does NOT match on an element, it gets yielded, otherwise it gets passed into a function and it gets filtered out
- **`selectWhere`**: Converts and filters the list based on a provided function at the same time
- **`select`**: Converts the list based on a provided function
- **`selectMany`**: Concats the (iterable) outputs of a provided function that will be applied to each element of the list
- **`flat`**: Flattens in a single list every iterable element of the list, and the elements of the elements and so on
- **`merge`**: Concats the current list to an iterable
- **`append`**: Adds a value to the end of the current list
- **`prepend`**: Adds a value to the beginning of the current list
- **`default`**: Adds a value to the end of the current list if it is empty
- **`repeat`**: Repeat the list's elements `n` times
- (non lazy) **`reverse`**: Reverses the list
- (non lazy) **`shuffle`**: Shuffles the list in a randomic way
- (non lazy) **`sort`**: Sorts the list based on a provided comparer
- (non lazy) **`orderBy`**: Sorts the list based on a provided function and a comparer
- **`splice`**: Replaces a section of the list with a new one based on a provided function
- **`fixedCount`**: Throws a `RangeError` according to the provided error mode if the current list has not exactly `n` elements
- (non lazy?) **`rotate`**: Moves the first `n` elements to the end of the list (If `n` is negative, it rotates towards the end but is not lazy)
- (non lazy?) **`skip`**: Skips the first `n` elements of the list (If `n` is negative, it skips from the end but is not lazy)
- (non lazy?) **`take`**: Takes only the first `n` elements of the list (If `n` is negative, it takes from the end but is not lazy)
- (non lazy) **`padStart`**: Force the list to have at least `n` elements by concatenating as many default values (Provided by input) as needed at the beginning of the list
- **`accumulate`**: Aggregates the list based on a provided function but yields the intermediate results too
- **`zip`**: Combines the current list to an iterable based on a provided function
- **`join`**: Joins the current list to an iterable based on a provided function, where a condition is met.
- **`combinations`**: Generates all the possible combinations of the provided length of the elements of the list
- **`storeBy`**: Lazy version of `groupBy`, the groups cannot be iterated, only their element can
- (non lazy) **`groupBy`**: Groups the list's elements based on a provided function
- (non lazy | unsafe) **`split`**: Groups the list's elements, `n` at a time or splits it according to a predicate; Passing `true` as the `lazy` argument will make the list lazy but unsafe
- **`wrap`**: Outputs a `LazyList` that will contain the current one as its only element
- **`toSet`**: Returns a set that contains the elements of the current list
- **`toMap`**: Returns a map that contains the elements of the current list
- **`cache`**: Outputs a `LazyList` that will cache the calculated elements (To prevent them from passing inside the pipeline again)
- (non lazy) **`calc`**: Calculates each element of the list and wraps them in another `LazyList`
- (non lazy) **`await`**: Calculates and awaits each element of the list and wraps them in another `LazyList`
- **`then`**: Applies a "then" function to each element of the current list (whose elements should be promises)
- **`catch`**: Applies a "catch" function to each element of the current list (whose elements should be promises)
- **`ofType`**: Filters the list returning only the elements which are instances of the given constructor
- **`assign`**: Executes `Object.assign()` on each element passing the given object as the second parameter
- **`but`**: Executes `f` on each element of the list and returns the current element (Not the output of `f`)
- **`forEach`**: Executes `f` on each element of the list forcing it to be entirely calculated 
- **`fill`**: Replaces every element of the list with the provided value
- **`slice`**: Returns a section of the current list

## Generators as lazy lists
Executing this function, will make every generator have the `LazyList`'s methods
```js
require("lazylist.js").injectInto();
const a = [ 1, 2, 3 ][Symbol.iterator]().where(x => x < 3).select(x => x * 2);
console.log(a.value); //=> [ 2, 4 ]
console.log(a.value); //=> []
```
Remember that generators can be iterated only one time (That's the reason why `a.value` returned an empty list the second time). <br>
To fix this problem, just call the `cache()` method on the generator like so:
```js
require("lazylist.js").injectInto();
const a = [ 1, 2, 3 ][Symbol.iterator]().cache().where(x => x < 3).select(x => x * 2);
console.log(a.value); //=> [ 2, 4 ]
console.log(a.value); //=> [ 2, 4 ]
```
The `injectInto()` function can additionally be used to make ANYTHING extend from `LazyList`, you just need to pass the class as the argument like so:
```js
require("lazylist.js").injectInto(Array);
console.log([ 1, 2, 3 ].select(x => x + 1).value); //=> [ 2, 3, 4 ]
```
But be careful, the standard array methods will still have an highter precedence
```js
const {
    join,   // <Array>.join
    select  // <LazyAbstractList>.select
} = [ 1, 2, 3 ];
```
Additionally you can't solve that with the `from()` function, because now `Array` is already a `LazyList`, so it will not be wrapped it in one.
To solve that, you just need to pass `true` as the second argumet of `from()` to force the wrap
```js
console.log(LazyList.from([ 1, 2, 3 ]))       //=> [ 1, 2, 3 ]
console.log(LazyList.from([ 1, 2, 3 ], true)) //=> LazyFixedList { source: [ 1, 2, 3 ] }
```

## Buffered list
You can create a buffered list with the `LazyList.buffer()` method, here is an example of how to loop through each byte of a file, loading 1024 at a time
```js

/**
 * Returns a function that returns the first {@link length} bytes of the file pointed by {@link path} starting from the provided index
 * @param {String} path The path to the file
 * @param {number} length The length of each chunk
 */
function fromFile(path, length = 1024) {
    const fs = require("fs");
    const file = fs.openSync(path, "r"); // (Probably should be closed)
    const buffer = Buffer.alloc(length);
    return n => buffer.subarray(0, fs.readSync(file, buffer, 0, buffer.length, n));
}

const file = LazyList.buffer(fromFile(__filename)); // Loops the current file
for (const elm of file)
    console.log(elm);

```