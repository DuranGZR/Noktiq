# Agentation kapsam incelemesi

İnceleme tarihi: 30 Ekim 2026. Bu belge resmî açıklamaları karşılaştırır; Agentation üzerinde karşılıklı performans/uyumluluk deneyi yapılmadı. Uygulama kodu kopyalanmadı.

| Alan | Agentation'ın belgelediği kapsam |
| --- | --- |
| Kurulum | React 18+, istemci DOM'u, masaüstü. Resmî kurulumda bağımsız Vue bileşeni gösterilmiyor. [Kurulum](https://www.agentation.com/install) |
| Seçim ve çıktı | Öğeler, seçili metin, çoklu seçim, alan seçimi; hesaplanmış stiller, React bileşen ağacı, ayrıntı seçenekleri. [Özellikler](https://www.agentation.com/features) |
| Kaynak bilgisi | Vite, Next.js, Webpack ve Turbopack ile kaynak bilgisi. [Çıktı](https://www.agentation.com/output) |
| Modal ve menüler | `portalContainer` ile araç ve pencereyi uygulamanın odak sınırına yerleştirme; Base UI Dialog örneği. Başka kütüphanelerin odak yönetimi ek bağlantı gerektirebilir. [API](https://www.agentation.com/api) |
| İç içe sayfalar | Aynı kaynaklı iframe ve açık Shadow DOM; tarayıcının erişime kapattığı sınırlar desteklenmez. [API](https://www.agentation.com/api) |
| Rotalar | Hash ayrımı için seçenek; navigasyon olayları ve gerektiğinde router'a abone olan bir bağlantı. [API](https://www.agentation.com/api) |
| Agent iş akışı | MCP üzerinden iki yönlü bağlantı, webhook/callback'ler ve canlı durumlar. [Kurulum](https://www.agentation.com/install), [API](https://www.agentation.com/api) |
| Yerleşim | Bileşen yerleştirme ve bölümleri taşıma; agent'a yaklaşık mekânsal bilgi verme. [Özellikler](https://www.agentation.com/features) |

İncelenen resmî belgeler ve [açık depo](https://github.com/benjitaylor/agentation), shadcn/MUI/PrimeVue/Vuetify/router/sanal tablo sürümlerini tek tek listeleyen kapsamlı bir test matrisi sunmuyor. Bu, bu alanların çalışmadığı veya test edilmediği anlamına gelmez. Noktiq'in daha kapsamlı olduğu sonucuna varılamaz; Agentation'ın agent bağlantısı ve yerleşim iş akışları daha geniş.

## Noktiq'te bu çalışmanın kapsamı

Tasarım korunarak gerçek kütüphane örnekleri kuruldu. Önce shadcn Radix/Base ve MUI; ardından PrimeVue/Vuetify, gerçek router'lar ve sanallaştırılmış tablolar doğrulandı. Sonuçlar [güncel sürümler](ecosystem-current.md) ve [önceki UI ana sürümleri](ecosystem-legacy.md) raporlarında; sürümler, registry dosya özetleri ve kopyalanan gerçek çıktılar ayrıca kaydedildi.

Bu çalışma MCP, webhook veya yerleşim düzenleme eklemez. Doğrulanan bileşenler ve sürüm birleşimleri, bütün üçüncü taraf bileşenlerin garantisi değildir.
