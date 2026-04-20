import os
import time
import json
from dotenv import load_dotenv
from pathlib import Path
from feishu_client import FeishuClient
import requests

# 0. 初始化探测
load_dotenv(Path('../../.env'))
client = FeishuClient()
token = client.get_tenant_access_token()
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

def verify_step(did, action_name):
    """辅助：在每个步骤后读取并验证文档状态"""
    print(f"\n--- [验证] {action_name} ---")
    res = client.api('GET', f'/docx/v1/documents/{did}/raw_content')
    blocks = client.api('GET', f'/docx/v1/documents/{did}/blocks/{did}/children')
    items = blocks.get('items', [])
    content = res.get('content', '').replace('\n', ' ')
    print(f"  [RESULT] 块树追踪仪: 获取到当前 {len(items)} 个顶层块。")
    print(f"  [TXT快照] {content[:150]}...")

print('✅ 验证环境准备就绪，即将进入全栈沉浸式文档重构!')
# 文档创立期就敲定名字！并追加休眠机制保证 Drive API 的索引落盘！
r_doc = client.api('POST', '/docx/v1/documents', json_data={'title': 'MetaBlog: The Ultimate API Guide'})
doc_id = r_doc['document']['document_id']
print(f"✅ 文档建立于 {doc_id}，正在沉睡 2.5 秒等待飞书数据层跨区同步...")
time.sleep(2.5)

# 更新标题(安全尝试)
try:
    client.api('PATCH', f'/drive/v1/files/{doc_id}', 
               params={'type': 'docx'}, 
               json_data={'name': 'MetaBlog: 全元素压测终结版'})
    print("✅ Drive API 二级标题同步已成功过境。")
except Exception as e:
    print(f"ℹ️ (忽略) Drive API 同步仍有延迟或权限拒接: {e}")

verify_step(doc_id, "第一阶段：时空跃迁完成")
# 我们要一口气压入大量的排版：一二级标题、有序、无序、引用、基础文本
rich_blocks = [
    {'block_type': 3, 'heading1': {'elements': [{'text_run': {'content': '核心结构图鉴'}}]}},
    {'block_type': 4, 'heading2': {'elements': [{'text_run': {'content': 'A. 多样化列表呈现'}}]}},
    {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '飞书不仅支持字幅写入，也具备原生列表转换层：'}}]}},
    {'block_type': 13, 'ordered': {'elements': [{'text_run': {'content': '首先，这是一条坚定的有序列表点1'}}]}},
    {'block_type': 13, 'ordered': {'elements': [{'text_run': {'content': '接着，这是它的兄弟节点有序列表2'}}]}},
    {'block_type': 12, 'bullet': {'elements': [{'text_run': {'content': '当然，也有随需应变的无序圆点A'}}]}},
    {'block_type': 12, 'bullet': {'elements': [{'text_run': {'content': '紧接着是配套的无序圆点B'}}]}},
    {'block_type': 15, 'quote': {'elements': [{'text_run': {'content': '“凡事追求极致的确定性，方能突破模型的局限边界” —— 邵承源'}}]}},
    {'block_type': 22, 'divider': {}},  # 华丽的分割线
    {'block_type': 4, 'heading2': {'elements': [{'text_run': {'content': 'B. CRUD 定位靶点区'}}]}},
    {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '【待修改】本段会被 PATCH 指令高亮！'}}]}},
    {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '【待删除】这是被献祭的一行垃圾字符数据。'}}]}}
]
client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': rich_blocks})
verify_step(doc_id, "排版矩阵空投成功")
# 上一步我们塞入了 12 个块，所以当前的块总数变为 12 (0到11)。
# 我们打算删除最后一个文字块（也就是我们的垃圾字符数据，在原数组的索引11处）。
# 因为它是最后追加的，为了稳定我们重新先拉取获取它的真实 index
lists = client.api('GET', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children')
items = lists.get('items', [])

# 寻找含有"待删除"文字的 Block
death_index = next((i for i, b in enumerate(items) if "待删除" in json.dumps(b, ensure_ascii=False)), None)

if death_index is not None:
    client.api('DELETE', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children/batch_delete', 
               json_data={'start_index': death_index, 'end_index': death_index + 1})
    print(f"✅ 从数组下标 [{death_index}] 精确消灭了靶点 Block！")
else:
    print("❌ 未能找到待删除靶点！")

verify_step(doc_id, "精确制导删除")
# 重新获取，定位【待修改】靶点
lists = client.api('GET', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children')
target_id = next((b['block_id'] for b in lists.get('items', []) if "待修改" in json.dumps(b, ensure_ascii=False)), None)

if target_id:
    # 发动携带 Style (斜体和下划线) 的 PATCH 猛攻
    requests.patch(f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{target_id}',
                   headers=headers, 
                   json={'update_text_elements': {'elements': [{'text_run': {'content': '【我已重生】：不再是原先粗陋的待修改靶标了！', 'text_element_style': {'bold': True, 'italic': True, 'underline': True}}}]}})
    print(f"✅ 成功定点升级 Block: {target_id}")
else:
    print("❌ 未能找到待修改靶点！")
    
verify_step(doc_id, "样式叠加与强制覆写")
# 注意公式属于块类型 16! (飞书文档深埋的暗坑)
geek_blocks = [
    {'block_type': 4, 'heading2': {'elements': [{'text_run': {'content': 'C. 极客硬核推演'}}]}},
    {'block_type': 14, 'code': {'style': {'language': 2}, 'elements': [{'text_run': {'content': 'def metablog_agent_run():\n    print("Agent is fully operational!")\n    return 0'}}]}},
    {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '定理公式推导：'}}, {'equation': {'content': 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}'}}]}}
]
client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': geek_blocks})
verify_step(doc_id, "贝叶斯与程序的史诗交响")
print("--- 构建 5x5 的数据要塞 ---")
table_req = {'block_type': 31, 'table': {'property': {'column_size': 5, 'row_size': 5}}}
r_table = client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': [table_req]})
cell_ids = r_table['children'][0]['table']['cells']

for idx, cid in enumerate(cell_ids):
    if idx > 0 and idx % 3 == 0: time.sleep(0.4) 
    
    r_cell = client.request('GET', f'/docx/v1/documents/{doc_id}/blocks/{cid}')
    anchor_id = r_cell["data"]["block"]["children"][0]
    # 无副作用定点填充
    requests.patch(f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{anchor_id}',
                   headers=headers, 
                   json={'update_text_elements': {'elements': [{'text_run': {'content': f'({idx//5},{idx%5})'}}]}})

print("✅ 25格矩阵数据轰炸不掉线！")
verify_step(doc_id, "表格压力过载平衡测试")
print(f"\n{'='*60}\n🏆 【终局呈现】\nURL: https://feishu.cn/docx/{doc_id}\n{'='*60}")
final_res = client.api('GET', f'/docx/v1/documents/{doc_id}/raw_content')
print(final_res.get('content'))
print("=" * 60)