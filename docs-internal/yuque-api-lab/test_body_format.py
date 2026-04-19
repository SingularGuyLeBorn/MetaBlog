#!/usr/bin/env python3
"""
Test different body formats to find which one actually saves content.
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
print(f"Using book ID: {BOOK_ID}")

# Test variations
variants = [
    # Variant 1: Original - simple body
    ("v1-simple-body", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v1-{datetime.now().strftime("%H%M%S")}',
        'body': '<!doctype lake><h1>Test V1</h1><p>Simple body format.</p>',
        'format': 'lake',
    }),
    # Variant 2: With meta tags
    ("v2-with-meta", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v2-{datetime.now().strftime("%H%M%S")}',
        'body': '<!doctype lake><meta name="doc-version" content="1" /><meta name="viewport" content="adapt" /><h1>Test V2</h1><p>With meta tags.</p>',
        'format': 'lake',
    }),
    # Variant 3: Full lake HTML with data-lake-id
    ("v3-full-lake", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v3-{datetime.now().strftime("%H%M%S")}',
        'body': '<!doctype lake><meta name="doc-version" content="1" /><meta name="viewport" content="adapt" /><meta name="typography" content="classic" /><meta name="paragraphSpacing" content="relax" /><h1 data-lake-id="abc123" id="abc123"><span data-lake-id="def456" id="def456">Test V3</span></h1><p data-lake-id="ghi789" id="ghi789"><span data-lake-id="jkl012" id="jkl012">Full lake HTML with IDs.</span></p>',
        'format': 'lake',
    }),
    # Variant 4: Without <!doctype lake> prefix
    ("v4-no-doctype", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v4-{datetime.now().strftime("%H%M%S")}',
        'body': '<h1>Test V4</h1><p>No doctype prefix.</p>',
        'format': 'lake',
    }),
    # Variant 5: body_draft field
    ("v5-body-draft", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v5-{datetime.now().strftime("%H%M%S")}',
        'body_draft': '<!doctype lake><h1>Test V5</h1><p>Using body_draft field.</p>',
        'format': 'lake',
    }),
    # Variant 6: body_asl field
    ("v6-body-asl", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v6-{datetime.now().strftime("%H%M%S")}',
        'body_asl': '<!doctype lake><h1>Test V6</h1><p>Using body_asl field.</p>',
        'format': 'lake',
    }),
    # Variant 7: Both body and body_draft
    ("v7-both", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v7-{datetime.now().strftime("%H%M%S")}',
        'body': '<!doctype lake><h1>Test V7</h1><p>Both body fields.</p>',
        'body_draft': '<!doctype lake><h1>Test V7</h1><p>Both body fields.</p>',
        'format': 'lake',
    }),
    # Variant 8: content field instead of body
    ("v8-content-field", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v8-{datetime.now().strftime("%H%M%S")}',
        'content': '<!doctype lake><h1>Test V8</h1><p>Using content field.</p>',
        'format': 'lake',
    }),
    # Variant 9: _save_desktop field (seen in some yuque requests)
    ("v9-save-desktop", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v9-{datetime.now().strftime("%H%M%S")}',
        'body': '<!doctype lake><h1>Test V9</h1><p>With _save_desktop.</p>',
        'format': 'lake',
        '_save_desktop': True,
    }),
    # Variant 10: body_slate field
    ("v10-body-slate", {
        'book_id': BOOK_ID,
        'title': f'[FmtTest]v10-{datetime.now().strftime("%H%M%S")}',
        'body_slate': '<!doctype lake><h1>Test V10</h1><p>Using body_slate field.</p>',
        'format': 'lake',
    }),
]

TEST_DOC_IDS = []

for name, payload in variants:
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"{'='*60}")

    # Create
    r = api('POST', '/api/docs', data=payload, referer=f'{BASE}/{BOOK_ID}')
    if 'data' not in r:
        print(f"[FAIL] Create failed: {r.get('msg', r)[:200]}")
        continue

    doc_id = r['data']['id']
    doc_slug = r['data']['slug']
    TEST_DOC_IDS.append(doc_id)
    print(f"[OK] Created: ID={doc_id}, Slug={doc_slug}")

    # Read and check content
    r2 = api('GET', f'/api/docs/{doc_slug}', query={'book_id': str(BOOK_ID)})
    content = r2.get('data', {}).get('content', '')
    print(f"   Content length: {len(content)} chars")

    if len(content) > 0:
        print(f"   [PASS] Content NOT empty! Preview: {content[:200]}")
        # Check if our text is in there
        test_text = f"Test {name.split('-')[1].upper()}"
        if test_text in content:
            print(f"   [PASS] Found expected text: '{test_text}'")
        else:
            print(f"   [WARN] Expected text not found, but content exists")
    else:
        print(f"   [FAIL] Content is EMPTY (0 chars)")

# Cleanup
print(f"\n{'='*60}")
print("Cleaning up test docs...")
for doc_id in TEST_DOC_IDS:
    r = api('DELETE', f'/api/docs/{doc_id}', query={'book_id': str(BOOK_ID)}, referer=f'{BASE}/{BOOK_ID}')
    status = 'OK' if 'data' in r else 'FAIL'
    print(f"   [{status}] Deleted {doc_id}")

print(f"\nDone. Tested {len(variants)} variants.")
