#!/usr/bin/env python3
"""Standard-library QA harness. An external adapter supplies production results.
No Teevo production implementation is bundled or claimed to have passed.
"""
import argparse, copy, hashlib, json, math, shlex, subprocess, sys
from pathlib import Path
P=Path(__file__).resolve().parent
WEIGHTS={'forgiveness':15,'stability':15,'direction':13,'head_launch':10,'head_spin':6,'workability':5,'loft':14,'flex':10,'weight':5,'shaft_launch':4,'shaft_spin':3}
BANDS={'DO_NOT_ACTIVELY_RECOMMEND':0,'GOOD_MATCH':1,'VERY_GOOD_MATCH':2,'EXCELLENT_MATCH':3}
def read(n):return json.loads((P/n).read_text())
def equal(actual,expected,path='result'):
 if isinstance(expected,dict):
  assert isinstance(actual,dict),f'{path}: object required'
  for k,v in expected.items():assert k in actual,f'{path}.{k}: missing';equal(actual[k],v,f'{path}.{k}')
 elif isinstance(expected,list):
  assert isinstance(actual,list) and len(actual)==len(expected),f'{path}: list length/type'
  for i,v in enumerate(expected):equal(actual[i],v,f'{path}[{i}]')
 elif isinstance(expected,(int,float)) and not isinstance(expected,bool):
  assert isinstance(actual,(int,float)) and not isinstance(actual,bool) and math.isfinite(actual) and abs(actual-expected)<1e-7,f'{path}: {actual} != {expected}'
 else:assert type(actual)==type(expected) and actual==expected,f'{path}: {actual!r} != {expected!r}'
def band(v):return 'EXCELLENT_MATCH' if v>=85 else 'VERY_GOOD_MATCH' if v>=75 else 'GOOD_MATCH' if v>=65 else 'DO_NOT_ACTIVELY_RECOMMEND'
def confidence(v):return 'HIGH' if v>=80 else 'MEDIUM' if v>=60 else 'LOW'
def slots(cs,budget):
 cs=[c for c in cs if not c.get('suppressed') and BANDS[c['band']]>=1 and c['confidence'] in ('HIGH','MEDIUM')]
 cs.sort(key=lambda c:(-BANDS[c['band']],-c['score'],-c.get('confidence_score',{'HIGH':100,'MEDIUM':70}[c['confidence']]),c['listing_id']))
 # No invented tie-breaker: stage probes avoid unresolved exact ties except identical slot destination.
 best=cs[0] if cs else None
 near=[c for c in cs if BANDS[c['band']]>=2 and best['score']-c['score']<=7] if best else []
 if budget is not None and any(c['price_gbp']<=budget for c in near):near=[c for c in near if c['price_gbp']<=budget]
 value=min(near,key=lambda c:c['price_gbp']) if near else None
 if value and best['price_gbp']-value['price_gbp']+1e-9<max(20,.1*best['price_gbp']):value=None
 affordable=[c for c in cs if budget is None or c['price_gbp']<=budget]
 cheap=min(affordable,key=lambda c:c['price_gbp']) if affordable else None
 out={'BEST_MATCH':best['listing_id'] if best else None,'BEST_VALUE':value['listing_id'] if value else None,'BUDGET_OPTION':cheap['listing_id'] if cheap else None}
 return {'slots':out,'unique_cards':len(set(v for v in out.values() if v))}
def validate_assets():
 m=read('source-manifest.json')
 amendment=m['rules_amendment']
 assert hashlib.sha256((P/amendment['file']).read_bytes()).hexdigest()==amendment['sha256']
 addendum=m['marketplace_addendum']
 assert hashlib.sha256((P/addendum['file']).read_bytes()).hexdigest()==addendum['sha256']
 for s in m['sources']:assert hashlib.sha256((P/s['file']).read_bytes()).hexdigest()==s['sha256'],s['name']+' changed'
 def records(n):
  a=read('reference/'+n+'.json');assert len(a[0])==len(set(a[0]));return [dict(zip(a[0],r)) for r in a[1:]]
 hs=[r for r in records('heads') if r.get('intelligence_version')=='DRIVER_V1'];ss=records('shafts')
 assert len(hs)==619 and sum(r.get('match_eligible')=='TRUE' for r in hs)==610
 assert len(ss)==2634 and sum(r.get('match_eligibility')=='MATCH_ELIGIBLE' for r in ss)==2394
 assert len({r['catalogue_key'] for r in hs})==619
 eligible=[r for r in ss if r['match_eligibility']=='MATCH_ELIGIBLE']
 assert all(r['shaft_key'] for r in eligible)
 assert len({r['shaft_key'] for r in eligible})==2394
 nonnull=[r['shaft_key'] for r in ss if r.get('shaft_key')]
 assert len(nonnull)==len(set(nonnull))
 eq=read('equipment-fixtures.json')
 for kind,rs,key in [('heads',hs,'catalogue_key'),('shafts',ss,'shaft_key')]:
  source={r[key]:r for r in rs}
  for alias,r in eq[kind].items():
   # trailing empty cells are normalised to None by fixture extraction
   assert any(all(original.get(k)==v for k,v in r.items()) for original in rs),alias+' frozen row mismatch'
 cases=read('archetypes.json');assert len(cases)==48
 assert len({c['id'] for c in cases})==48
 fields=set(cases[0]['raw_inputs'])
 for c in cases:
  assert set(c['raw_inputs'])==fields
  for name in ['normalised_equals','territory_notes','exclusions_and_guardrails','match_band_confidence_behaviour','marketplace_expectations','unresolved_decisions']:assert name in c['expected']
  for l in c['inventory']:assert l['head_key'] in {r['catalogue_key'] for r in hs};assert l['shaft_key'] is None or l['shaft_key'] in {r['shaft_key'] for r in ss}
 return {'archetypes':len(cases),'boundary_probes':len(read('boundary-probes.json')),'frozen_heads':len(hs),'frozen_shafts':len(ss),'source_hashes':'PASS','fixture_keys':'PASS','production_execution':'NOT RUN'}
def check_archetype(case,result):
 equal(result['normalised_requirements'],case['expected']['normalised_equals'],case['id']+'.requirements')
 req=result['normalised_requirements'];assert 'budget_max_gbp' not in req and 'brand_ids' not in req and 'marketplace_preferences' not in req
 assert isinstance(req['requirement_confidence'],dict)
 for f in ['forgiveness_requirement','stability_requirement','workability_preference']:
  x=req[f];assert x is None or (1<=x<=5 and x*4==int(x*4)),f+' violates contract quarter-step domain'
 for f in ['head_launch_target','shaft_launch_target','head_spin_target','shaft_spin_target']:assert req[f] in ['LOW','MID_LOW','MID','MID_HIGH','HIGH','ANY','UNRESOLVED']
 assert req['head_spin_target']==req['shaft_spin_target']=='UNRESOLVED'
 byid={l['listing_id']:l for l in case['inventory']}
 candidates=result['candidates'];assert len({c['listing_id'] for c in candidates})==len(candidates)
 assert {c['listing_id'] for c in candidates}==set(byid),'Every input listing needs a scored or excluded trace'
 allcodes=set();market=[]
 for c in candidates:
  listing=byid[c['listing_id']]
  if c['listing_id'] in case['expected'].get('candidate_goldens',{}):equal(c,case['expected']['candidate_goldens'][c['listing_id']],case['id']+'.golden')
  if listing['shaft_key'] is None:assert c['excluded'] and c['exclusion_reasons'];continue
  assert not c['excluded'],'Frozen eligible exact shaft and usable configuration must not be hard-excluded for optional evidence'
  dims=c['dimensions'];assert set(dims)==set(WEIGHTS),'Trace all active and omitted dimensions'
  num=den=0
  for name,d in dims.items():
   equal(d['nominal_weight'],WEIGHTS[name]);assert d['reliability'] in [0,0.5,.85,1]
   if d['active']:
    assert d['reliability']>0 and 0<=d['score']<=100
    num+=d['score']*WEIGHTS[name]*d['reliability'];den+=WEIGHTS[name]*d['reliability']
   else:assert d['omission_reason'],'Omission must be explained'
  assert den>0;equal(c['raw_fit_score'],num/den)
  assert not dims['head_spin']['active'] and not dims['shaft_spin']['active']
  for target,dim in [('directional_target_numeric','direction'),('preferred_loft_min_deg','loft'),('shaft_flex_min_value','flex'),('shaft_weight_min_g','weight')]:
   if req[target] is None:assert not dims[dim]['active']
  for target,dim in [('head_launch_target','head_launch'),('shaft_launch_target','shaft_launch')]:
   if req[target]=='UNRESOLVED':assert not dims[dim]['active']
  fixture=read('equipment-fixtures.json')['shafts'];shaft=next(v for v in fixture.values() if v['shaft_key']==listing['shaft_key'])
  if shaft['match_flex_mapping_status']=='UNMAPPED_TO_NORMALISED_FLEX':assert not dims['flex']['active']
  if shaft['actual_weight_g'] is None:assert not dims['weight']['active']
  if shaft['match_launch_resolution_status']!='RESOLVED':assert not dims['shaft_launch']['active']
  # Independent verification of §36 from adapter's explicit assessed gaps.
  gaps=c['guardrail_gaps'];suppress=(gaps.get('flex') is not None and gaps['flex']>2) or (gaps.get('loft') is not None and gaps['loft']>2.5) or (gaps.get('direction') is not None and gaps['direction']>=4)
  cap=(gaps.get('flex') is not None and gaps['flex']>1.5) or (gaps.get('loft') is not None and gaps['loft']>1.5) or (gaps.get('direction') is not None and gaps['direction']>=3) or (gaps.get('head_launch',0) is not None and gaps.get('shaft_launch',0) is not None and gaps.get('head_launch',0)>=3 and gaps.get('shaft_launch',0)>=3)
  equal(c['suppressed'],bool(suppress))
  expected_band=band(c['raw_fit_score'])
  if cap and BANDS[expected_band]>1:expected_band='GOOD_MATCH'
  equal(c['match_band'],expected_band)
  cc=c['confidence_components'];equal(cc['golfer'],case['expected']['golfer_evidence_score']);equal(cc['equipment'],sum(WEIGHTS[n]*{1:100,.85:80,.5:50}[d['reliability']] for n,d in dims.items() if d['active'])/sum(WEIGHTS[n] for n,d in dims.items() if d['active']));equal(c['confidence_score'],.45*cc['golfer']+.35*cc['equipment']+.2*cc['listing'])
  for v in cc.values():assert 0<=v<=100
  equal(c['confidence'],confidence(c['confidence_score']))
  allcodes.update(c['considerations'])
  market.append(dict(listing_id=c['listing_id'],score=c['raw_fit_score'],band=c['match_band'],confidence=c['confidence'],suppressed=c['suppressed'],price_gbp=listing['price_gbp'],confidence_score=c['confidence_score']))
 for code in case['expected']['required_considerations']:assert code in allcodes,'Missing '+code
 # Stage tests cover exact slot selections. Integration accepts tied candidates rather than inventing D07 policy.
 pres=result['presentation'];ids=[c['listing_id'] for c in pres['cards']];assert len(ids)==len(set(ids))
 for card in pres['cards']:
  assert card['listing_id'] in byid
  scored=next(c for c in candidates if c['listing_id']==card['listing_id'])
  assert not scored['excluded'] and not scored['suppressed'] and scored['confidence']!='LOW' and BANDS[scored['match_band']]>=1
  assert 'match_score_internal' not in card and 'match_percentage' not in card,'Numeric score cannot lead V1 card'
  for label in card['labels']:
   assert label in ['BEST_MATCH','BEST_VALUE','BUDGET_OPTION']
   if label=='BEST_VALUE':assert BANDS[scored['match_band']]>=2
   if label=='BUDGET_OPTION' and case['raw_inputs']['budget_max_gbp'] is not None:assert byid[card['listing_id']]['price_gbp']<=case['raw_inputs']['budget_max_gbp']
 if not any(not c.get('excluded') and not c.get('suppressed') and c.get('confidence')!='LOW' and BANDS.get(c.get('match_band'),0)>=1 for c in candidates):assert pres['empty_state'] and not ids
 expected_slots=slots(market,case['raw_inputs']['budget_max_gbp'])['slots']
 expected_cards=[]
 for label in ['BEST_MATCH','BEST_VALUE','BUDGET_OPTION']:
  target=expected_slots[label]
  if target is not None:
   card=next((x for x in expected_cards if x['listing_id']==target),None)
   if card is None:card={'listing_id':target,'labels':[]};expected_cards.append(card)
   card['labels'].append(label)
 equal([{'listing_id':x['listing_id'],'labels':x['labels']} for x in pres['cards']],expected_cards)
 equal(pres['unfilled_slots'],[k for k,v in expected_slots.items() if v is None])
 equal(result['versions'],dict(contract='MATCH_DRIVER_CONTRACT_V1.3',logic='DRIVER_MATCH_LOGIC_V1.2',heads='DRIVER_V1_2026-10-16',shafts='SHAFT_V1_2026-10-16'))

def main():
 if not __debug__:raise RuntimeError('Run without -O: assertions are required for this QA harness')
 ap=argparse.ArgumentParser();ap.add_argument('--verify',action='store_true');ap.add_argument('--adapter',help='Command accepting suite JSON on stdin and returning result JSON on stdout');a=ap.parse_args()
 report=validate_assets()
 if a.verify:print(json.dumps(report,indent=2));return 0
 if not a.adapter:print('NOT RUN: pass --adapter to connect the Teevo implementation. Use --verify for artifact validation.',file=sys.stderr);return 2
 payload={'archetypes':read('archetypes.json'),'probes':read('boundary-probes.json'),'equipment':read('equipment-fixtures.json'),'reference_directory':str(P/'reference')}
 # Expected answers are deliberately excluded from the implementation adapter input.
 payload['archetypes']=[{k:v for k,v in c.items() if k in ['id','raw_inputs','inventory']} for c in payload['archetypes']]
 payload['probes']=[{k:v for k,v in c.items() if k!='expected'} for c in payload['probes']]
 cp=subprocess.run(shlex.split(a.adapter),input=json.dumps(payload),text=True,capture_output=True,timeout=120)
 if cp.returncode:print(cp.stderr,file=sys.stderr);return 1
 actual=json.loads(cp.stdout);failures=[]
 for c in read('archetypes.json'):
  try:check_archetype(c,actual['archetypes'][c['id']])
  except (AssertionError,KeyError,TypeError,ValueError,StopIteration) as e:failures.append({'id':c['id'],'error':str(e)})
 for p in read('boundary-probes.json'):
  try:equal(actual['probes'][p['id']],p['expected'],p['id'])
  except (AssertionError,KeyError,TypeError) as e:failures.append({'id':p['id'],'error':str(e)})
 pending=[]
 report.update(production_execution='FAIL' if failures else 'PASS — production-function assertions only; fitter/integration release gates remain',failures=failures,pending_decisions=pending)
 (P/'implementation-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
 return 1 if failures else 3 if pending else 0
if __name__=='__main__':sys.exit(main())
