export function validValue(v){return v&&typeof v==='object'&&!Array.isArray(v)&&JSON.stringify(v).length<=300000;}
export function validateImport(data){
 if(!data||data.format!=='vika-literatura-v1'||!Array.isArray(data.records)||data.records.length>5000)throw Error('Это не файл прогресса Вики');
 const ids=new Set();for(const r of data.records){if(!r||typeof r.id!=='string'||!/^[a-zA-Z0-9:_-]{1,160}$/.test(r.id)||ids.has(r.id)||!validValue(r.value)||!Number.isSafeInteger(r.updated)||r.updated<0)throw Error('В файле есть некорректные или повторные записи');ids.add(r.id);}
 return data.records;
}
export class Store extends EventTarget{
 records=new Map();pending=0;db=null;channel=null;
 async init(){this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('vika-literatura-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 this.db.onversionchange=()=>this.db.close();
 await this.refresh();this.channel=new BroadcastChannel('vika-progress');this.channel.onmessage=async()=>{await this.refresh();this.dispatchEvent(new Event('remote'));};return this;}
 async refresh(){const all=await new Promise((resolve,reject)=>{const r=this.db.transaction('records').objectStore('records').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});for(const r of all){if(!this.records.has(r.id)||this.records.get(r.id).updated<r.updated)this.records.set(r.id,r);}}
 get(id){return this.records.get(id)?.value||{};}
 async put(id,value){if(!validValue(value))throw Error('Слишком большой ответ');const before=this.records.get(id);const row={id,value:structuredClone(value),updated:Math.max(Date.now(),(before?.updated||0)+1)};this.records.set(id,row);this.pending++;this.dispatchEvent(new Event('status'));
 try{await new Promise((resolve,reject)=>{const tx=this.db.transaction('records','readwrite');const store=tx.objectStore('records');const request=store.get(id);request.onsuccess=()=>{const disk=request.result;if(disk&&disk.updated>(before?.updated||0)&&JSON.stringify(disk.value)!==JSON.stringify(value))store.put({id:'conflict-'+crypto.randomUUID(),updated:Date.now(),value:{originalId:id,other:disk.value,local:value}});store.put(row);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Запись отменена'));});this.channel.postMessage(id);}
 finally{this.pending--;this.dispatchEvent(new Event('status'));}}
 export(){return {format:'vika-literatura-v1',exportedAt:new Date().toISOString(),records:[...this.records.values()]};}
 async import(data){const records=validateImport(data);let conflicts=0;
 await new Promise((resolve,reject)=>{const tx=this.db.transaction('records','readwrite');const store=tx.objectStore('records');for(const incoming of records){const request=store.get(incoming.id);request.onsuccess=()=>{const current=request.result;if(!current)store.put(incoming);else if(JSON.stringify(current.value)!==JSON.stringify(incoming.value)){conflicts++;store.put({id:'conflict-'+crypto.randomUUID(),updated:Date.now(),value:{originalId:incoming.id,other:incoming.value,local:current.value,imported:true}});}};}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});await this.refresh();this.channel.postMessage('import');return conflicts;}
}
