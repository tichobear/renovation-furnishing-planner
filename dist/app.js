const STORAGE_KEY = 'hearthplan-v1';
const defaultCategories = ['Renovation','Living Room','Bedrooms','Dining','Kitchen','Appliances','Bathroom','Décor','Shipping','Miscellaneous'];
const statuses = ['Planning','Researching','Shortlisted','Selected','Ordered','Paid','Completed'];
const committedStatuses = new Set(['Selected','Ordered','Paid','Completed']);
const money = new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR',minimumFractionDigits:0,maximumFractionDigits:0});
const moneyExact = new Intl.NumberFormat('en-MY',{style:'currency',currency:'MYR',minimumFractionDigits:2,maximumFractionDigits:2});
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
const num = value => Number(value) || 0;
const landed = product => num(product.price) + num(product.shipping) + num(product.fees);
const itemCost = item => num(item.actual) || num(item.estimated);
const portability = window.HearthplanPortability;

const sampleData = {
  totalBudget: 42000,
  categories: [...defaultCategories],
  appSettings: {currency:'MYR'},
  customData: {},
  expenses: [
    {id:'e1',name:'Renovation Package',category:'Renovation',subcategory:'Main works',room:'Whole home',budget:10000,estimated:9688,actual:9688,paid:4800,seller:'Apex Reno Studio',status:'Selected',notes:'Includes painting, lighting points and carpentry labour.'},
    {id:'e2',name:'Dining Table',category:'Dining',subcategory:'Furniture',room:'Dining area',budget:2200,estimated:1890,actual:0,paid:0,seller:'Oak & Co.',status:'Shortlisted',notes:'Six-seater oak veneer.'},
    {id:'e3',name:'Bed Frame',category:'Bedrooms',subcategory:'Furniture',room:'Main bedroom',budget:1600,estimated:1450,actual:1450,paid:1450,seller:'Sleep Haus',status:'Paid',notes:'Queen platform bed.'},
    {id:'e4',name:'Mattress',category:'Bedrooms',subcategory:'Bedding',room:'Main bedroom',budget:2800,estimated:2599,actual:2599,paid:1000,seller:'Dream Rest',status:'Ordered',notes:'Medium-firm hybrid mattress.'},
    {id:'e5',name:'Refrigerator',category:'Appliances',subcategory:'Kitchen appliance',room:'Kitchen',budget:3200,estimated:2899,actual:0,paid:0,seller:'Senheng',status:'Researching',notes:'Target 500L inverter model.'},
    {id:'e6',name:'Water Heater',category:'Bathroom',subcategory:'Appliance',room:'Common bathroom',budget:650,estimated:579,actual:579,paid:579,seller:'HomePro',status:'Completed',notes:'Installation included.'}
  ],
  products: [
    {id:'p1',productName:'Sofa',category:'Living Room',optionName:'Luna 3-Seater',seller:'Urban Home',price:3299,shipping:180,fees:0,dimensions:'210 × 92 × 84 cm',link:'',notes:'Soft boucle, warm ivory.',rating:9,shortlisted:true},
    {id:'p2',productName:'Sofa',category:'Living Room',optionName:'Milo Modular',seller:'Maju Living',price:2499,shipping:120,fees:35,dimensions:'225 × 95 × 82 cm',link:'',notes:'Removable covers.',rating:8.5,shortlisted:true},
    {id:'p3',productName:'Sofa',category:'Living Room',optionName:'Compact 3-Seater',seller:'IKEA',price:1599,shipping:150,fees:0,dimensions:'198 × 88 × 80 cm',link:'',notes:'Good value, firmer seat.',rating:7.5,shortlisted:false},
    {id:'p4',productName:'Coffee Table',category:'Living Room',optionName:'Travertine Round',seller:'Nook Market',price:1180,shipping:90,fees:0,dimensions:'Ø 80 × 38 cm',link:'',notes:'Statement piece.',rating:9,shortlisted:true},
    {id:'p5',productName:'Coffee Table',category:'Living Room',optionName:'Oak Nesting Pair',seller:'Shopee',price:429,shipping:28,fees:12,dimensions:'70 × 45 cm',link:'',notes:'Flexible and practical.',rating:8,shortlisted:true},
    {id:'p6',productName:'TV Cabinet',category:'Living Room',optionName:'Fluted Media Console',seller:'Fortytwo',price:999,shipping:80,fees:0,dimensions:'180 × 42 × 50 cm',link:'',notes:'Cable management included.',rating:8.5,shortlisted:true},
    {id:'p7',productName:'Washing Machine',category:'Appliances',optionName:'10kg Front Load',seller:'Harvey Norman',price:2199,shipping:0,fees:0,dimensions:'60 × 65 × 85 cm',link:'',notes:'Inverter, steam wash.',rating:9,shortlisted:true},
    {id:'p8',productName:'Air Conditioner',category:'Appliances',optionName:'1.5HP Inverter',seller:'Aircon Pro',price:1699,shipping:0,fees:380,dimensions:'1.5 HP',link:'',notes:'Fees include standard installation.',rating:8.5,shortlisted:true}
  ],
  scenarios: [
    {id:'s1',name:'Pretty / Premium',productIds:['p1','p4','p6','p7','p8']},
    {id:'s2',name:'Value for Money',productIds:['p2','p5','p6','p7','p8']},
    {id:'s3',name:'Lowest Acceptable',productIds:['p3','p5','p7']}
  ]
};

let state = loadState();
let categories = [...state.categories];
let currentView = 'dashboard';
let pendingImport = null;

function loadState(){
  try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)); return parsed && Array.isArray(parsed.expenses) ? normalizeStoredState(parsed) : structuredClone(sampleData); }
  catch { return structuredClone(sampleData); }
}
function normalizeStoredState(value){
  return {
    ...value,
    totalBudget:num(value.totalBudget),
    categories:Array.isArray(value.categories)&&value.categories.length?[...new Set(value.categories.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))]:[...defaultCategories],
    appSettings:value.appSettings&&typeof value.appSettings==='object'?value.appSettings:{currency:'MYR'},
    customData:value.customData&&typeof value.customData==='object'?value.customData:{},
    expenses:Array.isArray(value.expenses)?value.expenses:[],
    products:Array.isArray(value.products)?value.products:[],
    scenarios:Array.isArray(value.scenarios)?value.scenarios:[]
  };
}
function saveState(){ state.categories=[...categories]; localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); renderAll(); }
function toast(message){ const el=document.getElementById('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2200); }
function escapeHtml(value=''){ return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function optionList(values,selected=''){ return values.map(v=>`<option value="${escapeHtml(v)}" ${v===selected?'selected':''}>${escapeHtml(v)}</option>`).join(''); }
function formObject(form){ return Object.fromEntries(new FormData(form).entries()); }
function downloadFile(filename,contents,type){
  const url=URL.createObjectURL(new Blob([contents],{type})); const anchor=document.createElement('a'); anchor.href=url; anchor.download=filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function buildCsvExport(kind){ return portability.buildCsvExport(kind,state); }
function exportCsv(kind){ const file=buildCsvExport(kind); downloadFile(file.filename,file.contents,'text/csv;charset=utf-8'); const label=kind==='scenarios'?'Scenario Comparator':kind==='shopping'?'Shopping Comparator':'Budget Tracker'; toast(`${label} CSV exported successfully`); }
function createBackup(){ return portability.createBackup(state,categories); }

function dashboardTotals(){
  const estimated=state.expenses.reduce((s,i)=>s+itemCost(i),0);
  const committed=state.expenses.filter(i=>committedStatuses.has(i.status)).reduce((s,i)=>s+itemCost(i),0);
  const paid=state.expenses.reduce((s,i)=>s+num(i.paid),0);
  return {estimated,committed,paid,remaining:num(state.totalBudget)-estimated};
}
function categoryTotals(items=state.expenses){
  return categories.map(category=>({category,total:items.filter(i=>i.category===category).reduce((s,i)=>s+itemCost(i),0)}));
}
function scenarioProducts(scenario){ return scenario.productIds.map(id=>state.products.find(p=>p.id===id)).filter(Boolean); }
function scenarioTotal(scenario){ return scenarioProducts(scenario).reduce((sum,p)=>sum+landed(p),0); }

function renderAll(){
  renderDashboard(); renderExpenses(); renderProducts(); renderScenarios(); populateSharedSelects();
}
function renderDashboard(){
  const t=dashboardTotals();
  document.getElementById('total-budget-display').textContent=money.format(state.totalBudget);
  const pct=state.totalBudget?Math.min(100,Math.round(t.estimated/state.totalBudget*100)):0;
  document.getElementById('budget-percent').textContent=`${pct}%`;
  document.getElementById('budget-ring').style.setProperty('--pct',`${pct*3.6}deg`);
  const metrics=[
    ['Estimated total',money.format(t.estimated),`${state.expenses.length} tracked items`],
    ['Confirmed / committed',money.format(t.committed),'Selected or later'],
    ['Amount paid',money.format(t.paid),`${t.committed?Math.round(t.paid/t.committed*100):0}% of committed`],
    ['Remaining budget',money.format(t.remaining),t.remaining>=0?'Based on current estimate':'Over the working budget']
  ];
  document.getElementById('metric-grid').innerHTML=metrics.map((m,i)=>`<article class="metric-card ${i===3&&t.remaining<0?'warning':''}"><span class="label">${m[0]}</span><strong>${m[1]}</strong><small>${m[2]}</small></article>`).join('');
  const totals=categoryTotals().filter(x=>x.total>0); const max=Math.max(...totals.map(x=>x.total),1);
  document.getElementById('category-bars').innerHTML=totals.length?totals.map(x=>`<div class="bar-row"><span>${x.category}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(3,x.total/max*100)}%"></div></div><strong>${money.format(x.total)}</strong></div>`).join(''):'<div class="empty-state">Add an expense to see your category breakdown.</div>';
  const outstanding=state.expenses.reduce((s,i)=>s+Math.max(0,itemCost(i)-num(i.paid)),0);
  const researching=state.expenses.filter(i=>['Planning','Researching','Shortlisted'].includes(i.status)).length;
  const shortlisted=state.products.filter(p=>p.shortlisted).length;
  document.getElementById('project-pulse').innerHTML=[['Outstanding to pay','Across all tracked costs',money.format(outstanding)],['Still deciding','Planning, research or shortlist',researching],['Shopping shortlist','Product options saved',shortlisted]].map(x=>`<div class="pulse-item"><div><strong>${x[0]}</strong><span>${x[1]}</span></div><div class="pulse-number">${x[2]}</div></div>`).join('');
}

function renderExpenses(){
  const q=document.getElementById('expense-search').value.toLowerCase(); const cat=document.getElementById('expense-category-filter').value;
  const rows=state.expenses.filter(i=>(!cat||i.category===cat)&&[i.name,i.category,i.room,i.seller].join(' ').toLowerCase().includes(q));
  const totalBudgeted=state.expenses.reduce((s,i)=>s+num(i.budget),0); const totalActual=state.expenses.reduce((s,i)=>s+num(i.actual),0); const t=dashboardTotals();
  document.getElementById('budget-summary').innerHTML=[['Budgeted items',money.format(totalBudgeted)],['Current estimate',money.format(t.estimated)],['Actual cost',money.format(totalActual)],['Outstanding',money.format(state.expenses.reduce((s,i)=>s+Math.max(0,itemCost(i)-num(i.paid)),0))]].map(x=>`<div class="summary-card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  document.getElementById('expense-table').innerHTML=rows.length?rows.map(i=>{
    const variance=num(i.budget)-num(i.actual); const outstanding=Math.max(0,itemCost(i)-num(i.paid));
    return `<tr><td class="item-cell"><strong>${escapeHtml(i.name)}</strong><span>${escapeHtml(i.subcategory||i.seller||'—')}</span></td><td>${escapeHtml(i.category)}<span class="subtle">${escapeHtml(i.room||'No room')}</span></td><td class="money">${money.format(i.budget)}</td><td class="money">${money.format(i.estimated)}</td><td class="money">${i.actual?money.format(i.actual):'—'}</td><td class="money">${money.format(i.paid)}</td><td class="money ${i.actual?(variance>=0?'positive':'negative'):''}">${i.actual?`${variance>=0?'+':''}${money.format(variance)}`:'—'}</td><td class="money">${money.format(outstanding)}</td><td><span class="status-badge" data-status="${i.status}">${i.status}</span></td><td><div class="row-actions"><button class="mini-button" data-action="edit-expense" data-id="${i.id}">Edit</button><button class="mini-button danger" data-action="delete-expense" data-id="${i.id}" aria-label="Delete ${escapeHtml(i.name)}">×</button></div></td></tr>`;
  }).join(''):'<tr><td colspan="10" class="empty-state">No expenses match this view.</td></tr>';
}

function renderProducts(){
  const q=document.getElementById('product-search').value.toLowerCase(); const shortlist=document.getElementById('shortlist-filter').checked;
  const rows=state.products.filter(p=>(!shortlist||p.shortlisted)&&[p.productName,p.optionName,p.seller,p.category].join(' ').toLowerCase().includes(q));
  const shortlisted=state.products.filter(p=>p.shortlisted); const best=state.products.reduce((a,b)=>!a||num(b.rating)>num(a.rating)?b:a,null);
  document.getElementById('shopping-summary').innerHTML=[['Saved options',state.products.length],['Shortlisted',shortlisted.length],['Shortlist value',money.format(shortlisted.reduce((s,p)=>s+landed(p),0))],['Highest score',best?`${num(best.rating).toFixed(1)} / 10`:'—']].map(x=>`<div class="summary-card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  document.getElementById('product-table').innerHTML=rows.length?rows.map(p=>`<tr><td class="item-cell"><strong>${escapeHtml(p.productName)}</strong><span>${escapeHtml(p.optionName)} · ${escapeHtml(p.category)}</span></td><td>${escapeHtml(p.seller||'—')}</td><td class="money">${money.format(p.price)}</td><td class="money">${money.format(num(p.shipping)+num(p.fees))}</td><td class="money"><strong>${money.format(landed(p))}</strong></td><td>${escapeHtml(p.dimensions||'—')}</td><td class="score">${num(p.rating).toFixed(1)}</td><td><button class="mini-button" data-action="toggle-shortlist" data-id="${p.id}" aria-label="Toggle shortlist">${p.shortlisted?'<span class="shortlist-star">★</span> Yes':'☆ No'}</button></td><td><div class="row-actions"><button class="mini-button" data-action="confirm-product" data-id="${p.id}">Confirm</button><button class="mini-button" data-action="edit-product" data-id="${p.id}">Edit</button><button class="mini-button danger" data-action="delete-product" data-id="${p.id}" aria-label="Delete ${escapeHtml(p.productName)}">×</button></div></td></tr>`).join(''):'<tr><td colspan="9" class="empty-state">No product options match this view.</td></tr>';
}

function renderScenarios(){
  const totals=state.scenarios.map(s=>({scenario:s,total:scenarioTotal(s)})); const min=Math.min(...totals.filter(x=>x.total>0).map(x=>x.total),Infinity);
  document.getElementById('scenario-comparison').innerHTML=totals.length?totals.map(({scenario:s,total})=>{
    const products=scenarioProducts(s); return `<article class="scenario-card ${total===min?'best':''}">${total===min?'<span class="badge-note">Lowest total</span>':''}<p class="eyebrow">${products.length} PRODUCT${products.length===1?'':'S'}</p><h3>${escapeHtml(s.name)}</h3><div class="scenario-total">${money.format(total)}</div><div class="scenario-products">${products.slice(0,4).map(p=>`<div class="scenario-product"><strong>${escapeHtml(p.productName)}</strong><span>${money.format(landed(p))}</span></div>`).join('')}${products.length>4?`<div class="subtle">+ ${products.length-4} more</div>`:''}${!products.length?'<div class="subtle">No products selected yet.</div>':''}</div><div class="scenario-actions"><button class="secondary-button" data-action="edit-scenario" data-id="${s.id}">Edit</button><button class="mini-button danger" data-action="delete-scenario" data-id="${s.id}">Delete</button></div></article>`;
  }).join(''):'<div class="panel empty-state">Create a scenario to compare combinations.</div>';
  const baselineSelect=document.getElementById('scenario-baseline'); const old=baselineSelect.value; baselineSelect.innerHTML=state.scenarios.map(s=>`<option value="${s.id}">Compare to ${escapeHtml(s.name)}</option>`).join(''); if(state.scenarios.some(s=>s.id===old)) baselineSelect.value=old;
  const baseline=state.scenarios.find(s=>s.id===baselineSelect.value)||state.scenarios[0]; const baseTotal=baseline?scenarioTotal(baseline):0;
  document.getElementById('scenario-table').innerHTML=totals.length?totals.map(({scenario:s,total})=>{
    const diff=total-baseTotal; const byCat={}; scenarioProducts(s).forEach(p=>byCat[p.category]=(byCat[p.category]||0)+landed(p)); const top=Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
    return `<tr><td><strong>${escapeHtml(s.name)}</strong></td><td>${s.productIds.length}</td><td class="money"><strong>${money.format(total)}</strong></td><td class="money ${diff<0?'positive':diff>0?'negative':''}">${diff===0?'Baseline':`${diff>0?'+':''}${money.format(diff)}`}</td><td>${top?`${escapeHtml(top[0])} · ${money.format(top[1])}`:'—'}</td></tr>`;
  }).join(''):'<tr><td colspan="5" class="empty-state">No scenarios to compare.</td></tr>';
}

function populateSharedSelects(){
  const filter=document.getElementById('expense-category-filter'); const selected=filter.value; filter.innerHTML='<option value="">All categories</option>'+optionList(categories,selected); filter.value=selected;
  document.querySelector('#expense-form [name="category"]').innerHTML=optionList(categories);
  document.querySelector('#expense-form [name="status"]').innerHTML=optionList(statuses);
  document.querySelector('#product-form [name="category"]').innerHTML=optionList(categories);
}
function switchView(view){
  currentView=view; document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===view)); document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const names={dashboard:['YOUR HOME, AT A GLANCE','Dashboard'],budget:['PROJECT COSTS','Budget Tracker'],shopping:['PRODUCT RESEARCH','Shopping Comparator'],scenarios:['WHAT-IF PLANNING','Scenario Comparator'],settings:['DATA & PREFERENCES','Settings']}; document.getElementById('section-kicker').textContent=names[view][0]; document.getElementById('page-title').textContent=names[view][1]; document.querySelector('.sidebar').classList.remove('open'); window.scrollTo({top:0,behavior:'smooth'});
}
function openExpense(id){
  const form=document.getElementById('expense-form'); form.reset(); populateSharedSelects(); const item=state.expenses.find(i=>i.id===id);
  document.getElementById('expense-dialog-title').textContent=item?'Edit expense':'Add expense';
  if(item) Object.entries(item).forEach(([k,v])=>{if(form.elements[k]) form.elements[k].value=v;}); else {form.elements.id.value='';form.elements.status.value='Planning';}
  document.getElementById('expense-dialog').showModal();
}
function openProduct(id){
  const form=document.getElementById('product-form'); form.reset(); populateSharedSelects(); const product=state.products.find(p=>p.id===id);
  document.getElementById('product-dialog-title').textContent=product?'Edit product option':'Add product option';
  if(product) Object.entries(product).forEach(([k,v])=>{if(form.elements[k]) form.elements[k].type==='checkbox'?form.elements[k].checked=!!v:form.elements[k].value=v;}); else {form.elements.id.value='';form.elements.rating.value='7';}
  updateLiveTotal(); document.getElementById('product-dialog').showModal();
}
function openScenario(id){
  const form=document.getElementById('scenario-form'); form.reset(); const scenario=state.scenarios.find(s=>s.id===id); const selected=new Set(scenario?.productIds||[]);
  form.elements.id.value=scenario?.id||''; form.elements.name.value=scenario?.name||''; document.getElementById('scenario-dialog-title').textContent=scenario?'Edit scenario':'Create scenario';
  document.getElementById('scenario-product-options').innerHTML=state.products.length?state.products.map(p=>`<label class="product-pick"><input type="checkbox" name="productIds" value="${p.id}" ${selected.has(p.id)?'checked':''}/><div><strong>${escapeHtml(p.productName)} — ${escapeHtml(p.optionName)}</strong><span>${escapeHtml(p.seller||'No seller')} · ${p.shortlisted?'Shortlisted':'Not shortlisted'}</span></div><strong>${money.format(landed(p))}</strong></label>`).join(''):'<div class="empty-state">Add product options first.</div>';
  document.getElementById('scenario-dialog').showModal();
}
function updateLiveTotal(){ const f=document.getElementById('product-form'); document.getElementById('live-landed-cost').textContent=moneyExact.format(num(f.elements.price.value)+num(f.elements.shipping.value)+num(f.elements.fees.value)); }

document.getElementById('main-nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)switchView(b.dataset.view);});
document.getElementById('menu-button').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
document.getElementById('add-expense').addEventListener('click',()=>openExpense()); document.getElementById('add-product').addEventListener('click',()=>openProduct()); document.getElementById('add-scenario').addEventListener('click',()=>openScenario());
document.getElementById('expense-search').addEventListener('input',renderExpenses); document.getElementById('expense-category-filter').addEventListener('change',renderExpenses); document.getElementById('product-search').addEventListener('input',renderProducts); document.getElementById('shortlist-filter').addEventListener('change',renderProducts); document.getElementById('scenario-baseline').addEventListener('change',renderScenarios);
document.getElementById('edit-budget').addEventListener('click',()=>{const f=document.getElementById('budget-form');f.elements.totalBudget.value=state.totalBudget;document.getElementById('budget-dialog').showModal();});
document.getElementById('budget-form').addEventListener('submit',e=>{e.preventDefault();state.totalBudget=num(e.currentTarget.elements.totalBudget.value);saveState();document.getElementById('budget-dialog').close();toast('Total budget updated');});
document.getElementById('expense-form').addEventListener('submit',e=>{e.preventDefault();const d=formObject(e.currentTarget);const item={id:d.id||uid(),name:d.name.trim(),category:d.category,subcategory:d.subcategory.trim(),room:d.room.trim(),budget:num(d.budget),estimated:num(d.estimated),actual:num(d.actual),paid:num(d.paid),seller:d.seller.trim(),status:d.status,notes:d.notes.trim()};const ix=state.expenses.findIndex(i=>i.id===item.id);if(ix>=0)state.expenses[ix]=item;else state.expenses.push(item);saveState();document.getElementById('expense-dialog').close();toast(ix>=0?'Expense updated':'Expense added');});
document.getElementById('product-form').addEventListener('input',updateLiveTotal);
document.getElementById('product-form').addEventListener('submit',e=>{e.preventDefault();const d=formObject(e.currentTarget);const p={id:d.id||uid(),productName:d.productName.trim(),category:d.category,optionName:d.optionName.trim(),seller:d.seller.trim(),price:num(d.price),shipping:num(d.shipping),fees:num(d.fees),dimensions:d.dimensions.trim(),link:d.link.trim(),notes:d.notes.trim(),rating:num(d.rating),shortlisted:e.currentTarget.elements.shortlisted.checked};const ix=state.products.findIndex(x=>x.id===p.id);if(ix>=0)state.products[ix]=p;else state.products.push(p);saveState();document.getElementById('product-dialog').close();toast(ix>=0?'Product option updated':'Product option added');});
document.getElementById('scenario-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.currentTarget);const id=data.get('id')||uid();const scenario={id,name:String(data.get('name')).trim(),productIds:data.getAll('productIds')};const ix=state.scenarios.findIndex(s=>s.id===id);if(ix>=0)state.scenarios[ix]=scenario;else state.scenarios.push(scenario);saveState();document.getElementById('scenario-dialog').close();toast(ix>=0?'Scenario updated':'Scenario created');});
document.getElementById('export-budget-csv').addEventListener('click',()=>exportCsv('budget'));
document.getElementById('export-shopping-csv').addEventListener('click',()=>exportCsv('shopping'));
document.getElementById('export-scenarios-csv').addEventListener('click',()=>exportCsv('scenarios'));
document.getElementById('export-all-data').addEventListener('click',()=>{downloadFile(`renovation-planner-backup-${portability.localDateStamp()}.json`,JSON.stringify(createBackup(),null,2),'application/json;charset=utf-8');toast('Backup exported successfully');});
document.getElementById('backup-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0]; const button=document.getElementById('import-backup'); const name=document.getElementById('backup-file-name'); const note=document.getElementById('restore-note'); pendingImport=null; button.disabled=true;
  if(!file){name.textContent='Only renovation planner .json backups are accepted';note.textContent='No file selected.';return;}
  name.textContent=file.name;
  try { const restored=normalizeStoredState(portability.parseBackupText(await file.text(),{defaultCategories,statuses})); pendingImport={file,restored}; button.disabled=false; note.textContent=`Ready to restore ${restored.expenses.length} budget items, ${restored.products.length} shopping options and ${restored.scenarios.length} scenarios.`; }
  catch(error){note.textContent=error instanceof Error?error.message:'This backup could not be read.';toast('Backup file is invalid — existing data was not changed');}
});
document.getElementById('import-backup').addEventListener('click',()=>{
  if(!pendingImport)return;
  const warning=`Import “${pendingImport.file.name}”?\n\nThis will replace all current budget items, shopping options, scenarios, categories, and app settings. This action cannot be undone unless you have another backup.`;
  if(!confirm(warning))return;
  state=pendingImport.restored; categories=[...state.categories]; saveState(); pendingImport=null; const input=document.getElementById('backup-file'); input.value=''; document.getElementById('backup-file-name').textContent='Only renovation planner .json backups are accepted'; document.getElementById('restore-note').textContent='Planner restored successfully.'; document.getElementById('import-backup').disabled=true; toast('Planner restored successfully');
});

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]'); if(!b)return; const {action,id}=b.dataset;
  if(action==='edit-expense')openExpense(id);
  if(action==='delete-expense'&&confirm('Delete this expense?')){state.expenses=state.expenses.filter(i=>i.id!==id);saveState();toast('Expense deleted');}
  if(action==='edit-product')openProduct(id);
  if(action==='delete-product'&&confirm('Delete this product option? It will also be removed from scenarios.')){state.products=state.products.filter(p=>p.id!==id);state.scenarios.forEach(s=>s.productIds=s.productIds.filter(x=>x!==id));saveState();toast('Product option deleted');}
  if(action==='toggle-shortlist'){const p=state.products.find(p=>p.id===id);if(p){p.shortlisted=!p.shortlisted;saveState();}}
  if(action==='confirm-product'){
    const p=state.products.find(p=>p.id===id); if(!p)return;
    state.expenses.push({id:uid(),name:`${p.productName} — ${p.optionName}`,category:p.category,subcategory:'Confirmed from shopping',room:'',budget:landed(p),estimated:landed(p),actual:landed(p),paid:0,seller:p.seller,status:'Selected',notes:p.notes}); saveState(); switchView('budget'); toast('Purchase added to Budget Tracker');
  }
  if(action==='edit-scenario')openScenario(id);
  if(action==='delete-scenario'&&confirm('Delete this scenario?')){state.scenarios=state.scenarios.filter(s=>s.id!==id);saveState();toast('Scenario deleted');}
});
document.getElementById('reset-data').addEventListener('click',()=>{if(confirm('Reset all saved changes and restore the sample data?')){state=structuredClone(sampleData);categories=[...state.categories];saveState();switchView('dashboard');toast('Sample data restored');}});

function registerWebMCP(){
  const context=document.modelContext; if(!context?.registerTool)return;
  const register=tool=>Promise.resolve(context.registerTool(tool)).catch(()=>{});
  register({name:'get_renovation_summary',title:'Get renovation summary',description:'Read the current budget totals and item counts shown in the planner.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({...dashboardTotals(),totalBudget:state.totalBudget,expenseCount:state.expenses.length,productCount:state.products.length,scenarioCount:state.scenarios.length})});
  register({name:'add_budget_expense',title:'Add budget expense',description:'Add a planned renovation or furnishing expense to the Budget Tracker.',inputSchema:{type:'object',properties:{name:{type:'string'},category:{type:'string',enum:categories},budget:{type:'number',minimum:0},estimated:{type:'number',minimum:0},status:{type:'string',enum:statuses}},required:['name','category','budget','estimated'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input?.name||!categories.includes(input.category))throw new Error('Valid name and category are required');const item={id:uid(),name:input.name,category:input.category,subcategory:'',room:'',budget:num(input.budget),estimated:num(input.estimated),actual:0,paid:0,seller:'',status:statuses.includes(input.status)?input.status:'Planning',notes:''};state.expenses.push(item);saveState();return {id:item.id,name:item.name,estimated:item.estimated};}});
}

populateSharedSelects(); renderAll(); registerWebMCP();
