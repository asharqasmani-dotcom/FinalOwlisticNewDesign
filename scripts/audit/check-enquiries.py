"""Local API regression checks. No external messages are sent."""
import urllib.request,urllib.error,http.cookiejar,json
base='http://127.0.0.1:3002/api/enquiries'
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def call(method='GET',data=None,origin='http://127.0.0.1:3002'):
 req=urllib.request.Request(base,data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Content-Type':'application/json','Origin':origin})
 try:
  with client.open(req) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
assert call()[1]['saved'] is False
for invalid in [None,[],{'step':4,'answers':{}},{'step':1,'answers':{'email':'bad'}}]:assert call('POST',invalid)[0]==400
answers={'fullName':'API Audit','email':'audit@example.invalid','company':'Local Test','services':['social-media'],'engagement':'monthly','monthlyBudget':'300','industry':'Other','companySize':'Generate More Leads','timing':'Immediately','goals':'Long answer '*240}
assert call('POST',{'step':1,'answers':answers},'https://unrelated.invalid')[0]==403
assert call('POST',{'step':1,'answers':answers})[0]==200
assert call()[1]['answers']['goals']==answers['goals'].strip()
assert all(len(c.value)<100 and 'example' not in c.value for c in jar)
assert call('POST',{'step':2,'answers':answers})[0]==200
assert call('POST',{'step':3,'answers':answers})[0]==503
assert call()[1]['complete'] is False
assert call('POST',{'action':'withdraw-permission'})[0]==200
assert call('DELETE')[0]==200
assert call()[1]['saved'] is False
print('PASS: validation, origin, long draft persistence, opaque cookie, steps, no false success, withdrawal, deletion')
