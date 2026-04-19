#!/usr/bin/env python3
"""
Yuque CRUD Quick Test
Test: CREATE -> READ -> UPDATE -> READ -> DELETE
Focus: Verify content is actually saved (not empty)
"""

import os
import sys
from pathlib import Path
from datetime import datetime

import requests

# Direct read .env (avoid encoding issues)
env_path = Path('../../.env')
SESSION = None
CTOKEN = None
if env_path.exists():
    with open(env_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if line.startswith('YUQUE_SESSION='):
                SESSION = line.split('=', 1)[1].strip()
            elif line.startswith('YUQUE_CTOKEN='):
                CTOKEN = line.split('=', 1)[1].strip()

if not SESSION:
    print("[FAIL] YUQUE_SESSION not found in .env")
    sys.exit(1)
if not CTOKEN:
    print("[FAIL] YUQUE_CTOKEN not found in .env")
    sys.exit(1)

BASE = 'https://www.yuque.com'
COOKIE = f'_yuque_session={SESSION}; _ctoken={CTOKEN}'


def api(method, path, data=None, query=None, referer=None):
    url = f'{BASE}{path}'
    if query:
        url += '?' + '&'.join(f'{k}={v}' for k, v in query.items())
    h = {
        'Cookie': COOKIE,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'X-CSRF-Token': CTOKEN,
        'X-Requested-With': 'XMLHttpRequest',
    }
    if referer:
        h['Referer'] = referer
    if data and method not in ('GET', 'DELETE'):
        h['Content-Type'] = 'application/json'

    if method == 'GET':
        r = requests.get(url, headers=h)
    elif method == 'POST':
        r = requests.post(url, headers=h, json=data)
    elif method == 'PUT':
        r = requests.put(url, headers=h, json=data)
    elif method == 'DELETE':
        r = requests.delete(url, headers=h)
    else:
        raise ValueError(f'Unknown method: {method}')

    return r.json()


def main():
    print("=" * 60)
    print("Yuque CRUD Test")
    print("=" * 60)

    # 1. Get book
    print("\n[1/6] Getting book list...")
    r = api('GET', '/api/books')
    books = r.get('data', [])
    if not books:
        print(f"[FAIL] Get books failed: {r}")
        return
    BOOK_ID = books[0]['id']
    BOOK_SLUG = books[0]['slug']
    print(f"[OK] Using book: {books[0]['name']} (ID={BOOK_ID})")

    # 2. Create doc (simple Lake HTML)
    print("\n[2/6] Creating doc (simple Lake HTML)...")
    create_body = '<!doctype lake><h1>CRUD Test</h1><p>This is test content to verify content is saved correctly.</p>'
    create_payload = {
        'book_id': BOOK_ID,
        'title': f'[CRUD-Test]{datetime.now().strftime("%H%M%S")}',
        'body': create_body,
        'format': 'lake',
        'public': 0,
    }
    r = api('POST', '/api/docs', data=create_payload, referer=f'{BASE}/{BOOK_ID}')
    if 'data' not in r:
        print(f"[FAIL] Create failed: {r}")
        return
    doc_id = r['data']['id']
    doc_slug = r['data']['slug']
    print(f"[OK] Created: ID={doc_id}, Slug={doc_slug}")

    # 3. Read and verify (CRITICAL!)
    print("\n[3/6] Reading doc to verify content...")
    r = api('GET', f'/api/docs/{doc_slug}', query={'book_id': str(BOOK_ID)})
    doc = r.get('data', {})
    content = doc.get('content', '')
    print(f"   Title: {doc.get('title')}")
    print(f"   Content length: {len(content)} chars")
    print(f"   Content preview (first 300 chars):")
    print(f"   {content[:300]}")

    if 'CRUD Test' in content and 'test content' in content:
        print("[PASS] [PASS] [PASS] Content verification PASSED! Content is correctly saved!")
    else:
        print("[FAIL] [FAIL] [FAIL] Content verification FAILED! Content is EMPTY or not saved!")
        print(f"   Possible reasons:")
        print(f"   1. body field format is wrong")
        print(f"   2. Yuque needs extra meta tags")
        print(f"   3. API has special parsing requirements for body")

    # 4. Update doc
    print("\n[4/6] Updating doc...")
    update_body = '<!doctype lake><h1>CRUD Test - Updated</h1><p>This is updated content. <strong>Bold text</strong></p>'
    r = api('PUT', f'/api/docs/{doc_id}', data={
        'title': f'[CRUD-Test-Updated]{datetime.now().strftime("%H%M%S")}',
        'body': update_body,
        'format': 'lake',
    }, referer=f'{BASE}/{BOOK_ID}')
    if 'data' not in r:
        print(f"[FAIL] Update failed: {r}")
    else:
        print(f"[OK] Updated")

    # 5. Read again to verify update
    print("\n[5/6] Reading again to verify update...")
    r = api('GET', f'/api/docs/{doc_slug}', query={'book_id': str(BOOK_ID)})
    content2 = r.get('data', {}).get('content', '')
    checks = [
        ('updated content' in content2, "Contains 'updated content'"),
        ('Bold text' in content2, "Contains 'Bold text'"),
        ('CRUD Test - Updated' in content2, "Contains 'CRUD Test - Updated'"),
    ]
    all_pass = True
    for passed, desc in checks:
        status = '[PASS]' if passed else '[FAIL]'
        print(f"   {status} {desc}")
        if not passed:
            all_pass = False
    if all_pass:
        print("[PASS] [PASS] [PASS] Update verification PASSED!")
    else:
        print("[FAIL] [FAIL] [FAIL] Update verification FAILED!")

    # 6. Delete cleanup
    print("\n[6/6] Deleting test doc...")
    r = api('DELETE', f'/api/docs/{doc_id}', query={'book_id': str(BOOK_ID)}, referer=f'{BASE}/{BOOK_ID}')
    if 'data' in r or r.get('status') == 200:
        print(f"[OK] Deleted")
    else:
        print(f"[WARN] Delete result: {r}")

    print("\n" + "=" * 60)
    print("Test completed")
    print("=" * 60)

if __name__ == '__main__':
    main()
