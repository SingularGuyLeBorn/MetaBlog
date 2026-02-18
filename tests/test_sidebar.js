
const path = require('path');
const { scanStrictSidebar } = require('./docs/.vitepress/utils/sidebar');

const root = path.resolve(__dirname);
const sidebar = scanStrictSidebar(path.join(root, 'docs'), 'sections/resources');

function printTree(nodes, indent = '') {
    nodes.forEach(node => {
        console.log(`${indent}${node.text} -> ${node.link || '(no link)'}`);
        if (node.items) {
            printTree(node.items, indent + '  ');
        }
    });
}

printTree(sidebar);
