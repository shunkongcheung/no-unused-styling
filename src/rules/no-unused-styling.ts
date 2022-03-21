import {ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import {ReportDescriptor} from "@typescript-eslint/utils/dist/ts-eslint";
import {CallExpression} from "../CallExpression";
import {MessageId} from "../constants";
import {getBetterFilename} from "../getBetterFilename";
import {MemberExpression} from "../MemberExpression";
import {Review} from "../Review";

const createEslintRule = ESLintUtils.RuleCreator(name => name);

const DefaultOptions = {
    debugDiscover: false,
    debugUsage: false,
    mergeStyleSetsNames: ["mergeStyleSets"],
    variableNames: ["style","Style", "className", "ClassName"],
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
        if(!filename) return;

        const report = (des: ReportDescriptor<MessageId>) => {
          if(des.messageId === MessageId.DebugDiscover) {
             if(debugDiscover) context.report(des)
            }
          else context.report(des);
        }
        Review(filename, declareMap, usageMap, report);
      }
    }
  }
});
