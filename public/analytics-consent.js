(() => {
  'use strict';
  // İzleme sadece açık kullanıcı izni ile başlar; reddedildiğinde Google betiği indirilmez.
  const ID = 'G-3FFB6K64JM';
  const KEY = 'vardiyamatik-analytics-choice-v1';
  const DISABLE = 'ga-disable-' + ID;
  const css = document.createElement('style');
  css.textContent = `
    .vm-cookie-panel{position:fixed;left:16px;bottom:16px;z-index:9999;max-width:min(540px,calc(100vw - 32px));background:#fff;color:#182846;border:1px solid #cbd6e7;border-radius:16px;box-shadow:0 12px 44px #101d3550;padding:20px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;line-height:1.5}
    .vm-cookie-panel h2{font-size:17px;line-height:1.3;margin:0 0 8px;color:#132545}
    .vm-cookie-panel p{margin:0 0 12px;color:#394c6b}
    .vm-cookie-panel a{color:#215ac9}
    .vm-cookie-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    .vm-cookie-actions button{font:inherit;font-weight:700;border:1px solid #214ba8;min-height:41px;padding:9px 16px;border-radius:9px;cursor:pointer;flex:1}
    .vm-cookie-yes{background:#214ba8;color:#fff}
    .vm-cookie-no{background:#fff;color:#214ba8}
    .vm-preference-btn{border:0;background:transparent;color:inherit;text-decoration:underline;cursor:pointer;font:inherit;padding:2px 6px}
    @media(max-width:540px){.vm-cookie-panel{left:10px;bottom:10px;max-width:calc(100vw - 20px);padding:16px}}
  `;
  document.head.appendChild(css);

  let choice = null;
  try { choice = localStorage.getItem(KEY); } catch (_) { /* Depolama kapalıysa her ziyarette sor. */ }

  const preference = document.createElement('button');
  preference.type = 'button';
  preference.className = 'vm-preference-btn';
  preference.textContent = 'Çerez tercihleri';
  preference.setAttribute('aria-label', 'Analitik çerez tercihlerini değiştir');
  const footer = document.querySelector('footer');
  if (footer) footer.appendChild(preference);
  else document.body.appendChild(preference);

  let panel;
  function closePanel() {
    if (panel) { panel.remove(); panel = null; }
  }
  function removeAnalyticsCookies() {
    // Kullanıcının bu siteye ait, tanımlanabilir Google Analytics çerezlerini silmeye çalış.
    document.cookie.split(';').forEach(part => {
      const name = part.split('=')[0].trim();
      if (/^_ga(?:_|$)/.test(name)) {
        document.cookie = name + '=; Path=/; Max-Age=0; SameSite=Lax';
        document.cookie = name + '=; Path=/; Max-Age=0; SameSite=Lax; Secure';
      }
    });
  }
  function loadAnalytics() {
    if (document.querySelector('script[data-vm-analytics]')) return;
    window[DISABLE] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', ID, { send_page_view: true });
    const script = document.createElement('script');
    script.async = true;
    script.dataset.vmAnalytics = 'true';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
    document.head.appendChild(script);
  }
  function setChoice(value) {
    choice = value;
    try { localStorage.setItem(KEY, value); } catch (_) { /* Oturumluk seçim. */ }
    if (value === 'accepted') {
      closePanel();
      loadAnalytics();
    } else {
      window[DISABLE] = true;
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { analytics_storage: 'denied' });
      }
      removeAnalyticsCookies();
      closePanel();
    }
  }
  function showPanel() {
    closePanel();
    panel = document.createElement('div');
    panel.className = 'vm-cookie-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ziyaretçi istatistikleri tercihi');
    const heading = document.createElement('h2');
    heading.textContent = 'İsteğe bağlı ziyaretçi istatistikleri';
    const message = document.createElement('p');
    message.textContent = 'Sitemizi geliştirmek için Google Analytics ile sayfa ziyaretlerini ölçmek istiyoruz. Kabul etmezseniz hesaplama araçlarını aynı şekilde kullanabilirsiniz.';
    const link = document.createElement('a');
    link.href = './gizlilik.html';
    link.textContent = 'Gizlilik açıklaması';
    const actions = document.createElement('div');
    actions.className = 'vm-cookie-actions';
    const reject = document.createElement('button');
    reject.type = 'button'; reject.className = 'vm-cookie-no'; reject.textContent = 'Reddet';
    reject.addEventListener('click', () => setChoice('rejected'));
    const accept = document.createElement('button');
    accept.type = 'button'; accept.className = 'vm-cookie-yes'; accept.textContent = 'Kabul et';
    accept.addEventListener('click', () => setChoice('accepted'));
    actions.append(reject, accept);
    panel.append(heading, message, link, actions);
    document.body.appendChild(panel);
  }
  preference.addEventListener('click', showPanel);

  if (choice === 'accepted') loadAnalytics();
  else if (choice !== 'rejected') showPanel();
  else window[DISABLE] = true;
})();
