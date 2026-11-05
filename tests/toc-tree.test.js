const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { spawn } = require('node:child_process')
const stylus = require('stylus')
const pug = require('pug')

const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(file => file && fs.existsSync(file))

function fixture () {
  const main = fs.readFileSync('themes/butterfly/source/js/main.js', 'utf8')
  const start = main.includes('  let cleanupToc =') ? main.indexOf('  let cleanupToc =') : main.indexOf('  const tocFn =')
  const code = main.slice(start, main.indexOf('\n  /**\n * Rightside', start))
  const aside = fs.readFileSync('themes/butterfly/source/css/_layout/aside.styl', 'utf8')
  const functions = fs.readFileSync('themes/butterfly/source/css/_global/function.styl', 'utf8')
  const mixins = functions.slice(functions.indexOf('maxWidth900()'), functions.indexOf('minWidth900()'))
  const css = stylus.render(`${mixins}\n$theme-toc-color = #00c4b6\n$toc-active-color = #fff\n$toc-mobile-width = 300px\n#aside-content\n${aside.slice(aside.indexOf('  // toc\n'), aside.indexOf('  :only-child\n'))}`)
  const numbers = { a: '1.', a2: '1.1.', a3: '1.1.1.', a4: '1.1.1.1.', b: '2.', b2: '2.1.', c: '3.' }
  const link = (id, label, children = '') => `<li class="toc-item"><a class="toc-link" href="#${id}"><span class="toc-number">${numbers[id]} </span><span class="toc-text">${label}</span></a>${children ? `<ol class="toc-child">${children}</ol>` : ''}</li>`
  const tree = `<ol class="toc">${link('a', '第一章', link('a2', '第二层', link('a3', '第三层', link('a4', '第四层'))))}${link('b', '第二章', link('b2', '独立子章'))}${link('c', '无子节点章节')}</ol>`
  const card = pug.renderFile('themes/butterfly/layout/includes/widget/card_post_toc.pug', { page: { content: '' }, theme: { toc: { number: true } }, _p: () => '目录', toc: () => tree })
  return `<!doctype html><meta charset="utf-8"><style>body{margin:0}#article-container h1,#article-container h2,#article-container h3,#article-container h4{height:500px;margin:0}#aside-content{position:fixed;top:0;right:0;width:280px;--toc-link-color:#666261}${css}#card-toc .toc-link{transition:none!important}</style>
  <button id="mobile-toc-button">目录</button><aside id="aside-content">${card}</aside>
  <article id="article-container"><h1 id="a">第一章</h1><h2 id="a2">第二层</h2><h3 id="a3">第三层</h3><h4 id="a4">第四层</h4><h1 id="b">第二章</h1><h2 id="b2">独立子章</h2><h1 id="c">无子节点章节</h1></article>
  <pre id="results"></pre><script>
  const errors = []; window.addEventListener('error', e => errors.push(e.message));
  const GLOBAL_CONFIG = {isanchor:false}; const GLOBAL_CONFIG_SITE = {title:'目录测试'};
  const calls = []; const btf = {throttle:fn=>fn,getEleTop:el=>el.getBoundingClientRect().top+scrollY,scrollToDest:(top)=>{calls.push(top);window.scrollTo(0,top)}};
  ${code}
  const originalTree = ${JSON.stringify(tree)};
  const originalCard = ${JSON.stringify(card)};
  const get = id => document.querySelector('.toc-link[href="#'+id+'"]');
  const toggle = id => get(id).parentElement.querySelector('.toc-toggle');
  const children = id => document.getElementById(toggle(id).getAttribute('aria-controls'));
  const equal = (a,b,message) => {if(a!==b)throw Error(message+': '+a+' !== '+b)};
  const visible = id => get(id).getClientRects().length>0;
  const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
  const cases = [];
  async function run(name,fn){try{document.getElementById('card-toc').outerHTML=originalCard;calls.length=0;window.scrollTo(0,0);tocFn();await fn();cases.push({name,ok:true})}catch(e){cases.push({name,ok:false,error:e.message})}}
  async function tests(){
    await run('root branches start expanded and deeper branches start collapsed',()=>{
      equal(!!toggle('a'),true,'parent has a dedicated toggle');
      equal(toggle('a').getAttribute('aria-expanded'),'true','root open');
      equal(toggle('a2').getAttribute('aria-expanded'),'false','nested closed');
      equal(visible('a2'),true,'direct child visible');equal(visible('a3'),false,'deep child hidden');
    });
    await run('chapter numbers align and disclosure controls occupy only the right side',()=>{
      const numberLeft=id=>get(id).querySelector('.toc-number').getBoundingClientRect().left;
      equal(Math.abs(numberLeft('a')-numberLeft('c'))<.5,true,'parent and leaf numbers align');
      equal(Math.abs(numberLeft('a2')-numberLeft('b2'))<.5,true,'nested numbers align');
      const text=get('a').querySelector('.toc-text');text.textContent='很长的章节标题用于验证换行后的文字不会进入左侧箭头区域'.repeat(3);
      const range=document.createRange();range.selectNodeContents(text);const lines=[...range.getClientRects()];
      equal(lines.length>1,true,'title wraps');
      equal(lines.slice(1).every(rect=>rect.left>=numberLeft('a')-.5),true,'wrapped text keeps its original left edge');
      equal(toggle('a').getBoundingClientRect().left>=get('a').getBoundingClientRect().right-.5,true,'arrow to the right of the title');
    });
    await run('icon-only header action collapses every level without scrolling and supports re-expansion',()=>{
      toggle('a2').click();toggle('a3').click();
      const button=document.getElementById('toc-collapse-all');equal(!!button,true,'collapse action exists');
      equal(button.tagName,'BUTTON','native keyboard control');equal(!!button.closest('.item-headline'),true,'action in heading');
      equal(!!button.getAttribute('aria-label'),true,'accessible name');equal(button.textContent.trim(),'','no visible label');
      button.click();
      equal([...document.querySelectorAll('.toc-toggle')].every(link=>link.getAttribute('aria-expanded')==='false'),true,'every parent collapsed');
      equal(visible('a2'),false,'first branch hidden');equal(visible('b2'),false,'independent branch hidden');equal(calls.length,0,'collapse does not navigate');
      toggle('a').click();equal(visible('a2'),true,'parent can reopen');equal(visible('a3'),false,'deeper nodes remain collapsed');
      get('c').click();equal(calls.length,1,'leaf navigation unaffected');
    });
    await run('closing an ancestor hides every descendant and retains independent states',()=>{
      toggle('a2').click();toggle('a3').click();equal(visible('a4'),true,'four levels visible');
      toggle('a').click();equal(visible('a2'),false,'child hidden');equal(visible('a4'),false,'descendant hidden');
      equal(toggle('a2').getAttribute('aria-expanded'),'true','nested state retained');
      equal(toggle('b').getAttribute('aria-expanded'),'true','other branch untouched');
      toggle('a').click();equal(visible('a4'),true,'expanded states restored');
      toggle('a2').click();toggle('a').click();toggle('a').click();equal(visible('a3'),false,'collapsed child stays collapsed');
      equal(calls.length,0,'toggle does not navigate');
    });
    await run('titles navigate and expand their branch while arrows only toggle',()=>{
      get('b2').querySelector('span').click();equal(calls.length,1,'leaf scrolls once');window.tocScrollFn();
      equal(get('b2').classList.contains('active'),true,'leaf highlighted');
      toggle('a').click();equal(calls.length,1,'arrow never navigates');
      get('a').querySelector('.toc-text').click();equal(calls.length,2,'parent title scrolls once');
      equal(toggle('a').getAttribute('aria-expanded'),'true','parent title expands');
      get('a').click();equal(calls.length,3,'expanded title still navigates');
      equal(toggle('a').getAttribute('aria-expanded'),'true','title never collapses');
      equal(get('a').getAttribute('role'),null,'title retains link semantics');
      get('a2').click();equal(calls.length,4,'nested parent title navigates');window.tocScrollFn();
      equal(toggle('a2').getAttribute('aria-expanded'),'true','nested parent expands');
      equal(get('a2').classList.contains('active'),true,'jumped heading highlighted');
      equal(document.querySelectorAll('.toc-jump').length,0,'no separate jump icon');
    });
    await run('expand all opens every level without navigating and collapse all remains available',()=>{
      document.getElementById('toc-collapse-all').click();
      const button=document.getElementById('toc-expand-all');equal(!!button,true,'expand action exists');
      equal(button.tagName,'BUTTON','native keyboard control');equal(button.textContent.trim(),'','icon-only action');
      equal(!!button.getAttribute('aria-label'),true,'accessible name');
      button.click();equal([...document.querySelectorAll('.toc-toggle')].every(control=>control.getAttribute('aria-expanded')==='true'),true,'all levels expanded');
      equal(visible('a4'),true,'deepest heading visible');equal(visible('b2'),true,'independent branch visible');equal(calls.length,0,'expand all does not navigate');
      document.getElementById('toc-collapse-all').click();equal(visible('a2'),false,'collapse still works');
    });
    await run('scroll highlighting never reopens a manually collapsed subtree',async()=>{
      toggle('a').click();window.scrollTo(0,btf.getEleTop(document.getElementById('a4'))+2);window.tocScrollFn();await wait(0);
      equal(get('a4').classList.contains('active'),true,'deep heading tracks scroll');
      equal(visible('a4'),false,'scroll preserves collapse');equal(toggle('a').getAttribute('aria-expanded'),'false','root remains closed');
      equal(getComputedStyle(get('a')).backgroundColor,'rgb(0, 196, 182)','visible collapsed ancestor highlighted');
    });
    await run('parent controls support keyboard toggling and accessible expanded state',()=>{
      const parent=toggle('a');equal(parent.tagName,'BUTTON','native toggle button');parent.focus();
      parent.click();equal(parent.getAttribute('aria-expanded'),'false','button collapses');
      parent.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
      equal(parent.getAttribute('aria-expanded'),'true','right expands');
      parent.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
      equal(parent.getAttribute('aria-expanded'),'false','left collapses');
    });
    await run('refresh and dynamic directory replacement do not duplicate controls or listeners',async()=>{
      tocFn();tocFn();tocFn();toggle('a').click();equal(toggle('a').getAttribute('aria-expanded'),'false','one click toggles once');
      equal(document.querySelectorAll('.toc-toggle').length,4,'one toggle per parent');
      document.querySelector('.toc-content').innerHTML=originalTree;await wait(0);
      equal(toggle('a').getAttribute('aria-expanded'),'true','replacement initialized');
      toggle('a').click();equal(visible('a2'),false,'replacement toggles');
    });
    await run('article replacement initializes the new tree without stale state',()=>{
      document.getElementById('card-toc').outerHTML='<div id="card-toc"><div class="toc-content">'+originalTree+'</div></div>';
      tocFn();equal(toggle('a').getAttribute('aria-expanded'),'true','new article initial state');
      toggle('a').click();equal(visible('a2'),false,'new article listener');
    });
    await run('inserting a new branch cannot reuse another subtree identifier',async()=>{
      document.querySelector('.toc').insertAdjacentHTML('afterbegin','<li class="toc-item"><a class="toc-link" href="#new">新章节</a><ol class="toc-child"><li class="toc-item"><a class="toc-link" href="#new-child">新子章</a></li></ol></li>');
      await wait(0);equal(toggle('new').getAttribute('aria-expanded'),'true','new branch initialized');
      toggle('new').click();equal(children('new').hidden,true,'new subtree closed');equal(children('a').hidden,false,'existing subtree remains open');
      const ids=[...document.querySelectorAll('.toc-child')].map(el=>el.id);equal(new Set(ids).size,ids.length,'subtree identifiers unique');
    });
    await run('removing a subtree restores ordinary heading navigation',async()=>{
      children('a').remove();await wait(0);equal(!!toggle('a'),false,'leaf has no toggle control');
      get('a').click();equal(calls.length,1,'restored leaf navigates once');
    });
    if(innerWidth<=900)await run('mobile toggling keeps the panel open while navigation closes it',async()=>{
      document.getElementById('mobile-toc-button').click();await wait(10);
      document.getElementById('toc-collapse-all').click();equal(document.getElementById('card-toc').style.right,'45px','collapse all keeps panel open');
      document.getElementById('toc-expand-all').click();equal(document.getElementById('card-toc').style.right,'45px','expand all keeps panel open');
      toggle('a').click();equal(document.getElementById('card-toc').style.right,'45px','toggle keeps panel open');
      get('a').click();await wait(130);equal(document.getElementById('card-toc').style.right,'','parent title navigation closes panel');
      equal(toggle('a').getAttribute('aria-expanded'),'true','parent title expanded its branch');
      document.getElementById('mobile-toc-button').click();await wait(10);
      get('c').click();await wait(130);equal(document.getElementById('card-toc').style.right,'','navigation closes panel');
    });
    cases.push({name:'no browser JavaScript errors',ok:errors.length===0,error:errors.join(';')});
    document.getElementById('results').textContent=JSON.stringify(cases);
  } tests();</script>`
}

for (const width of [1440, 900, 390]) {
  test(`directory tree behaves correctly at viewport:${width}`, { skip: !chrome && 'Chrome unavailable; set CHROME_BIN for browser checks' }, async t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hexo-toc-test-'))
    try {
      const file = path.join(dir, 'fixture.html'); fs.writeFileSync(file, fixture())
      const html = await new Promise((resolve, reject) => {
        const args = ['--headless', '--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', `--user-data-dir=${path.join(dir, 'profile')}`, `--window-size=${width},900`, '--virtual-time-budget=2000', '--dump-dom', pathToFileURL(file).href]
        const child = spawn(chrome, args); let out = ''; let err = ''
        const timer = setTimeout(() => { child.kill(); reject(new Error('Browser test timed out')) }, 30000)
        child.stdout.on('data', chunk => { out += chunk }); child.stderr.on('data', chunk => { err += chunk })
        child.on('error', error => { clearTimeout(timer); reject(error) })
        child.on('close', code => { clearTimeout(timer); out.includes('<pre id="results">[') ? resolve(out) : reject(new Error(`Browser exit:${code}, ${err.slice(-600)}`)) })
      })
      const match = html.match(/<pre id="results">([^<]+)<\/pre>/)
      assert.ok(match, 'Browser reports completed behavior checks')
      for (const result of JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'))) {
        await t.test(result.name, () => assert.equal(result.ok, true, result.error))
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }) }
  })
}
