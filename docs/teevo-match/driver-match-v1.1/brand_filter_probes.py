"""Explicit marketplace expectations; synthetic stage fixtures, not fit predictions."""
import copy

def build_brand_probes(offset):
 def c(i,b,s,p,confidence='HIGH',suppressed=False,live=True):
  return dict(listing_id=i,head_brand_id=b,score=s,price_gbp=p,band='EXCELLENT_MATCH' if s>=85 else 'VERY_GOOD_MATCH' if s>=75 else 'GOOD_MATCH' if s>=65 else 'DO_NOT_ACTIVELY_RECOMMEND',confidence=confidence,suppressed=suppressed,publicly_purchasable=live)
 base=[c('a','adams',92,180),c('p','ping',90,300),c('t','taylormade',86,260),c('c','callaway',78,160)]
 known=['adams','ping','taylormade','callaway','benross']
 specs=[
  ('Missing selection means all brands',None,base,300,('a',None,'c'),'RESULTS'),
  ('Empty selection means all brands',[],base,300,('a',None,'c'),'RESULTS'),
  ('Single brand', ['ping'],base,300,('p',None,'p'),'RESULTS'),
  ('Multiple brands use OR and scoped value comparator',['ping','taylormade'],base,300,('p','t','t'),'RESULTS'),
  ('No selected brand stock',['benross'],base,300,(None,None,None),'NO_QUALIFYING_IN_SELECTED_BRANDS'),
  ('Selected brand below fit threshold',['ping'],[c('p','ping',64,100),base[0]],300,(None,None,None),'NO_QUALIFYING_IN_SELECTED_BRANDS'),
  ('Selected brand LOW confidence',['ping'],[c('p','ping',95,100,confidence='LOW'),base[0]],300,(None,None,None),'NO_QUALIFYING_IN_SELECTED_BRANDS'),
  ('Selected brand suppressed',['ping'],[c('p','ping',95,100,suppressed=True),base[0]],300,(None,None,None),'NO_QUALIFYING_IN_SELECTED_BRANDS'),
  ('Selected brand sold or hidden',['ping'],[c('p','ping',95,100,live=False),base[0]],300,(None,None,None),'NO_QUALIFYING_IN_SELECTED_BRANDS'),
  ('Budget applies inside selected brands',['ping','taylormade'],base,100,('p','t',None),'RESULTS'),
  ('Clearing filter restores all-brand scope',[],base,300,('a',None,'c'),'RESULTS'),
  ('Candidate permutation leaves non-tied outcome unchanged',['taylormade','ping'],list(reversed(base)),300,('p','t','t'),'RESULTS'),
  ('Duplicate selection normalizes',['ping','ping'],base,300,('p',None,'p'),'RESULTS'),
  ('No inventory with all brands',[],[],300,(None,None,None),'NO_QUALIFYING_INVENTORY'),
  ('No inventory with brand selection',['ping'],[],300,(None,None,None),'NO_QUALIFYING_IN_SELECTED_BRANDS'),
 ]
 out=[]
 for name,selected,cs,budget,winners,state in specs:
  slots=dict(zip(['BEST_MATCH','BEST_VALUE','BUDGET_OPTION'],winners))
  expected=dict(selected_brand_ids=sorted(set(selected or [])),scope='SELECTED_BRANDS' if selected else 'ALL_BRANDS',slots=slots,unique_cards=len(set(x for x in winners if x)),state=state,show_all_brands_action=bool(selected and state!='RESULTS'),fit_snapshot=[{k:v for k,v in x.items() if k in ['listing_id','score','band','confidence','suppressed']} for x in sorted(cs,key=lambda x:x['listing_id'])])
  out.append(dict(id=f'P{offset+len(out)+1:03}',stage='brand_marketplace',inputs=dict(name=name,selected_brand_ids=selected,known_brand_ids=known,candidates=copy.deepcopy(cs),budget=budget),expected=expected,source='BRAND_FILTER_V1.md / MATCH_MARKETPLACE_BRAND_FILTER_V1'))
 out.append(dict(id=f'P{offset+len(out)+1:03}',stage='brand_marketplace',inputs=dict(name='Unknown brand does not silently broaden selection',selected_brand_ids=['not-a-brand'],known_brand_ids=known,candidates=base,budget=300),expected={'error':'INVALID_BRAND_SELECTION'},source='BRAND_FILTER_V1.md / MATCH_MARKETPLACE_BRAND_FILTER_V1'))
 return out
