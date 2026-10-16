"""Fixture authoring for the versioned product decisions. Never import into production.
Expected JSON is checked in; Cursor adapter must only call production implementations.
"""
import json,math,hashlib
from pathlib import Path
P=Path(__file__).resolve().parent
KEYS=['forgiveness','stability','direction','head_launch','head_spin','workability','loft','flex','weight','shaft_launch','shaft_spin']
SPEED=[(80,[0,2],[40,55],[10.5,12.5]),(90,[1,2.5],[45,60],[10,12]),(100,[2,3],[50,65],[9,11.5]),(110,[2.5,4],[55,70],[8.5,10.5]),(math.inf,[3,5],[60,75],[8,10.5])]
def speed_region(s):return next((f,w,l) for lim,f,w,l in SPEED if s<lim)
def carry_region(c):return next(f for lim,f in [(180,[0,2]),(200,[2,2]),(220,[2,2]),(260,[2,3]),(280,[3,3]),(math.inf,[3,4])] if c<lim)
def category(x,direction=False):
 if x is None:return 'UNRESOLVED'
 n=0 if abs(x)<.5 else (1 if abs(x)<1.5 else 2)*(1 if x>0 else -1)
 return (['STRONG_FADE_ASSIST','FADE_ASSIST','NEUTRAL','DRAW_ASSIST','STRONG_DRAW_ASSIST'] if direction else ['LOW','MID_LOW','MID','MID_HIGH','HIGH'])[n+2]
def cl(x,a,b):return max(a,min(b,x))
def normalize(r,heads):
 # This authoring calculation is transparent, deterministic and separate from the SUT.
 src={k:set() for k in KEYS};flags=set();g,f,w=3,3,2
 for k in ['forgiveness','stability','workability']:src[k].add('BASELINE')
 h=r['handicap'];strike=r['strike_consistency'];obj=r['primary_objective'];traj=r['typical_trajectory'];start=r['typical_start_direction'];curve=r['typical_curvature'];severity=r['miss_severity'];speed=r['club_speed_mph'];carry=r['carry_distance_yards']
 def mod(a,b,c,source):
  nonlocal g,f,w
  g+=a;f+=b;w+=c
  for k,v in zip(['forgiveness','stability','workability'],[a,b,c]):
   if v:src[k].add(source)
 if h is not None:
  mod(*((0,0,.5) if h<6 else (0,0,0) if h<13 else (.25,.25,0) if h<21 else (.5,.5,-.25) if h<31 else (.75,.75,-.5)),'HANDICAP')
 if strike in ['HIGH','MEDIUM','LOW']:
  mod(*{'HIGH':(-.5,-.5,.5),'MEDIUM':(0,0,0),'LOW':(1,1.5,-.5)}[strike],'STRIKE_CONSISTENCY')
  for k in ['forgiveness','stability','workability']:src[k].add('STRIKE_CONSISTENCY')
 if r['strike_pattern']=='VARIABLE':mod(.5,.5,0,'STRIKE_PATTERN')
 sign=1 if r['handedness']=='RIGHT' else -1
 a={'LEFT':-.5,'RIGHT':.5}.get(start,0)*sign;b={'LEFT':-1.5,'RIGHT':1.5}.get(curve,0)*sign
 stable=start in ['LEFT','CENTRE','RIGHT'] or curve in ['LEFT','STRAIGHT','RIGHT'];raw=a+b
 ds=cl(raw*{'SMALL':.67,'MODERATE':1,'LARGE':1.33,'UNKNOWN':1}[severity],-2,2)
 os={'REDUCE_RIGHT_MISS':1.5*sign,'REDUCE_LEFT_MISS':-1.5*sign}.get(obj)
 if curve=='VARIABLE':
  direction=None;flags.add('TWO_WAY_MISS');mod(1,1.5,0,'BALL_FLIGHT')
 else:
  direction=cl(ds+.5*(os or 0),-2,2) if stable else os
  if stable:src['direction'].add('BALL_FLIGHT')
  if os is not None:src['direction'].add('PRIMARY_OBJECTIVE')
  if raw and severity!='UNKNOWN':mod(*{'SMALL':(.25,.25,0),'MODERATE':(.5,.5,0),'LARGE':(.75,1,0)}[severity],'BALL_FLIGHT')
  if os is not None and ds*os<0 and abs(ds)>=1 and abs(os)>=1:flags.add('DIRECTION_INPUT_CONFLICT')
  if (start=='UNKNOWN') != (curve=='UNKNOWN') or start=='VARIABLE':flags.add('DIRECTION_EVIDENCE_PARTIAL')
 mod(*{'FORGIVENESS':(1.5,1,-.5),'ACCURACY':(.5,1.5,0),'CONTROL':(-.25,1,1.5)}.get(obj,(0,0,0)),'PRIMARY_OBJECTIVE')
 ts={'LOW':1,'MID':0,'HIGH':-1}.get(traj);hs={'HIGHER_FLIGHT':1.5,'LOWER_FLIGHT':-1.5}.get(obj)
 launch=None if ts is None and hs is None else cl((ts or 0)+(hs or 0),-2,2)
 shaftlaunch=None if launch is None else cl((ts or 0)*.5+(0 if hs is None else .5 if hs>0 else -.5),-2,2)
 if ts is not None:
  src['head_launch'].add('TRAJECTORY');src['shaft_launch'].add('TRAJECTORY')
 if hs is not None:
  src['head_launch'].add('PRIMARY_OBJECTIVE');src['shaft_launch'].add('PRIMARY_OBJECTIVE')
 if ts is not None and hs is not None and ts*hs<0:flags.add('LAUNCH_INPUT_CONFLICT')
 current=heads.get(r['current_driver_key']);resolved=current is not None
 intent='UNANCHORED' if not resolved or r['current_club_satisfaction']=='UNKNOWN' else {'HIGH':'PRESERVE','MEDIUM':'OPTIMISE','LOW':'CORRECT'}[r['current_club_satisfaction']]
 usable=resolved and current['driver_subtype']=='STANDARD' and r['current_loft_deg'] is not None and r['current_loft_deg']>0 and r['current_club_satisfaction'] in ['HIGH','MEDIUM']
 flex=weight=loft=None
 if speed is not None:
  flex,weight,loft=speed_region(speed)
  for k in ['flex','weight','loft']:src[k].add('MEASURED_SPEED')
  if carry is not None and abs(sum(flex)/2-sum(carry_region(carry))/2)>=1:flags.add('SPEED_CARRY_CONFLICT')
 else:
  if carry is not None:flex=carry_region(carry);src['flex'].add('CARRY_PROXY')
  if usable:loft=[r['current_loft_deg']-1,r['current_loft_deg']+1];src['loft'].add('CURRENT_LOFT')
 if loft is not None:
  shift=cl((ts or 0)*.5+(0 if hs is None else .5 if hs>0 else -.5),-1,1);loft=[v+shift for v in loft]
  if ts:src['loft'].add('TRAJECTORY')
  if hs:src['loft'].add('PRIMARY_OBJECTIVE')
  if speed is not None and usable and max(loft[0]-r['current_loft_deg'],r['current_loft_deg']-loft[1],0)>1:flags.add('LOFT_EVIDENCE_CONFLICT')
 out=dict(handedness=r['handedness'],recommendation_intent=intent,head_launch_target=category(launch),head_launch_target_numeric=launch,head_spin_target='UNRESOLVED',forgiveness_requirement=cl(g,1,5),stability_requirement=cl(f,1,5),directional_target_numeric=direction,directional_requirement=category(direction,True),workability_preference=cl(w,1,5),driver_subtype_allowed='STANDARD',preferred_loft_min_deg=loft[0] if loft else None,preferred_loft_max_deg=loft[1] if loft else None,shaft_weight_min_g=weight[0] if weight else None,shaft_weight_max_g=weight[1] if weight else None,shaft_flex_min_value=flex[0] if flex else None,shaft_flex_max_value=flex[1] if flex else None,shaft_launch_target=category(shaftlaunch),shaft_launch_target_numeric=shaftlaunch,shaft_spin_target='UNRESOLVED',shaft_torque_target_deg=None,conflict_flags=sorted(flags))
 active=dict(forgiveness=True,stability=True,workability=True,direction=direction is not None,head_launch=launch is not None,shaft_launch=shaftlaunch is not None,head_spin=False,shaft_spin=False,loft=loft is not None,flex=flex is not None,weight=weight is not None)
 affected={'SPEED_CARRY_CONFLICT':['flex','weight','loft'],'DIRECTION_INPUT_CONFLICT':['direction'],'DIRECTION_EVIDENCE_PARTIAL':['direction'],'TWO_WAY_MISS':['direction'],'LAUNCH_INPUT_CONFLICT':['head_launch','shaft_launch','loft'],'LOFT_EVIDENCE_CONFLICT':['loft']}
 conf={}
 for k in KEYS:
  cf=sorted(code for code in flags if k in affected[code]);sources=sorted(src[k])
  if not active[k]:band='UNRESOLVED';sources=[]
  else:
   n=3 if 'MEASURED_SPEED' in sources else 1 if 'CARRY_PROXY' in sources else 2 if set(sources)-{'BASELINE','HANDICAP'} else 1
   n=min(n,{'HIGH':3,'MEDIUM':2,'LOW':1}[r['input_confidence']])
   if cf:n=max(1,n-1)
   band={1:'LOW',2:'MEDIUM',3:'HIGH'}[n]
  conf[k]=dict(band=band,source_codes=sources,conflict_codes=cf)
 out['requirement_confidence']=conf
 return out

def golfer_confidence(raw,flags):
 score=100
 speed,carry=raw['club_speed_mph'],raw['carry_distance_yards']
 if speed is None:score-=10 if carry is not None else 25
 for name,penalty in [('typical_start_direction',4),('typical_curvature',6),('typical_trajectory',6),('strike_consistency',6),('primary_objective',8)]:
  if raw[name] in [None,'UNKNOWN']:score-=penalty
 miss=raw['typical_curvature']=='VARIABLE' or raw['typical_start_direction'] in ['LEFT','RIGHT'] or raw['typical_curvature'] in ['LEFT','RIGHT']
 if miss and raw['miss_severity']=='UNKNOWN':score-=3
 if raw['handicap'] is None:score-=2
 score-={'HIGH':0,'MEDIUM':5,'LOW':15}[raw['input_confidence']]
 if 'DIRECTION_INPUT_CONFLICT' in flags:score-=10
 if 'SPEED_CARRY_CONFLICT' in flags:score-=5
 if set(flags)&{'LAUNCH_INPUT_CONFLICT','LOFT_EVIDENCE_CONFLICT'}:score-=5
 if raw['typical_start_direction']=='VARIABLE' or raw['typical_curvature']=='VARIABLE':score-=5
 return cl(score,0,100)

def resolve():
 cases=json.loads((P/'archetypes.json').read_text());a=json.loads((P/'reference/heads.json').read_text());heads={r[a[0].index('catalogue_key')]:dict(zip(a[0],r)) for r in a[1:] if len(r)>a[0].index('catalogue_key')}
 for c in cases:
  c['expected']['normalised_equals']=normalize(c['raw_inputs'],heads)
  c['expected']['unresolved_decisions']=[]
  c['expected']['golfer_evidence_score']=golfer_confidence(c['raw_inputs'],c['expected']['normalised_equals']['conflict_flags'])
  c['expected']['territory_notes']='Current exact vector uses RULES_V1_2.md; no rounding, guessed carry weight/loft or broad equipment anchoring. Original scenario: '+c['title']
  c['expected']['required_considerations']=sorted(set(c['expected']['required_considerations'])|set(c['expected']['normalised_equals']['conflict_flags']))
  c['source_sections'].append('RULES_V1_2.md: D01–D07 overrides')
 (P/'archetypes.json').write_text(json.dumps(cases,indent=2,ensure_ascii=False)+'\n')
 probes=json.loads((P/'boundary-probes.json').read_text())
 def add(stage,inputs,expected):probes.append(dict(id=f'P{len(probes)+1:03}',stage=stage,inputs=inputs,expected=expected,source='RULES_V1_2.md'))
 for gap,score in [(.25,95),(.75,85),(1.25,73.75)]:add('dimension',dict(dimension='minimum',gap=gap),dict(score=score))
 for x in [None,-2,-1.5,-1.4999,-.5,-.4999,0,.4999,.5,1.005,1.4999,1.5,2]:
  add('target_category',{'value':x},{'launch':category(x),'direction':category(x,True)})
 for v in [79.999,80,89.999,90,99.999,100,109.999,110]:
  f,w,l=speed_region(v);add('speed_region',{'speed':v},{'flex':f,'weight':w,'loft':l})
 for v in [179.999,180,199.999,200,219.999,220,259.999,260,279.999,280]:add('carry_region',{'carry':v},{'flex':carry_region(v),'weight':None,'loft':None})
 # Extra raw-input cases validate anchoring, conflict boundaries and numeric launch without enlarging archetype count.
 base=cases[16]['raw_inputs'].copy();base['club_speed_mph']=95
 current=dict(current_driver_key='adams|blue|2015',current_loft_deg=10.5,current_club_satisfaction='HIGH')
 for patch in [current|{'club_speed_mph':None},current|{'club_speed_mph':None,'primary_objective':'HIGHER_FLIGHT'},current|{'current_loft_deg':15},current|{'current_club_satisfaction':'LOW','club_speed_mph':None}, {'typical_trajectory':'LOW','primary_objective':'LOWER_FLIGHT'},{'typical_start_direction':'UNKNOWN','typical_curvature':'UNKNOWN','primary_objective':'REDUCE_RIGHT_MISS'},{'typical_curvature':'VARIABLE','primary_objective':'REDUCE_RIGHT_MISS'},{'club_speed_mph':95,'carry_distance_yards':280}]:
  raw=base|patch;add('requirements',{'raw_inputs':raw},{'normalised_requirements':normalize(raw,heads)})
 # Hand-calculated confidence and zero-evidence outputs.
 add('confidence_aggregate',{'golfer':28,'equipment':100,'listing':100},{'score':67.6,'confidence':'MEDIUM'})
 add('confidence_aggregate',{'golfer':-10,'equipment':100,'listing':120},{'score':55,'confidence':'LOW'})
 add('aggregate',{'dimensions':[]},{'score':None,'scorable':False,'reason':'NO_ACTIVE_FIT_DIMENSIONS'})
 # Explicit numeric confidence and deterministic listing-ID tie breaks.
 cs=[dict(listing_id=i,score=90,price_gbp=200,band='EXCELLENT_MATCH',confidence='HIGH',confidence_score=cf,suppressed=False) for i,cf in [('z',90),('b',95),('a',95)]]
 for seq in [cs,list(reversed(cs))]:add('marketplace',{'candidates':seq,'budget':None},{'slots':{'BEST_MATCH':'a','BEST_VALUE':None,'BUDGET_OPTION':'a'},'unique_cards':1})
 add('merge_labels',{'slots':{'BEST_MATCH':'a','BEST_VALUE':'b','BUDGET_OPTION':'b'}},{'cards':[{'listing_id':'a','labels':['BEST_MATCH']},{'listing_id':'b','labels':['BEST_VALUE','BUDGET_OPTION']}],'unfilled_slots':[]})
 add('money_saving',{'best_price_pence':20001,'candidate_price_pence':18001},{'qualifies':False})
 add('money_saving',{'best_price_pence':20001,'candidate_price_pence':18000},{'qualifies':True})
 # False uniqueness among eligible rows is forbidden; recognition-only match retains ambiguity.
 add('identity_resolution',{'matches':[{'key':'eligible','eligibility':'MATCH_ELIGIBLE'},{'key':'recognition','eligibility':'RECOGNITION_ONLY'}]}, {'resolved_key':None,'eligible':False,'reason':'AMBIGUOUS_IDENTITY'})
 (P/'boundary-probes.json').write_text(json.dumps(probes,indent=2,ensure_ascii=False)+'\n')
 m=json.loads((P/'source-manifest.json').read_text());m['contract_version']='MATCH_DRIVER_CONTRACT_V1.3';m['logic_version']='DRIVER_MATCH_LOGIC_V1.2';m['resolved_decisions']=['D01','D02','D03','D04','D05','D06','D07'];m['rules_amendment']={'file':'RULES_V1_2.md','sha256':hashlib.sha256((P/'RULES_V1_2.md').read_bytes()).hexdigest(),'precedence':'Overrides conflicting baseline source rules; frozen data unchanged'}
 (P/'source-manifest.json').write_text(json.dumps(m,indent=2)+'\n')
 print('Resolved suite:',len(cases),'archetypes;',len(probes),'probes')
if __name__=='__main__':resolve()
