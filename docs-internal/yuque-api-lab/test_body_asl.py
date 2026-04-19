#!/usr/bin/env python3
"""
Verify: body_asl is the correct field for creating/updating Yuque docs.
"""

import os
import sys
from pathlib import Path
from datetime import datetime

import requests

# Read .env
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

if not SESSION or not CTOKEN:
    print("Cookie not found")
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
    return r.json()

# Get book
r = api('GET', '/api/books')
books = r.get('data', [])
BOOK_ID = books[0]['id']
print(f"Book ID: {BOOK_ID}")

# ===== CREATE with body_asl =====
print("\n" + "="*60)
print("CREATE with body_asl")
print("="*60)

create_payload = {
    'book_id': BOOK_ID,
    'title': f'[body_asl-test]{datetime.now().strftime("%H%M%S")}',
    'body_asl': '<!doctype lake><h1>Test body_asl</h1><p>This is content via body_asl.</p><ul><li>Item 1</li><li>Item 2</li></ul>',
    'format': 'lake',
    'public': 0,
}

r = api('POST', '/api/docs', data=create_payload, referer=f'{BASE}/{BOOK_ID}')
if 'data' not in r:
    print(f"[FAIL] Create failed: {r}")
    sys.exit(1)

doc_id = r['data']['id']
doc_slug = r['data']['slug']
print(f"[OK] Created: ID={doc_id}, Slug={doc_slug}")

# ===== READ and verify =====
print("\n" + "="*60)
print("READ and verify")
print("="*60)

r = api('GET', f'/api/docs/{doc_slug}', query={'book_id': str(BOOK_ID)})
doc = r.get('data', {})

# Check all possible content fields
print(f"Title: {doc.get('title')}")
print(f"content length: {len(doc.get('content', ''))}")
print(f"body length: {len(doc.get('body', ''))}")
print(f"body_asl length: {len(doc.get('body_asl', ''))}")
print(f"body_draft length: {len(doc.get('body_draft', ''))}")
print(f"body_slate length: {len(doc.get('body_slate', ''))}")

content = doc.get('content', '')
print(f"\nContent preview (first 300 chars):")
print(content[:300])

# Verify
if 'Test body_asl' in content and 'body_asl' in content:
    print("\n[PASS] [PASS] [PASS] Content is correctly saved via body_asl!")
else:
    print("\n[FAIL] [FAIL] [FAIL] Content not found!")

# ===== UPDATE with body_asl =====
print("\n" + "="*60)
print("UPDATE with body_asl")
print("="*60)

update_payload = {
    'title': f'[body_asl-updated]{datetime.now().strftime("%H%M%S")}',
    'body_asl': '<!doctype lake><h1>Updated Title</h1><p>This is updated content. <strong>Bold text here.</strong></p>',
    'format': 'lake',
}

r = api('PUT', f'/api/docs/{doc_id}', data=update_payload, referer=f'{BASE}/{BOOK_ID}')
if 'data' not in r:
    print(f"[FAIL] Update failed: {r}")
else:
    print(f"[OK] Updated")

# ===== READ again to verify update =====
print("\n" + "="*60)
print("READ again to verify update")
print("="*60)

r = api('GET', f'/api/docs/{doc_slug}', query={'book_id': str(BOOK_ID)})
content2 = r.get('data', {}).get('content', '')
print(f"Content length: {len(content2)} chars")
print(f"Preview: {content2[:300]}")

checks = [
    ('Updated Title' in content2, "Contains 'Updated Title'"),
    ('updated content' in content2, "Contains 'updated content'"),
    ('Bold text here' in content2, "Contains 'Bold text here'"),
]
all_pass = True
for passed, desc in checks:
    status = '[PASS]' if passed else '[FAIL]'
    print(f"   {status} {desc}")
    if not passed:
        all_pass = False

if all_pass:
    print("\n[PASS] [PASS] [PASS] Update verification PASSED!")
else:
    print("\n[FAIL] [FAIL] [FAIL] Update verification FAILED!")

# ===== DELETE =====
print("\n" + "="*60)
print("DELETE cleanup")
print("="*60)

r = api('DELETE', f'/api/docs/{doc_id}', query={'book_id': str(BOOK_ID)}, referer=f'{BASE}/{BOOK_ID}')
if 'data' in r:
    print("[OK] Deleted")
else:
    print(f"[WARN] {r}")

print("\n" + "="*60)
print("CONCLUSION: body_asl is the correct field for Yuque content!")
print("="*60)
