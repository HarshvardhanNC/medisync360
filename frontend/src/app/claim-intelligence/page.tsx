"use client";
import { useState, useRef } from "react";

interface Deduction { item:string; claimed:number; allowed:number; deducted:number; reason:string; }
interface Factor { factor:string; status:string; impact:string; detail:string; }
interface ClaimResult {
  approval_probability:number; confidence_band:{low:number;high:number};
  total_claimed_amount:number; approved_amount:number; claim_efficiency_pct:number;
  deductions:Deduction[]; approval_breakdown:Factor[];
  final_decision_explanation:string; risk_score:number; risk_tier:string;
  recommendations:string[];
  metadata:{company:string;disease:string;sum_insured:number;network_hospital:boolean;waiting_completed:boolean;post_hosp_days:number};
}
interface CompareRow { company:string; approved_amount:number; total_deducted:number; claim_efficiency_pct:number; approval_probability:number; risk_score:number; risk_tier:string; hard_reject:boolean; }

const COMPANIES=["ICICI Lombard","HDFC ERGO","Star Health","Care Health","Niva Bupa","New India Assurance"];
const DISEASES=["Diabetes","Hypertension","Heart Disease","Asthma","Arthritis","Kidney Disease","Chronic Kidney Disease","Thyroid Disorder","Obesity","Sleep Apnea","COPD","Epilepsy","Liver Disease","Fever","Fracture","Appendicitis","Cancer","Maternity","Cataract","Hernia","Dengue","COVID-19","Pneumonia","Gallstones","Other"];
const TREATMENTS=["Surgery","Medical Management","Daycare","ICU","Emergency"];

const fmt=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const pct=(n:number)=>`${Math.round(n*100)}%`;
const riskColor=(s:number)=>s>=60?"#ef4444":s>=40?"#f97316":s>=20?"#f59e0b":"#10b981";
const probColor=(p:number)=>p>=0.75?"#10b981":p>=0.5?"#f59e0b":"#ef4444";

const S:Record<string,React.CSSProperties>={
  card:{background:"#18181b",border:"1px solid #27272a",borderRadius:12,padding:"1.5rem"},
  head:{fontSize:"0.9rem",fontWeight:600,color:"#fafafa",marginBottom:"1.25rem",display:"flex",alignItems:"center",gap:"0.5rem"},
  label:{display:"block",fontSize:"0.78rem",color:"#a1a1aa",fontWeight:500,marginBottom:"0.4rem"},
  input:{width:"100%",boxSizing:"border-box" as const,background:"#09090b",border:"1px solid #27272a",borderRadius:6,padding:"0.55rem 0.75rem",color:"#fafafa",fontSize:"0.875rem",outline:"none",fontFamily:"inherit"},
  select:{width:"100%",boxSizing:"border-box" as const,background:"#09090b",border:"1px solid #27272a",borderRadius:6,padding:"0.55rem 0.75rem",color:"#fafafa",fontSize:"0.875rem",cursor:"pointer",fontFamily:"inherit"},
};

function Dot({c}:{c:string}){return <span style={{width:8,height:8,borderRadius:"50%",background:c,display:"inline-block"}}/>;}
function Field({label,id,...p}:any){return <div><label style={S.label} htmlFor={id}>{label}</label><input id={id} style={S.input} {...p}/></div>;}
function Sel({label,id,options,...p}:any){return <div><label style={S.label} htmlFor={id}>{label}</label><select id={id} style={S.select} {...p}>{options.map((o:string)=><option key={o}>{o}</option>)}</select></div>;}
function Tog({id,name,checked,onChange,label}:any){
  return <label htmlFor={id} style={{display:"flex",alignItems:"center",gap:"0.6rem",cursor:"pointer"}}>
    <input type="checkbox" id={id} name={name} checked={checked} onChange={onChange} style={{display:"none"}}/>
    <div style={{width:34,height:18,borderRadius:99,background:checked?"#fafafa":"#27272a",position:"relative",transition:"background 0.2s"}}>
      <div style={{position:"absolute",top:2,left:checked?"calc(100% - 16px)":2,width:14,height:14,borderRadius:"50%",background:checked?"#09090b":"#71717a",transition:"left 0.2s"}}/>
    </div>
    <span style={{fontSize:"0.82rem",color:"#a1a1aa"}}>{label}</span>
  </label>;
}

function RiskGauge({score,tier}:{score:number;tier:string}){
  const c=riskColor(score);
  const r=36; const circ=2*Math.PI*r; const offset=circ*(1-score/100);
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.4rem"}}>
    <svg width="100" height="60" viewBox="0 0 100 60">
      <path d="M10,55 A40,40 0 0,1 90,55" fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round"/>
      <path d="M10,55 A40,40 0 0,1 90,55" fill="none" stroke={c} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${Math.PI*40}`} strokeDashoffset={`${Math.PI*40*(1-score/100)}`}
        style={{transition:"stroke-dashoffset 0.8s ease"}}/>
      <text x="50" y="52" textAnchor="middle" fill={c} fontSize="16" fontWeight="bold">{score}</text>
    </svg>
    <span style={{fontSize:"0.75rem",color:c,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{tier}</span>
  </div>;
}

function LiveTotal({form}:{form:any}){
  const bill=["room_rent","surgery_cost","medicines","diagnostics","ot_charges","blood_bank","miscellaneous"];
  const total=bill.reduce((s,k)=>s+(parseFloat(form[k])||0),0);
  const si=parseFloat(form.sum_insured)||0;
  const pctUsed=si>0?Math.min(total/si*100,100):0;
  const overSi=total>si&&si>0;
  return total>0?<div style={{...S.card,padding:"1rem",borderColor:overSi?"#7f1d1d":"#27272a"}}>
    <div style={{fontSize:"0.75rem",color:"#a1a1aa",marginBottom:"0.3rem"}}>Running Bill Total</div>
    <div style={{fontSize:"1.5rem",fontWeight:700,color:overSi?"#ef4444":"#fafafa"}}>{fmt(total)}</div>
    {si>0&&<>
      <div style={{height:4,background:"#27272a",borderRadius:2,marginTop:"0.5rem"}}>
        <div style={{height:"100%",width:`${pctUsed}%`,background:overSi?"#ef4444":"#10b981",borderRadius:2,transition:"width 0.3s"}}/>
      </div>
      <div style={{fontSize:"0.72rem",color:overSi?"#ef4444":"#71717a",marginTop:"0.25rem"}}>
        {overSi?`⚠ Exceeds SI by ${fmt(total-si)}`:`${pctUsed.toFixed(0)}% of ₹${(si/100000).toFixed(1)}L SI used`}
      </div>
    </>}
  </div>:null;
}

export default function ClaimIntelligencePage(){
  const [form,setForm]=useState({age:"",disease:"Fever",treatment_type:"Medical Management",company:"Star Health",sum_insured:"",waiting_completed:true,network_hospital:true,room_rent:"",surgery_cost:"",medicines:"",diagnostics:"",ot_charges:"",blood_bank:"",miscellaneous:""});
  const [loading,setLoading]=useState(false);
  const [comparing,setComparing]=useState(false);
  const [result,setResult]=useState<ClaimResult|null>(null);
  const [comparison,setComparison]=useState<CompareRow[]|null>(null);
  const [error,setError]=useState("");
  const ref=useRef<HTMLDivElement>(null);

  const onChange=(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>{
    const{name,value,type}=e.target;
    setForm(p=>({...p,[name]:type==="checkbox"?(e.target as HTMLInputElement).checked:value}));
  };

  const buildPayload=()=>({
    age:parseInt(form.age),disease:form.disease,treatment_type:form.treatment_type,company:form.company,
    sum_insured:parseFloat(form.sum_insured),waiting_completed:form.waiting_completed,network_hospital:form.network_hospital,
    room_rent:parseFloat(form.room_rent)||0,surgery_cost:parseFloat(form.surgery_cost)||0,
    medicines:parseFloat(form.medicines)||0,diagnostics:parseFloat(form.diagnostics)||0,
    ot_charges:parseFloat(form.ot_charges)||0,blood_bank:parseFloat(form.blood_bank)||0,
    miscellaneous:parseFloat(form.miscellaneous)||0,
  });

  const getFlaskUrl = () => {
    if (typeof window !== "undefined") {
      return `http://${window.location.hostname}:5001`;
    }
    return "http://localhost:5001";
  };

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault(); setLoading(true); setError(""); setResult(null); setComparison(null);
    try{
      const res=await fetch(`${getFlaskUrl()}/predict-claim`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(buildPayload())});
      if(!res.ok){const err=await res.json();throw new Error(err.error||"API Error");}
      setResult(await res.json());
      setTimeout(()=>ref.current?.scrollIntoView({behavior:"smooth"}),100);
    }catch(err:any){setError(err.message||"Could not reach Insurance AI on port 5001.");}
    finally{setLoading(false);}
  };

  const handleCompare=async()=>{
    setComparing(true); setError("");
    try{
      const res=await fetch(`${getFlaskUrl()}/compare-claim`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(buildPayload())});
      if(!res.ok)throw new Error("Compare failed");
      const d=await res.json();
      setComparison(d.comparison);
      setTimeout(()=>ref.current?.scrollIntoView({behavior:"smooth"}),100);
    }catch(err:any){setError(err.message);}
    finally{setComparing(false);}
  };

  return(
    <div style={{fontFamily:"Inter,Outfit,sans-serif",background:"#09090b",color:"#fafafa",minHeight:"100vh"}}>
      <div style={{textAlign:"center",padding:"2.5rem 1rem 1.5rem",borderBottom:"1px solid #27272a"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:99,padding:"0.3rem 1rem",fontSize:"0.75rem",color:"#818cf8",marginBottom:"1rem",letterSpacing:"0.05em"}}>
          ✦ AI-POWERED UNDERWRITING INTELLIGENCE v2
        </div>
        <h1 style={{fontSize:"clamp(1.75rem,4vw,2.75rem)",fontWeight:800,margin:"0 0 0.75rem",background:"linear-gradient(135deg,#fafafa,#a1a1aa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          Claim Intelligence System
        </h1>
        <p style={{color:"#71717a",maxWidth:600,margin:"0 auto",fontSize:"0.95rem",lineHeight:1.6}}>
          Multi-dimensional underwriting analysis across 6 insurers — 12 rule checks, Gradient Boosting ML, Risk Scoring &amp; AI Recommendations.
        </p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2rem",maxWidth:1260,margin:"0 auto",padding:"2rem 1rem 4rem"}}>
        <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>

          <section style={S.card}>
            <div style={S.head}><Dot c="#3b82f6"/>Policy &amp; Patient Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
              <Field label="Age (years)" id="age" name="age" type="number" placeholder="45" value={form.age} onChange={onChange} required min="1" max="100"/>
              <Sel label="Insurance Carrier" id="company" name="company" value={form.company} onChange={onChange} options={COMPANIES}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
              <Sel label="Admitting Diagnosis" id="disease" name="disease" value={form.disease} onChange={onChange} options={DISEASES}/>
              <Sel label="Treatment Modality" id="treatment_type" name="treatment_type" value={form.treatment_type} onChange={onChange} options={TREATMENTS}/>
            </div>
            <Field label="Sum Insured (₹)" id="sum_insured" name="sum_insured" type="number" placeholder="500000" value={form.sum_insured} onChange={onChange} required min="1"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginTop:"0.75rem"}}>
              <Tog id="waiting_completed" name="waiting_completed" checked={form.waiting_completed} onChange={onChange} label="Waiting Period Over"/>
              <Tog id="network_hospital" name="network_hospital" checked={form.network_hospital} onChange={onChange} label="In-Network Hospital"/>
            </div>
          </section>

          <section style={S.card}>
            <div style={S.head}><Dot c="#a855f7"/>Hospital Bill Breakdown (₹)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem"}}>
              <Field label="Room Rent" id="room_rent" name="room_rent" type="number" placeholder="0" value={form.room_rent} onChange={onChange}/>
              <Field label="Surgery / Procedure" id="surgery_cost" name="surgery_cost" type="number" placeholder="0" value={form.surgery_cost} onChange={onChange}/>
              <Field label="Medicines (IPD)" id="medicines" name="medicines" type="number" placeholder="0" value={form.medicines} onChange={onChange}/>
              <Field label="Diagnostics" id="diagnostics" name="diagnostics" type="number" placeholder="0" value={form.diagnostics} onChange={onChange}/>
              <Field label="OT Charges" id="ot_charges" name="ot_charges" type="number" placeholder="0" value={form.ot_charges} onChange={onChange}/>
              <Field label="Blood Bank" id="blood_bank" name="blood_bank" type="number" placeholder="0" value={form.blood_bank} onChange={onChange}/>
            </div>
            <div style={{marginTop:"0.75rem"}}>
              <Field label="Miscellaneous / Consumables" id="miscellaneous" name="miscellaneous" type="number" placeholder="0" value={form.miscellaneous} onChange={onChange}/>
            </div>
          </section>

          <LiveTotal form={form}/>

          {error&&<div style={{background:"rgba(220,38,38,0.08)",border:"1px solid #7f1d1d",borderRadius:8,padding:"0.75rem 1rem",color:"#fca5a5",fontSize:"0.85rem"}}>{error}</div>}

          <button type="submit" id="analyze-btn" disabled={loading} style={{padding:"0.9rem",background:loading?"#27272a":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fafafa",border:"none",borderRadius:8,fontWeight:700,fontSize:"1rem",cursor:loading?"not-allowed":"pointer",transition:"opacity 0.2s",letterSpacing:"0.02em"}}>
            {loading?"Consulting Underwriting Engine…":"⚡ Run Underwriting Analysis"}
          </button>
          <button type="button" id="compare-btn" onClick={handleCompare} disabled={comparing||!form.sum_insured} style={{padding:"0.75rem",background:"transparent",color:"#a1a1aa",border:"1px solid #27272a",borderRadius:8,fontWeight:600,fontSize:"0.875rem",cursor:"pointer",transition:"all 0.2s"}}>
            {comparing?"Comparing All Insurers…":"⇄ Compare Across All 6 Insurers"}
          </button>
        </form>

        <div ref={ref} style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
          {!result&&!comparison&&!loading&&(
            <div style={{...S.card,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:"1rem",color:"#52525b",textAlign:"center"}}>
              <div style={{fontSize:"3rem"}}>🔬</div>
              <div style={{fontWeight:600,color:"#71717a"}}>Awaiting Claim Data</div>
              <div style={{fontSize:"0.85rem",lineHeight:1.6,maxWidth:280}}>Fill in policy and bill details, then run analysis or compare across all 6 insurers.</div>
            </div>
          )}
          {result&&<ResultPanel result={result}/>}
          {comparison&&<ComparePanel rows={comparison}/>}
        </div>
      </div>
      <style>{`@media(max-width:768px){div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}

function ResultPanel({result}:{result:ClaimResult}){
  const p=result.approval_probability; const pc=probColor(p);
  const totalDed=result.total_claimed_amount-result.approved_amount;
  return <>
    <section style={S.card}>
      <div style={S.head}><Dot c={pc}/>Underwriting Forecast</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"1rem",alignItems:"center"}}>
        <div>
          <div style={{fontSize:"3rem",fontWeight:800,color:pc,lineHeight:1}}>{pct(p)}</div>
          <div style={{fontSize:"0.78rem",color:"#71717a",marginTop:"0.25rem"}}>
            Confidence: {pct(result.confidence_band.low)} – {pct(result.confidence_band.high)}
          </div>
          <div style={{marginTop:"0.5rem",display:"inline-block",padding:"0.25rem 0.75rem",borderRadius:99,background:`${riskColor(result.risk_score)}18`,color:riskColor(result.risk_score),fontSize:"0.75rem",fontWeight:700,border:`1px solid ${riskColor(result.risk_score)}44`}}>
            {result.risk_tier}
          </div>
        </div>
        <RiskGauge score={result.risk_score} tier={result.risk_tier}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem",marginTop:"1.25rem",borderTop:"1px solid #27272a",paddingTop:"1.25rem"}}>
        {[["Claimed",result.total_claimed_amount,"#a1a1aa"],["Approved",result.approved_amount,"#10b981"],["Deducted",totalDed,"#ef4444"]].map(([l,v,c])=>(
          <div key={l as string} style={{background:"#09090b",borderRadius:8,padding:"0.85rem",border:"1px solid #27272a"}}>
            <div style={{fontSize:"0.7rem",color:"#71717a",marginBottom:"0.3rem"}}>{l}</div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:c as string}}>{fmt(v as number)}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:"1rem",display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.5rem 0.75rem",background:"rgba(99,102,241,0.08)",borderRadius:6,border:"1px solid rgba(99,102,241,0.2)"}}>
        <span style={{fontSize:"0.75rem",color:"#818cf8"}}>⚡</span>
        <span style={{fontSize:"0.8rem",color:"#a1a1aa"}}>Claim Efficiency: <strong style={{color:"#fafafa"}}>{result.claim_efficiency_pct}%</strong> of bill recoverable</span>
      </div>
    </section>

    {result.recommendations.length>0&&(
      <section style={S.card}>
        <div style={S.head}><Dot c="#f59e0b"/>AI Recommendations</div>
        <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
          {result.recommendations.map((r,i)=>(
            <div key={i} style={{display:"flex",gap:"0.75rem",background:"#09090b",border:"1px solid #27272a",borderRadius:8,padding:"0.75rem"}}>
              <span style={{color:"#f59e0b",fontWeight:700,fontSize:"0.85rem",flexShrink:0}}>{i+1}.</span>
              <span style={{fontSize:"0.82rem",color:"#d4d4d8",lineHeight:1.5}}>{r}</span>
            </div>
          ))}
        </div>
      </section>
    )}

    {result.deductions.length>0&&(
      <section style={S.card}>
        <div style={S.head}><Dot c="#ef4444"/>Deduction Ledger</div>
        <div style={{overflowX:"auto",border:"1px solid #27272a",borderRadius:8}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.8rem"}}>
            <thead style={{background:"#09090b"}}>
              <tr>{["Item","Claimed","Allowed","Deducted"].map(h=><th key={h} style={{padding:"0.6rem 0.8rem",color:"#71717a",fontWeight:500,textAlign:"left",borderBottom:"1px solid #27272a"}}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {result.deductions.map((d,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #1a1a1e"}}>
                  <td style={{padding:"0.6rem 0.8rem",color:"#fafafa",fontWeight:500}}>{d.item}</td>
                  <td style={{padding:"0.6rem 0.8rem",color:"#71717a"}}>{fmt(d.claimed)}</td>
                  <td style={{padding:"0.6rem 0.8rem",color:"#10b981"}}>{fmt(d.allowed)}</td>
                  <td style={{padding:"0.6rem 0.8rem",color:"#f87171",fontWeight:700}}>{fmt(d.deducted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:"0.75rem",display:"flex",flexDirection:"column",gap:"0.4rem"}}>
          {result.deductions.map((d,i)=>(
            <div key={i} style={{background:"#09090b",border:"1px solid #27272a",borderRadius:6,padding:"0.6rem 0.75rem",fontSize:"0.78rem",color:"#71717a",lineHeight:1.5}}>
              <span style={{color:"#fafafa",fontWeight:500}}>{d.item}: </span>{d.reason}
            </div>
          ))}
        </div>
      </section>
    )}

    <section style={S.card}>
      <div style={S.head}><Dot c="#6366f1"/>Policy Checks ({result.approval_breakdown.length})</div>
      <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
        {result.approval_breakdown.map((f,i)=>{
          const pos=f.impact==="Positive"; const c=pos?"#10b981":"#f87171";
          return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"0.6rem 0",borderBottom:"1px solid #27272a"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:"0.85rem",color:"#fafafa",marginBottom:"0.15rem"}}>{f.factor}</div>
              <div style={{fontSize:"0.78rem",color:"#71717a",lineHeight:1.4}}>{f.detail}</div>
            </div>
            <span style={{fontSize:"0.7rem",fontWeight:600,padding:"0.2rem 0.5rem",borderRadius:4,background:`${c}18`,color:c,border:`1px solid ${c}33`,whiteSpace:"nowrap",marginLeft:"0.75rem"}}>{f.status}</span>
          </div>;
        })}
      </div>
    </section>

    <section style={{...S.card,borderLeft:`3px solid ${result.approved_amount>0?"#10b981":"#ef4444"}`}}>
      <div style={{fontSize:"0.72rem",fontWeight:700,color:result.approved_amount>0?"#10b981":"#ef4444",marginBottom:"0.5rem",textTransform:"uppercase",letterSpacing:"0.06em"}}>Executive Summary</div>
      <p style={{color:"#d4d4d8",lineHeight:1.65,fontSize:"0.9rem",margin:0}}>{result.final_decision_explanation}</p>
    </section>
  </>;
}

function ComparePanel({rows}:{rows:CompareRow[]}){
  return <section style={S.card}>
    <div style={S.head}><Dot c="#06b6d4"/>Policy Comparison — All 6 Insurers</div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.78rem"}}>
        <thead>
          <tr style={{background:"#09090b"}}>
            {["Insurer","Approved","Recovery%","Prob.","Risk","Verdict"].map(h=>(
              <th key={h} style={{padding:"0.6rem 0.75rem",color:"#71717a",fontWeight:500,textAlign:"left",borderBottom:"1px solid #27272a",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>{
            const rc=riskColor(r.risk_score); const pc=probColor(r.approval_probability);
            const best=i===0&&!r.hard_reject;
            return <tr key={r.company} style={{borderBottom:"1px solid #1a1a1e",background:best?"rgba(16,185,129,0.04)":"transparent"}}>
              <td style={{padding:"0.6rem 0.75rem",color:"#fafafa",fontWeight:600}}>
                {best&&<span style={{color:"#10b981",marginRight:"0.3rem"}}>★</span>}{r.company}
              </td>
              <td style={{padding:"0.6rem 0.75rem",color:r.hard_reject?"#ef4444":"#10b981",fontWeight:700}}>{r.hard_reject?"REJECTED":fmt(r.approved_amount)}</td>
              <td style={{padding:"0.6rem 0.75rem",color:"#fafafa"}}>{r.hard_reject?"—":`${r.claim_efficiency_pct}%`}</td>
              <td style={{padding:"0.6rem 0.75rem",color:pc,fontWeight:600}}>{pct(r.approval_probability)}</td>
              <td style={{padding:"0.6rem 0.75rem"}}>
                <span style={{color:rc,background:`${rc}18`,padding:"0.15rem 0.4rem",borderRadius:4,fontSize:"0.7rem",fontWeight:600}}>{r.risk_tier}</span>
              </td>
              <td style={{padding:"0.6rem 0.75rem",color:"#71717a",maxWidth:180}}>{r.hard_reject?"Ineligible under this policy":"Eligible for claim"}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <div style={{marginTop:"0.75rem",fontSize:"0.75rem",color:"#52525b"}}>★ = Best recovery amount for your bill profile</div>
  </section>;
}
