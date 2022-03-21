import * as parser from "@typescript-eslint/parser";
import {AST_NODE_TYPES} from "@typescript-eslint/parser/node_modules/@typescript-eslint/types";
import { TSESTree, simpleTraverse } from "@typescript-eslint/typescript-estree";
import commandLineArgs from "command-line-args";
import fs from "fs";
import {CallExpression} from "./CallExpression";
import {DeclareMap, MessageId, PATH_JOINNER, UsageMap} from "./constants";
import {getBetterFilename} from "./getBetterFilename";
import {MemberExpression} from "./MemberExpression";
import {Review} from "./Review";


enum LogLevel {
    error = 0,
    warning,
    info,
    debug,
}

const LogStart  = {
    [LogLevel.debug]: "[DEBUG]",
    [LogLevel.error]: "[ERROR]",
    [LogLevel.info]: "[INFO]",
    [LogLevel.warning]: "[WARNING]",
}

const log = (msg: string, logLvl: LogLevel) => console.log(`${LogStart[logLvl]} ${(new Date()).toTimeString()} ${msg}`);


function getFiles (dir: string, files_: Array<string>){
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '\\' + files[i];
        if (fs.statSync(name).isDirectory()){
            getFiles(name, files_);
        } else {
            files_.push(name);
        }
    }
    return files_;
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


(function() {
    const options = commandLineArgs([
        { name: "src", alias: "s", type: String },
        { name: "variableNames", alias:"v", type: String, multiple: true, defaultValue: ["style","Style", "className", "ClassName"] },
        { name: "mergeStyleSetNames", alias:"m", type: String, multiple: true, defaultValue: ["mergeStyleSets"] },
        { name: "extensions", alias:"e", type: String, multiple: true, defaultValue: [".ts", "tsx"] },
        { name: "excludes", alias:"x", type: String, multiple: true, defaultValue: [".d.ts"] },
        { name: "logLevel", alias:"l", type: String, defaultValue: "info" },
    ])

    const { extensions, excludes, mergeStyleSetNames, src, variableNames } = options;
    const logLevel: LogLevel = Object.keys(LogLevel).includes(options.logLevel)? LogLevel[options.logLevel] as unknown as LogLevel : LogLevel.info;
    // const { extensions, excludes, mergeStyleSetNames,  variableNames } = options;
    // const src = "C:\\Users\\shcheung\\codes\\WPA1UX\\Client\\NovaClient\\Src\\Components\\Features\\Analysis\\AnalysisDocumentationCard"
    const fileNames = getFiles(src, []);

    const declareMap:DeclareMap = {};
    const usageMap: UsageMap = {};


    for(let _filename of fileNames) {
        if (!extensions.some((itm: string) => _filename.endsWith(itm))) {
            if(logLevel >= LogLevel.debug)
                log(`not included: ${_filename}`, LogLevel.debug);
            continue;
        }
        if (excludes.some((itm: string) => _filename.endsWith(itm))) {
            if(logLevel >= LogLevel.debug)
                log(`excluded: ${_filename}`, LogLevel.debug);
            continue;
        }


        let program = "";
        try{
            program = fs.readFileSync(_filename, 'utf8');
        }catch(err) {
            if(logLevel >= LogLevel.warning)
                log(`unreadable: ${_filename}`, LogLevel.warning);
            continue;
        }
        const filename = getBetterFilename(_filename);
        if(!filename) {
            if(logLevel >= LogLevel.warning)
                log(`unreadable: ${_filename}`, LogLevel.warning);
            continue;
        }

        try{
            parseProgram(program, filename, mergeStyleSetNames, variableNames, declareMap, usageMap)
            if(logLevel >= LogLevel.debug)
                log(`completed: ${_filename}`, LogLevel.debug);
        }catch (err) {
            if(logLevel >= LogLevel.error)
                log(`unable to process: ${_filename}`, LogLevel.error);
            throw(err);
        }
    }

    if(logLevel >= LogLevel.info){
        const result: Record<string, Array<string>> = {};

        Review("", declareMap, usageMap, (node: TSESTree.Node, messageId: MessageId, data) => {
            if(messageId !== MessageId.NotUsed) return;
            const { className, pathname } = data;
            const {loc} = node;
            const [filename, ...path] = pathname.split(PATH_JOINNER);
            const accessor = [...path, className].join('.');
            const position = `${loc.start.line}:${loc.start.column}`;
            const message = `${position}: ${accessor} not being used`;

            if(Array.isArray(result[filename])) result[filename].push(message); 
            else result[filename] = [message]; 
        });

        let counter = 0;
        Object.keys(result).sort().map(key => {
            log(`File: ${key}`, LogLevel.info);
            result[key].sort().map(message => console.log(`${(++counter).toString().padStart(3)}  ${message}`));
            console.log();
        })
    }
})();

