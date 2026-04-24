"""
飞书 Wiki 多层嵌套文档创建示例
创建 3 层深度的 6 个子文档，并在每个文档中写入内容
"""

# 复制到 notebook cell 中运行

cells = '''
# 15.5b 创建多层嵌套子文档（3层，6个）并写入内容

# 第2层：文档1下的3个子文档
child_1 = client.create_wiki_node(
    space_id=WIKI_SPACE_ID,
    node_type='origin',
    obj_type='docx',
    parent_node_token=WIKI_NODE_TOKEN_1,
    title='1-1 第二层第一个'
)
TOKEN_1_1 = child_1['node']['node_token']
DOC_1_1 = child_1['node']['obj_token']
print(f'1-1: token={TOKEN_1_1}, doc={DOC_1_1}')

child_2 = client.create_wiki_node(
    space_id=WIKI_SPACE_ID,
    node_type='origin',
    obj_type='docx',
    parent_node_token=WIKI_NODE_TOKEN_1,
    title='1-2 第二层第二个'
)
TOKEN_1_2 = child_2['node']['node_token']
DOC_1_2 = child_2['node']['obj_token']
print(f'1-2: token={TOKEN_1_2}, doc={DOC_1_2}')

child_3 = client.create_wiki_node(
    space_id=WIKI_SPACE_ID,
    node_type='origin',
    obj_type='docx',
    parent_node_token=WIKI_NODE_TOKEN_1,
    title='1-3 第二层第三个'
)
TOKEN_1_3 = child_3['node']['node_token']
DOC_1_3 = child_3['node']['obj_token']
print(f'1-3: token={TOKEN_1_3}, doc={DOC_1_3}')

# 第3层
child_1_1 = client.create_wiki_node(
    space_id=WIKI_SPACE_ID,
    node_type='origin',
    obj_type='docx',
    parent_node_token=TOKEN_1_1,
    title='1-1-1 第三层'
)
DOC_1_1_1 = child_1_1['node']['obj_token']
print(f'1-1-1: doc={DOC_1_1_1}')

child_1_2_1 = client.create_wiki_node(
    space_id=WIKI_SPACE_ID,
    node_type='origin',
    obj_type='docx',
    parent_node_token=TOKEN_1_2,
    title='1-2-1 第三层第一个'
)
DOC_1_2_1 = child_1_2_1['node']['obj_token']
print(f'1-2-1: doc={DOC_1_2_1}')

child_1_2_2 = client.create_wiki_node(
    space_id=WIKI_SPACE_ID,
    node_type='origin',
    obj_type='docx',
    parent_node_token=TOKEN_1_2,
    title='1-2-2 第三层第二个'
)
DOC_1_2_2 = child_1_2_2['node']['obj_token']
print(f'1-2-2: doc={DOC_1_2_2}')

print("\\n=== 6个子文档创建完成，开始写入内容 ===\\n")

# 给每个文档写入内容
docs = [
    (DOC_1_1, '1-1'),
    (DOC_1_2, '1-2'),
    (DOC_1_3, '1-3'),
    (DOC_1_1_1, '1-1-1'),
    (DOC_1_2_1, '1-2-1'),
    (DOC_1_2_2, '1-2-2'),
]

for doc_id, name in docs:
    try:
        blocks = client.api('GET', f'/docx/v1/documents/{doc_id}/blocks', use_user_token=True)
        page = next((b for b in blocks.get('items', []) if b.get('block_type') == 1), None)
        if page:
            client.api(
                'POST',
                f'/docx/v1/documents/{doc_id}/blocks/{page["block_id"]}/children',
                json_data={'children': [make_text_block(f'这是 {name} 的内容，位于 Wiki 知识库的多层嵌套结构中。')] },
                use_user_token=True
            )
            print(f'{name}: 内容写入成功')
        else:
            print(f'{name}: 未找到 page block')
    except Exception as e:
        print(f'{name}: 写入失败 - {e}')

print("\\n=== 全部完成 ===")
'''

print(cells)
