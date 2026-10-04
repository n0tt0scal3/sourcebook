import re,sys
def fix(s):
    # Load Google Fonts without blocking the page (they're slow or blocked in mainland China).
    return re.sub(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/css2\?[^"]+)">', r'<link rel="stylesheet" href="\1" media="print" onload="this.media=\'all\'">', s)
for p in sys.argv[1:]:
    s=open(p).read();n=fix(s)
    print(p, 'changed' if n!=s else 'unchanged'); open(p,'w').write(n)
