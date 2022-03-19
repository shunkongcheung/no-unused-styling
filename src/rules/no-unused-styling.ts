import {CallExpressionArgument} from "@typescript-eslint/types/dist/generated/ast-spec";
import {AST_NODE_TYPES, ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const createEslintRule = ESLintUtils.RuleCreator(name => name);

enum MessageId {
functionFound = "functionFound"
}

const MERGE_STYLE_SET_NAME = "mergeStyleSets";

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

type NodeArg = Array<CallExpressionArgument> | TSESTree.ArrayExpression | TSESTree.ObjectExpression | CallExpressionArgument;

const getIsArrayArgument = (node: NodeArg): node is Array<CallExpressionArgument> => Array.isArray(node);

const getIsArrayExpression = (node: CallExpressionArgument): node is TSESTree.ArrayExpression =>
  node.type === AST_NODE_TYPES.ArrayExpression;

const getIsObjectExpression = (node: CallExpressionArgument): node is TSESTree.ObjectExpression =>
  node.type === AST_NODE_TYPES.ObjectExpression;

const getStyleNames = (nodeArg: NodeArg) :Array<string> => {

  let names:Array<string> = [];
  if(getIsArrayArgument(nodeArg)){
    return nodeArg.map(getStyleNames).reduce((acc, names) => [...acc, ...names], []);
  }
  if(getIsArrayExpression(nodeArg)) {
    return nodeArg.elements.map(getStyleNames).reduce((acc, names) => [...acc, ...names], []);
  }
  if(getIsObjectExpression(nodeArg)) {
    nodeArg.properties.map(property => {
      const key = (property as TSESTree.Property).key;
      const name = (key as TSESTree.Identifier).name;
      names.push(name);
    });
  }
  return names;
}

export default createEslintRule({
  name:'no-unused-styling',
  meta: {
    type: 'problem', // `problem`, `suggestion`, or `layout`
    docs: {
      description: "no unused styling from @fluentui mergeStyleSets",
      recommended: false,
    },
    fixable: 'code', // Or `code` or `whitespace`
    schema: [], // Add a schema if the rule has options
    messages: {
      [MessageId.functionFound]: "Error: function found {{varNames}}" 
    }
  },
  defaultOptions: [],

  create(context) {
    return {
      CallExpression (node: TSESTree.CallExpression) {
        const callee = node.callee as TSESTree.Identifier;
        if(callee.name === MERGE_STYLE_SET_NAME){
          const varNames = getStyleNames(node.arguments);
          context.report({ node, messageId: MessageId.functionFound, data: { varNames } });
        }
      }
    };
  },
});
