export const styles = `
:host { all:initial; color-scheme:light; font:13px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:#30332f; --accent:#e9876f; --muted:#71766b; --border:#e9e7e1; }
*,*::before,*::after { box-sizing:border-box; }
[hidden] { display:none!important; }
button,textarea { font:inherit; }
button { cursor:pointer; color:inherit; border:1px solid var(--border); background:#fff; border-radius:9px; padding:8px 12px; }
button:hover { background:#f5f4f0; }
button:disabled { opacity:.38; cursor:default; }
button:focus-visible,textarea:focus-visible { outline:2px solid var(--accent); outline-offset:4px; }
.primary { color:#fffdf8; background:#343b34; border-color:transparent; font-weight:600; }
.primary:hover { background:#4b554a; }
.quiet { background:transparent; }
.small { font-size:11px; padding:5px 9px; }
.dock { position:fixed; right:22px; bottom:16px; width:68px; height:76px; pointer-events:none; }
.brand { position:relative; flex:0 0 68px; width:68px; height:76px; padding:0; border:0; background:transparent; border-radius:24px; pointer-events:auto; -webkit-tap-highlight-color:transparent; }
.brand { cursor:grab; touch-action:none; user-select:none; }
.brand:hover { background:transparent; }
.dock[data-dragging] .brand { cursor:grabbing; }
.dock[data-dragging] .brand::after { opacity:0; }
.brand:active .nok-body { transform:scale(.92,.96); }
.brand::after { content:'Noktiq'; position:absolute; bottom:79px; left:50%; transform:translateX(-50%) translateY(3px); opacity:0; pointer-events:none; font-size:10px; letter-spacing:.3px; color:#777b72; background:#fffefa; padding:4px 8px; border:1px solid var(--border); border-radius:6px; }
.brand:hover::after,.brand:focus-visible::after { opacity:1; transform:translateX(-50%); }
.nok { width:68px; height:76px; display:block; overflow:visible; pointer-events:none; }
.nok-body { transform-origin:50px 86px; }
.nok-gaze { transform:translate(var(--gaze-x,0px),var(--gaze-y,0px)); }
.nok-blink { transform-box:fill-box; transform-origin:center; }
.nok-happy { opacity:0; }
.count { position:absolute; right:0; top:1px; min-width:20px; height:20px; padding:1px 5px; border-radius:10px; border:2px solid #f9f8f4; background:#f19a80; color:#603e32; font-size:10px; font-weight:700; line-height:14px; pointer-events:none; }
.menu { position:absolute; width:max-content; max-width:calc(100vw - 32px); display:flex; flex-wrap:wrap; align-items:center; gap:2px; padding:6px; background:#fffefa; border:1px solid #e9e6df; border-radius:13px; box-shadow:0 4px 7px #302c2403,0 12px 32px #302c2412; pointer-events:auto; transform-origin:right center; }
.menu[hidden][data-closing] { display:flex!important; pointer-events:none; }
.panel[hidden][data-closing] { display:block!important; pointer-events:none; }
.menu button { display:flex; align-items:center; justify-content:center; gap:7px; padding:8px 10px; font-size:11px; white-space:nowrap; border:0; border-radius:8px; background:transparent; }
.menu button+button { position:relative; }
.menu button+button::before { content:''; position:absolute; left:-1px; top:8px; bottom:8px; border-left:1px solid #eeece6; }
.menu button:hover { background:#f4f2ed; }
.menu button[aria-pressed=true] { color:#b65b43; background:#fff0e9; }
.menu-count { font-size:10px; line-height:16px; min-width:16px; text-align:center; padding:0 3px; border-radius:4px; color:#9b5039; background:#ffede5; }
.copy-sheets { position:absolute; left:2px; top:17px; opacity:0; pointer-events:none; }
.copy-sheets i { position:absolute; width:11px; height:14px; border:1px solid #e38970; background:#fffaf2; border-radius:2px; }
.copy-sheets i:nth-child(2) { left:4px; top:3px; }
.copy-sheets i:nth-child(3) { left:8px; top:6px; }
.panel { position:fixed; right:28px; bottom:106px; width:min(344px,calc(100vw - 24px)); max-height:min(560px,calc(100dvh - 32px)); overflow:auto; pointer-events:auto; border-radius:15px; background:#fffefa; border:1px solid #e7e4dc; box-shadow:0 3px 8px #29271e04,0 16px 52px #29271e16; }
.heading { display:flex; align-items:flex-start; justify-content:space-between; padding:19px 19px 12px; gap:8px; }
.heading strong { font-size:14px; letter-spacing:-.3px; font-weight:650; }
.heading .quiet { color:#6f746a; font-size:10px; }
.title-count { display:inline-grid; place-items:center; min-width:20px; height:20px; padding:0 5px; margin-left:8px; border-radius:6px; font-size:10px; background:#f1efe8; color:#797c71; vertical-align:middle; }
.panel[data-view=notes] .heading { align-items:center; padding:16px 17px 12px; }
.panel[data-view=notes] .heading .eyebrow { display:none; }
.panel[data-view=notes] .body { padding:0 17px 12px; }
.icon-button { display:inline-grid; place-items:center; width:28px; height:28px; padding:5px; border:0; border-radius:7px; background:transparent; color:#86897d; }
.icon-button:hover { background:#efeee7; color:#343b34; }
.icon-button[aria-label=Delete]:hover { color:#b65741; background:#faeee8; }
.icon-button svg { width:15px; height:15px; }
.eyebrow { font-size:8px; letter-spacing:1.6px; color:#8d624e; margin-bottom:5px; }
.body { padding:0 19px 19px; }
.muted { color:var(--muted); font-size:10px; line-height:1.7; }
.status { margin:0; padding:0 19px 13px; color:#945540; font-size:11px; overflow-wrap:anywhere; }
.status:empty { display:none; }
.toast { position:fixed; right:28px; bottom:109px; max-width:min(344px,calc(100vw - 24px)); padding:12px 16px; border:1px solid #e7e4dc; border-radius:12px; background:#fffefa; color:#555d50; box-shadow:0 8px 30px #29271e12; font-size:11px; pointer-events:none; }
.empty { padding:25px 8px; text-align:center; border:1px dashed #e1ddd2; border-radius:12px; margin:4px 0 15px; }
.empty span { display:block; font-size:24px; color:#bb8c75; margin-bottom:10px; }
.empty strong { font-size:12px; font-weight:550; }
.empty p { margin:6px 0; color:var(--muted); font-size:11px; }
.row { padding:13px 0; margin:0; border-top:1px solid var(--border); }
.row-head { display:flex; gap:8px; align-items:center; }
.number { background:#fff0e8; color:#95513b; border-radius:5px; font-size:10px; padding:2px 6px; }
.target { font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:550; }
.note { font-size:12px; line-height:1.7; white-space:pre-wrap; overflow-wrap:anywhere; margin:6px 0 8px; }
.source { color:#6f746a; font:9px/1.6 ui-monospace,monospace; overflow-wrap:anywhere; }
.source-link { display:block; max-width:100%; text-align:left; padding:3px 0; border:0; background:transparent; text-decoration:underline; text-underline-offset:3px; }
.source-context { margin:4px 0 10px; }
.source-kind { color:#57634f; font-size:10px; margin-bottom:3px; }
.source-context .source-link { font-size:11px; color:#424c3e; }
.location-state { font-size:10px; color:#77766c; margin:5px 0; }
.location-state[data-state=found] { color:#427047; }
.target-position { margin-top:6px; }
.compact-source { margin:0; }
.compact-source .source,.compact-source .source-link { color:#7c8174; font-size:9px; padding:0; text-decoration-color:#d3d5ca; }
.compact-source .source-kind { font-size:9px; color:#8d7c66; }
.location-state::before { content:''; display:inline-block; width:5px; height:5px; margin-right:5px; border-radius:50%; background:currentColor; vertical-align:middle; }
.note-actions { display:flex; gap:1px; margin-left:auto; }
.note-details { margin-top:5px; }
.note-details summary { cursor:pointer; color:#8b8e81; font-size:9px; width:max-content; padding:4px 0; }
.note-details[open] summary { color:#56614e; }
.target-details { border-left:2px solid #e9e6dd; padding:2px 0 3px 10px; margin-top:7px; }
.notes-footer { position:sticky; bottom:-12px; display:flex; gap:8px; padding:12px 0 7px; margin-top:2px; border-top:1px solid var(--border); background:#fffefa; }
.notes-footer .primary { flex:1; font-size:11px; }
.notes-footer .quiet { border:0; padding:8px 4px; font-size:10px; color:#858779; }
.notes-footer .quiet:hover { color:#af604a; }
.list-caption { font-size:9px; margin:7px 0 0; text-align:center; color:#989a8e; }
.row-actions { display:flex; gap:6px; margin-top:11px; }
.actions { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
.actions button { flex:1; font-size:12px; }
label { display:block; font-size:11px; margin:14px 0 7px; }
textarea { display:block; resize:vertical; width:100%; min-height:108px; border:1px solid #e2ded4; border-radius:10px; background:#fff; color:#34392f; padding:12px; line-height:1.7; }
textarea::placeholder { color:#74766d; font-size:11px; }
textarea.output { font:10px/1.8 ui-monospace,monospace; min-height:220px; }
code { font:10px/1.5 ui-monospace,monospace; color:#956246; display:block; overflow-wrap:anywhere; margin:5px 0 8px; }
.highlight { position:fixed; pointer-events:none; border:1.5px solid #e6957a; background:#ee9a7d0a; border-radius:5px; z-index:-1; }
.highlight[data-locked=true] { border-color:#ce876e; background:#ee9a7d07; }
.pin { position:fixed; pointer-events:auto; width:23px; height:23px; padding:0; border:2px solid #fffaf3; border-radius:50%; background:#ed977a; color:#4a3027; font-size:10px; font-weight:650; box-shadow:0 2px 7px #4f362b26; transform:translate(-50%,-50%); }
.pin:hover { background:#d98266; }
.hint { position:fixed; top:18px; left:50%; transform:translateX(-50%); background:#fffefa; color:#73766c; border:1px solid #e7e4dc; border-radius:10px; padding:10px 16px; pointer-events:none; box-shadow:0 5px 24px #302c240d; font-size:11px; text-align:center; }
.selection-actions { position:fixed; top:62px; left:50%; transform:translateX(-50%); pointer-events:auto; }
.tool-setting { display:flex; justify-content:space-between; align-items:center; gap:12px; margin:12px 0; }
select { max-width:190px; border:1px solid var(--border); border-radius:8px; padding:7px; color:inherit; background:#fff; font:inherit; font-size:11px; }
.style-details { margin-top:14px; color:var(--muted); font-size:11px; }
.style-details summary { cursor:pointer; }
.style-value { font:10px/1.8 ui-monospace,monospace; overflow-wrap:anywhere; }
.dock[data-mood=copied] .nok-blink { opacity:0; }
.dock[data-mood=copied] .nok-happy { opacity:1; }
.dock[data-mood=selecting] .eye { ry:7px; }
.dock[data-mood=writing] .eye-right { ry:7px; }
.dock[data-mood=error] .eye-left { ry:6px; }
@media(prefers-reduced-motion:no-preference) {
  button { transition:background .15s; }
  .brand::after { transition:opacity .15s,transform .15s; }
  .nok-body { transition:transform .2s; }
  .nok-gaze { transition:transform .12s ease-out; }
  .brand:hover .nok-body { transform:translateY(-2px) rotate(-3deg); }
  .dock[data-mood=idle] .nok-blink { animation:blink 6.4s infinite; }
  .dock[data-mood=selecting] .nok-body { transform:translateY(-3px) rotate(-5deg); }
  .dock[data-mood=writing] .nok-body { transform:rotate(-3deg); }
  .dock[data-mood=saved] .nok-body { animation:nod .48s ease-in-out; }
  .dock[data-mood=copied] .nok-body { animation:delight .65s cubic-bezier(.2,.7,.3,1); }
  .dock[data-mood=copied] .copy-sheets { animation:collect .6s ease-out; }
  .dock[data-mood=error] .nok-body { animation:wobble .32s ease-in-out; }
  .dock[data-dragging] .brand .nok-body { transform:translateY(-4px) scale(1.04) rotate(-3deg); filter:drop-shadow(0 9px 7px #272c2020); }
  .toast { animation:card-in .18s ease-out; }
  .pin { animation:pin-in .3s cubic-bezier(.2,.8,.3,1.4); }
  .highlight[data-locked=true] { animation:focus-in .2s ease-out; }
  @keyframes blink { 0%,43%,47%,100% { transform:scaleY(1); } 45% { transform:scaleY(.08); } }
  @keyframes nod { 0%,100% { transform:translateY(0) scale(1); } 35% { transform:translateY(3px) scale(1.04,.92); } 65% { transform:translateY(-3px) scale(.98,1.03); } }
  @keyframes delight { 0%,100% { transform:translateY(0) rotate(0); } 30% { transform:translateY(-6px) rotate(-5deg); } 65% { transform:translateY(1px) rotate(3deg); } }
  @keyframes wobble { 25% { transform:rotate(-5deg); } 75% { transform:rotate(4deg); } }
  @keyframes collect { 0% { opacity:0; transform:translate(-20px,8px) rotate(-12deg) scale(.7); } 35%,85% { opacity:1; } 100% { opacity:0; transform:translate(20px,-8px) rotate(8deg) scale(.45); } }
  @keyframes card-in { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }
  @keyframes pin-in { from { opacity:0; transform:translate(-50%,-50%) scale(.55); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
  @keyframes focus-in { from { opacity:.6; } to { opacity:1; } }
}
@media(max-width:430px) {
  .dock { right:10px; bottom:10px; width:60px; }
  .brand,.nok { width:60px; }
  .brand { flex-basis:60px; }
  .menu { padding:6px; border-radius:12px; max-width:calc(100vw - 24px); justify-content:center; }
  .menu button { gap:5px; padding:9px 7px; font-size:10px; }
  .menu svg { width:15px; }
  .panel { right:12px; bottom:98px; width:calc(100vw - 24px); }
  .icon-button { width:34px; height:34px; }
  .toast { right:12px; bottom:99px; }
  .hint { max-width:calc(100vw - 32px); width:max-content; font-size:10px; }
}
`;
