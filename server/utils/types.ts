export interface SidebarNode {
  text: string            // Was title
  path: string            // Physical path
  link?: string           // Route link
  isFolder: boolean       
  items?: SidebarNode[]   // Was children
  collapsed: boolean      // Was isExpanded (inverted logic usually, but we track state)
  level: number
}
