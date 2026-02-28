import json

with open(r'D:\ALL IN AI\MetaBlog\model-reference\kimi\notebook\08-多轮对话.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        if isinstance(cell['source'], list):
            lines = cell['source']
        else:
            lines = cell['source'].split('\n')
        
        new_lines = []
        for line in lines:
            if 'thinking=' in line and 'type' in line:
                continue
            new_lines.append(line)
        cell['source'] = new_lines

with open(r'D:\ALL IN AI\MetaBlog\model-reference\kimi\notebook\08-多轮对话.ipynb', 'w', encoding='utf-8') as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)

print('Fixed 08!')
