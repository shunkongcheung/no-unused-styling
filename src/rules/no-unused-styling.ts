import {ESLintUtils, TSESTree} from "@typescript-eslint/utils";
import {MessageId, PATH_JOINNER, UsageMap} from "../constants";
import {getBetterFilename} from "../getBetterFilename";
import {getClassNameIdentifiers} from "../getClassNameIdentifiers";
import {getDeclarePathname} from "../getDeclarePathname";
import {getMaps} from "../getMaps";
import {MemberExpression} from "../MemberExpression";

const createEslintRule = ESLintUtils.RuleCreator(name => name);

const DefaultOptions = {
  debugDiscover: false,
  debugUsage: false,
  mergeStyleSetsNames: ["mergeStyleSets"],
  variableNames: ["style","Style", "className", "ClassName"],
}


const sharedStart =(array: Array<string>): string => {
  let A= array.concat().sort(); 
  let a1= A[0]; 
  let a2= A[A.length-1]; 
  let L= a1.length;
  let i= 0;

  while( i< L && a1.charAt(i) === a2.charAt(i)) i++;

  return a1.substring(0, i);
}

let isSet = false;
let usageMap: UsageMap = {};

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
      Program() {
        if(isSet) return;
        const parserServices = context.parserServices;
        if(!parserServices) return;
        const fileNames = parserServices.program.getRootFileNames().map(j => j);
        const srcDir = sharedStart(fileNames)

        const maps = getMaps(fileNames.map(j => j), srcDir, () => {}, MERGE_STYLE_SET_NAMES, STYLE_VAR_NAMES);
        usageMap = maps.usageMap;
        isSet = true;
      },
      CallExpression (node: TSESTree.CallExpression) {
        const parserServices = context.parserServices;
        if(!parserServices) return;
        const srcDir = parserServices.program.getCurrentDirectory();
        const filename = getBetterFilename(context.getFilename(), srcDir);
        if(!filename) return;

        const callee = node.callee as TSESTree.Identifier;
        if(!MERGE_STYLE_SET_NAMES.includes(callee.name)) return;
        const classNameIdentifiers = getClassNameIdentifiers(node.arguments);

        try{
          const declaredPathname = getDeclarePathname([], node).join(PATH_JOINNER);
          const pathname = `${filename}${PATH_JOINNER}${declaredPathname}`;

          classNameIdentifiers.map(identifier => {
            const className = identifier.name;
            const fullpath = `${pathname}${PATH_JOINNER}${className}`;
            if(!usageMap[fullpath]) context.report({ node: identifier, messageId: MessageId.NotUsed, data: { className, pathname }});
            if(debugDiscover) {
              const usedPaths = [... new Set(usageMap[fullpath])].join(",");
              context.report({ node: identifier, messageId: MessageId.DebugDiscover, data: { pathname: fullpath , usedPaths }});
            }
          })
        }catch {}
      },
      MemberExpression(node) {
        if(!debugUsage) return;

        const parserServices = context.parserServices;
        if(!parserServices) return;
        const srcDir = parserServices.program.getCurrentDirectory();
        const filename = getBetterFilename(context.getFilename(), srcDir);
        if(!filename) return;

        const originatePathname = MemberExpression(MERGE_STYLE_SET_NAMES, STYLE_VAR_NAMES, filename, node, {});
        if(originatePathname) context.report({ node, messageId: MessageId.DebugUsage, data: { originatePathname } });
      }
    }
  }
});
