import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Noktiq } from 'noktiq/react';
import '../shared.css';

function App() {
  const [clicks, setClicks] = useState(0);
  return <>
    <header className="topbar"><a className="logo" href="/">n<span>o</span>ktiq<span className="dot">.</span></a><span className="tagline">Point. Note. Paste.</span><nav aria-label="Örnekler"><a className="active" href="http://127.0.0.1:5173">React</a><a href="http://127.0.0.1:5174">Vue</a></nav></header>
    <main>
      <div className="intro"><div><p className="eyebrow">THE PLAYGROUND / 01</p><h1>Göster. Anlat. Değiştir.</h1><p>Bir öğeyi seç, ne istediğini yaz. Gerisini agent’ına anlatacak metni biz hazırlayalım.</p></div><span className="framework"><span/>React + Vite</span></div>
      <div className="workspace">
        <section className="preview" aria-label="Örnek web sitesi">
          <div className="browserbar"><span/><span/><span/><p>forma.studio / örnek arayüz</p><b>LIVE PREVIEW</b></div>
          <div className="sample-nav"><strong>forma<span>®</span></strong><span>Fikirden ekrana.</span><span>2026</span></div>
          <div className="hero"><p className="eyebrow">DAHA AZ GÜRÜLTÜ. DAHA ÇOK KARAKTER.</p><h2 id="hero-title">Küçük bir dokunuş.<br/><em>Daha iyi bir arayüz.</em></h2><p className="hero-copy">İyi fikirler küçük ayrıntılarda saklı.<br/>Birlikte onlara biraz alan açalım.</p><button id="demo-cta" onClick={() => setClicks(clicks + 1)}>Birlikte başlayalım <span>↗</span></button><div className="orbit" aria-hidden="true"><span>f.</span><small>made to feel different</small></div></div>
          <div className="cards"><article><span className="card-no">01 / STRATEJİ</span><h3>Önce doğru soru.</h3><p>Ne yaptığın kadar, neden yaptığın da önemli.</p></article><article><span className="card-no">02 / TASARIM</span><h3>Her pikselin bir işi var.</h3><p>Azalt, sadeleştir, asıl fikre yer aç.</p></article><article><span className="card-no">03 / GELİŞTİRME</span><h3>Fikirler yayına çıksın.</h3><p>İyi görünen, iyi çalışan deneyimler.</p></article></div>
          <div className="sample-footer"><span>SMALL THINGS. BETTER INTERFACES.</span><span id="click-count">Normal tıklama: {clicks}</span></div>
        </section>
        <aside className="guide"><span className="guide-icon">↗</span><p className="eyebrow">DAHA KOLAY GERİ BİLDİRİM</p><h2>“Şurayı değiştir.”<br/>Artık yeterince açık.</h2><ol><li><b>Bir yeri işaretle</b><p>Sağ alttaki Noktiq’ten İşaretle’yi aç. Başlığa veya butona tıkla.</p></li><li><b>İstediğini yaz</b><p>“Başlığı biraz küçült.” Her seçime ayrı bir not ekle.</p></li><li><b>Agent’ına yapıştır</b><p>Tüm notları kopyala. Seçici, dosya ve satır bilgisi de yanında gelsin.</p></li></ol><div className="local-note"><span>●</span><p>Kendi sayfan. Kendi agent’ın.<br/><strong>API anahtarı gerekmez.</strong></p></div></aside>
      </div>
      <footer className="page-footer"><span>NOKTIQ / EARLY BUILD</span>{import.meta.env.DEV && <a href="/lab.html">Test laboratuvarı ↗</a>}<span>React & Vue · Aynı akış, ortak motor.</span></footer>
    </main>
    <Noktiq enabled={import.meta.env.DEV}/>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
