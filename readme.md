
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

- **`at`**: Returns the element at the provided index
- **`last`**: Gets the last element of the list or the provided value as default if it's empty
- **`first`**: Gets the first element of the list or the provided value as default if it's empty
- **`single`**: Gets the first element of the current list if it has exactly `1` element, otherwise the provided value as default, unless none is passed, in that case it throws a `RangeError`
- **`aggregate`**: Aggregates the current list based on a provided function
- **`all`**: Returns `true` if the provided predicate returns `true` for every element of the list
- **`any`**: Returns `true` if the provided predicate returns `true` for at least one element of the list
- **`has`**: Returns `true` if a value is in the list; If nothing is provided returns `true` if the list has at list one element
- **`indexOf`**: Returns the index of the provided value in the list if found, `-1` otherwise
- **`find`**: Returns the index of the first element of the current list for which the provided function returns `true` end the element itself; If nothing is found returns `[ -1, null ]`
- **`concat`**: Joins the list elements using the given separator
- (getter) **`sum`**: Aggregates the list using the `+` operator (Can both add numbers and concatenate strings)
- (getter) **`avg`**: Calculates the average of the elements of the list
- (getter) **`count`**: Calculates the length of the list
- (getter) **`max`**: Returns the biggest number in the list
- (getter) **`min`**: Returns the smallest number in the list
- (getter) **`value`**: Calculates each element of the list and puts them inside of an `Array`
- (getter) **`fastCount`**: Returns the length of the current list if it is easy to compute, `-1` otherwise

### **Lists**
Methods that generate other `LazyList`s
- (static & hack) **`attachIterator`**: Makes every `Generator` a `LazyList` and returns the module for chaining
- (static) **`fastCount`**: Returns the length of the provided arbitrary object if it is easy to compute, `-1` otherwise
- (static) **`range`**: Creates a new list that will iterate through the specified boundaries
- (static) **`from`**: Returns a new `LazyFixedList` that wraps the provided iterable object, unless the object is a `LazyList` itself, in that case it gets returned directly
- **`distinct`**: Ensures every element of the current list shows up only once
- **`except`**: Ensures no element of the given iterable shows up in the current list
- **`where`**: Filters the list based on a provided function
- **`when`**: If a given predicate matches on an element, it gets converted by a convertion function, otherwise by an (eventual) other
- **`select`**: Converts the list based on a provided function
- **`selectMany`**: Concats the (iterable) outputs of a provided function that will be applied to each element of the list
- **`merge`**: Concats the current list to an iterable
- **`append`**: Adds a value to the end of the current list
- **`prepend`**: Adds a value to the beginning of the current list
- **`defaultIfEmpty`**: Adds a value to the end of the current list if it is empty
- **`repeat`**: Repeat the list's elements `n` times
- (non lazy) **`reverse`**: Reverses the list
- (non lazy) **`sort`**: Sorts the list based on a provided function
- **`splice`**: Replaces a section of the list with a new one based on a provided function
**`fixedCount`**: Throws a `RangeError` if the current list has not exactly `n` elements
- (non lazy?) **`skip`**: Skips the first `n` elements of the list (If `n` is negative, it skips from the end but is not lazy)
- (non lazy?) **`take`**: Takes only the first `n` elements of the list (If `n` is negative, it takes from the end but is not lazy)
- **`zip`**: Combines the current list to an iterable based on a provided function
- **`join`**: Joins the current list to an iterable based on a provided function, where a condition is met.
- (non lazy) **`groupBy`**: Groups the list's elements based on a provided function
- (non lazy | unsafe) **`split`**: Groups the list's elements, `n` at a time; Passing `true` as the `lazy` argument will make the list lazy but unsafe
- **`toSet`**: Returns a set that contains the elements of the current list
- **`toMap`**: Returns a map that contains the elements of the current list
- **`cache`**: Outputs a `LazyList` that will cache the calculated elements (To prevent them from passing inside the pipeline again)
- (non lazy) **`calc`**: Calculates each element of the list and wraps them in another `LazyList`
- (non lazy) **`await`**: Calculates and awaits each element of the list and wraps them in another `LazyList`
- **`then`**: Applies a "then" function to each element of the current list (whose elements should be promises)
- **`catch`**: Applies a "catch" function to each element of the current list (whose elements should be promises)
- **`wrap`**: Outputs a `LazyList` that will contain the current one as its only element
- **`ofType`**: Filters the list returning only the elements which are instances of the given constructor
- **`but`**: Executes `f` on each element of the list and returns the current element (not the output of `f`)
- **`assign`**: Executes `Object.assign()` on each element passing the given object as the second parameter
- **`slice`**: Returns a section of the current list

## Generators as lazy lists
Executing this method, will make every generator have the `LazyList`'s methods
```js
require("lazylist.js").attachIterator();
const a = [ 1, 2, 3 ][Symbol.iterator]().where(x => x < 3).select(x => x * 2);
console.log(a.value); //=> [ 2, 4 ]
console.log(a.value); //=> []
```
Remember that generators can be iterated only one time (That's the reason why `a.value` returned an empty list the second time). <br>
To fix this problem, just call the `cache()` method on the generator like so:
```js
require("lazylist.js").attachIterator();
const a = [ 1, 2, 3 ][Symbol.iterator]().cache().where(x => x < 3).select(x => x * 2);
console.log(a.value); //=> [ 2, 4 ]
console.log(a.value); //=> [ 2, 4 ]
```