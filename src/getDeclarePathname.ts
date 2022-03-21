import {AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";

export const getDeclarePathname = (prev: Array<string>, node?: TSESTree.Node): Array<string> => {
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
