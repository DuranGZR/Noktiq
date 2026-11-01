<script setup lang="ts">
import { ref } from 'vue';
import { Noktiq } from 'noktiq/vue';
const clicks = ref(0);
const enabled = import.meta.env.DEV;
</script>

<template>
  <header class="topbar"><a class="logo" href="/">n<span>o</span>ktiq<span class="dot">.</span></a><span class="tagline">Point. Note. Paste.</span><nav aria-label="Örnekler"><a href="http://127.0.0.1:5173">React</a><a class="active" href="http://127.0.0.1:5174">Vue</a></nav></header>
  <main>
    <div class="intro"><div><p class="eyebrow">THE PLAYGROUND / 02</p><h1>Göster. Anlat. Değiştir.</h1><p>Bir öğeyi seç, ne istediğini yaz. Gerisini agent’ına anlatacak metni biz hazırlayalım.</p></div><span class="framework"><span/>Vue + Vite</span></div>
    <div class="workspace">
      <section class="preview" aria-label="Örnek web sitesi">
        <div class="browserbar"><span/><span/><span/><p>forma.studio / örnek arayüz</p><b>LIVE PREVIEW</b></div>
        <div class="sample-nav"><strong>forma<span>®</span></strong><span>Fikirden ekrana.</span><span>2026</span></div>
        <div class="hero"><p class="eyebrow">DAHA AZ GÜRÜLTÜ. DAHA ÇOK KARAKTER.</p><h2 id="hero-title">Küçük bir dokunuş.<br/><em>Daha iyi bir arayüz.</em></h2><p class="hero-copy">İyi fikirler küçük ayrıntılarda saklı.<br/>Birlikte onlara biraz alan açalım.</p><button id="demo-cta" @click="clicks++">Birlikte başlayalım <span>↗</span></button><div class="orbit" aria-hidden="true"><span>f.</span><small>made to feel different</small></div></div>
        <div class="cards"><article><span class="card-no">01 / STRATEJİ</span><h3>Önce doğru soru.</h3><p>Ne yaptığın kadar, neden yaptığın da önemli.</p></article><article><span class="card-no">02 / TASARIM</span><h3>Her pikselin bir işi var.</h3><p>Azalt, sadeleştir, asıl fikre yer aç.</p></article><article><span class="card-no">03 / GELİŞTİRME</span><h3>Fikirler yayına çıksın.</h3><p>İyi görünen, iyi çalışan deneyimler.</p></article></div>
        <div class="sample-footer"><span>SMALL THINGS. BETTER INTERFACES.</span><span id="click-count">Normal tıklama: {{ clicks }}</span></div>
      </section>
      <aside class="guide"><span class="guide-icon">↗</span><p class="eyebrow">DAHA KOLAY GERİ BİLDİRİM</p><h2>“Şurayı değiştir.”<br/>Artık yeterince açık.</h2><ol><li><b>Bir yeri işaretle</b><p>Sağ alttaki Noktiq’ten İşaretle’yi aç. Başlığa veya butona tıkla.</p></li><li><b>İstediğini yaz</b><p>“Başlığı biraz küçült.” Her seçime ayrı bir not ekle.</p></li><li><b>Agent’ına yapıştır</b><p>Tüm notları kopyala. Seçici, dosya ve satır bilgisi de yanında gelsin.</p></li></ol><div class="local-note"><span>●</span><p>Kendi sayfan. Kendi agent’ın.<br/><strong>API anahtarı gerekmez.</strong></p></div></aside>
    </div>
    <footer class="page-footer"><span>NOKTIQ / EARLY BUILD</span><a v-if="enabled" href="/lab.html">Test laboratuvarı ↗</a><span>React & Vue · Aynı akış, ortak motor.</span></footer>
  </main>
  <Noktiq :enabled="enabled"/>
</template>
