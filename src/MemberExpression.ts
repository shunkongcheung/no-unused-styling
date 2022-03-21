import {AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { PATH_JOINNER, UsageMap } from "./constants";
import {getOriginatePathname} from "./getOriginatePathname";

export const MemberExpression = (mergeStyleSetsNames: Array<string>, styleVaNames:Array<string>, filename: string, node: TSESTree.MemberExpression, usageMap: UsageMap) => {
    if(node.object.type !== AST_NODE_TYPES.Identifier) return "";
    if(node.property.type !== AST_NODE_TYPES.Literal && node.property.type !== AST_NODE_TYPES.Identifier) return "";

    const identifierName = node.object.name;

    const [paths, isInSameScope] = getOriginatePathname(mergeStyleSetsNames, filename, identifierName, node);
    const originatePathname = paths.filter(itm => isInSameScope || !itm.isAssume).map(itm => itm.name).join(PATH_JOINNER);

    if(
        styleVaNames.length &&
        !styleVaNames.some(itm => identifierName.includes(itm)) &&
        !styleVaNames.some(itm => originatePathname.includes(itm))
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

    return originatePathname;
}
