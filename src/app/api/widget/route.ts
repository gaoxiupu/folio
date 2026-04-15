import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const script = `
(function () {
  if (document.getElementById('folio-widget-root')) return;

  var BASE = '${baseUrl}';

  /* ── styles ── */
  var style = document.createElement('style');
  style.textContent = [
    '#folio-widget-root{position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:12px;font-family:sans-serif;}',
    '#folio-btn{width:48px;height:48px;border-radius:50%;background:#37352F;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:rgba(0,0,0,0.08) 0px 0px 0px 1px,rgba(0,0,0,0.12) 0px 4px;transition:background .15s;flex-shrink:0;}',
    '#folio-btn:hover{background:#2F2D2A;}',
    '#folio-btn svg{display:block;}',
    '#folio-iframe-wrap{width:380px;height:600px;border-radius:12px;overflow:hidden;box-shadow:rgba(0,0,0,0.08) 0px 0px 0px 1px,rgba(0,0,0,0.08) 0px 4px,rgba(0,0,0,0.04) 0px 12px;transform-origin:bottom right;transition:opacity .15s;pointer-events:auto;}',
    '#folio-iframe-wrap.folio-hidden{opacity:0;pointer-events:none;visibility:hidden;}',
    '#folio-iframe-wrap iframe{width:100%;height:100%;border:none;display:block;}',
  ].join('');
  document.head.appendChild(style);

  /* ── root container ── */
  var root = document.createElement('div');
  root.id = 'folio-widget-root';
  document.body.appendChild(root);

  /* ── iframe wrapper (hidden by default) ── */
  var wrap = document.createElement('div');
  wrap.id = 'folio-iframe-wrap';
  wrap.className = 'folio-hidden';

  var iframe = document.createElement('iframe');
  iframe.src = BASE + '/widget';
  iframe.allow = 'clipboard-write';
  iframe.title = 'Folio chat';
  wrap.appendChild(iframe);
  root.appendChild(wrap);

  /* ── toggle button ── */
  var btn = document.createElement('button');
  btn.id = 'folio-btn';
  btn.setAttribute('aria-label', 'Open chat');

  var iconChat = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var iconClose = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  btn.innerHTML = iconChat;
  root.appendChild(btn);

  var open = false;
  btn.addEventListener('click', function () {
    open = !open;
    if (open) {
      wrap.classList.remove('folio-hidden');
      btn.innerHTML = iconClose;
      btn.setAttribute('aria-label', 'Close chat');
    } else {
      wrap.classList.add('folio-hidden');
      btn.innerHTML = iconChat;
      btn.setAttribute('aria-label', 'Open chat');
    }
  });
})();
`.trim();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
