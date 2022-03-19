/**
 * @fileoverview no unused styling from @fluentui mergeStyleSets
 * @author Shun
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-unused-styling"),
  RuleTester = require("eslint").RuleTester;

RuleTester.setDefaultConfig({
  parserOptions: {
    ecmaVersion: 6,
    ecmaFeatures: {
      jsx: true,
    },
  }
});


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester();
ruleTester.run("no-unused-styling", rule, {
  valid: [
    `const getClassNames = () => {
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
}`
  ],

  invalid: [
    {
      code: `const getClassNames = () => {
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
}`,
      errors: [{ message: "Fill me in.", type: "Me too" }],
    },
  ],
});
