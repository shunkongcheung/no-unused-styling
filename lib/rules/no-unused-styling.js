/**
 * @fileoverview no unused styling from @fluentui mergeStyleSets
 * @author Shun
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: null, // `problem`, `suggestion`, or `layout`
    docs: {
      description: "no unused styling from @fluentui mergeStyleSets",
      category: "Fill me in",
      recommended: false,
      url: null, // URL to the documentation page for this rule
    },
    fixable: null, // Or `code` or `whitespace`
    schema: [], // Add a schema if the rule has options
  },

  create(context) {
    // variables should be defined here
    const MERGE_STYLE_SET_NAME = "mergeStyleSets";

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    // any helper functions should go here or else delete this section


    /* 
     * scenario 1. mergeStyleSets({ ... });
     * 1. enter Array.isArray() as node.arguments is always an array
     * 2. arguments contain one element, that element being recursively called
     * 3. second call reaches type === "ObjectExpression", name is retrieves and return
     *
     * scenario 2. mergeStyleSets([{...}, {...}]);
     * 1. enter Array.isArray() as node.argument is an array
     * 2. argument contains one element, that element is being called.
     * 3. second call reaches type ==== "ArrayExpression", first object being recursively called
     * 4. first object reaches type === "ObjectExpression", name is retrieves and return
     * 5. function return to "ArrayExpression", second object being recursively called
     * 6. second object reaches type === "ObjectExpression", name is retrieves and return
     * 7. names are concated and return to Array.isArray(). names are returned
     *
     *
     * scenario 3. mergeStyleSets([{...}, {...}], {...});
     * 1. enter Array.isArray() as node.arguments is always an array
     * 2. first argument reaches sceanrio 2.
     * 3. second argument reaches sceanrio 1.
     * 4. names are concated.
     *
     * @param {import('estree').CallExpression["arguments"]} nodeArg 
     * @return {Array<string>}
     *
     */
    const getStyleNames = (nodeArg) => {

      let names = [];
      if(Array.isArray(nodeArg)){
        return names.concat(nodeArg.map(getStyleNames));
      }
      if(nodeArg.type === "ArrayExpression") {
        return names.concat(nodeArg.elements.map(getStyleNames));
      }
      if(nodeArg.type === "ObjectExpression") {
        nodeArg.properties.map(property => {
          names.push(property.key.name);
        });
      }
      return names;
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      // visitor functions for different types of nodes
      CallExpression (node) {
        if(node.callee.name === MERGE_STYLE_SET_NAME){
          const styleNames = getStyleNames(node.arguments);
          context.report({ node, message: `Error: function found ${styleNames}` });
        }
      }
    };
  },
};
