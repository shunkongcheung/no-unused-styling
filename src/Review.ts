import {ReportDescriptor} from "@typescript-eslint/utils/dist/ts-eslint";
import { DeclareMap, MessageId, PATH_JOINNER, UsageMap } from "./constants";

export const Review = (filename: string, declareMap: DeclareMap, usageMap: UsageMap, report: (des: ReportDescriptor<MessageId>) => any) => {
    Object.entries(declareMap).map(([pathname, nodes]) => {
        nodes.map(node => {
            if(!pathname.includes(filename)) return;

            const className = node.name;
            const fullpath = `${pathname}${PATH_JOINNER}${className}`;

            if(!usageMap[fullpath]) report({ node, messageId: MessageId.NotUsed, data: { className } })

            const usedPaths = [... new Set(usageMap[fullpath])];
            report({ node, messageId: MessageId.DebugDiscover, data: { pathname: fullpath, usedPaths } })
        });
    })
}
