# no unused styling from @fluentui mergeStyleSets (no-unused-styling)

## Rule Details

`eslintrc` configuration example:
```js
"no-unused-styling/no-unused-styling": [2, {
  debugDiscover: false, //  on declaration, all used locations are reported
  debugUsage: false, // on consume, the orignate declartion is reported
  mergeStyleSetsNames: ["mergeStyleSets"], // function name to detect, by default it is `@fluentui/react`'s `mergeStyleSetsNames`
  variableNames:  ["style","Style", "className", "ClassName"], // keywords in variable to filter. filtering for performance only. set to empty array to disable filtering
}]
```

Examples of **incorrect** code for this rule:

```js
const getClassNames = () => {
    return mergeStyleSets({
        style1: { color: "red" },
        style2: { color: "red" },
    });
}

const ComponentOne = () => {
    const style = getClassNames();
    return (
        <div className={style.style1}>
        </div>
    );
}
```

Examples of **correct** code for this rule:

```js
const getClassNames = () => {
    return mergeStyleSets({
        style1: { color: "red" }
    });
}

const ComponentOne = () => {
    const style = getClassNames();
    return (
        <div className={style.style1}>
        </div>
    );
}
```

## When Not To Use It
Recommend to set at `warn` level only. This rules detect unused style class names. When left unused, they would still cause no errors.

## Further Reading

watch [this](../../assets/02-discovery.gif) to see how `mergeStyleSets()` and it's classNames are discovered.

There are two main parts as to discover classNames. First, we have to discover any usage of `mergeStyleSets()`. 

According to the fluentui's [source code](https://github.com/microsoft/fluentui/blob/master/packages/merge-styles/src/mergeStyles.ts). `mergeStyleSets()` can be called with a few combination of arguments:
1. with an object: `mergeStyleSets({...})`
2. with an array: `mergeStyleSets([{...}])`
3. with up to four combination of the above: `mergeStyleSets({...}, [{...}, {...}], {...}, [{...}])`

One way to bypass all the hustle is to first look for the typescript definition of the result. But there is one huge assumption: type must be defined. Type might not be defined if 1) result is used directly without type needed, 2) codebase is not typescript at all.

To discover all arguments (with various type), recursion is used. First, node.arguments is always an array, no matter if the argument is scenario 1) one object, 2) one array, or 3) multple arguments with a combination of both. Therefore, our recursive function has to handle input Array.

Secondly, if argument is an array, it is denoted with .type === "ArrayExpression".
Finally, if argument is an object, it is denoted with .type === "ArrayExpression".

For the first two situations (Array, and .type === "ArrayExpression"), the function would recursively call itself, until the third situation is reached. Under which, the function would look for all properties, and the properties' name.

## Learn more

* a similar eslint rule for material-ui: [link](https://github.com/jens-ox/eslint-plugin-material-ui-unused-classes/blob/main/rule.js)
