import {ESLintUtils, TSESTree } from "@typescript-eslint/utils";
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
        const fileNames = parserServices.program.getRootFileNames();
        const maps = getMaps(fileNames.map(j => j), () => {}, MERGE_STYLE_SET_NAMES, STYLE_VAR_NAMES);
        usageMap = maps.usageMap;

        isSet = true;
      },
      CallExpression (node: TSESTree.CallExpression) {
        const filename = getBetterFilename(context.getFilename());
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

        const filename = getBetterFilename(context.getFilename());
        if(!filename) return;

        const originatePathname = MemberExpression(MERGE_STYLE_SET_NAMES, STYLE_VAR_NAMES, filename, node, {});
        if(originatePathname) context.report({ node, messageId: MessageId.DebugUsage, data: { originatePathname } });
      }
    }
  }
});
