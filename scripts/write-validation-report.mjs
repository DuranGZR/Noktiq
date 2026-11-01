import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { publicReport } from './report-paths.mjs';

const report = JSON.parse(await readFile('.local-validation/browser-results.json', 'utf8'));
const tests = [];
function visit(suites) {
  for (const suite of suites) { for (const spec of suite.specs || []) for (const test of spec.tests) tests.push({ ...test, title: spec.title }); visit(suite.suites || []); }
}
visit(report.suites);
assert.ok(tests.length > 0);
assert.ok(tests.every(test => test.results.at(-1)?.status === 'passed'), 'Resolve failed/skipped tests before writing a success report');
const readAttachment = async attachment => publicReport(attachment.path ? await readFile(attachment.path, 'utf8') : Buffer.from(attachment.body, 'base64').toString('utf8'));
await mkdir('reports/samples', { recursive: true });
await mkdir('reports/source-cases', { recursive: true });
const sources = [];
const counts = new Map(), latency = [];
for (const test of tests) {
  counts.set(test.projectName, (counts.get(test.projectName) || 0) + 1);
  for (const attachment of test.results.at(-1).attachments || []) {
    if (attachment.name === 'selection-latency.json') latency.push({ browser: test.projectName, ...JSON.parse(await readAttachment(attachment)) });
    if (test.projectName === 'chrome' && /^(react|vue)-(request\.md|resolved-source\.txt)$/.test(attachment.name)) await writeFile(`reports/samples/${attachment.name}`, await readAttachment(attachment));
    if (test.projectName === 'chrome' && attachment.name === 'source-discovery.md') {
      const name = test.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().slice(0, 110) + '.md';
      await writeFile(`reports/source-cases/${name}`, await readAttachment(attachment)); sources.push({ title: test.title, name });
    }
  }
}
const lines = [
  '# Noktiq doğrulama raporu', '',
  `${tests.length} tarayıcı senaryosu geçti.`, '',
  '| Tarayıcı / motor | Geçen senaryo |', '| --- | ---: |',
  ...[...counts].map(([browser, count]) => `| ${browser} | ${count} |`), '',
  '## Çıktıdan gerçek kaynak dosyasına', '',
  '- [React: kopyalanan istek](samples/react-request.md) · [Bulunan kaynak satırı](samples/react-resolved-source.txt)',
  '- [Vue: kopyalanan istek](samples/vue-request.md) · [Bulunan kaynak satırı](samples/vue-resolved-source.txt)', '',
  'Her iki örnekte aynı metinli ve aynı kaynak satırını paylaşan iki kart var. Test, beta kartını seçer; çıktının seçicisini gerçek DOM üzerinde çözerek yalnızca beta kartına ulaştığını kontrol eder. Dosyayı diskten açıp satır/sütunun beklenen düğme tanımını gösterdiğini ayrıca doğrular. Yeniden sıralama ve sayfa yenileme de test edilir.', '',
  ...(sources.length ? ['## Kaynak önceliği örnekleri', '', ...sources.map(source => `- [${source.title}](source-cases/${source.name})`), '', 'Bu çıktılarda önce kaynak veya bilinen bileşen dosyası gösterilir. Bileşen kullanım satırı ve kesin öğe tanımı ayrı etiketlenir; bilinmeyen satır uydurulmaz.', ''] : []),
  '## Büyük DOM ölçümü', '',
  '| Motor | Ek öğe | Tıklamadan editörün görünmesine | Üst sınır |', '| --- | ---: | ---: | ---: |',
  ...latency.map(item => `| ${item.browser} | ${item.addedElements} | ${item.selectionToEditorMs} ms | ${item.budgetMs} ms |`), '',
  'Ölçüm bu makinede Playwright etkileşim gecikmesini de içerir; bütün projeler için hız garantisi değildir.', '',
  '## Yakalanan ve düzeltilen sorunlar', '',
  '- ShadowRoot kökündeki kardeş öğelerde seçicinin benzersizliği.',
  '- Çok satırlı seçimin görünen yazısı ile DOM ofsetleri arasındaki fark.',
  '- Kaydırılan veya gizlenen alanlarda pinin görünürlük sınırı.',
  '- Üst kartın kimliği değişince eski notun yeni içeriğe bağlanması.',
  '- Grup notlarında her hedefin ayrı pini ve kalan hedeflerin düzenlenmesi.',
  '- iframe belgesi yüklenince dinleyicilerin beklemeden bağlanması.', '',
  '## Kapsamın sınırı', '',
  ...(tests.some(test => test.title.includes('parent navigation')) ? ['Üst öğeye geçme/geri dönme, canlı konum durumları, tekil ve grup hedeflerini açıklamayı koruyarak yeniden bağlama, Vite editör istekleri ve özel editör callback bağlantısı da doğrulandı. Editör HTTP istekleri testte yakalanıp doğrulandı; fiziksel editör uygulaması başlatılmadı.', ''] : []),
  'Bu testler, Noktiq çıktısındaki konumları gerçek DOM ve kaynak dosyalarıyla karşılaştırır. Başka bir AI sağlayıcısına istek gönderilmedi; bağımsız modellerin doğru kod değişikliği yapma oranı ölçülmedi. WebKit Windows üzerinde test edildi; fiziksel Safari/iPhone testi değildir. Kimliği ayırt edilemeyen eski öğelerde yanlış hedef seçmek yerine pin gizlenir ve not korunur. Farklı kaynaklı iframe ve kapalı Shadow DOM erişilemez.', '',
  'Tekrar çalıştırma: `npm run build && npm run build:examples && npm run test:all-browsers && npm run report:validation`.', '',
];
await writeFile('reports/validation.md', lines.join('\n'));
console.log(`PASS: reports/validation.md records ${tests.length} passed browser scenarios.`);
