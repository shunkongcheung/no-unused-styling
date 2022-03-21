import { TSESTree } from "@typescript-eslint/typescript-estree";

export type DeclareMap = Record<string, Array<TSESTree.Identifier>>;

export const PATH_JOINNER = "_";

export type UsageMap = Record<string, Array<string>>


