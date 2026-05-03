/**
 * ============================================================================
 * 平台解析工具集统一导出
 * ============================================================================
 *
 * 包含通用文章读取(readArticle)和 OCR 图片识别(ocrImage). 
 * 所有社交平台(知乎、小红书、微信等)统一通过 readArticle 读取. 
 *
 * @module src/theme/tools/platform
 */

export {
  ocrImage, ocrImageDef, readArticle, readArticleDef
} from './generic'
export {
  generateImage, generateImageDef
} from './image'

