import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { publicReport } from './report-paths.mjs';
const report=JSON.parse(await readFile('.local-validation/ecosystem-results.json','utf8'));
const provenance=JSON.parse(await readFile('.local-validation/ecosystem/registry-provenance.json','utf8'));
const mode=provenance.mode||'current', tests=[];
function collect(suites){for(const suite of suites||[]){for(const spec of suite.specs||[])for(const test of spec.tests||[])tests.push({title:spec.title,...test});collect(suite.suites)}}collect(report.suites);
assert.ok(tests.length&&tests.every(test=>test.results.at(-1)?.status==='passed'),'Only write a success report after all selected scenarios pass');
const versions={};
for(const framework of ['react','vue'])for(const name of Object.keys(provenance.dependencies[framework])){
  const pkg=JSON.parse(await readFile(`.local-validation/ecosystem/${framework}/node_modules/${name}/package.json`,'utf8'));versions[`${framework}: ${name}`]=pkg.version;
}
const samples=[];await mkdir(`reports/ecosystem/${mode}`,{recursive:true});
for(const test of tests)if(test.projectName==='chrome')for(const attachment of test.results.at(-1).attachments||[])if(attachment.name==='ecosystem-request.md'){
  const name=test.title.replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase()+'.md';
  const text=attachment.path?await readFile(attachment.path,'utf8'):Buffer.from(attachment.body,'base64').toString('utf8');
  await writeFile(`reports/ecosystem/${mode}/${name}`,publicReport(text));samples.push({title:test.title,name});
}
const summary={testedAt:new Date().toISOString(),mode,count:tests.length,engines:[...new Set(tests.map(test=>test.projectName))],versions,sdkSha256:createHash('sha256').update(await readFile('dist/shared-chunk.js')).digest('hex'),registries:provenance.registries,scenarios:tests.map(test=>({title:test.title,browser:test.projectName,status:test.results.at(-1).status}))};
await writeFile(`reports/ecosystem-${mode}.json`,JSON.stringify(summary,null,2));
await writeFile(`reports/ecosystem-${mode}.md`,[
  '# Noktiq ecosystem validation','',`${mode}: ${tests.length} scenarios passed (${summary.engines.join(', ')}).`,
  '',`Tested: ${summary.testedAt}`,'','| Dependency | Tested version |','| --- | --- |',...Object.entries(versions).map(([name,version])=>`| ${name} | ${version} |`),'',
  '## Verified behavior','',
  '- Original shadcn radix-nova and base-nova registry dialogs/menus; unchanged registry files, local cn/icon project dependencies, Tailwind CSS. Registry URLs and hashes are recorded in the JSON report.',
  '- MUI, PrimeVue and Vuetify modal focus, typing, Tab, Escape, copy, source context, reopening and reload; no focus trap is disabled. Hidden keepMounted dialogs do not hide the toolbar.',
  '- React Router, TanStack Router and Vue Router: separate notes, browser back/forward, retained drafts saved to the captured page, abandoned multi-selection cleared on navigation.',
  '- Blocked localStorage: pending notes survive internal navigation in memory; a full browser reload cannot restore memory-only data.',
  '- TanStack Table/Virtual and Vue Virtual: 20,000 records, fewer than 100 rendered rows, repeated labels distinguished by stable row identity. AG Grid uses its native row-id/col-id with getRowId. Pins disappear offscreen and return to the original row.',
  '','## Captured output samples','',...samples.map(sample=>`- [${sample.title}](ecosystem/${mode}/${sample.name})`),'',
  '## Scope','',
  'These are real-library fixture tests, not every component/property/version combination. Shadow DOM/iframe boundaries and mobile layout have separate baseline tests. WebKit here is not a physical Safari/iPhone test. Agentation was researched from official documentation, not benchmarked against these fixtures.',
  '','Repeat: npm run prepare:ecosystem && npm run test:ecosystem && npm run report:ecosystem. NOKTIQ_ECOSYSTEM_LEGACY=1 selects the older UI-library majors; run --project=chrome for the legacy smoke suite.','',
].join('\n'));
console.log(`PASS reports/ecosystem-${mode}.md: ${tests.length} scenarios.`);
