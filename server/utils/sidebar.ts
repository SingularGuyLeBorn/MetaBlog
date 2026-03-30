import fs from 'fs'
import path from 'path'

import { SidebarNode } from './types'

function formatName(name: string): string {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export function scanStrictSidebar(rootPath: string, relativePath: string): SidebarNode[] {
    const fullPath = path.resolve(rootPath, relativePath)
    if (!fs.existsSync(fullPath)) return []
    return scanChildren(fullPath, rootPath, relativePath, 1) // Start at level 1
}

function scanChildren(folderPath: string, rootPath: string, relativePrefix: string, level: number, exclude?: string): SidebarNode[] {
  if (!fs.existsSync(folderPath)) return []

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  const baseNames = new Set<string>();
  
  entries.forEach(entry => {
      if (entry.name.startsWith('.') || entry.name === 'index.md' || entry.name === exclude) return;
      // Handle both .md files and directories
      const base = entry.name.replace(/\.md$/, '');
      baseNames.add(base);
  });
  
  const sortedBaseNames = Array.from(baseNames).sort();
  const children: SidebarNode[] = [];
  
  for (const base of sortedBaseNames) {
      const mdFile = path.join(folderPath, `${base}.md`);
      const subDir = path.join(folderPath, base);
      
      const hasMd = fs.existsSync(mdFile);
      const hasDir = fs.existsSync(subDir) && fs.statSync(subDir).isDirectory();
      
      const siteLink = hasMd ? '/' + path.relative(rootPath, mdFile).replace(/\\/g, '/').replace(/\.md$/, '') : undefined;
      const physicalPath = hasMd ? mdFile : subDir;

      if (hasMd && hasDir) {
           // Form A: Paired
           children.push({
               text: formatName(base),
               path: physicalPath,
               link: siteLink,
               isFolder: true,
               items: scanChildren(subDir, rootPath, path.join(relativePrefix, base), level + 1),
               collapsed: true, // Default collapsed
               level: level
           });
      } else if (hasMd && !hasDir) {
          // Leaf
          children.push({
              text: formatName(base),
              path: physicalPath,
              link: siteLink,
              isFolder: false,
              collapsed: true,
              level: level
          })
      } else if (!hasMd && hasDir) {
          // Form C: Container
          const indexFile = path.join(subDir, 'index.md');
          const hasIndex = fs.existsSync(indexFile);
          const indexSiteLink = hasIndex ? '/' + path.relative(rootPath, indexFile).replace(/\\/g, '/').replace(/\/index\.md$/, '') : undefined;
          
          children.push({
              text: formatName(base),
              path: physicalPath,
              link: indexSiteLink,
              isFolder: true, 
              items: scanChildren(subDir, rootPath, path.join(relativePrefix, base), level + 1, 'index.md'),
              collapsed: true,
              level: level
          });
      }
  }
  
  return children;
}
