import { DeclareMap, MessageId, PATH_JOINNER, Report, UsageMap } from "./constants";

export const Review = (filename: string, declareMap: DeclareMap, usageMap: UsageMap, report: Report) => {
    Object.entries(declareMap).map(([pathname, nodes]) => {
        nodes.map(node => {
            if(filename && !pathname.includes(filename)) return;

            const className = node.name;
            const fullpath = `${pathname}${PATH_JOINNER}${className}`;

            if(!usageMap[fullpath]) report(node, MessageId.NotUsed, { className, pathname, usedPaths: "" } )

            const usedPaths = [... new Set(usageMap[fullpath])].join(",");
            report(node, MessageId.DebugDiscover, { pathname: fullpath, className: "" ,usedPaths })
        });
    })
}
