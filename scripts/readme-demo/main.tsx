import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Noktiq } from 'noktiq/react';
import interior from '../../docs/assets/readme-interior.png';
import './style.css';

function ReadmeDemo() {
  const [clicks, setClicks] = useState(0);
  return <>
    <header className="chapter">
      <div className="wordmark">noktiq<span>.</span><small>POINT. NOTE. PASTE.</small></div>
      <div className="caption"><span id="chapter-number">01 / POINT</span><h1 id="chapter-title">A little point. A lot more context.</h1><p id="chapter-description">Visual change requests for the coding agent you already use.</p></div>
      <div className="chapter-track"><i className="active"/><i/><i/></div>
    </header>
    <div className="browser">
      <div className="chrome"><div className="lights"><i/><i/><i/></div><span>LOCAL DEVELOPMENT / EXAMPLE REACT PROJECT</span><b>● &nbsp; NOKTIQ ENABLED</b></div>
      <div className="application">
        <nav className="site-nav"><a className="studio-name" href="#">still<span>.</span></a><span>INTERIORS, CONSIDERED.</span><div><a href="#work">Our work</a><a href="#approach">Approach</a><a className="nav-contact" href="#contact">Let’s talk ↗</a></div></nav>
        <main>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">SPACES TO COME HOME TO / EST. 2020</p>
              <h2 id="demo-heading">A slower way<br/><em>to live.</em></h2>
              <p className="hero-description">Thoughtful spaces. Honest materials.<br/>Interiors that feel quietly, completely yours.</p>
              <button id="demo-cta" onClick={() => setClicks(clicks + 1)}>Explore our work <span>↗</span></button>
              <div className="hero-foot"><span>RESIDENTIAL &amp; CREATIVE SPACES</span><span>SCROLL TO DISCOVER ↓</span></div>
            </div>
            <figure className="project-image"><img src={interior} alt="Sunlit limewash interior with an olive lounge chair, travertine table and sculptural arch"/><figcaption><span>01 — THE COVE RESIDENCE</span><span>PALMA, MALLORCA / CONCEPT</span></figcaption><div className="image-label">A study in<br/><em>softness.</em></div></figure>
          </section>
          <section className="project-bottom" id="approach"><div><p className="eyebrow">OUR PHILOSOPHY</p><h3>Less noise.<br/><em>More feeling.</em></h3></div><p>We believe a beautiful space is one you can feel.<br/>Natural light, tactile textures, and room to breathe.<br/>A considered approach to the everyday.</p><div className="project-mark"><span>✳</span><small>MADE TO FEEL LIKE HOME</small></div></section>
          <span id="application-clicks" hidden>{clicks}</span>
        </main>
      </div>
    </div>
    <section id="clipboard-preview" hidden><p className="eyebrow">03 / PASTE</p><h2>Ready for your coding agent.</h2><p className="preview-description">Actual clipboard excerpt. Paste the full request into your agent.</p><pre id="clipboard-text"/><div className="preview-footer"><span>Source file + line</span><span>Element context</span><span>Your request</span></div></section>
    <footer className="recording-footer"><span>REACT + VUE</span><p>Good feedback starts with a little point.</p><span>LOCAL-FIRST / NO API KEY</span></footer>
    <Noktiq enabled={import.meta.env.DEV}/>
  </>;
}
createRoot(document.getElementById('root')!).render(<ReadmeDemo/>);
