const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, deps = {}, globals = {}) {
 const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module = {exports:{}};
 new Function('require','exports','module',...Object.keys(globals),source)(id => { assert.ok(id in deps, id); return deps[id]; },module.exports,module,...Object.values(globals));
 return module.exports;
}
const base='src/Editor/Rendering/';
const resolution=load(base+'upscale/previewResolution.ts');
const budget=load(base+'renderResourceBudget.ts');
assert.deepEqual(resolution.previewResolution(1920,1080,2),{ratio:2/3,width:1280,height:720});
assert.deepEqual(resolution.previewResolution(1080,1920,2),{ratio:2/3,width:720,height:1280});
assert.deepEqual(resolution.previewResolution(640,360,1),{ratio:1,width:640,height:360});
assert.deepEqual(resolution.previewResolution(640,360,2),{ratio:2,width:1280,height:720});
const small=new budget.RenderResourceBudget(100), a={},b={};
assert.equal(small.reserve(a,60),true); assert.equal(small.reserve(b,50),false);
assert.equal(small.reserve(a,30),true); assert.equal(small.reserve(b,50),true);
small.release(a);small.release(a);assert.equal(small.used,50);
let ratio=2,width=1920,height=1080,passes=0,releases=0,shouldFail=false;
const source={style:{opacity:''},parentElement:{},after(output){this.nextSibling=output;}};
const canvas={_canvas:source,getPixelRatio:()=>ratio,setPixelRatio(value){ratio=value;source.width=Math.floor(width*ratio);source.height=Math.floor(height*ratio);}};
const events={};
const layer={getCanvas:()=>canvas,width:()=>width,height:()=>height,on(name,fn){events[name]=fn;},off(){for(const key of Object.keys(events))delete events[key];},draw(){events['beforeDraw.previewUpscale']?.();events['draw.previewUpscale']?.();},batchDraw(){}};
const {attachPreviewUpscaling}=load(base+'upscale/PreviewSceneLayer.tsx',{
 'react':{},'react-konva':{},'react/jsx-runtime':{},'./store':{},'./previewResolution':resolution,'../renderResourceBudget':budget,
 './SpatialUpscaler':{acquireUpscaler:()=>({renderer:{draw(){passes++;if(shouldFail)throw Error('context lost');}},release(){releases++;}})},
},{window:{devicePixelRatio:2},document:{createElement:()=>({style:{},dataset:{},setAttribute(){},remove(){if(source.nextSibling===this)source.nextSibling=undefined;}})},console:{warn(){}}});
let detach=attachPreviewUpscaling(layer);
assert.equal(ratio,2/3);assert.equal(source.style.opacity,'0');assert.equal(source.nextSibling.width,3840);
assert.equal(passes,1);layer.draw();assert.equal(passes,2,'One upscale per Konva draw; no animation loop');
width=640;height=360;layer.draw();assert.equal(ratio,2);assert.equal(source.style.opacity,'');assert.equal(source.nextSibling,undefined);
assert.equal(budget.renderResourceBudget.used,0,'Small native previews release output memory');
width=1920;height=1080;layer.draw();assert.equal(ratio,2/3);
detach();assert.equal(ratio,2);assert.equal(source.style.opacity,'');assert.equal(budget.renderResourceBudget.used,0);
shouldFail=true;detach=attachPreviewUpscaling(layer);assert.equal(ratio,2,'GPU failure restores native resolution');
assert.equal(source.style.opacity,'','GPU failure reveals original canvas');const failures=passes;layer.draw();assert.equal(passes,failures,'Failed layer must not retry every frame');
detach();assert.equal(budget.renderResourceBudget.used,0);assert.ok(releases>=3);
console.log('Preview upscaling: landscape/portrait/retina sizing, shared budget, redraw lifecycle, resize, cleanup, and GPU fallback passed.');
