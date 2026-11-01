# Noktiq — geliştirici rehberi

[Ürün özeti ve hızlı başlangıç](../README.md)

**Point. Note. Paste.** React ve Vue için geliştirme sırasında çalışan görsel değişiklik notları.

Sayfada bir öğeyi işaretle, neyin değişmesini istediğini yaz, tüm notları konumlarıyla kopyalayıp mevcut kodlama agent’ına yapıştır. Noktiq kendi başına kod düzenlemez ve AI servisine bağlanmaz.

## Noktiq neden geliştirildi?

Noktiq’in çıkış noktası, ekranda gördüğün küçük bir değişikliği agent’a anlatmanın bazen uzun bir konuşmaya dönüşmesi: hangi düğme, hangi kart, hangi dosya? Hedef yanlış anlaşılınca yeniden tarif etmek ve kodda tekrar aramak zaman ve token harcatabilir. Noktiq, gördüğün öğeyi doğrudan işaretleyip isteğinle birlikte kaynak ve konum bağlamını aktarmak için geliştirildi.

Amaç, görev boyunca gereksiz aramaları ve tekrar açıklama turlarını azaltarak token kullanımını düşürmeye yardımcı olmak. Ayrıntılı çıktı, kısa bir ilk mesajdan daha uzun olabilir; olası kazanç görevin tamamındaki tekrarların azalmasındadır. Sonuç agent, model, proje ve isteğe bağlıdır. Henüz yayımlanmış token tasarrufu ölçümümüz veya yüzdemiz yok; tasarruf garantisi vermiyoruz.

**Nereyi değiştireceğini tarif etmeye daha az zaman, değişiklik için daha doğru bağlam.**

## Nasıl çalışır?

1. **İşaretle:** Nok’a tıklayıp değiştirmek istediğin öğeyi seç.
2. **Not yaz:** İsteğini öğenin yanında yazıp **Save note** ile kaydet. Öğede numaralı bir pin kalır.
3. **Kopyala:** Tek notu veya sayfanın tüm notlarını kopyalayıp mevcut kodlama agent’ına yapıştır.

Nok’a tekrar tıklamak seçim modunu kapatır. **Notes** listesi yalnızca sen açınca görünür. Maskotu basılı tutup sürükleyebilirsin; menü ve panel ekrandaki boşluğa göre yerleşir. Arayüz etiketleri İngilizcedir; bu rehberde düğme adları ekranda gördüğün hâliyle yazılır.

Doğrulanan kurulumlar: **React 18/19 + Vite**, **Vue 3.4/3.5 + Vite**, **Webpack 5**, **Next.js 14/15/16 (Turbopack ve Webpack)** ve **Nuxt 3/4**. Agentation kodu, görsel varlıkları veya stilleri kullanılmadan geliştirildi. npm üzerinden kurulum komutu `npm install -D noktiq` şeklindedir. Kaynak depodan yerel arşiv ile deneme adımları da aşağıdadır.

## Kendi projene kurulum

Uygulamanın terminalinde npm paketini kur:

```sh
npm install -D noktiq
```

Paket sayfası: [noktiq](https://www.npmjs.com/package/noktiq).

### Kaynak kodundan yerel arşiv ile deneme

Noktiq klasöründe:

```sh
npm run pack:release
```

Kendi uygulamanın klasöründe oluşturulan dosyanın yolunu ver:

```sh
npm install -D /path/to/noktiq-0.1.0.tgz
```

Windows’ta dosya yolu örneği: `npm install -D "C:\projects\noktiq\noktiq-0.1.0.tgz"`.

### React

Uygulamanın ana bileşenine bir kez ekle:

```tsx
import { Noktiq } from 'noktiq/react';

export default function App() {
  return (
    <>
      {/* Uygulamanın mevcut içeriği */}
      {import.meta.env.DEV && <Noktiq enabled />}
    </>
  );
}
```

### Vue

Ana `.vue` bileşenine bir kez ekle:

```vue
<script setup>
import { Noktiq } from 'noktiq/vue';
const isDev = import.meta.env.DEV;
</script>

<template>
  <!-- Uygulamanın mevcut içeriği -->
  <Noktiq v-if="isDev" :enabled="isDev" />
</template>
```

`enabled` açıkça verilmediğinde araç kurulmaz. React StrictMode ve bileşen kaldırma temizliği desteklenir. Geliştirme koşulunu uygulamada tut; kütüphane kullanıcının ortamını tahmin etmez.

### Geliştirme ortamı ile canlı site arasındaki fark

**Örneklerdeki geliştirme koşulunu koruduğunda, yayına çıkmadan önce bileşeni elle silmen gerekmez.**

| Uygulamayı nasıl çalıştırıyorsun? | Belgelenen geliştirme koşuluyla ne olur? |
| --- | --- |
| Geliştirme sunucusu, örneğin `npm run dev` | Maskot görünür; öğe seçip not yazabilirsin. |
| Üretim derlemesinin yerel önizlemesi | Adres localhost olsa bile maskot gizli kalır. |
| Canlıya alınmış üretim derlemesi | Ziyaretçiler maskotu, menüyü veya not pinlerini görmez. |

Vite projelerinde `import.meta.env.DEV`, Next.js’te `process.env.NODE_ENV === 'development'`, Nuxt’ta `import.meta.dev` kullanılır. Yalnızca paketi `-D` ile kurmak bu davranışı sağlamaz; geliştirme koşulu ayrıca verilmelidir. `enabled` varsayılan olarak `false` olduğu için hiç verilmezse araç geliştirmede de görünmez. Değeri sürekli `true` yaparsan maskot üretim ortamında da açılır.

Kaynak eklentisi de üretim derlemelerini işlemez. Arayüzün gizlenmesi, kütüphanenin bütün JavaScript kodunun üretim paketinden çıkarıldığı anlamına gelmez. Ortamı belirleyen URL’nin internette veya localhost üzerinde olması değil, uygulamanın hangi koşulla derlenip çalıştırıldığıdır.

### Gerçek dosya ve satır bilgisi

Vite yapılandırmasında Noktiq eklentisini framework eklentisinin önüne ekle. Mevcut `react()` veya `vue()` eklentini koru:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Vue projesinde @vitejs/plugin-vue
import { noktiq } from 'noktiq/vite';

export default defineConfig({
  plugins: [noktiq(), react()], // Vue projesinde [noktiq(), vue()]
});
```

Eklenti geliştirme sunucusunda `.js`, `.jsx`, `.ts`, `.tsx` ve normal HTML şablonlu `.vue` dosyalarındaki yerel DOM etiketlerine `data-noktiq-source="dosya:satır:sütun"` ekler. Vue direktifleri ve iç içe etiketler desteklenir. `node_modules`, proje kökü dışındaki dosyalar ve üretim derlemesi işlenmez.

Eklenti olmadan da seçim, not ve kopyalama çalışır; dosya konumu yerine seçici, görünen metin ve bulunabilen bileşen bağlamı kullanılır. React `createElement` ve Vue `h()` çağrıları gerçek import bağlarıyla tanınır; takma adlar ve namespace importları desteklenir. Native DOM oluşturan çağrıların özgün dosya/satırı kaydedilir. Yerel aynı isimli fonksiyonlar değiştirilmez. Vue render fonksiyonları ve `template src` ile yüklenen HTML şablonları da kapsanır. Pug ve çözülemeyen özel fabrikalarda kesin satır çıkmayabilir. En yakın üst öğenin kaynak konumu bulunursa çıktıda açıkça **ancestor** olarak belirtilir; seçilen alt öğenin satırıymış gibi sunulmaz. Açık Shadow DOM ve aynı kaynaklı iframe içindeki kaynak etiketleri okunur; iframe uygulamasında da kaynak eklentisi çalışmalıdır. Nuxt 3/4 kurulumu aşağıda ve uyumluluk raporunda belgelenmiştir.

### Kaynak önceliği

Arayüzde ve Markdown çıktısında kaynak dosyası seçiciden önce gösterilir:

1. Seçilen native öğenin JSX/şablon tanımı veya onu oluşturan `createElement`/`h()` çağrısı.
2. Seçili dinamik Vue bileşeninde varsa kullanım satırı; açıkça **bileşen kullanımı** diye belirtilir, iç öğenin tanımı sayılmaz.
3. Doğrudan konum bulunamazsa üst DOM öğesinin kaynak satırı; **üst öğe** olarak işaretlenir.
4. Kesin satır yoksa framework/derleme metaverisinden bilinen bileşen dosyası; **kesin satır bilinmiyor** denir.
5. Kaynak bulunamazsa seçici, kimlikler, metin ve ekran konumu kullanılır.

Satır bulunması seçiciyi gereksiz yapmaz: bir listenin birçok satırı aynı koddan üretilir. Hangi örneğin seçildiğini belirleyen bilgiler korunur. Dosya ipucu yalnızca bilinen bileşeni gösterir; CSS kuralı veya event handler satırı olarak sunulmaz. React geliştirme stack’inden doğrulanmamış satır türetilmez. React’te tanınan üst seviye bileşenlere geliştirme sırasında dosya metaverisi eklenir; `memo`/`forwardRef` ve tanınan sınıf bileşenleri de kapsanır. Vue’nun `__file` bilgisi kullanılabilir. Framework dosyayı tam yolla bildiriyorsa ve proje kökü eşlenemiyorsa dosya ipucu tam yol olabilir.

Gerçek kaynak örnekleri: [React kaynak ekranı](http://127.0.0.1:5173/source.html), [Vue kaynak ekranı](http://127.0.0.1:5174/source.html). Bu ekranlarda render fonksiyonları, dinamik native türler, Vue dış şablonu ve kesin satır bulunamayan bileşen dosyaları ayrı ayrı denenebilir. Dinamik `is`/etiket ifadeleri metaveri toplamak için ikinci kez çalıştırılmaz.

### Next.js 14, 15 ve 16: Turbopack ve Webpack

Mevcut nesne biçimindeki Next yapılandırmanı sarmala:

```js
// next.config.mjs
import { withNoktiq } from 'noktiq/next';
export default withNoktiq({ /* mevcut Next seçeneklerin */ });
```

Aracı bir client bileşeninden ekle:

```tsx
'use client';
import { Noktiq } from 'noktiq/react';
export function DevTools() {
  return <Noktiq enabled={process.env.NODE_ENV === 'development'} />;
}
```

`withNoktiq` uygulamanın çalışma dizinindeki Next sürümünü algılar; Next 14–15.2 için `experimental.turbo`, 15.3+ için `turbopack` biçimini kullanır. Mevcut kurallar ve `webpack` fonksiyonu korunur. Kaynak konumu uygulama dönüştürülmeden önce toplanır. Next 16'da geliştirme koşulu; eski sürümlerde geliştirme yapılandırması ve yükleyicinin üretim koruması kullanılır. Paket artık `Next >=14` kabul eder; doğrulanan tam sürümler [uyumluluk raporunda](../reports/compatibility.md).

Eski Turbopack, TSX yükleyici çıktısını JavaScript olarak yorumlayabildiği için projenin kurulu TypeScript derleyicisiyle yalnızca tipler kaldırılır; JSX ve özgün kaynağa giden haritalar korunur. Next'in TypeScript proje kurulumunu tamamlamış olması gerekir. Next 14/15 Turbopack'te düz `.ts` dosyalarına yükleyici uygulamak sanal HMR modüllerini de yakalar: bu dosyalarda kesin satır yerine dosya/üst öğe/DOM bağlamına dönülür. Webpack'te `.ts` ve `.tsx`; Next 16 Turbopack'te de her ikisi doğrulandı.

App Router ve Pages Router test edilir. Örnek: `node scripts/dev-next.mjs turbopack` (5181) veya `node scripts/dev-next.mjs webpack` (5182).

### Nuxt 3 ve 4

Mevcut Vite eklentisi ve Vue bileşeni kullanılır; ayrı bir Nuxt modülü gerekmez:

```ts
// nuxt.config.ts
import { noktiq } from 'noktiq/vite';
import { fileURLToPath } from 'node:url';
export default defineNuxtConfig({
  vite: { plugins: [noktiq({ root: fileURLToPath(new URL('.', import.meta.url)) })] },
});
```

Kaynak kökünü belirtmek, Nuxt 4'ün `app/` klasöründeki dosyaların `app/app.vue` gibi proje köküne göre yazılmasını sağlar. Genel Vite kullanımında bu seçenek verilmezse mevcut `config.root` kullanılır. Göreli `root` değeri Vite köküne göre çözülür.

Nuxt 3'te `app.vue`, Nuxt 4'te `app/app.vue` içine ekle:

```vue
<script setup>
import { Noktiq } from 'noktiq/vue';
const isDev = import.meta.dev;
</script>
<template>
  <NuxtPage />
  <ClientOnly><Noktiq :enabled="isDev" /></ClientOnly>
</template>
```

Mevcut sayfa/layout içeriğini koru; yalnızca geliştirme bileşenini ekle. `<ClientOnly>` tarayıcıda kurar, `isDev` üretimde kapatır. Nuxt'un kendi Node gereksinimleri geçerlidir; son Nuxt 4 testi ayrı Node 24 çalıştırıcısıyla yapılmıştır.

### Kapsam ve 3B arayüzler

React 18/19, Vue 3.4/3.5, Vite 6/7/8, Next 14/15/16 ve Nuxt 3/4 için doğrulanan sürüm birleşimleri [raporda](../reports/compatibility.md) listelenir. Bu, her sürüm/eklenti birleşiminin garantisi değildir.

Node.js ve NestJS sunucu tarafıdır; Noktiq'in React/Vue web arayüzünde çalışması için ayrı backend bağlantısı gerekmez. Three.js React değildir; React Three Fiber ile birlikte kullanılabilir. Tanınan Three.js/React Three Fiber modüllerine veya özel renderer öğeleri içeren dosyalara HTML kaynak öznitelikleri eklenmez; bileşen dosyası ipuçları korunur. Aynı dosyadaki normal DOM öğelerinde de kesin satır yerine bu ipuçları kullanılabilir. Normal DOM arayüzünü ayrı bileşen dosyasında tutmak kaynak ayrıntısını korur. Canvas içindeki mesh/ışık/kamera seçimi desteklenmez; canvas'ın bütünü veya çevresindeki HTML öğeleri seçilebilir. Gerçek WebGL sahnesinde renderer hatası oluşmadığı ve normal React arayüzü doğrulanır.

### Webpack 5

JSX/TSX dönüştürücünü koruyarak bir ön yükleyici ekle:

```js
// webpack.config.cjs
module.exports = {
  // mevcut ayarlar ve dönüştürücü kuralların...
  module: { rules: [
    {
      test: /\.(jsx?|tsx)$/, exclude: /node_modules/, enforce: 'pre',
      use: require.resolve('noktiq/webpack-loader'),
    },
    // mevcut Babel / SWC / TypeScript yükleyicilerin...
  ] },
};
```

Yükleyici Webpack `mode: 'production'` olduğunda kaynak etiketlerini eklemez. Vite ile aynı AST dönüşümünü kullanır; kaynak satırı tahmin edilmez. Webpack 5.112.2 geliştirme ve üretim paketleri tarayıcıda doğrulandı. Geliştirme arayüzü için React/Vue bileşenindeki `enabled` koşulu ayrıca gereklidir.

### Öğeyi kaynak kodda bulma

- Seçiciler önce `data-testid`, `data-test`, `data-test-id`, `data-qa`, `data-cy`, `data-component` ve uygun `id` değerlerini kullanır. Bilinen otomatik kimlik kalıpları atlanır. Her seçicinin yalnızca seçilen öğeyi bulduğu kontrol edilir; aynı kimliğin tekrarlandığı listelerde üst öğe kapsamı veya gerektiğinde öğe sırası kullanılır.
- Çıktıya bulunan tanımlayıcılar, CSS sınıfları, açıkça verilmiş rol/erişilebilir etiket ve React/Vue bileşen zinciri eklenir. Geliştirme metaverisinden gelen gerçek isimler kullanılır; anonim bileşene isim veya kaynak dosyası uydurulmaz. Props, state, form değerleri ve tüm HTML dökümü toplanmaz.
- React/Vue bileşen algılama geliştirme çalışma zamanlarının iç metaverisine dayanır ve sürümler arasında değişebilir. Erişilemezse bu alan atlanır; diğer öğe bilgileriyle akış devam eder. Tarayıcı testleri gerçek React 19 ve Vue 3.5 bileşenleriyle çalışır; React `memo`/`forwardRef` sarmalayıcıları da doğrulanır.
- Sayfa değiştiğinde pinin bağlı olduğu öğenin kimliği yeniden doğrulanır. Eski yapısal seçici başka bir öğeye denk gelirse kaynak, metin ve kimlik bağlamıyla yalnızca tek bir eşleşme bulunduğunda pin geri bağlanır. Birbirinden ayırt edilemeyen tekrarlar varsa pin gizlenir, not listede korunur. Kaydırma sırasında aynı kimlik araması tekrar tekrar yapılmaz.

Dosya/satır, bileşen zinciri ve tanımlayıcılar birbirini destekleyen ipuçlarıdır; agent düzenlemeden önce mevcut kodla karşılaştırmalıdır. Önceden kaydedilmiş notlar korunur; yeni alanlar yeni seçimlerde toplanır.

## Kullanım

Geliştirme demolarının altındaki **Test laboratuvarı** bağlantısı zor senaryoları açar: [React laboratuvarı](http://127.0.0.1:5173/lab.html), [Vue laboratuvarı](http://127.0.0.1:5174/lab.html). Aynı yazılı kartları yeniden sıralayabilir, 40 satırlık listeyi kaydırabilir, çok satırlı yazı seçebilir ve modal/Shadow DOM/iframe içinde not bırakabilirsin. Varsayılan demo tasarımı korunur.

1. Normal geliştirme sunucunu aç.
2. Sağ alttaki **Nok maskotuna** tıkla; seçim doğrudan açılır. Ardından sayfadaki öğeye tıkla. Seçim modunda tıklama uygulamadaki işlemi çalıştırmaz.
3. İsteğini yazıp **Save note** de. Kutu kapanır, tıkladığın yerde numaralı pin kalır ve başka bir öğe seçebilirsin.
4. Pine tıklayarak o notu düzenle. Tüm notları görmek veya bir notu silmek için menüdeki **Notes** düğmesini kullan; liste kendiliğinden açılmaz.
5. **Copy all notes** ile metni kopyalayıp projeyi açık tuttuğun agent’a yapıştır. Otomatik kopyalama kapalıysa çıktı alanında Ctrl/Cmd+C kullan.

**Notes** düğmesine tekrar basmak listeyi kapatır ve seçime döner. Her notun **Copy** düğmesi yalnızca o notu konum bilgileriyle kopyalar. **Clear all**, mevcut sayfanın bütün notlarını ve pinlerini tarayıcı kaydından da kaldırır.

Arayüz metinleri İngilizcedir. Notlar kompakt satırlar hâlinde gösterilir. Düzenle, kopyala ve sil ikonları fare, klavye ve dokunmatik ile erişilebilir; dosya/satır ve canlı hedef durumu satırın altında kalır. Uzun seçici ve **Rebind target** işlemi, notun **Details** bölümündedir. Maskota kısa tıklama aç/kapat içindir; basılı tutup sürükleme konumu değiştirir. Menü maskotun yerini oynatmadan uygun tarafa, panel de ekrandaki boşluğa yerleşir. Daraltılan pencerede konum ekran içinde tutulur. Açılış/kapanış geçişleri hızla tersine çevrilebilir; hareket azaltma tercihinde geçişler kapatılır.

Maskot köşede göz kırpar, yakınındaki fareye bakar ve seçim sırasında odaklanır. Not kaydedilince başıyla karşılık verir; kopyalama gerçekten başarılı olduğunda gülümseyip kısa bir başarı hareketi yapar. Menüdeki **Copy** düğmesi, not panelini açmadan tüm notları kopyalar. Not editörü seçilen öğenin yakınında, ekran sınırları içinde açılır. Sisteminin hareket azaltma tercihi açıkken bu animasyonlar ve göz takibi kapatılır.

Örnek çıktı:

```text
## 1. h2
Page: http://localhost:5173/
Selector: #hero-title
Source: src/App.vue:18:5
Vue components: "App" > "HeroSection"
Identifiers: {"id":"hero-title"}
Viewport: 1440 × 1000
Visible text: "Küçük bir dokunuş. Daha iyi bir arayüz."
Requested change: "Başlığı 32 piksel yap."
```

Maskota tekrar tıklamak veya **Esc** aracı ve seçimi kapatır; sayfa normal çalışmaya döner. Kaydedilmemiş not taslağı araç kapatıldığında açık oturumda korunur, yeniden açınca geri gelir. Not yazarken yeni seçim yapılamaz; önce kaydet veya vazgeç. SPA rotalarında notlar URL yoluna ve `#/...` / `#!/...` biçimindeki hash rotasına göre ayrılır; sorgular ve sıradan `#başlık` bağlantıları grup oluşturmaz.

### Seçim, araçlar ve çıktı

Kompakt menüdeki **⋯** düğmesi araçları açar; Nok’un çizimi ve not akışı korunur.

- **Element:** bir öğeye tıkla. **Shift+tıkla** ile birkaç öğeyi biriktirip **Annotate selection** de.
- **Text:** paragraftaki kelime veya cümleyi sürükleyerek seç. Seçilen metin ve başlangıç/bitiş ofsetleri saklanır; öğenin bütün metni değiştirilmiş sayılmaz. Özel alanlardan geçen seçim reddedilir.
- **Multiple elements:** öğeleri tek tek aç/kapat; **Annotate selection** veya **Enter** ortak isteği oluşturur. Çıktıda her öğenin kendi seçicisi, kaynağı ve bağlamı bulunur. Bir grupta en fazla 50 öğe seçilir. Her hedefin aynı not numarasını taşıyan ayrı pini bulunur; bir hedef kaybolduğunda diğerleri kalır. Editör tıklanan pinin konumunu gösterir.
- **Area:** sürükleyerek dikdörtgen çiz. Tamamen içinde kalan görünür öğeler seçilir; seçili üst öğenin çocukları tekrar eklenmez. Ardından ortak notunu yaz.
- **Computed styles:** not editöründeki açılır bölümde hesaplanmış renk, font, boyut, padding, margin, gap ve yerleşim değerlerini gör. Değerler seçim anının görüntüsüdür; tüm CSS/HTML veya form değerleri toplanmaz.
- **Output detail:** **Compact** seçici/kaynak/isteği, **Standard** bileşen ve kimlik bağlamını, **Detailed** ek olarak hesaplanmış stilleri, konumu ve yazı ofsetlerini içerir.
- **Copy format:** Markdown notları, yalnızca dosya/satır konumları veya yalnızca CSS sınıfları. Tekrarlanan yollar/sınıflar ayıklanır. Seçilen biçim için veri yoksa pano korunur ve açıklama gösterilir. Tek not ve tüm notlar aynı biçimi kullanır.
- Nok’u sürükleyerek veya odaktayken **Shift+ok** ile taşı. **Hide pins / Show pins** notları silmeden görünürlüğü değiştirir.
- **Pause page motion** CSS/Web Animations animasyonlarını ve oynayan videoları duraklatır. Sürdürme veya aracı kaldırma, yalnızca Noktiq’in durdurduklarını geri açar. Nok’un kendi animasyonları devam eder. Özel JavaScript oyun/animasyon döngüleri durdurulmaz.

Kısayollar: **Ctrl/Cmd+Shift+F** aç/kapat; araç açıkken **E** öğe, **T** yazı, **M** çoklu, **A** alan, **H** pinler, **P** hareket, **C** kopyala, **Enter** grup notu, **Esc** kapat. Yazı alanlarında bu harf kısayolları çalışmaz. Araçlardan kısayollar kapatılabilir; Esc çıkışı korunur. Konum ve araç menüsündeki seçimler açık oturum içindir.

### Hedefi düzeltme ve kaynak dosyasını açma

Not editöründeki **Select parent**, SVG parçasından SVG’ye, düğmeye veya karta geçer. **Previous element** aynı seçimin geçmişine döner. Açıklama metni korunur; yeni konum ancak **Save note** ile uygulanır. **Alt+↑ / Alt+↓** aynı işlemleri not alanındayken de yapar. Sayfanın `html/body` kökleri ve özel işaretli alanlar seçilmez.

**Notes** listesinde her hedefin canlı konum durumu görünür: bulundu, şu an görünmüyor, içerik/kimlik değişmiş, bulunamadı, birden fazla eşleşme veya erişilemeyen belge sınırı. Belirsiz eşleşme kesin bir öğeymiş gibi işaretlenmez. Grup notlarında durum her hedef için ayrıdır.

**Rebind target** ile mevcut notun yeni hedefini seç. Açıklama ve not kimliği korunur; önceki kayıt sen kaydedene kadar değiştirilmez. Esc veya Nok’u kapatmak işlemi iptal eder. Grup notunda yalnızca seçtiğin hedef değişir. Yeniden bağlama sırasında seçim türünü değiştirme ve eski hedefi kopyalama devre dışıdır.

Kaynak dosyası bulunan seçimlerde dosya/satır düğmesi editöre açma isteği gönderir. Yeni seçimler Vite eklentisi ve Next.js `withNoktiq` üzerinden gerekli yerel dosya bilgisini otomatik alır. Kaynak üst öğeden geliyorsa düğmenin açıklamasında belirtilir. İstek başarılı olsa da editör penceresinin açıldığı tarayıcıdan doğrulanamaz; araç yalnızca isteğin gönderildiğini söyler. Geliştirme sunucusunun editör ayarının çalışıyor olması gerekir. Yerel editör yolu notla birlikte tarayıcıda saklanır; AI için Markdown çıktısına eklenmez. Eski kayıtlarda editör metaverisi olmayabilir; hedefi yeniden seçmek bunu yeniler.

Diğer geliştirme sunucuları ve özel editör bağlantıları `openInEditor` callback’ini kullanabilir:

```tsx
<Noktiq enabled openInEditor={async ({ file, line, column, source, page }) => {
  // Kendi editör eklentine veya yerel geliştirme sunucundaki bağlantıya ilet.
  await myEditorBridge.open({ file, line, column });
}} />
```

`myEditorBridge` uygulamanın sağladığı bağlantıdır; Noktiq bu isimde bir servis kurmaz. Vue karşılığı `:open-in-editor="openSource"`, framework olmadan kullanım `mountNoktiq({ openInEditor })` şeklindedir. Vite/Next metaverisi varsa `file` yerel tam yoldur; metaveri yoksa yakalanan göreli kaynak yoludur. Kaynak bilgisi yokken dosya veya satır uydurulmaz.

### Modal, Shadow DOM, iframe ve seçenekler

Noktiq açık native modal, görünür dialog veya konumlandırılmış menü/listbox penceresinin odak sınırına otomatik yerleşir; pencere kapanınca ana sayfaya döner. Desteklenen tarayıcıda Popover top layer kullanır. Açık Shadow DOM içindeki modallar da izlenir. Özel odak yöneten bileşenlerde konteyneri açıkça verebilirsin:

```tsx
<Noktiq enabled
  portalContainer={() => document.querySelector('#my-dialog')}
  useHashLocation={true}
  enableKeyboardShortcuts={true}
  outputDetail="standard"
  copyFormat="markdown"
/>
```

Vue aynı prop adlarını kebab-case ile destekler (`:portal-container`, `:use-hash-location`, `output-detail`, `copy-format`). Konteyner kendi belgesindeki HTMLElement veya açık ShadowRoot olmalıdır. Framework kullanmadan `mountNoktiq(options)` çağırıp dönen temizleme fonksiyonunu kullanabilirsin. `exportNotes(notes, { detail: 'detailed', format: 'markdown' })` programatik çıktı verir.

Açık Shadow DOM ve aynı kaynaklı iç içe iframe sınırları **Boundary path** olarak ayrı kaydedilir; seçici bu sınırların içinde çözülür. Pinler kaydırma ve ölçeklenmiş iframe koordinatlarına uyarlanır; frame değişince eşleşme yeniden doğrulanır. Farklı kaynaklı iframe ve kapalı Shadow DOM tarayıcı tarafından erişime kapalıdır. Döndürülmüş/eğilmiş veya 3B dönüştürülmüş iframe konumları desteklenmez; güvenilir pin gösterilmez.

Hash rotası ayrımını istemiyorsan `useHashLocation={false}` kullan. Önceki sürümün ortak yol grubundaki notları otomatik olarak bütün hash sayfalarına kopyalanmaz; bu seçenekle eski ortak gruba erişilebilir.

## UI kütüphaneleri, router ve sanal tablolar

Gerçek kütüphane örnekleriyle shadcn/ui'nin Radix ve Base UI registry dialog/menüleri, MUI dialog/menüsü, PrimeVue ve Vuetify dialog/select pencereleri doğrulanır. Noktiq görünür pencerenin odak sınırına yerleşir; not yazma, Tab ve Escape olaylarının uygulamanın menü kısayollarıyla çakışmasını önler. Gizli `keepMounted` dialog aktif pencere kabul edilmez. Maskotun tasarımı değişmez; bu kütüphaneler Noktiq'in çalışma zamanı bağımlılıklarına eklenmez.

React Router, TanStack Router ve Vue Router ile sayfa notları ayrılır. Rota değişirken açık taslak korunur ve kaydedildiğinde ilk seçimin yapıldığı sayfaya yazılır; tamamlanmamış çoklu seçim yeni sayfaya taşınmaz.

TanStack Table/Virtual, Vue Virtual ve AG Grid örneklerinde 20.000 kayıt ve 100'den az görünür DOM satırı kullanılır. Aynı yazılı satırların karışmaması için gerçek kayıt kimliğini `data-row-id`, `data-row-key`, `data-item-id` veya `data-item-key` üzerinde taşı. AG Grid'de kararlı `getRowId` kullan; Noktiq `row-id` ve `col-id` bağlamını da toplar. Görünmeyen satırın pini gizlenir, aynı kayıt yeniden görünürse geri gelir. İndeks veya tekrar kullanılan DOM düğümü tek başına kayıt kimliğini garanti etmez.

Test edilen tam sürümler ve gerçek kopyalama çıktıları: [güncel ekosistem](../reports/ecosystem-current.md), [önceki UI ana sürümleri](../reports/ecosystem-legacy.md). Bunlar her bileşen/özellik/sürüm birleşimi için garanti değildir. Üçüncü tarafın ürettiği öğenin doğrudan uygulama kaynak satırı bulunamazsa çıktı bileşen/üst öğe bağlamını açıkça belirtir; kesin satır uydurmaz. [Agentation kapsam incelemesi](../reports/agentation-comparison.md) ayrı belgelenmiştir.

## Yerel veri ve sınırlar

- Notlar uygulamanın origin/path/hash rotasına ait `localStorage` anahtarında saklanır. Aynı origin’de çalışan diğer kodlar bu verilere erişebilir. **Delete** ile ilgili not kaldırılır.
- Noktiq ağ üzerinden not göndermez. AI’a kopyaladığın içerik, kullandığın AI aracına gider. Hassas not yazmamaya ve kopyalamadan önce çıktıyı kontrol etmeye dikkat et.
- URL sorguları, hash içindeki sorgular, sıradan bağlantı hash’leri ve form değerleri çıktıya alınmaz. Hash rotasının yolu alınır. `data-noktiq-private` ile işaretlenen alanlar seçilemez; üst öğenin metni alınırken de dışarıda bırakılır. Diğer normal görünür sayfa metinleri çıktıya girebilir.
- Tarayıcı kaydı engellenirse notlar yalnızca açık oturumda tutulur ve uyarı gösterilir. Kaydedilemeyen notlar uygulama içindeki rota geçişlerinde bellekte korunur; tam sayfa yenilemesi bu veriyi kaybettirir. Her rota için en fazla 100 not, her notta en fazla 2.000 karakter bulunur. Bir rota kaydı 1 milyon karakteri geçerse önceki kalıcı kayıt korunur; yeni notlar oturumda kalır ve ayrılmadan kopyalama uyarısı gösterilir.
- DOM seçicileri ve kaynak satırları seçim anını temsil eder. Sayfa/kod büyük ölçüde değişirse konum eskiyebilir; agent değişiklikten önce kontrol etmelidir. Eşleştirilemeyen eski notun işareti gösterilmez; metin not listesinde kalır.
- Bu sürüm metin çıktısı üretir; ekran görüntüsü yakalama ve doğrudan agent bağlantısı içermez. Temel iş akışı masaüstü Chrome’da, dar ekran yerleşimi ise tarayıcı emülasyonuyla test edilir.

## Sık sorulan sorular

**Maskot neden görünmüyor?** Bileşenin uygulamada bir kez eklendiğini, `enabled` koşulunun açık olduğunu ve üretim önizlemesi yerine geliştirme sunucusunu çalıştırdığını kontrol et. Paketi kurmak veya yalnızca kaynak eklentisini eklemek maskotu açmaz. Eklenti ayarını değiştirdiğinde geliştirme sunucusunu yeniden başlat.

**Dosya veya satır neden bulunamıyor?** Kaynak eklentisini seçtiğin içeriği oluşturan uygulamaya ekle. Desteklenmeyen kaynak biçimlerinde Noktiq bilinen bileşen/üst öğe bilgisini ve DOM kimliklerini kullanır; kesin satır uydurmaz. Gösterilen konum öğeyi oluşturan kodun konumudur; değiştirmek istediğin CSS kuralı veya olay işleyicisi başka bir dosyada olabilir.

**Noktiq kodu otomatik değiştiriyor mu?** Hayır. Notu ve konum bağlamını hazırlar; kopyaladığın isteği alan mevcut kodlama agent’ın düzenlemeyi yapar. Noktiq için ayrı AI API anahtarı veya AI aboneliği gerekmez. Kullandığın agent’ın kendi hesabı ve ücretlendirmesi ayrı konudur.

**Ne kadar token tasarrufu sağlar?** Henüz ölçülmüş bir oran vermiyoruz. Hedef, görev boyunca yanlış öğeyi arama ve tekrar açıklama turlarını azaltmaktır. Noktiq’in çıktısı ilk mesajı uzatabilir; olası kazanç görevin tamamında değerlendirilmelidir. Tasarruf agent’a, modele, projeye ve isteğe bağlıdır.

**Notlarım neden başka portta veya canlı sitede görünmüyor?** Notlar tarayıcıda sayfa ve origin’e göre ayrılır. `localhost:3000`, başka bir port ve canlı alan adı aynı not grubunu paylaşmaz. Aynı sayfanın sekmeleri kaydedilmiş değişiklikleri eşgüdümlü kullanır. Başka sekmede silinen not geri oluşturulmaz; açık taslaktaki açıklaman korunur. Kayıt kullanılamıyorsa bellekteki notlarını tam sayfa yenilemesinden önce kopyala.

**Pano izni yoksa ne yapacağım?** Açılan çıktı önizlemesinde metni seçip Ctrl/Cmd+C ile elle kopyalayabilirsin.

**Noktiq’i nasıl kaldırırım?** Bileşeni/importunu ve kaynak eklentisi ayarını kaldır, ardından `npm uninstall noktiq` çalıştır. O sayfanın kayıtlı notlarını da kaldırmak istiyorsan önce **Clear all** kullan. Normal üretim yayını için aracı kaldırman gerekmez; geliştirme koşulunu koruman yeterlidir.

## Bu depoyu çalıştır

Node.js **22.12+** (veya Vite 8’in desteklediği 20.19+) kullan.

```sh
npm install
npm run build
npm run dev:react
```

React: <http://127.0.0.1:5173>

İkinci terminalde:

```sh
npm run dev:vue
```

Vue: <http://127.0.0.1:5174>

Kaynak kodunu değiştirdikten sonra `npm run build` çalıştır; örnekler derlenmiş paketi kullanır. Örnekler normal uygulama HMR’ını destekler; kütüphane geliştirmesi için henüz otomatik derleme izleyicisi yok.

## Doğrulama

```sh
npm run build
npm run typecheck
npm test
npm run build:examples
npm run test:e2e
npm run test:all-browsers
npm run report:validation
npm run verify:package
npm run verify:integrations
npm run verify:compatibility
npm run prepare:ecosystem
npm run test:ecosystem
npm run report:ecosystem
```

`test:e2e` tam Chrome regresyonunu çalıştırır. `test:cross-browser` Firefox/WebKit laboratuvar ve uyumluluk senaryolarını, `test:all-browsers` üçünü birlikte çalıştırır. Ek motorları bir kez `npx playwright install firefox webkit` ile kur. Chrome yoksa yapılandırmadaki Chrome projesinden `channel` seçeneğini kaldırıp `npx playwright install chromium` çalıştır.

`report:validation`, son başarılı bütün tarayıcı çalışmasının sonuçlarından `reports/validation.md` ve kopyalanan gerçek istek/kaynak örneklerini üretir. Etkileşimli sonuçlar `playwright-report/index.html` içindedir (`npx playwright show-report`). Tam regresyon Chrome’da, ortak laboratuvar ve uyumluluk senaryoları Firefox ve WebKit’te doğrulanır; WebKit çalışması fiziksel Safari/iPhone testi değildir.

`verify:package`, mevcut derlemeden `.tgz` üretir; `.local-validation` altında iki ayrı tüketiciye kurar ve her ikisini derler. React tüketicisinde Vue, Vue tüketicisinde React kurulu olmaması da doğrulanır. Bu komuttan önce `npm run build` çalıştır.

`verify:integrations`, gerçek Webpack geliştirme/üretim paketlerini ve Next.js’in iki geliştirme derleyicisini tarayıcıda açıp özgün dosya/satır bilgisini kopyalanan çıktıya kadar doğrular. Ardından Next.js Turbopack üretim derlemesinde kaynak etiketleri ve araç bulunmadığını kontrol eder. 5181, 5182 ve 5183 portlarını kullanır; önceden açık geliştirme sunucularını yeniden kullanır. Mevcut başka bir Next örneğin varsa bu portları boşalt.

`verify:compatibility` ayrı projelere gerçek paket kurulumu yapar; kaynak, kopyalama, pinin yenilemede geri gelmesi ve üretimde kapanmayı test eder. Son Nuxt 4 için uyumlu bir Node gerekir (22.21+ veya 24.11+). `NOKTIQ_TEST_NODE` ortam değişkeni, sistem Node kurulumunu değiştirmeden test sunucuları için ayrı bir Node yürütülebilir dosyasını gösterebilir.

## Yapı

- `src/identity.ts`: benzersiz seçici, tanımlayıcılar, React/Vue bileşen bağlamı ve kaynak kapsamı.
- `src/context.ts`: öğe metni, çıktı, kayıt doğrulaması ve eski pinin güvenli eşleştirilmesi.
- `src/storage.ts`: sekmeler arası sıralı kayıt, çakışma kontrolü ve bellek yedeğinin güncel kayıtla birleştirilmesi.
- `src/dom.ts`: Shadow DOM/iframe sınırları, koordinatlar ve belge gözlemi.
- `src/selection.ts`, `src/motion.ts`: yazı/alan seçimi ve sayfa hareketi.
- `src/output.ts`, `src/options.ts`: çıktı biçimleri ve ortak seçenek tipleri.
- `src/index.ts`: ortak seçim, not, pin, kopyalama ve temizleme akışı.
- `src/styles.ts`: Shadow DOM içinde izole araç arayüzü.
- `src/mascot.ts`: özgün Nok çizimi ve küçük araç simgeleri.
- `src/react.ts`, `src/vue.ts`: framework yaşam döngüsü bağlantıları.
- `src/source.ts`: Vite, Webpack ve Turbopack’in paylaştığı kaynak AST dönüşümü.
- `src/vite.ts`, `src/webpack-loader.cjs`, `src/next.ts`: derleyici bağlantıları.
- `examples/react`, `examples/vue`, `examples/next`: gerçek kütüphane tüketicisi olan deneme siteleri.
- `tests`: birim ve tarayıcı doğrulamaları.

## Lisans, katkı ve güvenlik

Noktiq, [npm’de `noktiq`](https://www.npmjs.com/package/noktiq) adıyla yayımlanır. [PolyForm Shield 1.0.0](../LICENSE) kapsamında kaynak kodu görülebilir yazılımdır. Lisansın izin verdiği kullanım, değişiklik ve dağıtımlar mümkündür; rakip ürün/hizmet sunma kısıtları ve istisnaları için tam metin geçerlidir. Üçüncü taraf bağımlılıkların kendi lisansları korunur. Lisans sahibi bir şirket değil, **Duran Gezer**’dir.

Katkı yapmak için [katkı rehberini](../CONTRIBUTING.md), güvenlik sorunu bildirmek için [güvenlik politikasını](../SECURITY.md) oku. Hassas güvenlik ayrıntılarını herkese açık bir issue’ya yazma. Yayın arşivi, kaynak klasöründen ayrı hazırlanır; yanlışlıkla doğrudan kaynak klasörünün npm’ye gönderilmesini engelleyen bir yayın koruması vardır.



## Sekmeler arası kayıt ve paket hazırlığı

Notlar localStorage içinde kalır. Ekleme, düzenleme ve silme işlemleri sekmeler arasında bir IndexedDB işlemiyle sıraya alınır; storage olayları açık listeleri günceller. Başka sekmede silinen bir not düzenleniyorsa eski not geri oluşturulmaz: açıklama editörde korunur ve uyarı gösterilir. Kayıt veya eşgüdüm kullanılamazsa notlar bellekte kalır; sayfa tamamen yenilenmeden kopyalanmalıdır.

Yayın arşivi için `npm run pack:release` kullanılır. GitHub README’si görsel tanıtımı korur; npm arşivi, kaynak depoda bulunan `docs/npm-readme.md.template` şablonundan sade bir README alır. Büyük medya pakete girmez. Paketteki belge bağlantıları da doğrulanır.
