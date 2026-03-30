/**
 * 平台解析工具集
 * 支持知乎、小红书、微信公众号等平台的内容提取
 */

export {
  parseZhihu,
  parseXiaohongshu,
  parseWechat,
  parsePlatformLink,
  ocrImage,
  processImage
} from './executors'

export {
  parseZhihuDef,
  parseXiaohongshuDef,
  parseWechatDef,
  parsePlatformLinkDef,
  ocrImageDef,
  processImageDef
} from './definitions'
