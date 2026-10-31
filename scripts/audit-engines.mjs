// Independent cases. Run against isolated copies after npm ci; never imports UI.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] || '/tmp/geospatial-flash-audit');
const imp = (name, path) => import(pathToFileURL(resolve(root, name, path)));
const { area } = await imp('deepseek', 'node_modules/@turf/turf/dist/esm/index.js');
const engines = {
 deepseek: (await imp('deepseek','src/core/engine.js')).evaluateCollection,
 glm: (await imp('glm','src/modules/qualityEngine.js')).runQualityAnalysis,
 mimo: fc => { const parsed = parseMimo(JSON.stringify(fc)); return parsed.ok ? impMimo(parsed.features) : { incidents: parsed.incidents }; }
};
const parseMimo = (await imp('mimo','src/core/dataLoader.js')).parseGeoJSONText;
const impMimo = (await imp('mimo','src/core/engine.js')).evaluateDataset;
const rect = (x=0,y=0,w=2,h=2) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]].map(([a,b])=>[-78.5+a*.0001,-.22+b*.0001]);
const geom = ring => ({type:'Polygon',coordinates:[ring]});
const a=rect(), clone=x=>structuredClone(x);
const output = {};
for (const name of Object.keys(engines)) {
 const data=JSON.parse(await readFile(resolve(root,name,'public/data/quito_predios_sinteticos.geojson'),'utf8'));
 const base=data.features.find(f=>f.geometry?.type==='Polygon');
 const feature=(geometry,id)=>({type:'Feature',properties:{...base.properties,id,id_predio:id,clave_catastral:`SYNTH-${id}`,area_terreno_m2:area(geometry)},geometry});
 const fc=geometries=>({type:'FeatureCollection',features:geometries.map((g,i)=>feature(g,`AUDIT-${i}`))});
 const cases={
  disjoint:fc([geom(a),geom(rect(3))]),
  overlap:fc([geom(a),geom(rect(1))]),
  edge:fc([geom(a),geom(rect(2))]),
  vertex:fc([geom(a),geom(rect(2,2))]),
  identical:fc([geom(a),geom(a)]),
  reversed_duplicate:fc([geom(a),geom([...a].reverse())]),
  bowtie:fc([geom([a[0],a[2],a[1],a[3],a[0]])]),
  hole_outside:fc([{type:'Polygon',coordinates:[a,rect(4,4,1,1)]}]),
  null_ring:fc([geom(a)]),
  malformed_multipolygon:fc([geom(a)]),
  missing_id:fc([geom(a)]),
  duplicate_id:fc([geom(a),geom(rect(3))]),
  null_feature:{type:'FeatureCollection',features:[null]},
  empty:{type:'FeatureCollection',features:[]},
  invalid_collection:{type:'FeatureCollection',features:'bad'},
  area_threshold:fc([geom(a)])
 };
 cases.null_ring.features[0].geometry.coordinates=[null];
 cases.malformed_multipolygon.features[0].geometry={type:'MultiPolygon',coordinates:[null]};
 delete cases.missing_id.features[0].properties.id; delete cases.missing_id.features[0].properties.id_predio;
 cases.duplicate_id.features[1].properties.id=cases.duplicate_id.features[0].properties.id;
 cases.duplicate_id.features[1].properties.id_predio=cases.duplicate_id.features[0].properties.id_predio;
 cases.area_threshold.features[0].properties.area_terreno_m2*=1.051;
 output[name]={};
 for(const [key,input] of Object.entries(cases)) {
  try {
   const r=engines[name](clone(input));const issues=r.issues||r.incidents||[];
   output[name][key]={codes:[...new Set(issues.map(i=>i.codigoRegla||i.codigo_regla||i.rule_code))],indicators:r.indicators,notEvaluated:r.notEvaluated||r.notEvaluatedRules,contacts:r.contacts||r.topology?.contacts};
  } catch(e){output[name][key]={error:e.message};}
 }
}
console.log(JSON.stringify(output,null,2));
