# no unused styling from @fluentui mergeStyleSets (no-unused-styling)

Please describe the origin of the rule here.

## Rule Details

This rule aims to...

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

### Options

If there are any options, describe them here. Otherwise, delete this section.

## When Not To Use It

Give a short description of when it would be appropriate to turn off this rule.

## Further Reading

If there are other links that describe the issue this rule addresses, please include them here in a bulleted list.
