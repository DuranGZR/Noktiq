# Noktiq doğrulama raporu

266 tarayıcı senaryosu geçti.

| Tarayıcı / motor | Geçen senaryo |
| --- | ---: |
| chrome | 118 |
| firefox | 74 |
| webkit | 74 |

## Çıktıdan gerçek kaynak dosyasına

- [React: kopyalanan istek](samples/react-request.md) · [Bulunan kaynak satırı](samples/react-resolved-source.txt)
- [Vue: kopyalanan istek](samples/vue-request.md) · [Bulunan kaynak satırı](samples/vue-resolved-source.txt)

Her iki örnekte aynı metinli ve aynı kaynak satırını paylaşan iki kart var. Test, beta kartını seçer; çıktının seçicisini gerçek DOM üzerinde çözerek yalnızca beta kartına ulaştığını kontrol eder. Dosyayı diskten açıp satır/sütunun beklenen düğme tanımını gösterdiğini ayrıca doğrular. Yeniden sıralama ve sayfa yenileme de test edilir.

## Kaynak önceliği örnekleri

- [React imported createElement maps to its native creation call, not the component invocation](source-cases/react-imported-createelement-maps-to-its-native-creation-call-not-the-component-invocation.md)
- [React dynamic types are evaluated once and retain precise native source](source-cases/react-dynamic-types-are-evaluated-once-and-retain-precise-native-source.md)
- [React memo-file-only falls back to its actual component file without inventing a line](source-cases/react-memo-file-only-falls-back-to-its-actual-component-file-without-inventing-a-line.md)
- [React ref-file-only falls back to its actual component file without inventing a line](source-cases/react-ref-file-only-falls-back-to-its-actual-component-file-without-inventing-a-line.md)
- [React fragments retain their native child location](source-cases/react-fragments-retain-their-native-child-location.md)
- [Vue dynamic template exposes its usage line and never evaluates is twice](source-cases/vue-dynamic-template-exposes-its-usage-line-and-never-evaluates-is-twice.md)
- [Vue external HTML template points to the HTML file rather than the SFC wrapper](source-cases/vue-external-html-template-points-to-the-html-file-rather-than-the-sfc-wrapper.md)
- [Vue unknown factories still identify the real owning component file](source-cases/vue-unknown-factories-still-identify-the-real-owning-component-file.md)
- [Vue render instrumentation keeps the original props reference and survives source-only relocation](source-cases/vue-render-instrumentation-keeps-the-original-props-reference-and-survives-source-only-relocation.md)
- [Vue attribute fallthrough preserves the native render location](source-cases/vue-attribute-fallthrough-preserves-the-native-render-location.md)
- [Vue cloned VNodes retain the original creation location](source-cases/vue-cloned-vnodes-retain-the-original-creation-location.md)
- [Vue conditional directives keep their original update behavior](source-cases/vue-conditional-directives-keep-their-original-update-behavior.md)
- [Vue cached roots never borrow the source of an unrelated unused render call](source-cases/vue-cached-roots-never-borrow-the-source-of-an-unrelated-unused-render-call.md)
- [Vue setup keeps its context argument and returned render source](source-cases/vue-setup-keeps-its-context-argument-and-returned-render-source.md)
- [Vue #vue-kebab-source button keeps the native child source instead of the component usage](source-cases/vue-vue-kebab-source-button-keeps-the-native-child-source-instead-of-the-component-usage.md)
- [Vue #vue-capital-source button keeps the native child source instead of the component usage](source-cases/vue-vue-capital-source-button-keeps-the-native-child-source-instead-of-the-component-usage.md)
- [Vue #vue-kebab-router button keeps the native child source instead of the component usage](source-cases/vue-vue-kebab-router-button-keeps-the-native-child-source-instead-of-the-component-usage.md)

Bu çıktılarda önce kaynak veya bilinen bileşen dosyası gösterilir. Bileşen kullanım satırı ve kesin öğe tanımı ayrı etiketlenir; bilinmeyen satır uydurulmaz.

## Büyük DOM ölçümü

| Motor | Ek öğe | Tıklamadan editörün görünmesine | Üst sınır |
| --- | ---: | ---: | ---: |
| chrome | 5000 | 501 ms | 2500 ms |
| firefox | 5000 | 350 ms | 2500 ms |
| webkit | 5000 | 259 ms | 2500 ms |

Ölçüm bu makinede Playwright etkileşim gecikmesini de içerir; bütün projeler için hız garantisi değildir.

## Yakalanan ve düzeltilen sorunlar

- ShadowRoot kökündeki kardeş öğelerde seçicinin benzersizliği.
- Çok satırlı seçimin görünen yazısı ile DOM ofsetleri arasındaki fark.
- Kaydırılan veya gizlenen alanlarda pinin görünürlük sınırı.
- Üst kartın kimliği değişince eski notun yeni içeriğe bağlanması.
- Grup notlarında her hedefin ayrı pini ve kalan hedeflerin düzenlenmesi.
- iframe belgesi yüklenince dinleyicilerin beklemeden bağlanması.

## Kapsamın sınırı

Üst öğeye geçme/geri dönme, canlı konum durumları, tekil ve grup hedeflerini açıklamayı koruyarak yeniden bağlama, Vite editör istekleri ve özel editör callback bağlantısı da doğrulandı. Editör HTTP istekleri testte yakalanıp doğrulandı; fiziksel editör uygulaması başlatılmadı.

Bu testler, Noktiq çıktısındaki konumları gerçek DOM ve kaynak dosyalarıyla karşılaştırır. Başka bir AI sağlayıcısına istek gönderilmedi; bağımsız modellerin doğru kod değişikliği yapma oranı ölçülmedi. WebKit Windows üzerinde test edildi; fiziksel Safari/iPhone testi değildir. Kimliği ayırt edilemeyen eski öğelerde yanlış hedef seçmek yerine pin gizlenir ve not korunur. Farklı kaynaklı iframe ve kapalı Shadow DOM erişilemez.

Tekrar çalıştırma: `npm run build && npm run build:examples && npm run test:all-browsers && npm run report:validation`.
