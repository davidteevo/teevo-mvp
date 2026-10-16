"""Rebuild deterministic QA fixtures; never writes the frozen reference inputs."""
import json, copy, hashlib
from pathlib import Path
P=Path(__file__).resolve().parent

def save(name,obj): (P/name).write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n')
def rows(name):
 a=json.loads((P/'reference'/f'{name}.json').read_text());return [dict(zip(a[0],r+[None]*(len(a[0])-len(r)))) for r in a[1:]]
heads=[r for r in rows('heads') if r['intelligence_version']=='DRIVER_V1']; shafts=rows('shafts')
def pick(rs,**kw): return next(r for r in rs if all(r.get(k)==v for k,v in kw.items()))
H={
 'fixed_draw':pick(heads,catalogue_key='adams|blue|2015'),
 'fixed_neutral':pick(heads,catalogue_key='adams|speedline-9064ls|2011'),
 'delta':pick(heads,hosel_loft_adjustment_type='DELTA_RANGE',match_eligible='TRUE'),
 'published':pick(heads,hosel_loft_adjustment_type='PUBLISHED_SETTINGS',match_eligible='TRUE'),
 'fade':pick(heads,directional_bias='FADE',match_eligible='TRUE'),
 'mini':pick(heads,driver_subtype='MINI'),
 'ineligible':pick(heads,match_eligible='FALSE'),
}
S={
 'regular':pick(shafts,match_eligibility='MATCH_ELIGIBLE',match_flex_value='2'),
 'stiff':pick(shafts,match_eligibility='MATCH_ELIGIBLE',match_flex_value='3'),
 'soft':pick(shafts,match_eligibility='MATCH_ELIGIBLE',match_flex_value='0'),
 'unmapped':pick(shafts,match_eligibility='MATCH_ELIGIBLE',match_flex_mapping_status='UNMAPPED_TO_NORMALISED_FLEX'),
 'weight_unknown':pick(shafts,match_eligibility='MATCH_ELIGIBLE',match_weight_confidence='UNRESOLVED'),
 'launch_conflict':pick(shafts,match_eligibility='MATCH_ELIGIBLE',match_launch_resolution_status='SOURCE_CONFLICT'),
 'recognition':pick(shafts,match_eligibility='RECOGNITION_ONLY'),
 'quarantined':pick(shafts,match_eligibility='QUARANTINED'),
 'excluded':pick(shafts,match_eligibility='EXCLUDED_SCOPE'),
}
save('equipment-fixtures.json',{'heads':H,'shafts':S,'note':'Verbatim frozen records. Fixture aliases are local test names, not production identities.'})
base=dict(handedness='RIGHT',handicap=10,club_speed_mph=95,ball_speed_mph=None,launch_angle_deg=None,spin_rate_rpm=None,attack_angle_deg=None,carry_distance_yards=None,typical_trajectory='MID',typical_start_direction='CENTRE',typical_curvature='STRAIGHT',miss_severity='MODERATE',strike_pattern='CENTRE',strike_consistency='MEDIUM',current_driver_key=None,current_loft_deg=None,current_shaft_key=None,current_flex_raw=None,current_club_satisfaction='UNKNOWN',primary_objective='DISTANCE',budget_max_gbp=250,input_source='QUESTIONNAIRE',input_confidence='HIGH')
base_req=dict(handedness='RIGHT',recommendation_intent='UNANCHORED',head_launch_target='MID',head_spin_target='UNRESOLVED',forgiveness_requirement=3,stability_requirement=3,directional_target_numeric=0,directional_requirement='NEUTRAL',workability_preference=2,driver_subtype_allowed='STANDARD',preferred_loft_min_deg=9,preferred_loft_max_deg=11.5,shaft_weight_min_g=50,shaft_weight_max_g=65,shaft_flex_min_value=2,shaft_flex_max_value=3,shaft_launch_target='MID',shaft_spin_target='UNRESOLVED',shaft_torque_target_deg=None,conflict_flags=[])
cases=[]
def add(title,raw=None,expect=None,omit=(),issues=(),notes='',pool='standard',codes=()):
 r=base| (raw or {}); e=base_req|(expect or {})
 for k in omit:e.pop(k,None)
 cases.append(dict(id=f'A{len(cases)+1:02}',title=title,raw_inputs=r,expected=dict(normalised_equals=e,unresolved_decisions=list(issues),territory_notes=notes,exclusions_and_guardrails=['GATES','CRITICAL_MISMATCH'],match_band_confidence_behaviour='BANDS_AND_CONFIDENCE',marketplace_expectations='PRESENTATION',required_considerations=list(codes)),inventory_pool=pool,source_sections=['contract §§4–5,8–13','logic §§8–19,20–39,44,48']))
# 12 explicit directional cases, mirrored inputs (absolute LEFT/RIGHT observations).
for hand in ['RIGHT','LEFT']:
 for name,start,curve,sev,target in [('push-slice','RIGHT','RIGHT','LARGE',2),('pull-fade','LEFT','RIGHT','MODERATE',1),('push-draw','RIGHT','LEFT','MODERATE',-1),('pull-hook','LEFT','LEFT','LARGE',-2),('straight push','RIGHT','STRAIGHT','MODERATE',.5),('small fade','CENTRE','RIGHT','SMALL',1.005)]:
  if hand=='LEFT':start={'LEFT':'RIGHT','RIGHT':'LEFT'}.get(start,start);curve={'LEFT':'RIGHT','RIGHT':'LEFT'}.get(curve,curve)
  fg,st={'LARGE':(3.75,4),'MODERATE':(3.5,3.5),'SMALL':(3.25,3.25)}[sev]
  quarter=sev in ('LARGE','SMALL')
  add(f'{hand.title()} handed {name}',dict(handedness=hand,typical_start_direction=start,typical_curvature=curve,miss_severity=sev),dict(handedness=hand,directional_target_numeric=target,forgiveness_requirement=fg,stability_requirement=st),omit=['directional_requirement']+(['forgiveness_requirement','stability_requirement'] if quarter else []),issues=['D02']+(['D01'] if quarter else []),notes=f'Directional numeric target {target}; pre-quantisation forgiveness/stability {fg}/{st}. Support, never a promise to correct swing.')
add('Two-way curvature',dict(typical_curvature='VARIABLE'),dict(directional_target_numeric=None,directional_requirement='UNRESOLVED',forgiveness_requirement=4,stability_requirement=4.5),issues=['D06'],notes='Two-way stability support; no invented neutral direction.')
add('Variable start with stable right curve',dict(typical_start_direction='VARIABLE',typical_curvature='RIGHT'),dict(directional_target_numeric=1.5,forgiveness_requirement=3.5,stability_requirement=3.5),omit=['directional_requirement'],issues=['D02','D06'])
add('Direction objective contradicts observed slice',dict(typical_start_direction='RIGHT',typical_curvature='RIGHT',primary_objective='REDUCE_LEFT_MISS'),dict(directional_target_numeric=1.25,forgiveness_requirement=3.5,stability_requirement=3.5,conflict_flags=['DIRECTION_INPUT_CONFLICT']),omit=['directional_requirement'],issues=['D02'],codes=['DIRECTION_INPUT_CONFLICT'])
add('Direction and trajectory skipped',dict(typical_start_direction='UNKNOWN',typical_curvature='UNKNOWN',typical_trajectory='UNKNOWN'),dict(directional_target_numeric=None,directional_requirement='UNRESOLVED',head_launch_target='UNRESOLVED',shaft_launch_target='UNRESOLVED'),notes='Omit direction and both launch dimensions; no neutral/MID default.')
# speed boundary territory: exact specified integer bands; extra fractional boundary probes below.
for speed,flex,weight,loft in [(79,[0,2],[40,55],[10.5,12.5]),(80,[1,2.5],[45,60],[10,12]),(89,[1,2.5],[45,60],[10,12]),(90,[2,3],[50,65],[9,11.5]),(99,[2,3],[50,65],[9,11.5]),(100,[2.5,4],[55,70],[8.5,10.5]),(109,[2.5,4],[55,70],[8.5,10.5]),(110,[3,5],[60,75],[8,10.5])]:
 add(f'Measured {speed} mph',dict(club_speed_mph=speed),dict(shaft_flex_min_value=flex[0],shaft_flex_max_value=flex[1],shaft_weight_min_g=weight[0],shaft_weight_max_g=weight[1],preferred_loft_min_deg=loft[0],preferred_loft_max_deg=loft[1]),notes='Measured speed selects broad region; no forced single flex.')
add('Slow speed inconsistent strike',dict(club_speed_mph=75,strike_consistency='LOW',strike_pattern='VARIABLE'),dict(forgiveness_requirement=4.5,stability_requirement=5,workability_preference=1.5,shaft_flex_min_value=0,shaft_flex_max_value=2,shaft_weight_min_g=40,shaft_weight_max_g=55,preferred_loft_min_deg=10.5,preferred_loft_max_deg=12.5))
add('Fast consistent golfer',dict(club_speed_mph=115,strike_consistency='HIGH'),dict(forgiveness_requirement=2.5,stability_requirement=2.5,workability_preference=2.5,shaft_flex_min_value=3,shaft_flex_max_value=5,shaft_weight_min_g=60,shaft_weight_max_g=75,preferred_loft_min_deg=8,preferred_loft_max_deg=10.5))
add('Fast golfer still needs forgiveness',dict(club_speed_mph=115,strike_consistency='LOW',primary_objective='FORGIVENESS'),dict(forgiveness_requirement=5,stability_requirement=5,workability_preference=1,shaft_flex_min_value=3,shaft_flex_max_value=5,shaft_weight_min_g=60,shaft_weight_max_g=75,preferred_loft_min_deg=8,preferred_loft_max_deg=10.5))
add('Low flight',dict(typical_trajectory='LOW'),dict(head_launch_target='MID_HIGH',preferred_loft_min_deg=9.5,preferred_loft_max_deg=12),omit=['shaft_launch_target'],issues=['D02'],notes='Shaft launch numeric +0.5 has no contract enum. Spin unresolved.')
add('High flight',dict(typical_trajectory='HIGH'),dict(head_launch_target='MID_LOW',preferred_loft_min_deg=8.5,preferred_loft_max_deg=11),omit=['shaft_launch_target'],issues=['D02'],notes='Shaft launch numeric -0.5 has no contract enum. Never prescribe low spin.')
add('Control objective',dict(primary_objective='CONTROL'),dict(stability_requirement=4,workability_preference=3.5),omit=['forgiveness_requirement'],issues=['D01'],notes='Pre-quantisation forgiveness 2.75. No players-head bonus.')
add('Low handicap inconsistent',dict(handicap=3,strike_consistency='LOW'),dict(forgiveness_requirement=4,stability_requirement=4.5,workability_preference=2),notes='Direct strike needs dominate; handicap does not prescribe low spin.')
add('High handicap consistent',dict(handicap=35,strike_consistency='HIGH'),dict(workability_preference=2),omit=['forgiveness_requirement','stability_requirement'],issues=['D01'],notes='Pre-quantisation forgiveness/stability 3.25; no forced max-forgiveness head.')
add('Carry-only 230 yards',dict(club_speed_mph=None,carry_distance_yards=230),dict(shaft_flex_min_value=2,shaft_flex_max_value=3),omit=['shaft_weight_min_g','shaft_weight_max_g','preferred_loft_min_deg','preferred_loft_max_deg'],issues=['D03'],codes=['SWING_SPEED_INFERRED_FROM_CARRY'],notes='Regular–Stiff; golfer confidence 90 before other deductions. Exact speed-band mapping unspecified.')
add('Measured speed overrides conflicting carry',dict(club_speed_mph=95,carry_distance_yards=290),omit=['conflict_flags'],issues=['D06'],notes='Retain 90–99 mph territory; flag speed/carry conflict, reduce confidence, never average.')
add('No speed or carry',dict(club_speed_mph=None),dict(shaft_flex_min_value=None,shaft_flex_max_value=None,shaft_weight_min_g=None,shaft_weight_max_g=None,preferred_loft_min_deg=None,preferred_loft_max_deg=None),codes=['SWING_SPEED_UNKNOWN'])
anchor=dict(current_driver_key=H['fixed_draw']['catalogue_key'],current_loft_deg=10.5,current_shaft_key=S['regular']['shaft_key'],current_flex_raw=S['regular']['flex'])
for sat,intent in [('HIGH','PRESERVE'),('MEDIUM','OPTIMISE'),('LOW','CORRECT')]:
 add(f'Current driver satisfaction {sat}',anchor|dict(current_club_satisfaction=sat),dict(recommendation_intent=intent),omit=[] if sat=='LOW' else ['preferred_loft_min_deg','preferred_loft_max_deg','head_launch_target','shaft_launch_target','directional_target_numeric','directional_requirement','forgiveness_requirement','stability_requirement','workability_preference','shaft_weight_min_g','shaft_weight_max_g','shaft_flex_min_value','shaft_flex_max_value'],issues=[] if sat=='LOW' else ['D04'],notes='No brand/model continuity bonus. '+('Do not anchor unsuitable current equipment.' if sat=='LOW' else 'Preserve satisfactory territory on unchanged dimensions; exact anchoring awaits D04.'))
add('Current driver unresolved despite satisfaction',dict(current_club_satisfaction='HIGH'),notes='UNANCHORED; no inferred same-brand preference.')
add('Eligible proprietary unmapped shaft',pool='unmapped',codes=['SHAFT_FLEX_UNMAPPED'],notes='Full Match eligibility retained; flex omitted, listing confidence -10; no L/A/R/S/X guess.')
add('Eligible shaft actual weight unknown',pool='weight_unknown',codes=['SHAFT_WEIGHT_UNKNOWN'],notes='Weight omitted; listing confidence -5 when relevant. Never use weight_class as grams.')
add('Shaft launch source conflict',pool='launch_conflict',notes='Shaft launch omitted; listing confidence -5 when relevant; no guessed category.')
add('Shaft identity cannot resolve',pool='identity_missing',notes='All candidates excluded from full Match; ordinary Browse may retain listing.')
add('No qualifying inventory',pool='none',notes='Empty recommendation state; persist unmet demand; no relaxed thresholds.')
add('Exactly one qualifying listing',pool='one',notes='One unique card maximum; omit redundant marketplace labels.')
add('Close fits at different prices',pool='price',notes='Same equipment Fit across prices; cheapest qualifying option may take value/budget label; no filler cards.')
add('Best fit above preferred budget',dict(budget_max_gbp=50),pool='one',notes='Best Match may remain above budget; show over-budget consideration and amount; no budget option.')
add('Sparse low-confidence questionnaire',dict(handicap=None,club_speed_mph=None,typical_start_direction='UNKNOWN',typical_curvature='UNKNOWN',miss_severity='UNKNOWN',typical_trajectory='UNKNOWN',strike_consistency='UNKNOWN',primary_objective='UNKNOWN',input_confidence='LOW'),dict(head_launch_target='UNRESOLVED',shaft_launch_target='UNRESOLVED',directional_target_numeric=None,directional_requirement='UNRESOLVED',shaft_flex_min_value=None,shaft_flex_max_value=None,shaft_weight_min_g=None,shaft_weight_max_g=None,preferred_loft_min_deg=None,preferred_loft_max_deg=None),notes='Golfer evidence 28. With HIGH active equipment evidence and complete listing, overall 67.6 = MEDIUM, not automatically LOW. Fit must not be reduced for sparse inputs.')
assert len(cases)==48,len(cases)
# Synthetic sellable configurations, not claims of real stock or physical adapter compatibility.
def listing(i,h='fixed_neutral',s='regular',price=200,**kw): return dict(listing_id=i,head_key=H[h]['catalogue_key'],shaft_key=S[s]['shaft_key'],handedness='RIGHT',stated_loft_deg=10.5,publicly_purchasable=True,price_gbp=price,condition='GOOD',seller_trust='STANDARD',delivery_days=3,**kw)
pools={'standard':[listing('neutral'),listing('draw','fixed_draw'),listing('fade','fade'),listing('delta','delta'),listing('published','published')], 'one':[listing('only')], 'none':[], 'price':[listing('expensive',price=300),listing('cheaper',price=220),listing('cheapest',price=180)]}
for s in ['unmapped','weight_unknown','launch_conflict']:pools[s]=[listing(s,s=s)]
pools['identity_missing']=[listing('missing')];pools['identity_missing'][0]['shaft_key']=None
for c in cases:
 c['inventory']=copy.deepcopy(pools[c.pop('inventory_pool')])
 for l in c['inventory']: l['handedness']=c['raw_inputs']['handedness']
save('archetypes.json',cases)
# Small stage-isolated probes with explicit hand-calculated expectations.
probes=[]
def probe(kind,inputs,expected,section):probes.append(dict(id=f'P{len(probes)+1:03}',stage=kind,inputs=inputs,expected=expected,source=f'logic §{section}'))
for value,expected in [(64.99,'DO_NOT_ACTIVELY_RECOMMEND'),(65,'GOOD_MATCH'),(74.99,'GOOD_MATCH'),(75,'VERY_GOOD_MATCH'),(84.99,'VERY_GOOD_MATCH'),(85,'EXCELLENT_MATCH'),(100,'EXCELLENT_MATCH')]:probe('band',{'score':value},{'band':expected},37)
for v,e in [(59.99,'LOW'),(60,'MEDIUM'),(79.99,'MEDIUM'),(80,'HIGH'),(100,'HIGH')]:probe('confidence_band',{'score':v},{'confidence':e},38)
for dim,points in [('minimum',[(0,100),(.5,90),(1,80),(1.5,67.5),(2,55),(3,30),(4,0)]),('direction',[(0,100),(.5,92.5),(1,85),(2,60),(3,35),(4,15)]),('launch',[(0,100),(.5,92.5),(1,85),(2,65),(3,40),(4,20)]),('loft',[(0,100),(.5,90),(.5001,75),(1,75),(1.5,55),(1.5001,30)]),('flex',[(0,100),(.5,90),(1,75),(1.5,55),(2,35),(2.0001,0)]),('weight',[(0,100),(5,85),(5.001,65),(10,65),(15,40),(15.001,20)])]:
 for gap,score in points:probe('dimension',dict(dimension=dim,gap=gap),{'score':score},'27–34')
probe('aggregate',{'dimensions':[{'weight':15,'reliability':1,'score':100},{'weight':10,'reliability':.85,'score':60},{'weight':6,'reliability':0,'score':0}]},{'score':85.53191489361703},26)
for dim,vals in [('flex',[(1.5,False,None),(1.5001,False,'GOOD_MATCH'),(2,False,'GOOD_MATCH'),(2.0001,True,None)]),('loft',[(1.5,False,None),(1.5001,False,'GOOD_MATCH'),(2.5,False,'GOOD_MATCH'),(2.5001,True,None)]),('direction',[(2.9999,False,None),(3,False,'GOOD_MATCH'),(3.9999,False,'GOOD_MATCH'),(4,True,None)])]:
 for gap,suppressed,ceiling in vals:probe('guardrail',dict(dimension=dim,gap=gap),dict(suppressed=suppressed,ceiling=ceiling),36)
for mode,extra,reachable in [('NONE',{},[10.5]),('DELTA_RANGE',{'min':-1,'max':1},[9.5,11.5]),('PUBLISHED_SETTINGS',{'settings':[9,10,12]},[9,10,12]),('PUBLISHED_SETTINGS',{'min':9,'max':12},[9,12]),('FACE_ANGLE_ONLY',{},[10.5]),('LIE_ONLY',{},[10.5]),('UNKNOWN',{},[10.5])]:probe('loft',dict(mode=mode,stated=10.5,**extra),{'reachable':reachable},22)
# Marketplace inputs are already scored stage fixtures; prices never enter Fit.
def cand(i,score,price,band=None,confidence='HIGH',suppressed=False):return dict(listing_id=i,score=score,price_gbp=price,band=band or ('EXCELLENT_MATCH' if score>=85 else 'VERY_GOOD_MATCH' if score>=75 else 'GOOD_MATCH' if score>=65 else 'DO_NOT_ACTIVELY_RECOMMEND'),confidence=confidence,suppressed=suppressed)
for label,cs,budget,slots in [
 ('7 point inclusive and 10 percent saving',[cand('a',90,300),cand('b',83,270)],None,{'BEST_MATCH':'a','BEST_VALUE':'b','BUDGET_OPTION':'b'}),
 ('7 points exceeded',[cand('a',90,300),cand('b',82.99,200)],None,{'BEST_MATCH':'a','BEST_VALUE':None,'BUDGET_OPTION':'b'}),
 ('saving below max threshold',[cand('a',90,300),cand('b',85,280)],None,{'BEST_MATCH':'a','BEST_VALUE':None,'BUDGET_OPTION':'b'}),
 ('20 pounds inclusive',[cand('a',90,150),cand('b',85,130)],None,{'BEST_MATCH':'a','BEST_VALUE':'b','BUDGET_OPTION':'b'}),
 ('Good cannot be Best Value',[cand('a',80,200),cand('b',74.99,100)],None,{'BEST_MATCH':'a','BEST_VALUE':None,'BUDGET_OPTION':'b'}),
 ('above budget Best Match',[cand('a',90,300),cand('b',85,230)],250,{'BEST_MATCH':'a','BEST_VALUE':'b','BUDGET_OPTION':'b'}),
 ('all over budget',[cand('a',90,300)],200,{'BEST_MATCH':'a','BEST_VALUE':None,'BUDGET_OPTION':None}),
 ('low confidence excluded from badges',[cand('a',95,300,confidence='LOW'),cand('b',80,200)],None,{'BEST_MATCH':'b','BEST_VALUE':None,'BUDGET_OPTION':'b'}),
 ('poor fit cannot fill cheap slot',[cand('a',64.99,10)],None,{'BEST_MATCH':None,'BEST_VALUE':None,'BUDGET_OPTION':None}),
 ('ceiling beats raw score',[cand('a',95,200,band='GOOD_MATCH'),cand('b',85,300)],None,{'BEST_MATCH':'b','BEST_VALUE':None,'BUDGET_OPTION':'a'}),
 ('suppressed candidate cannot reappear',[cand('a',95,100,suppressed=True),cand('b',80,200)],None,{'BEST_MATCH':'b','BEST_VALUE':None,'BUDGET_OPTION':'b'}),
 ('empty inventory',[],200,{'BEST_MATCH':None,'BEST_VALUE':None,'BUDGET_OPTION':None})]:probe('marketplace',dict(name=label,candidates=cs,budget=budget),dict(slots=slots,unique_cards=len(set(v for v in slots.values() if v))),39)
save('boundary-probes.json',probes)
manifest=[]
ids={'logic':'1ovD2By7sEz-Vzz0aMHeHVWK90kdfUfZ3sSNTM7z09Y0','contract':'1zJS-uVElhfEES6_9fKvRMGj0ARtHHbmAYsKsckcmqFE','architecture':'1GViaXpzn7mJuakiRXTtZ0BXVITr8FsAYw3OdxbZlrGs','principles':'10n5SY_PXm1vJ3u0s63fO0hIRB_LLrltNif4hLAnr83k','heads':'13-J2gwRk_z1KBXaCUZXxWVw4dWeHV1xRnPsm6oWIAVg','shafts':'1UHM2PPbC_xwWTZ1FPHlXmkfcsrdA6IZvsqfH-XiFWvI'}
for k,id in ids.items():
 file='reference/'+k+('.json' if k in ('heads','shafts') else '.txt'); data=(P/file).read_bytes()
 manifest.append(dict(name=k,file=file,sha256=hashlib.sha256(data).hexdigest(),url=f'https://docs.google.com/{"spreadsheets" if k in ("heads","shafts") else "document"}/d/{id}/edit',retrieved_date='2026-10-16',authority='live specified source; no archived content'))
save('source-manifest.json',dict(contract_version='MATCH_DRIVER_CONTRACT_V1.2',logic_version='DRIVER_MATCH_LOGIC_V1.1',dataset_freeze='2026-10-16',sources=manifest,counts=dict(heads=619,eligible_heads=610,shafts=2634,eligible_shafts=2394),excluded_archive_folder='14Q5hALvWMnCjFiT7kx8jL1oCgih9odd5'))
print(f'Built {len(cases)} archetypes and {len(probes)} stage probes')
# Explicit independently worked golden candidates. Medium head-launch reliability = .85;
# total active nominal weight 91; weighted denominator 89.5; deficits 127.5+140+75.
for c in cases:
 title=c['title']; golden={}
 if title=='Close fits at different prices':c['expected']['unresolved_decisions'].append('D07')
 if title in ['Exactly one qualifying listing','Best fit above preferred budget']:
  golden['only']={'raw_fit_score':96.1731843575419,'match_band':'EXCELLENT_MATCH','confidence':'HIGH','confidence_score':99.23076923076923,'suppressed':False}
 if title=='Close fits at different prices':
  for i in ['expensive','cheaper','cheapest']:golden[i]={'raw_fit_score':96.1731843575419,'match_band':'EXCELLENT_MATCH','confidence':'HIGH','confidence_score':99.23076923076923,'suppressed':False}
 if title=='Sparse low-confidence questionnaire':golden['neutral']={'raw_fit_score':100,'match_band':'EXCELLENT_MATCH','confidence':'MEDIUM','confidence_score':67.6,'suppressed':False}
 if title=='Eligible proprietary unmapped shaft':golden['unmapped']={'raw_fit_score':95.69182389937107,'match_band':'EXCELLENT_MATCH','confidence':'HIGH','suppressed':False}
 c['expected']['candidate_goldens']=golden
save('archetypes.json',cases)
# Gate and ingestion probes distinguish missing optional data from disallowed identities.
base_gate={'category':'DRIVER','subtype':'STANDARD','head_version':'DRIVER_V1','head_eligible':True,'conformity':'UNKNOWN','head_key_count':1,'shaft_key_count':1,'shaft_eligibility':'MATCH_ELIGIBLE','same_oem_variant':True,'purchasable':True,'handedness_matches':True,'usable_loft':True,'flex_mapping':'MAPPED','actual_weight_g':60}
probe('eligibility',base_gate,{'eligible':True},20)
for field,value in [('category','FAIRWAY'),('subtype','MINI'),('head_version','DRIVER_V2'),('head_eligible',False),('conformity','NON_CONFORMING'),('head_key_count',0),('shaft_key_count',0),('shaft_key_count',2),('shaft_eligibility','RECOGNITION_ONLY'),('shaft_eligibility','EXCLUDED_SCOPE'),('shaft_eligibility','QUARANTINED'),('same_oem_variant',False),('purchasable',False),('handedness_matches',False),('usable_loft',False)]:probe('eligibility',base_gate|{field:value},{'eligible':False},20)
probe('eligibility',base_gate|{'flex_mapping':'UNMAPPED_TO_NORMALISED_FLEX','actual_weight_g':None},{'eligible':True},20)
for raw,expected in [('',{'value':None,'diagnostic':False}),('not-a-number',{'value':None,'diagnostic':True}),('49',{'value':49,'diagnostic':False})]:probe('parse_number',{'raw':raw},expected,'contract §8')
save('boundary-probes.json',probes)
print(f'Final suite: {len(cases)} archetypes, {len(probes)} boundary probes')
# Approved marketplace-only extension. Existing golfer archetypes and frozen fixtures stay intact.
from brand_filter_probes import build_brand_probes
probes += build_brand_probes(len(probes))
save('boundary-probes.json',probes)
m=json.loads((P/'source-manifest.json').read_text())
m['marketplace_addendum']={'version':'MATCH_MARKETPLACE_BRAND_FILTER_V1','file':'BRAND_FILTER_V1.md','sha256':hashlib.sha256((P/'BRAND_FILTER_V1.md').read_bytes()).hexdigest(),'approved':'Founder approval in this conversation, 2026-10-16','live_sections':{'contract':17,'logic':56,'architecture':'Brand filter and availability — marketplace addendum V1'},'baseline_reference_snapshots':'Preserved before this addendum; use alongside BRAND_FILTER_V1.md'}
save('source-manifest.json',m)
print(f'With brand-filter addendum: {len(cases)} archetypes, {len(probes)} probes')
# Current implementation amendment; old reference snapshots remain immutable.
from resolve_suite import resolve
resolve()
