import json

# 修复所有 notebook
notebooks = [
    '02-流式输出.ipynb',
    '03-思考模式.ipynb', 
    '08-多轮对话.ipynb'
]

for nb_file in notebooks:
    filepath = f'D:\\ALL IN AI\\MetaBlog\\model-reference\\kimi\\notebook\\{nb_file}'
    with open(filepath, 'r', encoding='utf-8') as f:
        nb = json.load(f)
    
    for cell in nb['cells']:
        if cell['cell_type'] == 'code':
            if isinstance(cell['source'], list):
                lines = cell['source']
            else:
                lines = cell['source'].split('\n')
            
            new_lines = []
            for line in lines:
                # 删除包含 thinking= 的行
                if 'thinking=' in line:
                    print(f'Removed from {nb_file}: {line.strip()[:50]}')
                    continue
                new_lines.append(line)
            cell['source'] = new_lines
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(nb, f, ensure_ascii=False, indent=1)

print('All fixed!')
