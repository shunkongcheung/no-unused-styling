import {CallExpressionArgument} from "@typescript-eslint/types/dist/generated/ast-spec";
import {AST_NODE_TYPES, ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const createEslintRule = ESLintUtils.RuleCreator(name => name);

enum MessageId {
  functionFound = "functionFound"
}

interface MapItem {
  node: TSESTree.Node;
  classNames: Array<string>;
}

const MERGE_STYLE_SET_NAME = "mergeStyleSets";


type NodeArg = Array<CallExpressionArgument> | TSESTree.ArrayExpression | TSESTree.ObjectExpression | CallExpressionArgument;

const getIsArrayArgument = (node: NodeArg): node is Array<CallExpressionArgument> => Array.isArray(node);

const getIsArrayExpression = (node: CallExpressionArgument): node is TSESTree.ArrayExpression =>
  node.type === AST_NODE_TYPES.ArrayExpression;

const getIsObjectExpression = (node: CallExpressionArgument): node is TSESTree.ObjectExpression =>
  node.type === AST_NODE_TYPES.ObjectExpression;

const getStyleNames = (nodeArg: NodeArg) :Array<string> => {
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

const getScopePathname = (ret: Array<string>, node?: TSESTree.Node): Array<string> => {
  if(!node) {
    return ret;
  }

  if(node.type === AST_NODE_TYPES.VariableDeclarator) {
    let currName = (node.id as TSESTree.Identifier).name;
    ret.unshift(currName);
  }

  if(node.type === AST_NODE_TYPES.BlockStatement) {
    const returnStatement = node.body.find(itm => itm.type === AST_NODE_TYPES.ReturnStatement) as TSESTree.ReturnStatement;

    if(
      !returnStatement 
    || returnStatement.argument?.type !== AST_NODE_TYPES.Identifier 
    || returnStatement.argument?.name !== ret[0]
    ) {
      // Component.styles
      ret = [ret[0]];
    } else {
      // getClassNames
      ret = [];
    }
  }

  return getScopePathname(ret, node.parent); 
}


export default createEslintRule({
  name:'no-unused-styling',
  meta: {
    type: 'problem',
    docs: {
      description: "no unused styling from @fluentui mergeStyleSets",
      recommended: false,
    },
    fixable: 'code',
    schema: [],
    messages: {
      [MessageId.functionFound]: "Error: function found {{classNames}}" 
    }
  },
  defaultOptions: [],
  create(context) {
    const map:Record<string, MapItem> = {};

    return {
      CallExpression (node: TSESTree.CallExpression) {
        const callee = node.callee as TSESTree.Identifier;
        if(callee.name === MERGE_STYLE_SET_NAME){
          const classNames = getStyleNames(node.arguments);

          const filename = context.getFilename().replace(/\\/g, "/").split("Src/")[1];
          const pathname = `${filename}.${getScopePathname([], node)}`;

          map[pathname] = { classNames, node };

          context.report({ node, messageId: MessageId.functionFound, data: { classNames: [pathname].concat(classNames) } });
        }
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const scope = context.getScope();
        // const srcFilename = node.source.value; // useful to track where it comes from
        //
        const variableName = "getClassNames";

        node.specifiers.forEach(specifier => {
          const importName = specifier.local.name;

          if(importName === variableName){
            const variable = scope.variables.find(variable => variable.name === variableName)!;
            const definition = variable.defs[0].node;

            // let varNames = maps.find(itm => itm === definition)
            const classNames = definition.type;

            context.report({ node, messageId: MessageId.functionFound, data: { classNames } });

          }

        });
      },
    };
  },
});
