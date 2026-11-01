import { useState, useRef, useEffect, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Noktiq } from 'noktiq/react';
import { mountLabBoundaries } from '../lab-elements';
import '../shared.css';
import '../lab.css';

function RepeatedCard({ name, action }: { name: string; action: () => void }) {
  return <article data-testid={`card-${name}`}><p>{name}</p><button data-testid="repeated-action" onClick={action}><span>Kaydet</span></button></article>;
}
function Lab() {
  const [names, setNames] = useState(['alpha', 'beta']); const [clicks, setClicks] = useState(0);
  const boundary = useRef<HTMLDivElement>(null), modal = useRef<HTMLDialogElement>(null);
  useEffect(() => mountLabBoundaries(boundary.current!), []);
  return <main><header className="lab-heading"><div><p className="eyebrow">NOKTIQ / REACT TEST LAB</p><h1>Doğru yeri bulabiliyor muyuz?</h1><p>Benzer öğeler, değişen sıralar, uzun listeler ve belge sınırları.</p></div><a href="/">Demoya dön ↗</a></header>
    <div className="lab-grid">
      <section className="lab-card"><h2>Benzer kartlar</h2><p>Aynı yazı, aynı bileşen ve aynı kaynak satırı. Kart kimliği farkı belirlemeli.</p><button id="lab-reorder" onClick={() => setNames([...names].reverse())}>Sırayı değiştir</button><div className="lab-items">{names.map(name => <RepeatedCard key={name} name={name} action={() => setClicks(n => n + 1)}/>)}</div><p id="lab-live-status">Uygulama işlemleri: {clicks}</p></section>
      <section className="lab-card"><h2>Çok satırlı yazı</h2><p id="lab-text">İlk satır.<br/><strong>İkinci satır.</strong><br/>Son kelimeler.</p><p id="lab-mixed">Görünür metin <span data-noktiq-private>GİZLİ-LAB-DEĞERİ</span> ve devamı.</p></section>
      <section className="lab-card"><h2>Kayan liste · 40 satır</h2><div className="lab-scroll" id="lab-scroll">{Array.from({length:40}, (_, n) => <article className="lab-row" data-testid={`row-${n}`} key={n}><span>Satır {n + 1}</span><button onClick={() => setClicks(c => c + 1)}>Düzenle</button></article>)}</div></section>
      <section className="lab-card"><h2>Shadow DOM ve iframe</h2><p>İki aynı Shadow düğmesi ile ayrı bir iframe içindeki hedef.</p><div ref={boundary}/></section>
      <section className="lab-card"><h2>Native modal</h2><button id="lab-open-modal" onClick={() => modal.current?.showModal()}>Pencereyi aç</button><dialog className="lab-modal" ref={modal}><h2>Modal içindeki hedef</h2><button id="lab-modal-target">Bu düğmeyi değiştir</button><form method="dialog"><button>Kapat</button></form></dialog></section>
    </div><Noktiq enabled={import.meta.env.DEV}/></main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Lab/></StrictMode>);
