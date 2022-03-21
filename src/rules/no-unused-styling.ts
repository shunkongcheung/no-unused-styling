import {AST_NODE_TYPES, ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { PATH_JOINNER } from "../constants";
import {getBetterFilename} from "../getBetterFilename";
import {getClassNameIdentifiers} from "../getClassNameIdentifiers";
import {getDeclarePathname} from "../getDeclarePathname";
import {getOriginatePathname} from "../getOriginatePathname";

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
        const callee = node.callee as TSESTree.Identifier;
        if(MERGE_STYLE_SET_NAMES.includes(callee.name) ){
          const classNameIdentifiers = getClassNameIdentifiers(node.arguments);

          const filename = getBetterFilename(context.getFilename());
          if(!filename) return;

          try{
            const pathname = `${filename}${PATH_JOINNER}${getDeclarePathname([], node).join(PATH_JOINNER)}`;
            declareMap[pathname] = classNameIdentifiers;

          }catch {}
        }
      },

      MemberExpression(node) {
        if(node.object.type !== AST_NODE_TYPES.Identifier) return;
        if(node.property.type !== AST_NODE_TYPES.Literal && node.property.type !== AST_NODE_TYPES.Identifier) return;

        const identifierName = node.object.name;

        const filename = getBetterFilename(context.getFilename());
        if(!filename) return;

        const [paths, isInSameScope] = getOriginatePathname(MERGE_STYLE_SET_NAMES, filename, identifierName, node);
        const originatePathname = paths.filter(itm => isInSameScope || !itm.isAssume).map(itm => itm.name).join(PATH_JOINNER);

        if(
          STYLE_VAR_NAMES.length &&
          !STYLE_VAR_NAMES.some(itm => identifierName.includes(itm)) &&
        !STYLE_VAR_NAMES.some(itm => originatePathname.includes(itm))
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

        if(debugUsage) context.report({ node, messageId: MessageId.DebugUsage, data: { originatePathname } });
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
