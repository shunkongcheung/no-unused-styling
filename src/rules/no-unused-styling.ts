import {ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import {CallExpression} from "../CallExpression";
import { PATH_JOINNER } from "../constants";
import {getBetterFilename} from "../getBetterFilename";
import {MemberExpression} from "../MemberExpression";

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
        const filename = getBetterFilename(context.getFilename());
        if(!filename) return;
        CallExpression(MERGE_STYLE_SET_NAMES, filename, node, declareMap);
      },
      MemberExpression(node) {
        const filename = getBetterFilename(context.getFilename());
        if(!filename) return;
        const originatePathname = MemberExpression(MERGE_STYLE_SET_NAMES, STYLE_VAR_NAMES, filename, node, usageMap);
        if(originatePathname && debugUsage) context.report({ node, messageId: MessageId.DebugUsage, data: { originatePathname } });
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
