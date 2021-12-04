
# lazylist.js
Data structures that compute their elements only when needed <br>
Even in the browser! Just add this to your HTML code...
```html
<script src="https://cdn.jsdelivr.net/gh/AFatNiBBa/lazylist@latest/bin/main.js"></script>
```
...or this to your JavaScript
```js
document.head.append(Object.assign(document.createElement("script"), { src: "https://cdn.jsdelivr.net/gh/AFatNiBBa/lazylist@latest/bin/main.js" }));
```

## Usage
You can both import the package like this...
```js
const LazyList = require("lazylist.js");
```
...and like this
```js
const { LazyList } = require("lazylist.js");
```
Simply pass an iterable object to the static method `LazyList.from()` to create a `LazyList`.
> Note that if the iterable object is the result of a generator function you will be able to iterate over it only one time
```js
var i = 0;
const list = LazyList.from([ 1, 2, 3 ]).select(x => (i++) + x);
for (const e of list)
    console.log(i, e); // Notice that since the elements of `list` are calculated only when needed, their side-effects on `i` are applied one at a time
```

## Methods
Each `LazyList` allows you to execute these methods. <br>
For the details look at the JSDocs.

- **`aggregate`**: Aggregates the current list based on a provided function
- **`at`**: Returns the element at the provided index
- **`first`**: Gets the first element of the list or the provided value as default if it's empty
- **`last`**: Gets the last element of the list or the provided value as default if it's empty
- **`all`**: Returns `true` if the provided predicate returns `true` for every element of the list
- **`any`**: Returns `true` if the provided predicate returns `true` for at least one element of the list
- **`has`**: Returns `true` if a value is in the list
- (getter) **`value`**: Calculates each element of the list and puts them inside of an `Array`
- (getter) **`count`**: Calculates the length of the list
- (getter) **`avg`**: Calculates the average of the elements of the list
- (getter) **`sum`**: Aggregates the list using the `+` operator (Can both add numbers and concatenate strings)
- (getter) **`max`**: Returns the biggest number in the list
- (getter) **`min`**: Returns the smallest number in the list

### **Lists**
Methods that generate other `LazyList`s
- (static & hack) **`attachIterator`**: Makes every `Generator` a `LazyList` and returns the module for chaining
- (static) **`range`**: Creates a new list that will iterate through the specified boundaries (both the `begin` and `end` boundaries are included); The `count` operation will be calculated on this type of list 
- (static) **`from`**: Returns a new `LazyDataList` that wraps the provided iterable object, unless the object is a `LazyList` itself, in that case it gets returned directly
- **`concat`**: Concat the current list to an iterable
- **`zip`**: Combines the current list to an iterable based on a provided function
- **`join`**: Joins the current list to an iterable based on a provided function, where a condition is met.
- **`select`**: Converts the list based on a provided function
- **`selectMany`**: Concat the (iterable) outputs of a provided function that will be applied to each element of the list
- **`where`**: Filters the list based on a provided function
- **`skip`**: Skips the first `n` elements of the list
- **`take`**: Takes the first `n` elements of the list and skips the rest
- (non lazy | unsafe) **`slice`**: Groups the list's elements, `n` at a time; Passing `true` as the `lazy` argument will make the list lazy but unsafe
- (non lazy) **`groupBy`**: Groups the list's elements based on a provided function
- (non lazy) **`sort`**: Sorts the list based on a provided function
- (non lazy) **`reverse`**: Reverses the list
- **`repeat`**: Repeat the list's elements `n` times
- **`cache`**: Outputs a `LazyList` that will cache the calculated elements (To prevent them from passing inside the pipeline again)
- **`wrap`**: Outputs a `LazyList` that will contain the current one as its only element
- **`adjust`**: Utility function that specifies how two iterables of different lengths should be conbined
- **`but`**: Executes `f` on each element of the list and returns the current element (not the output of `f`)
- (non lazy) **`calc`**: Calculates each element of the list and wraps them in another `LazyList`
- (non lazy) **`await`**: Calculates and awaits each element of the list and wraps them in another `LazyList`