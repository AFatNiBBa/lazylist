
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
- **`any`**: Returns `true` if the provided predicate returns `true` for at least one element of the list
- **`all`**: Returns `true` if the provided predicate returns `true` for every element of the list
- (getter) **`value`**: Calculates each element of the list and puts them inside of an `Array`
- (getter) **`count`**: Calculates the length of the list
- (getter) **`avg`**: Calculates the average of the elements of the list
- (getter) **`sum`**: Aggregates the list using the `+` operator (Can both add numbers and concatenate strings)
- (getter) **`max`**: Returns the biggest number in the list
- (getter) **`min`**: Returns the smallest number in the list

### **Lists**
Methods that generate other `LazyList`s
- (static) **`range`**: Creates a new list that will iterate through the specified boundaries (both the `begin` and `end` boundaries are included); The `count` operation will be calculated on this type of list 
- (static) **`from`**: Returns a new list that wraps the provided iterable object
- **`concat`**: Concat the current list to an iterable
- **`zip`**: Combines the current list to an iterable based on a provided function
- **`select`**: Converts the current list based on a provided function
- **`selectMany`**: Concat the (iterable) outputs of a provided function that will be applied to each element of the list
- **`where`**: Filters the current list based on a provided function
- **`skip`**: Skips the first `n` elements of the list
- **`take`**: Takes the first `n` elements of the list and skips the rest
- (non lazy) **`groupBy`**: Groups the current list's elements based on a provided function
- (non lazy) **`sort`**: Sorts the current list's elements based on a provided function
- (non lazy) **`reverse`**: Reverses the current list
- **`repeat`**: Repeat the current list's elements `n` times
- **`cache`**: Outputs a `LazyList` that will cache the calculated elements (To prevent them from passing inside the pipeline again)
- **`wrap`**: Outputs a `LazyList` that will contain the current one as its only element
- **`adjust`**: Utility function that specifies how two iterables of different lengths should be conbined
- (non lazy) **`calc`**: Calculates each element of the list and wraps them in another `LazyList`