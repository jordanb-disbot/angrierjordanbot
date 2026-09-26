/** PostgreSQL JSONB reorders keys and can round floating coordinates by an ULP.
 * Compare render inputs canonically, retaining integers/identities exactly and
 * normalizing only sub-billionth fractional differences. Never used for payouts.
 */
export function presentationKey(value:unknown):string{
 const normalize=(v:unknown):unknown=>{
  if(typeof v==='number'&&!Number.isInteger(v))return Number(v.toFixed(9));
  if(Array.isArray(v))return v.map(normalize);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([,item])=>item!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,normalize(item)]));
  return v;
 };
 return JSON.stringify(normalize(value));
}
