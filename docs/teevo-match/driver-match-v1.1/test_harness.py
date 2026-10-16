"""Test the QA checker and independently sanity-check stage fixtures, not Teevo."""
import copy, unittest
import harness as h

def probe_oracle(p):
 i=p['inputs'];s=p['stage']
 if s=='band':return {'band':h.band(i['score'])}
 if s=='confidence_band':return {'confidence':h.confidence(i['score'])}
 if s=='marketplace':return h.slots(i['candidates'],i['budget'])
 if s=='brand_marketplace':
  selected=sorted(set(i['selected_brand_ids'] or []))
  if not set(selected)<=set(i['known_brand_ids']):return {'error':'INVALID_BRAND_SELECTION'}
  filtered=[c for c in i['candidates'] if c['publicly_purchasable'] and (not selected or c['head_brand_id'] in selected)]
  r=h.slots(filtered,i['budget']);state='RESULTS' if r['unique_cards'] else 'NO_QUALIFYING_IN_SELECTED_BRANDS' if selected else 'NO_QUALIFYING_INVENTORY'
  return r|dict(selected_brand_ids=selected,scope='SELECTED_BRANDS' if selected else 'ALL_BRANDS',state=state,show_all_brands_action=bool(selected and state!='RESULTS'),fit_snapshot=[{k:v for k,v in c.items() if k in ['listing_id','score','band','confidence','suppressed']} for c in sorted(i['candidates'],key=lambda c:c['listing_id'])])
 if s=='dimension':
  d,g=i['dimension'],i['gap']
  curves={'minimum':[100,80,55,30,0],'direction':[100,85,60,35,15],'launch':[100,85,65,40,20]}
  if d in curves:
   a=curves[d];n=min(int(g),4);score=a[n] if n==4 else a[n]+(a[n+1]-a[n])*(g-n)
  else:
   limits={'flex':[(0,100),(.5,90),(1,75),(1.5,55),(2,35),(float('inf'),0)],'loft':[(0,100),(.5,90),(1,75),(1.5,55),(float('inf'),30)],'weight':[(0,100),(5,85),(10,65),(15,40),(float('inf'),20)]}
   score=next(score for lim,score in limits[d] if g<=lim)
  return {'score':score}
 if s=='aggregate':
  ds=i['dimensions']
  if not ds:return {'score':None,'scorable':False,'reason':'NO_ACTIVE_FIT_DIMENSIONS'}
  return {'score':sum(d['weight']*d['reliability']*d['score'] for d in ds)/sum(d['weight']*d['reliability'] for d in ds)}
 if s=='guardrail':
  d,g=i['dimension'],i['gap'];suppressed=g>({'flex':2,'loft':2.5}.get(d,4)) if d!='direction' else g>=4
  cap=(g>=3 if d=='direction' else g>1.5)
  return {'suppressed':suppressed,'ceiling':'GOOD_MATCH' if cap and not suppressed else None}
 if s=='loft':
  if i['mode']=='DELTA_RANGE':v=[i['stated']+i['min'],i['stated']+i['max']]
  elif i['mode']=='PUBLISHED_SETTINGS':v=i.get('settings') or [i['min'],i['max']]
  else:v=[i['stated']]
  return {'reachable':v}
 if s=='eligibility':return {'eligible':i['category']=='DRIVER' and i['subtype']=='STANDARD' and i['head_version']=='DRIVER_V1' and i['head_eligible'] is True and i['conformity']!='NON_CONFORMING' and i['head_key_count']==i['shaft_key_count']==1 and i['shaft_eligibility']=='MATCH_ELIGIBLE' and i['same_oem_variant'] and i['purchasable'] and i['handedness_matches'] and i['usable_loft']}
 if s=='parse_number':
  if i['raw']=='':return {'value':None,'diagnostic':False}
  try:return {'value':float(i['raw']),'diagnostic':False}
  except ValueError:return {'value':None,'diagnostic':True}
 if s in ['speed_region','carry_region','target_category','requirements']:
  import resolve_suite as r
  if s=='speed_region':
   f,w,l=r.speed_region(i['speed']);return {'flex':f,'weight':w,'loft':l}
  if s=='carry_region':return {'flex':r.carry_region(i['carry']),'weight':None,'loft':None}
  if s=='target_category':return {'launch':r.category(i['value']),'direction':r.category(i['value'],True)}
  a=h.read('reference/heads.json');hs={row[a[0].index('catalogue_key')]:dict(zip(a[0],row)) for row in a[1:] if len(row)>a[0].index('catalogue_key')}
  return {'normalised_requirements':r.normalize(i['raw_inputs'],hs)}
 if s=='confidence_aggregate':
  v=.45*max(0,min(100,i['golfer']))+.35*max(0,min(100,i['equipment']))+.2*max(0,min(100,i['listing']))
  return {'score':v,'confidence':h.confidence(v)}
 if s=='merge_labels':
  cards=[]
  for label in ['BEST_MATCH','BEST_VALUE','BUDGET_OPTION']:
   target=i['slots'][label]
   if target is not None:
    card=next((x for x in cards if x['listing_id']==target),None)
    if card is None:card={'listing_id':target,'labels':[]};cards.append(card)
    card['labels'].append(label)
  return {'cards':cards,'unfilled_slots':[k for k,v in i['slots'].items() if v is None]}
 if s=='money_saving':
  saving=i['best_price_pence']-i['candidate_price_pence'];return {'qualifies':saving>=2000 and 10*saving>=i['best_price_pence']}
 if s=='identity_resolution':
  if len(i['matches'])!=1:return {'resolved_key':None,'eligible':False,'reason':'AMBIGUOUS_IDENTITY'}
 raise AssertionError('Unrecognised stage '+s)

class HarnessTests(unittest.TestCase):
 def test_sources_and_fixtures(self):self.assertEqual(h.validate_assets()['archetypes'],48)
 def test_stage_fixture_arithmetic(self):
  for p in h.read('boundary-probes.json'):
   with self.subTest(id=p['id']):h.equal(probe_oracle(p),p['expected'])
 def test_every_stage_probe_detects_a_mutation(self):
  for p in h.read('boundary-probes.json'):
   with self.subTest(id=p['id']):
    bad=copy.deepcopy(p['expected']);k=next(iter(bad));bad[k]='deliberately wrong'
    with self.assertRaises(AssertionError):h.equal(bad,p['expected'])
 def test_missing_keys_rejected(self):
  with self.assertRaises(AssertionError):h.equal({}, {'score':10})
 def test_nan_rejected(self):
  with self.assertRaises(AssertionError):h.equal(float('nan'),1)
 def test_bool_not_numeric(self):
  with self.assertRaises(AssertionError):h.equal(True,1)
 def test_archetype_checker_with_hand_worked_trace(self):
  case=next(c for c in h.read('archetypes.json') if c['title']=='Exactly one qualifying listing')
  dims={name:dict(active=name not in ['head_spin','shaft_spin'],nominal_weight=w,reliability=.85 if name=='head_launch' else 1,score={'head_launch':85,'weight':85,'shaft_launch':65}.get(name,100),omission_reason='No spin target' if name in ['head_spin','shaft_spin'] else None) for name,w in h.WEIGHTS.items()}
  candidate=dict(listing_id='only',excluded=False,raw_fit_score=96.1731843575419,match_band='EXCELLENT_MATCH',suppressed=False,dimensions=dims,guardrail_gaps=dict(flex=0,loft=0,direction=0,head_launch=1,shaft_launch=2),confidence_components=dict(golfer=100,equipment=97.8021978021978,listing=100),confidence_score=99.23076923076923,confidence='HIGH',considerations=[])
  out=dict(normalised_requirements=copy.deepcopy(case['expected']['normalised_equals']),candidates=[candidate],presentation=dict(cards=[dict(listing_id='only',labels=['BEST_MATCH','BUDGET_OPTION'])],empty_state=False,unfilled_slots=['BEST_VALUE']),versions=dict(contract='MATCH_DRIVER_CONTRACT_V1.3',logic='DRIVER_MATCH_LOGIC_V1.2',heads='DRIVER_V1_2026-10-16',shafts='SHAFT_V1_2026-10-16'))
  h.check_archetype(case,out)
  for field,bad in [('raw_fit_score',0),('confidence','LOW'),('match_band','GOOD_MATCH'),('suppressed',True)]:
   broken=copy.deepcopy(out);broken['candidates'][0][field]=bad
   with self.subTest(field=field),self.assertRaises(AssertionError):h.check_archetype(case,broken)
  broken=copy.deepcopy(out);broken['normalised_requirements']['directional_target_numeric']=2
  with self.assertRaises(AssertionError):h.check_archetype(case,broken)
 def test_brand_filter_fit_snapshot_and_scope(self):
  probes=[p for p in h.read('boundary-probes.json') if p['stage']=='brand_marketplace']
  baseline=probe_oracle(probes[0]);selected=probe_oracle(probes[3])
  self.assertEqual(baseline['fit_snapshot'],selected['fit_snapshot'])
  self.assertEqual(selected['slots'],{'BEST_MATCH':'p','BEST_VALUE':'t','BUDGET_OPTION':'t'})
  self.assertEqual(probe_oracle(probes[11]),selected)
  broken=copy.deepcopy(selected);broken['fit_snapshot'][0]['score']+=1
  with self.assertRaises(AssertionError):h.equal(broken,probes[3]['expected'])
  for index in [4,5,6,7,8,13,14]:
   self.assertEqual(probe_oracle(probes[index])['unique_cards'],0)
 def test_resolved_requirement_manual_checks(self):
  cases={c['title']:c['expected']['normalised_equals'] for c in h.read('archetypes.json')}
  self.assertEqual(cases['Control objective']['forgiveness_requirement'],2.75)
  self.assertEqual(cases['Low flight']['head_launch_target_numeric'],1)
  self.assertEqual(cases['Low flight']['shaft_launch_target_numeric'],.5)
  self.assertEqual(cases['Low flight']['shaft_launch_target'],'MID_HIGH')
  self.assertIsNone(cases['Carry-only 230 yards']['shaft_weight_min_g'])
  self.assertIsNone(cases['Carry-only 230 yards']['preferred_loft_min_deg'])
  self.assertEqual(cases['Carry-only 230 yards']['shaft_flex_max_value'],3)
  self.assertEqual(cases['Measured speed overrides conflicting carry']['conflict_flags'],['SPEED_CARRY_CONFLICT'])
  self.assertEqual(cases['Two-way curvature']['conflict_flags'],['TWO_WAY_MISS'])
  self.assertTrue(all(not c['expected']['unresolved_decisions'] for c in h.read('archetypes.json')))
 def test_golden_arithmetic(self):
  self.assertAlmostEqual(100-(127.5+140+75)/89.5,96.1731843575419)
  self.assertAlmostEqual(.45*100+.35*((91*100-10*20)/91)+.2*100,99.23076923076923)
  self.assertAlmostEqual(.45*28+.35*100+.2*100,67.6)
  self.assertAlmostEqual(100-342.5/79.5,95.69182389937107)
if __name__=='__main__':unittest.main()
