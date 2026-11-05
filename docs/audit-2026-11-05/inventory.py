from html.parser import HTMLParser
from pathlib import Path
import json,csv,collections,re
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
class Node:
 def __init__(self,tag,attrs,line,parent=None):
  self.tag,self.a,self.line,self.parent=tag,dict(attrs),line,parent
  self.children=[]; self.text=''
 def has(self,c):return c in self.a.get('class','').split()
 def all(self):
  yield self
  for c in self.children:yield from c.all()
 def ancestor(self,p):
  n=self
  while n:
   if p(n):return n
   n=n.parent
 def words(self):return ' '.join(' '.join(n.text for n in self.all()).split())
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.root=Node('root',[],1);self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  n=Node(tag,attrs,self.getpos()[0],self.stack[-1]);self.stack[-1].children.append(n)
  if tag not in ['input','img','meta','link','br','hr','source','wbr','area','base','embed','param']:self.stack.append(n)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==tag:self.stack=self.stack[:i];break
 def handle_data(self,s):self.stack[-1].text+=s
rows=[]; pages=[]
for f in sorted((ROOT/'public').rglob('*.html')):
 if f.name=='404.html':continue
 src=f.read_text();p=Parser();p.feed(src);nodes=list(p.root.all());stage=re.search(r'(?:const|var|let) FORM_KEY\s*=\s*[\'"]([^\'"]+)',src)
 page={'file':str(f.relative_to(ROOT)),'stage':stage.group(1) if stage else 'dashboard','fields':[],'buttons':[],'scripts':[]}
 for n in nodes:
  if n.tag=='script' and n.a.get('src'):page['scripts'].append(n.a['src'])
  if n.tag=='button':page['buttons'].append({'line':n.line,'text':n.words(),'id':n.a.get('id',''),'action':n.a.get('data-action',''),'onclick':n.a.get('onclick','')})
  if n.tag not in ['input','select','textarea']:continue
  task=n.ancestor(lambda a:a.has('checklist-item') or a.has('task'))
  section=n.ancestor(lambda a:a.has('section'))
  note=n.ancestor(lambda a:a.has('notes-row'))
  qty=n.ancestor(lambda a:a.has('item-qty'))
  label=next((a.words() for a in nodes if a.tag=='label' and a.a.get('for') and a.a.get('for')==n.a.get('id')), '')
  if not label and n.parent:label=' | '.join(a.words() for a in n.parent.children if a.tag=='label')
  tasklabel=next((a.words() for a in task.all() if a.has('item-label') or a.has('task-text') or a.has('task-title')), '') if task else ''
  if not tasklabel and task:tasklabel=next((a.words() for a in task.all() if a.tag=='label'),'')
  category='checkbox' if n.a.get('type')=='checkbox' else 'section-note' if note else 'item-detail' if qty else 'staff' if n.has('staff-input') or n.has('staff-name-input') or n.a.get('id') in ['team-leader','teamLeader'] else 'field'
  r={'file':page['file'],'line':n.line,'stage':page['stage'],'category':category,'tag':n.tag,'type':n.a.get('type',n.tag),'id':n.a.get('id',''),'name':n.a.get('name',''),'label':label,'task':tasklabel,'class':n.a.get('class',''),'checkbox_task':n.a.get('data-task',''),'task_id':task.a.get('data-task-id','') if task else '', 'section':(task.a.get('data-section') if task else '') or n.a.get('data-section',''),'section_id':section.a.get('id','') if section else '', 'placeholder':n.a.get('placeholder',''),'readonly':'readonly' in n.a,'disabled':'disabled' in n.a,'initial':n.a.get('value',n.words() if n.tag=='textarea' else ''),'options':' | '.join(a.words() for a in n.all() if a.tag=='option')}
  rows.append(r);page['fields'].append(r)
 page['counts']=dict(collections.Counter(r['category'] for r in page['fields']))
 pages.append(page)
(OUT/'inventory.json').write_text(json.dumps(pages,indent=2))
with (OUT/'field-inventory.csv').open('w') as h:
 w=csv.DictWriter(h,fieldnames=rows[0].keys(),lineterminator='\n');w.writeheader();w.writerows(rows)
for p in pages:
 print(p['file'],p['counts'])
 print('  Other fields: '+', '.join((r['id'] or r['label'] or r['placeholder']) for r in p['fields'] if r['category'] not in ['checkbox','section-note']))
print('TOTAL',len(pages),'pages',len(rows),'static controls',dict(collections.Counter(r['category'] for r in rows)))
