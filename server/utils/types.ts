/**
 * ============================================================================
 * 工具函数 - types
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/utils
 */


export interface SidebarNode {
  text: string            // Was title
  path: string            // Physical path
  link?: string           // Route link
  isFolder: boolean       
  items?: SidebarNode[]   // Was children
  collapsed: boolean      // Was isExpanded (inverted logic usually, but we track state)
  level: number
}
