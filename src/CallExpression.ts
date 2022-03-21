import { TSESTree } from "@typescript-eslint/typescript-estree";
import { DeclareMap, PATH_JOINNER } from "./constants";
import {getClassNameIdentifiers} from "./getClassNameIdentifiers";
import {getDeclarePathname} from "./getDeclarePathname";

export const CallExpression = (mergeStyleSetNames: Array<string>, filename: string, node: TSESTree.CallExpression, declareMap: DeclareMap)  => {
    const callee = node.callee as TSESTree.Identifier;
    if(mergeStyleSetNames.includes(callee.name)){
        const classNameIdentifiers = getClassNameIdentifiers(node.arguments);

        try{
            const pathname = `${filename}${PATH_JOINNER}${getDeclarePathname([], node).join(PATH_JOINNER)}`;
            declareMap[pathname] = classNameIdentifiers;
        }catch {}
    }
}

