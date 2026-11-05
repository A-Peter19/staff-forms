import json,csv,pathlib,re,collections
out=pathlib.Path(__file__).resolve().parent; root=out.parents[1]
pages=json.loads((out/'inventory.json').read_text()); rows=[]; matrices=[]
for p in pages:
 f=p['file'];stage=p['stage']; family='dashboard' if stage=='dashboard' else f.split('/')[1] if f.count('/')>1 else 'wake'
 source=(root/f).read_text()
 isnotes=family in ['celebration','flourish']; isqty=family=='flourish'
 for r in p['fields']:
  r=dict(r); c=r['category']; id=r['id']; detail='';scope='event + stage';storage='Not persisted';trigger='None';read='None'
  if stage=='dashboard':
   scope='manager event configuration';storage='Firestore events/{eventId}';trigger='Create Event';read='Event list onSnapshot (not edit-form autosave)'
   if id in ['search-input','sort-select']:scope='local dashboard preference';storage='In-memory';trigger='Input/change';read='Local filtering only'
  elif c=='checkbox':
   storage='RTDB events/{eventId}/'+stage;trigger='Checkbox change';read='Realtime listener'
   if family=='twilight':detail='Position-based cb_i IDs; full-map overwrite; attribution of unchanged tasks can be reassigned.'
   elif family=='wake':detail='Conflicting nested tasks and flat task-map writers/listeners on same path; progress callback mismatch.'
   else:detail='Whole-map write; initial identity/legacy-load ordering needs correction.'
  elif c=='section-note':
   if isnotes:storage='RTDB events/{eventId}/'+stage+'_notes';trigger='Input after 250ms';read='Realtime listener';detail='Writes all notes; remote snapshot can replace an in-progress edit.'
   elif family=='twilight' and stage=='during':storage='Firestore events/{eventId}.during.sectionNotes.ta_i';trigger='Save button';read='Once at load'
   else:detail='Visible textarea has no persistence wiring.'
  elif c=='item-detail':
   if isqty:storage='RTDB events/{eventId}/'+stage+'_quantities';trigger='Input after 250ms / change';read='Realtime listener';detail='Whole-map write; keys may be cached before event-type task IDs are applied.'
   else:detail='Visible item detail has no persistence wiring.'
   if 'bar open' in r['label'].lower():scope='shared event bar opening time (same meaning as header bar field)'
  elif c=='staff':
   if family=='wake':storage='RTDB events/{eventId}/'+stage+'.teamLeader or staffNames[]';trigger='Input (saveState)';read='Realtime legacy listener';detail='Can be overwritten by competing checkbox map; deletion is not persisted by generic handler.'
   elif family in ['foundation','feast'] and stage=='setup':storage='Read: Firestore events/{eventId}.setup; no active save path';read='Once at load';detail='saveStaffSection wrapper exists but is not called; no Save button or autosave.'
   else:storage='Firestore events/{eventId}.'+stage+'.teamLeader or staffMembers[]';trigger='Save button';read='Once at load';detail='Staff list lacks stable entry IDs; updates are not live.'
  elif id=='final-notes':
   storage='Firestore events/{eventId}.'+stage+'.finalNotes';trigger='Save button';read='Once at load'
  elif id.startswith('meta-'):
   scope='shared event detail'
   canonical={'meta-guests':'guests','meta-day':'date-derived weekday','meta-sash':'sash','meta-runner':'runner','meta-bar':'barTime','meta-access':'accessTime','meta-tables':'tableStyle','meta-catering':'catering option','meta-bar-open':'bar opening time','meta-bar-close':'bar closing time'}[id]
   scope+=': '+canonical
   if id=='meta-day':scope='derived event display: weekday from event date'
   if family=='evening-party':storage='Firestore events/{eventId}.'+{'meta-guests':'guests','meta-day':'day','meta-bar':'barTime','meta-access':'accessTime','meta-tables':'tableStyle'}[id];trigger='Save button';read='Once at load';detail='Not live; day/date aliases need consolidation.'
   elif family=='celebration' and id in ['meta-access','meta-bar','meta-tables']:
    storage='Firestore events/{eventId}.'+stage+'.'+{'meta-access':'accessTime','meta-bar':'barTime','meta-tables':'tableStyle'}[id];trigger='Save button';read='Once at load; some top-level fallbacks';detail='Same event detail is currently stage-local.'
   elif family=='twilight' and id in ['meta-bar-open','meta-bar-close']:
    storage='Firestore events/{eventId}.during.'+('barOpen' if id=='meta-bar-open' else 'barClose');trigger='Save button';read='Once at load';detail='Stage-local alias; must become shared where semantically identical.'
   else:
    storage='Read event metadata only; no write for this control';read='Once at load'
    if id=='meta-catering' or (family=='feast' and stage=='setup' and id in ['meta-sash','meta-runner']):storage='No load/save wiring';read='None'
    if family in ['foundation','feast'] and stage!='setup' and id=='meta-day':storage='No date hydration in page loader';read='None'
    detail='Read-only/disabled display' if r['readonly'] or r['disabled'] else 'Editable UI but changes have no save path.'
  else:detail='Unclassified layout-specific field; current Twilight clear-up stored counts have no save path.'
  if family=='wake' and c=='staff':scope='event + stage staff assignment'
  r.update(family=family,current_storage=storage,current_save_trigger=trigger,current_load=read,target_scope=scope,audit_note=detail)
  rows.append(r)
 if stage!='dashboard':
  ns=p['counts'].get('section-note',0);q=p['counts'].get('item-detail',0)
  matrices.append({'package':family,'stage':stage,'file':f,'tasks':p['counts'].get('checkbox',0),'section_notes':ns,'item_details':q,'notes_status':'Realtime' if isnotes else 'Manual' if family=='twilight' and stage=='during' else 'Missing UI' if family=='wake' else 'Not saved','quantity_status':'Realtime' if q and isqty else 'Not saved' if q else 'Not present','staff_status':'Missing UI' if family=='wake' and stage=='setup' else 'Conflicting realtime' if family=='wake' else 'Not saved' if family in ['foundation','feast'] and stage=='setup' else 'Manual'})
with (out/'field-audit.csv').open('w') as h:
 w=csv.DictWriter(h,fieldnames=rows[0].keys(),lineterminator='\n');w.writeheader();w.writerows(rows)
with (out/'form-matrix.csv').open('w') as h:
 w=csv.DictWriter(h,fieldnames=matrices[0].keys(),lineterminator='\n');w.writeheader();w.writerows(matrices)
(out/'annotated-inventory.json').write_text(json.dumps(rows,indent=2))
print('Annotated',len(rows),'static controls and',len(matrices),'staff forms')
print('Notes:',dict(collections.Counter(r['current_save_trigger'] for r in rows if r['category']=='section-note')))
