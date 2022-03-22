import {TSESTree} from "@typescript-eslint/utils";
import commandLineArgs from "command-line-args";
import fs from "fs";
import {MessageId, LogLevel, PATH_JOINNER} from "./constants";
import {getMaps} from "./getMaps";
import {Review} from "./Review";


const LogStart  = {
    [LogLevel.none]: "",
    [LogLevel.debug]: "[DEBUG]",
    [LogLevel.error]: "[ERROR]",
    [LogLevel.info]: "[INFO]",
    [LogLevel.warning]: "[WARNING]",
}


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


    const log = (msg: string, logLvl: LogLevel) => {
        if(logLvl > logLevel) return;
        console.log(`${LogStart[logLvl]} ${(new Date()).toTimeString()} ${msg}`);
    }

    const fileNames = getFiles(src, []).filter((_filename: string) => {
        if (!extensions.some((itm: string) => _filename.endsWith(itm))) {
            log(`not included: ${_filename}`, LogLevel.debug);
            return false
        }
        if (excludes.some((itm: string) => _filename.endsWith(itm))) {
            log(`excluded: ${_filename}`, LogLevel.debug);
            return false;
        }
        return true;
    });

    const { declareMap, usageMap } = getMaps(fileNames, src, log, mergeStyleSetNames, variableNames);

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
})();

