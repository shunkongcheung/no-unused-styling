import {AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";

interface PathItem {
  isAssume: boolean;
  name: string;
}

export const getOriginatePathname = (
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

  if(node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
    const parent = node.parent;

    if(parent && parent.type === AST_NODE_TYPES.VariableDeclarator) {
      const varName = (parent.id as TSESTree.Identifier)?.name;
      const [paths, isInSameScope] = getOriginatePathname(MERGE_STYLE_SET_NAMES, pathname, name || varName, parent.parent)

      const result = paths[paths.length - 1].name === varName ? paths : [...paths].concat([{ name: varName, isAssume: true }]);
      return [result, isInSameScope];
    }
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
