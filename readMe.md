
## Note to self about compilation
- There's a fair chance that **vite**'s enough stupid to bundle the classes in the wrong order, thus throwing when derived classes don't find their base one, sort them
- Type nesting may be too much for **TypeScript**, and it will give you an error at `recursiveTypeRelatedTo()`, run <kbd>Ctrl + P</kbd> and paste the error path, then wrap the line
  ```js
  result2 = structuredTypeRelatedTo(source2, target2, reportErrors2,   intersectionState);
  ```
  with a "try-ignore" as follows
  ```js
  try { result2 = structuredTypeRelatedTo(source2, target2,   reportErrors2, intersectionState); }
  catch { }
  ```