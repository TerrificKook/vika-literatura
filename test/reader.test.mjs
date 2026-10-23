import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const json=name=>JSON.parse(readFileSync(new URL('../public/'+name,import.meta.url)));
const map=json('reader-map.json').tasks;
const official=json('official.json').sets.flatMap(s=>s.tasks);
const expert=json('expert-cases.json');
test('all original tasks, alternatives and rubrics have bounded reading regions',()=>{
 assert.equal(Object.keys(map).length,35);
 for(const task of [...official,...expert]){
  const entry=map[task.id];assert.ok(entry,task.id);
  for(const alt of task.alternatives?.length?task.alternatives:['default'])assert.ok(entry.question[alt]?.length,task.id+' '+alt);
 }
 for(const [id,entry] of Object.entries(map)){
  const regions=Object.values(entry).flatMap(v=>Array.isArray(v)?v:Object.values(v).flat());
  assert.ok(regions.length,id);
  for(const r of regions){assert.ok(Number.isInteger(r.page)&&r.page>=1&&r.page<=(id.includes('assembly')?59:106));assert.ok(r.y0>=0&&r.y1<=1&&r.y0<r.y1);assert.ok(r.x0>=0&&r.x1<=1&&r.x0<r.x1);}
 }
});
test('student regions do not overlap published expert feedback',()=>{
 for(const task of expert){const entry=map[task.id];assert.ok(entry.student.length);assert.ok(entry.feedback.length);
  for(const s of entry.student)for(const f of entry.feedback)if(s.page===f.page)assert.ok(s.y1<=f.y0||f.y1<=s.y0,task.id);
 }
});
test('public domain fallback texts are substantial and point to real assembly tasks',()=>{
 for(const entry of Object.values(json('classic-texts.json'))){assert.ok(entry.text.length>1000);for(const id of entry.taskIds)assert.ok(official.some(t=>t.id===id),id);}
});
