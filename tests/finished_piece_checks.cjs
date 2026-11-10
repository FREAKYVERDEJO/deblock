// Completed pieces retain words and image selection; image-off exports omit artwork.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
function element() {
  return { value:'', textContent:'', children:[], dataset:{}, handlers:{}, clientWidth:600,
    classList:{remove(){},toggle(){}},style:{setProperty(){}},
    addEventListener(type,handler){this.handlers[type]=handler;},
    append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},
    setAttribute(name,value){this[name]=value;},focus(){},close(){this.open=false;},
    showModal(){this.open=true;},decode:async()=>{},
    click(){if(!this.disabled)this.handlers.click?.();},
  };
}
(async()=>{
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  get('document-title').textContent='Untitled';
  const window={addEventListener(){},dispatchEvent(){}};
  const document={body:element(),getElementById:get,querySelectorAll:()=>[],createElement:element,addEventListener(){}};
  const context=vm.createContext({window,document,crypto:{randomUUID},CustomEvent:class{},
    fetch:async url=>({ok:true,json:async()=>url.includes('catalog')
      ? [{id:'sample',src:'/assets/art/sample.jpg',license:'CC0'}]
      : {title:'Test',instructions:'Test'}})});
  for(const name of ['writing-tools','aphorisms','app','art','modes'])
    vm.runInContext(fs.readFileSync(`deblock/web/${name}.js`,'utf8'),context);
  await vm.runInContext('loadExercise()',context);
  get('word').value='moon tide';get('word').handlers.input({});
  get('finish').handlers.click();
  assert.equal(get('chain-summary').textContent,'moon → tide');
  assert.equal(get('document-title').textContent,'Untitled');
  get('finish-dialog').close();
  await get('art-toggle').handlers.click();
  const selected=window.DeblockDocument.snapshot().artwork.id;
  await get('art-toggle').handlers.click();
  assert.equal(get('writing-art').hidden,true);
  assert.equal(window.DeblockDocument.snapshot().artwork,null);
  get('finish').handlers.click();
  assert.equal(get('finish-art').hidden,true);
  assert.equal(get('finish-art').children.length,0);
  await get('art-toggle').handlers.click();
  assert.equal(window.DeblockDocument.snapshot().artwork.id,selected,'Image on restores the selected artwork');
  get('finish').handlers.click();
  assert.equal(get('finish-art').children[0].src,'/assets/art/sample.jpg');
  get('finish-dialog').close();
  const story=window.DeblockWritingTools.createStory('one\ntwo\nthree',randomUUID);
  await window.DeblockDocument.load({words:[],draft:'',story,artwork:null});
  assert.equal(window.DeblockDocument.snapshot().artwork,null,'A different piece must not inherit hidden artwork');
  const enter=()=>get('word-form').handlers.submit({preventDefault(){}});
  get('word').value='first passage';get('word').handlers.input({});enter();
  assert.equal(window.DeblockDocument.snapshot().story.active,1);
  get('word').value='final word';get('word').handlers.input({});enter();
  assert.equal(window.DeblockDocument.snapshot().story.active,1);
  assert.equal(Boolean(get('finish-dialog').open),false);
  assert.equal(get('next-beat').textContent,'press ↵ for next beat');
  get('finish').handlers.click();
  assert.equal(get('chain-summary').textContent,'first → passage\n\nfinal → word');
  assert.equal(get('finish-dialog').open,true);
  console.log('PASS: Untitled, final word, image-off omission, selection restored, no artwork leakage, Enter advances but never finishes');
})().catch(error=>{console.error(error);process.exitCode=1;});
