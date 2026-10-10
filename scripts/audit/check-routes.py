"""Check every imported page and its local asset/link destinations over HTTP."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
from concurrent.futures import ThreadPoolExecutor
import urllib.request, urllib.error, json, time, statistics
base='http://127.0.0.1:3002'
routes=['/']+['/'+str(p.parent.relative_to('mirror/dist')) for p in Path('mirror/dist').rglob('index.html') if p.parent != Path('mirror/dist')]
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.urls=set()
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  for key in ('src','href','poster','data-src','data-live-dither'):
   value=a.get(key,'')
   if value.startswith('/') and not value.startswith('//'):self.urls.add(urlsplit(value).path.rstrip('/') or '/')
def check(route):
 start=time.perf_counter()
 try:
  with urllib.request.urlopen(base+route) as r:data=r.read();status=r.status;ctype=r.headers.get('content-type','')
  return route,status,round((time.perf_counter()-start)*1000,1),data,ctype
 except urllib.error.HTTPError as e:return route,e.code,0,b'',''
with ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(check,routes))
links=set()
for route,status,ms,data,ctype in results:
 if status==200:
  parser=Parser();parser.feed(data.decode());links.update(parser.urls)
with ThreadPoolExecutor(max_workers=4) as pool: checked=list(pool.map(check,sorted(links-set(routes))))
report={'pages':len(results),'targets':len(checked),'failures':[(r,s) for r,s,*_ in results+checked if s!=200], 'page_response_ms':{r:ms for r,s,ms,*_ in results}}
Path('scripts/audit/routes.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='page_response_ms'}))
