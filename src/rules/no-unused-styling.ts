import {CallExpressionArgument} from "@typescript-eslint/types/dist/generated/ast-spec";
import {AST_NODE_TYPES, ESLintUtils, TSESTree } from "@typescript-eslint/utils";
// import fs from "fs";

const createEslintRule = ESLintUtils.RuleCreator(name => name);

const DefaultOptions = {
    debugDiscover: false,
    debugUsage: false,
    mergeStyleSetsNames: ["mergeStyleSets"],
    variableNames: ["style","Style", "className", "ClassName"],
  }

enum MessageId {
  DebugDiscover = "DebugDiscover",
  DebugUsage = "DebugUsage",
  NotUsed = "NotUsed"
}

const PATH_JOINNER = "_";


interface PathItem {
  isAssume: boolean;
  name: string;
}

type NodeArg = Array<CallExpressionArgument> | TSESTree.ArrayExpression | TSESTree.ObjectExpression | CallExpressionArgument;

const getBetterFilename = (filename: string) =>  {
  if(filename.includes("Src")) filename = filename.replace(/\\/g, "/").split("Src/")[1]
  if(filename.includes("Test")) filename = filename.replace(/\\/g, "/").split("Tests/")[1]
  
  if(!filename) return "";

  return filename.replace(".tsx", "").replace(".ts", "")
}

const getIsArrayArgument = (node: NodeArg): node is Array<CallExpressionArgument> => Array.isArray(node);

const getIsArrayExpression = (node: CallExpressionArgument): node is TSESTree.ArrayExpression =>
  node.type === AST_NODE_TYPES.ArrayExpression;

const getIsObjectExpression = (node: CallExpressionArgument): node is TSESTree.ObjectExpression =>
  node.type === AST_NODE_TYPES.ObjectExpression;

const getClassNameIdentifiers = (nodeArg: NodeArg) :Array<TSESTree.Identifier> => {
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

const getDeclarePathname = (prev: Array<string>, node?: TSESTree.Node): Array<string> => {
  let ret = prev.map(itm => itm);

  if(!node) {
    return ret;
  }

  if(node.type === AST_NODE_TYPES.JSXElement)
    throw Error();

  if(node.type === AST_NODE_TYPES.VariableDeclarator || node.type === AST_NODE_TYPES.FunctionDeclaration) {
    let currName = (node.id as TSESTree.Identifier).name;
    if(currName) ret.unshift(currName);
  }

  if(node.type === AST_NODE_TYPES.BlockStatement) {
    const returnStatement = node.body.find(itm => itm.type === AST_NODE_TYPES.ReturnStatement) as TSESTree.ReturnStatement;

    if(returnStatement && returnStatement.argument?.type === AST_NODE_TYPES.Identifier && returnStatement.argument?.name === ret[0])
      // getClassNames
      ret = [];
      // ret = [ret[0]];
      // ret.unshift(`scoped-${ret[0]}`);
  }

  return getDeclarePathname(ret, node.parent); 
}

const getOriginatePathname = (
  MERGE_STYLE_SET_NAMES: Array<string>, 
  pathname: string, 
  name: string, 
  node?: TSESTree.Node
): [Array<PathItem>, boolean] => {

  // scenario 1: import from external file
  // scenario 2: in function mergeStyleSets
  // scenario 3: variable in same scope
  // scenario 4: function in same scope

  if(!node) {
    return [[{isAssume: false, name: pathname }], false];
  }

  if(node.type === AST_NODE_TYPES.VariableDeclarator || node.type === AST_NODE_TYPES.FunctionDeclaration) {
    const varName = (node.id as TSESTree.Identifier)?.name;
    const [paths, isInSameScope] = getOriginatePathname(MERGE_STYLE_SET_NAMES, pathname, name || varName, node.parent)

    const result = paths[paths.length - 1].name === varName ? paths : [...paths].concat([{ name: varName, isAssume: true }]);
    return [result, isInSameScope];
  }

  if(
    node.type !== AST_NODE_TYPES.BlockStatement &&
    node.type !== AST_NODE_TYPES.Program 
  )
  return getOriginatePathname(MERGE_STYLE_SET_NAMES, pathname, name, node.parent);


  const variableDecarations = node.body.filter(item => item.type === AST_NODE_TYPES.VariableDeclaration) as Array<TSESTree.VariableDeclaration>;
  for(let variableDecaration of variableDecarations){
    for( let variableDecarator of variableDecaration.declarations){
      if((variableDecarator.id as TSESTree.Identifier)?.name !== name) continue;
      if(variableDecarator.init?.type === AST_NODE_TYPES.CallExpression) {

        const calleeName = ((variableDecarator.init as TSESTree.CallExpression).callee as TSESTree.Identifier)?.name

        const isMergeStyleSet = MERGE_STYLE_SET_NAMES.includes(calleeName);
        let [prevOrigin, isInSameScope] = getOriginatePathname(MERGE_STYLE_SET_NAMES, pathname, isMergeStyleSet ? "" : calleeName, node.parent);

        const result = [...prevOrigin].concat([{ name: isMergeStyleSet? name : calleeName, isAssume: false }]);
        if(!isMergeStyleSet) isInSameScope = false;
          
        return [result, isInSameScope || (node.type === AST_NODE_TYPES.BlockStatement && isMergeStyleSet)];
      }
    }
  }

  const importDecarations = node.body.filter(item => item.type === AST_NODE_TYPES.ImportDeclaration) as Array<TSESTree.ImportDeclaration>;
  for(let importDecaration of importDecarations){
    for(let specifier of importDecaration.specifiers){
      let importName =  "";
      if(specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier) 
        importName = specifier.local.name
      if(specifier.type === AST_NODE_TYPES.ImportSpecifier) 
        importName = specifier.imported.name;
      if (importName === name) 
        return [[{ name: importDecaration.source.value, isAssume: false }], false];
    }
  }


  return getOriginatePathname(MERGE_STYLE_SET_NAMES, pathname, name, node.parent);
}


// const evalFiles:Array<string> = [];
const declareMap:Record<string, Array<TSESTree.Identifier>> = {};
const usageMap: Record<string, Array<string>> = {};

export default createEslintRule({
  name:'no-unused-styling',
  meta: {
    type: 'problem',
    docs: {
      description: "no unused styling from @fluentui mergeStyleSets",
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: "object",
        properties: {
          debugDiscover: {
            type: "boolean"
          },
          debugUsage: {
            type: "boolean"
          },
          mergeStyleSetsNames: {
            type: "array"
          },
          variableNames: {
            type: "array"
          }
        }
      }
    ],
    messages: {
      [MessageId.DebugDiscover]:  `Declare '{{pathname}}'. \nConsumed at: {{usedPaths}}`,
      [MessageId.DebugUsage]:     "Consume '{{originatePathname}}'",
      [MessageId.NotUsed]:        "{{className}} is not being used." 
    }
  },
  defaultOptions: [DefaultOptions],
  create(context) {

    const [firstOptions] = context.options;
    const debugDiscover = firstOptions?.debugDiscover ?? DefaultOptions.debugDiscover;
    const debugUsage = firstOptions?.debugUsage ?? DefaultOptions.debugUsage;
    const MERGE_STYLE_SET_NAMES = firstOptions?.mergeStyleSetsNames ?? DefaultOptions.mergeStyleSetsNames;
    const STYLE_VAR_NAMES  = firstOptions?.variableNames ?? DefaultOptions.variableNames; // performance only



    return {
      CallExpression (node: TSESTree.CallExpression) {
        const callee = node.callee as TSESTree.Identifier;
        if(MERGE_STYLE_SET_NAMES.includes(callee.name) ){
          const classNameIdentifiers = getClassNameIdentifiers(node.arguments);

          const filename = getBetterFilename(context.getFilename());
          if(!filename) return;

          try{
            const pathname = `${filename}${PATH_JOINNER}${getDeclarePathname([], node).join(PATH_JOINNER)}`;
            declareMap[pathname] = classNameIdentifiers;

          }catch {}
        }
      },
      MemberExpression(node) {
        if(node.object.type !== AST_NODE_TYPES.Identifier) return;
        if(node.property.type !== AST_NODE_TYPES.Literal && node.property.type !== AST_NODE_TYPES.Identifier) return;

        const identifierName = node.object.name;

        const filename = getBetterFilename(context.getFilename());
        if(!filename) return;

        const [paths, isInSameScope] = getOriginatePathname(MERGE_STYLE_SET_NAMES, filename, identifierName, node);
        const originatePathname = paths.filter(itm => isInSameScope || !itm.isAssume).map(itm => itm.name).join(PATH_JOINNER);

        if(
          STYLE_VAR_NAMES.length &&
          !STYLE_VAR_NAMES.some(itm => identifierName.includes(itm)) &&
        !STYLE_VAR_NAMES.some(itm => originatePathname.includes(itm))
        ) 
        return;

        let className = "";
        if(node.property.type === AST_NODE_TYPES.Literal)
          className = node.property.value as string;

        if(node.property.type === AST_NODE_TYPES.Identifier)
          className = node.property.name;

        const fullpath = `${originatePathname}${PATH_JOINNER}${className}`;

        if(Array.isArray(usageMap[fullpath])) usageMap[fullpath].push(filename);
        else usageMap[fullpath] = [filename];

        if(debugUsage) context.report({ node, messageId: MessageId.DebugUsage, data: { originatePathname } });
      },
      "Program:exit"() {
        const filename = getBetterFilename(context.getFilename());

        Object.entries(declareMap).map(([pathname, nodes]) => {
          nodes.map(node => {
            if(!pathname.includes(filename)) return;

            const className = node.name;
            const fullpath = `${pathname}${PATH_JOINNER}${className}`;

            if(!usageMap[fullpath]) context.report({ node, messageId: MessageId.NotUsed, data: { className } })
            if(debugDiscover) {
              const usedPaths = [... new Set(usageMap[fullpath])];
              context.report({ node, messageId: MessageId.DebugDiscover, data: { pathname: fullpath, usedPaths } })
            }
          });
        })
      }
    }
  }
});
