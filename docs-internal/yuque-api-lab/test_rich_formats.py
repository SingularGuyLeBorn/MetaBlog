#!/usr/bin/env python3
"""
Rich format test: verify table, code block, formula, list, quote, etc.
All using the CORRECT field: body_asl
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

TEST_DOC_IDS = []

def test_format(name, body_asl, expected_texts):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")

    payload = {
        'book_id': BOOK_ID,
        'title': f'[RichFmt]{name}-{datetime.now().strftime("%H%M%S")}',
        'body_asl': body_asl,
        'format': 'lake',
        'public': 0,
    }

    r = api('POST', '/api/docs', data=payload, referer=f'{BASE}/{BOOK_ID}')
    if 'data' not in r:
        print(f"[FAIL] Create failed: {r.get('msg', str(r))[:200]}")
        return None, None

    doc_id = r['data']['id']
    doc_slug = r['data']['slug']
    TEST_DOC_IDS.append(doc_id)
    print(f"[OK] Created: ID={doc_id}")

    # Read and verify
    r2 = api('GET', f'/api/docs/{doc_slug}', query={'book_id': str(BOOK_ID)})
    content = r2.get('data', {}).get('content', '')
    print(f"   Content length: {len(content)} chars")

    all_pass = True
    for expected in expected_texts:
        passed = expected in content
        status = '[PASS]' if passed else '[FAIL]'
        print(f"   {status} Contains '{expected[:50]}'")
        if not passed:
            all_pass = False

    if not all_pass:
        print(f"   Content preview: {content[:500]}")

    print(f"   RESULT: {'PASS' if all_pass else 'FAIL'}")
    return doc_id, doc_slug


# === Test 1: Headings + Paragraphs ===
test_format("Headings", 
    '<!doctype lake><h1>H1 Title</h1><h2>H2 Title</h2><h3>H3 Title</h3><p>Normal paragraph.</p>',
    ['H1 Title', 'H2 Title', 'H3 Title', 'Normal paragraph'])

# === Test 2: Lists ===
test_format("Lists",
    '<!doctype lake><ul><li>UL Item A</li><li>UL Item B</li></ul><ol><li>OL Item 1</li><li>OL Item 2</li></ol>',
    ['UL Item A', 'UL Item B', 'OL Item 1', 'OL Item 2'])

# === Test 3: Inline formatting ===
test_format("InlineFmt",
    '<!doctype lake><p>Normal <span style="font-weight: bold">bold text</span> and <span style="font-style: italic">italic text</span>.</p><p>Code: <code>print(hello)</code></p>',
    ['bold text', 'italic text', 'print(hello)'])

# === Test 4: Table ===
test_format("Table",
    '<!doctype lake><table class="lake-table" style="width: 600px"><colgroup><col width="200"><col width="200"><col width="200"></colgroup><tbody>'
    '<tr><td><p><span>Name</span></p></td><td><p><span>Age</span></p></td><td><p><span>City</span></p></td></tr>'
    '<tr><td><p><span>Zhang</span></p></td><td><p><span>25</span></p></td><td><p><span>Beijing</span></p></td></tr>'
    '<tr><td><p><span>Li</span></p></td><td><p><span>30</span></p></td><td><p><span>Shanghai</span></p></td></tr>'
    '</tbody></table>',
    ['Name', 'Age', 'City', 'Zhang', 'Li', 'Beijing', 'Shanghai'])

# === Test 5: Code Block ===
test_format("CodeBlock",
    '<!doctype lake><pre><code class="language-python">def hello():\n    print("Hello, World!")\n\nhello()\n</code></pre>'
    '<p>JS code:</p><pre><code class="language-javascript">const x = 1;\nconsole.log(x);\n</code></pre>',
    ['def hello', 'Hello, World', 'const x', 'console.log'])

# === Test 6: Blockquote ===
test_format("Quote",
    '<!doctype lake><blockquote><p><span>This is a quote block.</span></p></blockquote><p>Normal text.</p>',
    ['This is a quote block'])

# === Test 7: Formula ===
test_format("Formula",
    '<!doctype lake><p>Inline formula: <span data-latex="E = mc^2">$$E = mc^2$$</span></p>'
    '<p>Display formula: <span data-latex="\\int_0^\\infty e^{-x} dx = 1">$$\\int_0^\\infty e^{-x} dx = 1$$</span></p>',
    ['data-latex', 'E = mc^2', 'int_0'])

# === Test 8: Mixed rich document ===
test_format("MixedDoc",
    '<!doctype lake><meta name="doc-version" content="1" /><meta name="viewport" content="adapt" />'
    '<h1>Complete Test Doc</h1>'
    '<p>This doc tests <span style="font-weight: bold">multiple</span> formats.</p>'
    '<h2>1. List</h2><ul><li>Feature A</li><li>Feature B</li></ul>'
    '<h2>2. Table</h2>'
    '<table class="lake-table" style="width: 400px"><colgroup><col width="200"><col width="200"></colgroup><tbody>'
    '<tr><td><p><span>Param</span></p></td><td><p><span>Value</span></p></td></tr>'
    '<tr><td><p><span>LR</span></p></td><td><p><span>0.001</span></p></td></tr>'
    '</tbody></table>'
    '<h2>3. Code</h2><pre><code class="language-python">import torch\nmodel = torch.nn.Linear(10, 2)\nprint(model)\n</code></pre>'
    '<h2>4. Formula</h2><p><span data-latex="\\sigma(x)=\\frac{1}{1+e^{-x}}">$$\\sigma(x)=\\frac{1}{1+e^{-x}}$$</span></p>'
    '<blockquote><p><span>Note: this is important.</span></p></blockquote>',
    ['Complete Test Doc', 'Feature A', 'Param', 'Value', 'LR', '0.001', 'import torch', 'sigma(x)', 'Note: this is important'])

# Cleanup
print(f"\n{'='*60}")
print("Cleaning up...")
for doc_id in TEST_DOC_IDS:
    r = api('DELETE', f'/api/docs/{doc_id}', query={'book_id': str(BOOK_ID)}, referer=f'{BASE}/{BOOK_ID}')
    print(f"   {'OK' if 'data' in r else 'FAIL'} Deleted {doc_id}")

print(f"\n{'='*60}")
print("All rich format tests completed!")
print(f"{'='*60}")
