import { TSESTree } from "@typescript-eslint/typescript-estree";

export type DeclareMap = Record<string, Array<TSESTree.Identifier>>;


export enum LogLevel {
    none = 0,
    error,
    warning,
    info,
    debug,
}

export type Log = (msg: string, logLvl: LogLevel) => any;

export enum MessageId {
  DebugDiscover = "DebugDiscover",
  DebugUsage = "DebugUsage",
  NotUsed = "NotUsed"
}

export const PATH_JOINNER = "_";

export type UsageMap = Record<string, Array<string>>

export type Report = (node: TSESTree.Node, messageId: MessageId, data: { className: string, pathname: string, usedPaths: string }) => any;

