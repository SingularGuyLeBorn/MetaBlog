/**
 * 飞书 Open API 工具模块
 * 直接调用飞书 REST API，无需 lark-cli
 */

export {
  feishuDocCreate,
  feishuDocRead,
  feishuDocSearch,
  feishuDocBlocks,
  feishuDocAppend,
  feishuDocUpdateBlock,
  feishuDocDeleteBlock,
  feishuDocInsertImage,
  feishuDocShare,
  feishuDocUnshare,
  feishuImSend,
  feishuUserSearch,
  feishuWikiSpaceCreate,
  feishuWikiSpaceList,
  feishuWikiSpaceGet,
  feishuWikiSpaceUpdate,
  feishuWikiSpaceDelete,
  feishuWikiNodeCreate,
  feishuWikiNodeList,
  feishuWikiNodeDelete,
} from './executors'

export {
  feishuDocCreateDef,
  feishuDocReadDef,
  feishuDocSearchDef,
  feishuDocBlocksDef,
  feishuDocAppendDef,
  feishuDocUpdateBlockDef,
  feishuDocDeleteBlockDef,
  feishuDocInsertImageDef,
  feishuDocShareDef,
  feishuDocUnshareDef,
  feishuImSendDef,
  feishuUserSearchDef,
  feishuWikiSpaceCreateDef,
  feishuWikiSpaceListDef,
  feishuWikiSpaceGetDef,
  feishuWikiSpaceUpdateDef,
  feishuWikiSpaceDeleteDef,
  feishuWikiNodeCreateDef,
  feishuWikiNodeListDef,
  feishuWikiNodeDeleteDef,
} from './definitions'
