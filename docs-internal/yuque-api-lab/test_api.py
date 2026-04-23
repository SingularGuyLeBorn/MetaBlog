#!/usr/bin/env python3
"""
测试语雀 Web API 客户端 - 验证关键端点
"""

import sys
sys.path.insert(0, ".")
from yuque_client import YuqueClient

def test_all():
    print("=" * 60)
    print("测试语雀 Web API")
    print("=" * 60)
    
    # 1. 初始化
    try:
        client = YuqueClient()
        print("\n[1] 客户端初始化: OK")
    except Exception as e:
        print(f"\n[1] 客户端初始化: FAIL - {e}")
        return
    
    # 2. 获取用户信息
    try:
        result = client.api("GET", "/api/mine")
        user = result.get("data", {})
        print(f"\n[2] 获取用户信息: OK")
        print(f"    登录名: {user.get('login')}")
        print(f"    昵称: {user.get('name')}")
        print(f"    ID: {user.get('id')}")
    except Exception as e:
        print(f"\n[2] 获取用户信息: FAIL - {e}")
        print(f"    响应: {result if 'result' in dir() else 'N/A'}")
    
    # 3. 列出知识库
    try:
        books = client.list_books(use_cache=False)
        print(f"\n[3] 列出知识库: OK ({len(books)} 个)")
        for b in books[:5]:
            print(f"    - {b['name']} (ID={b['id']}, slug={b.get('slug')}, docs={b.get('items_count', 'N/A')})")
    except Exception as e:
        print(f"\n[3] 列出知识库: FAIL - {e}")
        books = []
    
    # 4. 测试创建知识库 (POST /api/books)
    print(f"\n[4] 测试创建知识库...")
    try:
        payload = {
            "name": "API测试-自动创建",
            "slug": "api-test-auto",
            "description": "用于API测试的临时知识库",
            "type": "Book",
            "public": 0,
        }
        result = client.api("POST", "/api/books", data=payload, referer="https://www.yuque.com")
        print(f"    响应: {result}")
        if result.get("data", {}).get("id"):
            print(f"    创建成功! ID={result['data']['id']}, slug={result['data'].get('slug')}")
        else:
            print(f"    可能失败，检查响应...")
    except Exception as e:
        print(f"    FAIL - {e}")
    
    # 5. 搜索
    print(f"\n[5] 测试搜索...")
    try:
        result = client.api("GET", "/api/zsearch", query={"q": "test", "type": "doc"})
        print(f"    响应状态: {result.get('status')}")
        print(f"    结果数: {len(result.get('data', {}).get('hits', []))}")
    except Exception as e:
        print(f"    FAIL - {e}")
    
    # 6. 如果有知识库，测试文档操作
    if books:
        test_book = books[0]
        book_id = test_book["id"]
        print(f"\n[6] 测试文档操作 (知识库: {test_book['name']}, ID={book_id})")
        
        # 6a. 获取目录
        try:
            toc = client.get_toc(book_id)
            print(f"    [6a] 获取TOC: OK ({len(toc)} 项)")
        except Exception as e:
            print(f"    [6a] 获取TOC: FAIL - {e}")
        
        # 6b. 创建文档 (markdown格式)
        try:
            doc = client.create_doc(
                book_id=book_id,
                title="API测试-临时文档",
                content="# 测试内容\n\n这是一段测试文本。",
                format="markdown"
            )
            print(f"    [6b] 创建文档: OK (ID={doc.get('id')}, slug={doc.get('slug')})")
            doc_id = doc.get("id")
            doc_slug = doc.get("slug")
        except Exception as e:
            print(f"    [6b] 创建文档: FAIL - {e}")
            doc_id = None
        
        # 6c. 读取文档
        if doc_id:
            try:
                read_result = client.read_doc(book_id, doc_slug)
                print(f"    [6c] 读取文档: OK (title={read_result.get('title')})")
                print(f"         content前100字: {str(read_result.get('content', ''))[:100]}...")
            except Exception as e:
                print(f"    [6c] 读取文档: FAIL - {e}")
            
            # 6d. 更新文档 (append)
            try:
                # 先读取当前内容
                current_doc = client.read_doc(book_id, doc_slug)
                current_body = current_doc.get("body") or current_doc.get("body_asl") or current_doc.get("content") or ""
                new_content = current_body + "\n\n## 追加内容\n\n这是追加的文本。"
                updated = client.update_doc(doc_id, content=new_content, format="markdown")
                print(f"    [6d] 更新文档(append): OK")
            except Exception as e:
                print(f"    [6d] 更新文档(append): FAIL - {e}")
            
            # 6e. 使用 replace_text 更新
            try:
                updated = client.update_doc(
                    doc_id, 
                    replace_text={"old": "这是追加的文本。", "new": "这是被替换后的文本。"}
                )
                print(f"    [6e] 替换文本: OK")
            except Exception as e:
                print(f"    [6e] 替换文本: FAIL - {e}")
            
            # 6f. 删除文档
            try:
                client.delete_doc(doc_id, book_id)
                print(f"    [6f] 删除文档: OK")
            except Exception as e:
                print(f"    [6f] 删除文档: FAIL - {e}")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    test_all()
