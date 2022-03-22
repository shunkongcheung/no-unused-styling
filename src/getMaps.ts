import {AST_NODE_TYPES} from "@typescript-eslint/parser/node_modules/@typescript-eslint/types";
import { TSESTree, simpleTraverse } from "@typescript-eslint/typescript-estree";
import * as parser from "@typescript-eslint/parser";
import fs from "fs";

import {DeclareMap, Log, LogLevel, UsageMap} from "./constants";
import {getBetterFilename} from "./getBetterFilename";
import {CallExpression} from "./CallExpression";
import {MemberExpression} from "./MemberExpression";

export const getMaps = (fileNames: Array<string>, log: Log, mergeStyleSetNames:Array<string>, variableNames: Array<string>) => {
    const declareMap:DeclareMap = {};
    const usageMap: UsageMap = {};


    for(let _filename of fileNames) {
        let program = "";
        try{
            program = fs.readFileSync(_filename, 'utf8');
        }catch(err) {
            log(`unreadable: ${_filename}`, LogLevel.warning);
            continue;
        }
        const filename = getBetterFilename(_filename);
        if(!filename) {
            log(`unreadable: ${_filename}`, LogLevel.warning);
            continue;
        }

        try{
            parseProgram(program, filename, mergeStyleSetNames, variableNames, declareMap, usageMap)
            log(`completed: ${_filename}`, LogLevel.debug);
        }catch (err) {
            log(`unable to process: ${_filename}`, LogLevel.error);
            throw(err);
        }
    }

    return { declareMap, usageMap };
}

const parseProgram = (program: string, filename: string, mergeStyleSetNames: Array<string>, varStyleNames: Array<string>, declareMap: DeclareMap, usageMap: UsageMap) => {
    const ast = parser.parse(program, { 
        range: true,
        loc: true,
        tokens: false,
        comment: false,
        useJSXTextNode: false,
        ecmaVersion: 6,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    });
    simpleTraverse(ast, {
        CallExpression(node: TSESTree.Node) {
            if(node.type !== AST_NODE_TYPES.CallExpression) {
                console.error("[ERROR] hey something went wrong call!")
                return;
            }
            CallExpression(mergeStyleSetNames, filename, node, declareMap);
        },
        MemberExpression(node: TSESTree.Node) {
            if(node.type !== AST_NODE_TYPES.MemberExpression) {
                console.error("[ERROR] hey something went wrong member!")
                return;
            }
            MemberExpression(mergeStyleSetNames, varStyleNames, filename, node, usageMap);
        }
    }, true);
}


