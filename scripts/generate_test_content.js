import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sections = ['posts', 'knowledge', 'resources'];
const root = path.resolve(__dirname, '../docs/sections');

console.log(`Generating content in ${root}...`);

function createNode(dir, depth, maxDepth, section) {
    if (depth > maxDepth) return;

    // Create a few leaf files at this level
    for (let i = 1; i <= 2; i++) {
        const fileName = `leaf-${depth}-${i}.md`;
        const content = `---
title: Leaf ${depth}-${i} (${section})
date: 2026-02-15
description: A leaf node at depth ${depth}
tags: [test, depth-${depth}]
---
# Leaf Node ${depth}-${i}
This is a leaf node at depth ${depth} in section **${section}**.

- Breadcrumb: Level ${depth}
- Sibling: ${i}
`;
        fs.writeFileSync(path.join(dir, fileName), content);
    }

    // Create a paired node (folder + md) if not at max depth
    if (depth < maxDepth) {
        const nodeName = `node-L${depth}`;
        const newDir = path.join(dir, nodeName);
        
        // 1. Create the Folder
        if (!fs.existsSync(newDir)) fs.mkdirSync(newDir);

        // 2. Create the Paired File
        const pairedContent = `---
title: 📂 Node L${depth} Hub (${section})
date: 2026-02-15
description: A paired hub node at depth ${depth}
---
# Node L${depth} Hub
This is a **Paired Hub Page**.
It corresponds to the folder \`${nodeName}/\`.
It should appear in the sidebar as a clickable parent item.
`;
        fs.writeFileSync(path.join(dir, `${nodeName}.md`), pairedContent);

        // Recurse
        createNode(newDir, depth + 1, maxDepth, section);
    }
}

sections.forEach(section => {
    const sectionDir = path.join(root, section);
    if (!fs.existsSync(sectionDir)) fs.mkdirSync(sectionDir, { recursive: true });
    
    // Generate deep structure
    console.log(`Generating tree for ${section}...`);
    createNode(sectionDir, 1, 6, section); // Depth 1 to 6
});

console.log('Done! helper script finished.');
