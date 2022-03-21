import {CallExpressionArgument} from "@typescript-eslint/types/dist/generated/ast-spec";
import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";

type NodeArg = Array<CallExpressionArgument> | TSESTree.ArrayExpression | TSESTree.ObjectExpression | CallExpressionArgument;

const getIsArrayArgument = (node: NodeArg): node is Array<CallExpressionArgument> => Array.isArray(node);

const getIsArrayExpression = (node: CallExpressionArgument): node is TSESTree.ArrayExpression =>
  node.type === AST_NODE_TYPES.ArrayExpression;

const getIsObjectExpression = (node: CallExpressionArgument): node is TSESTree.ObjectExpression =>
  node.type === AST_NODE_TYPES.ObjectExpression;

export const getClassNameIdentifiers = (nodeArg: NodeArg) :Array<TSESTree.Identifier> => {
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
   */

  let names:Array<TSESTree.Identifier> = [];
  if(getIsArrayArgument(nodeArg)){
    return nodeArg.map(getClassNameIdentifiers).reduce((acc, names) => [...acc, ...names], []);
  }
  if(getIsArrayExpression(nodeArg)) {
    return nodeArg.elements.map(getClassNameIdentifiers).reduce((acc, names) => [...acc, ...names], []);
  }
  if(getIsObjectExpression(nodeArg)) {
    nodeArg.properties.map(property => {
      const key = (property as TSESTree.Property).key;
      names.push(key as TSESTree.Identifier);
    });
  }
  return names;
}


