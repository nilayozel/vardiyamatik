(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const labels = {
    S: ['Sabah', 'morning'], A: ['Akşam', 'evening'], G: ['Gece', 'night'], 'İ': ['İzin', 'rest']
  };
  // Bunlar işveren takvimleri değil; kullanıcının uyarlayabileceği örnek döngülerdir.
  const patterns = {
    '3': ['S','S','A','A','G','G','İ','İ'],
    '2': ['S','S','G','G','İ','İ'],
    '4': ['S','S','S','S','İ','İ','G','G','G','G','İ','İ'],
    '5x2': ['S','S','S','S','S','İ','İ'],
    '224': ['S','S','G','G','İ','İ','İ','İ']
  };
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  const formatNumber = new Intl.NumberFormat('tr-TR', {maximumFractionDigits: 2});
  const money = n => formatNumber.format(n) + ' TL';
  const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dateFromKey = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); };
  const validDate = key => /^\d{4}-\d{2}-\d{2}$/.test(key) && fmtDate(dateFromKey(key)) === key;
  const defaultSettings = {pattern: '3', customPattern: 'S,S,A,A,G,G,İ,İ', start: fmtDate(new Date(today.getFullYear(),today.getMonth(),1)), hoursPerShift: 8};
  let settings = {...defaultSettings};
  let overrides = {};
  function getStore(key) {try {return JSON.parse(localStorage.getItem(key) || 'null')} catch (_) {return null}}
  const saved = getStore('vardiyamatik-settings');
  if (saved && typeof saved === 'object') settings = {...defaultSettings, ...saved};
  const savedOverrides = getStore('vardiyamatik-overrides');
  if (savedOverrides && typeof savedOverrides === 'object' && !Array.isArray(savedOverrides)) {
    overrides = Object.fromEntries(Object.entries(savedOverrides).filter(([date,code]) => validDate(date) && labels[code]));
  }
  const cycleFrom = (pattern, custom) => pattern === 'custom'
    ? custom.toLocaleUpperCase('tr-TR').split(',').map(v => v.trim()).filter(Boolean)
    : patterns[pattern];
  function isValidConfig(s) {
    const cycle = cycleFrom(s.pattern,s.customPattern);
    return !!(validDate(s.start) && Array.isArray(cycle) && cycle.length > 0 && cycle.length <= 90 && cycle.every(c => labels[c]) && Number.isFinite(Number(s.hoursPerShift)) && Number(s.hoursPerShift) > 0 && Number(s.hoursPerShift) <= 24);
  }
  if (!isValidConfig(settings)) settings = {...defaultSettings};
  function loadSharedSettings() {
    try {
      const qs = new URLSearchParams(location.hash.replace(/^#/,''));
      if (!qs.has('vardiya')) return;
      const incoming = {pattern: qs.get('p') || 'custom', customPattern: qs.get('c') || defaultSettings.customPattern, start: qs.get('d') || '', hoursPerShift: Number(qs.get('h'))};
      if (isValidConfig(incoming)) { settings = incoming; toast('Paylaşılan vardiya düzeni yüklendi'); }
    } catch (_) {}
  }
  function persist() {
    try {
      localStorage.setItem('vardiyamatik-settings',JSON.stringify(settings));
      localStorage.setItem('vardiyamatik-overrides',JSON.stringify(overrides));
    } catch (_) {toast('Tarayıcı ayarları kaydedemedi; açık kaldığı sürece kullanabilirsin.');}
  }
  function toast(msg) {
    const el=$('#toast'); el.textContent=msg; el.style.display='block';
    clearTimeout(toast.timer); toast.timer=setTimeout(() => {el.style.display='none'},3600);
  }
  function baseShift(d) {
    const cycle = cycleFrom(settings.pattern,settings.customPattern);
    const [y,m,day] = settings.start.split('-').map(Number);
    const diff = Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(y,m-1,day))/86400000);
    return cycle[((diff%cycle.length)+cycle.length)%cycle.length];
  }
  function dayShift(date) {return overrides[fmtDate(date)] || baseShift(date)}
  const monthDates = () => Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=>new Date(year,month,i+1));
  function render() {
    const first = new Date(year,month,1), offset=(first.getDay()+6)%7;
    $('#monthTitle').textContent = new Intl.DateTimeFormat('tr-TR',{month:'long',year:'numeric'}).format(first);
    const box = $('#days'); box.replaceChildren();
    let work=0,off=0;
    for(let i=0;i<offset;i++) {const blank=document.createElement('div');blank.className='day dim';blank.setAttribute('aria-hidden','true');box.appendChild(blank)}
    for(const date of monthDates()) {
      const code=dayShift(date),[label,cl]=labels[code],key=fmtDate(date);
      const cell=document.createElement('button');cell.type='button';cell.className='day date-button';cell.title=`${key}: ${label} — değiştirmek için tıkla`;
      cell.setAttribute('aria-label',`${date.getDate()} ${$('#monthTitle').textContent}, ${label}. Vardiyayı düzenle`);
      if (overrides[key]) cell.classList.add('overridden');
      const num=document.createElement('span');num.className='daynum';num.textContent=String(date.getDate());
      const shift=document.createElement('span');shift.className='shift '+cl;shift.textContent=label;
      cell.append(num,shift);
      if (overrides[key]) {const mark=document.createElement('span');mark.className='overmark';mark.textContent='•';mark.title='Elle düzenlendi';cell.append(mark)}
      cell.addEventListener('click',()=>editDay(key));box.appendChild(cell);
      code==='İ'?off++:work++;
    }
    $('#workdays').textContent=String(work);$('#offdays').textContent=String(off);
    $('#totalHours').textContent=formatNumber.format(work*Number(settings.hoursPerShift));
    $('#monthHint').textContent=`${Object.keys(overrides).filter(d=>d.startsWith(`${year}-${String(month+1).padStart(2,'0')}-`)).length} gün elle düzenlendi`;
  }
  function syncInputs() {
    $('#pattern').value=settings.pattern;
    $('#customPattern').value=settings.customPattern;
    $('#start').value=settings.start;
    $('#hoursPerShift').value=settings.hoursPerShift;
    $('#customWrap').hidden=settings.pattern!=='custom';
  }
  function generate() {
    const incoming={pattern:$('#pattern').value,customPattern:$('#customPattern').value,start:$('#start').value,hoursPerShift:Number($('#hoursPerShift').value)};
    if (!isValidConfig(incoming)) {toast('Geçerli tarih, 1–90 günlük döngü ve 0–24 saat arası çalışma süresi gir.');return}
    settings=incoming;persist();render();toast('Takvim güncellendi');
  }
  function editDay(date) {
    $('#editDateLabel').textContent = new Intl.DateTimeFormat('tr-TR',{dateStyle:'full'}).format(dateFromKey(date));
    $('#editDate').value=date;
    $('#editShift').value=overrides[date] || 'auto';
    $('#editDialog').showModal();
  }
  $('#saveEdit').addEventListener('click',()=>{
    const date=$('#editDate').value,code=$('#editShift').value;
    if(!validDate(date))return;
    if(code==='auto')delete overrides[date]; else if(labels[code]) overrides[date]=code;
    persist();render();$('#editDialog').close();toast('Gün kaydedildi');
  });
  $('#cancelEdit').addEventListener('click',()=>$('#editDialog').close());
  $('#editDialog').addEventListener('click',ev=>{if(ev.target===$('#editDialog'))$('#editDialog').close()});
  function download(filename,content,type) {
    const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  const monthSlug=()=>`${year}-${String(month+1).padStart(2,'0')}`;
  $('#csv').addEventListener('click',()=>{
    const rows=['Tarih;Gün;Vardiya;Net Saat;Durum'];
    for(const date of monthDates()) {
      const code=dayShift(date),key=fmtDate(date);
      rows.push([key,new Intl.DateTimeFormat('tr-TR',{weekday:'long'}).format(date),labels[code][0],code==='İ'?0:settings.hoursPerShift,overrides[key]?'Elle düzenlendi':'Döngü'].join(';'));
    }
    download(`vardiya-${monthSlug()}.csv`,'\uFEFF'+rows.join('\r\n'),'text/csv;charset=utf-8');
    toast('CSV dosyası indirildi');
  });
  const icsEscape=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  $('#ics').addEventListener('click',()=>{
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//VardiyaMatik//TR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:VardiyaMatik'];
    const timestamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    for(const date of monthDates()) {
      const code=dayShift(date),key=fmtDate(date).replace(/-/g,''),next=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1),end=fmtDate(next).replace(/-/g,'');
      lines.push('BEGIN:VEVENT',`UID:vardiyamatik-${key}-${code}@local`,`DTSTAMP:${timestamp}`,`DTSTART;VALUE=DATE:${key}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:${icsEscape('Vardiya: '+labels[code][0])}`,'DESCRIPTION:'+icsEscape('Bireysel planlama için örnek vardiya kaydı. Saat içermeyen tüm gün etkinliğidir.'),'END:VEVENT');
    }
    lines.push('END:VCALENDAR');download(`vardiya-${monthSlug()}.ics`,lines.join('\r\n')+'\r\n','text/calendar;charset=utf-8');toast('Takvim dosyası indirildi');
  });
  $('#share').addEventListener('click', async ()=>{
    if(location.protocol==='file:') {toast('Paylaşım bağlantısı için siteyi internette yayımla.');return}
    const qs=new URLSearchParams({vardiya:'1',p:settings.pattern,c:settings.customPattern,d:settings.start,h:String(settings.hoursPerShift)});
    const url=location.href.split('#')[0]+'#'+qs;
    try {await navigator.clipboard.writeText(url);toast('Döngü bağlantısı kopyalandı. Günlük düzeltmeler paylaşılmaz.')} catch(_) {prompt('Bağlantıyı kopyala:',url)}
  });
  $('#print').addEventListener('click',()=>window.print());
  $('#pattern').addEventListener('change',()=>{$('#customWrap').hidden=$('#pattern').value!=='custom'});
  $('#generate').addEventListener('click',generate);
  $('#prev').addEventListener('click',()=>{month--;if(month<0){year--;month=11}render()});
  $('#next').addEventListener('click',()=>{month++;if(month>11){year++;month=0}render()});
  $('#today').addEventListener('click',()=>{year=today.getFullYear();month=today.getMonth();render()});
  $$('.tab').forEach(b=>b.addEventListener('click',()=>{
    $$('.tab').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-selected',String(t===b));t.tabIndex=t===b?0:-1});
    $$('.panel').forEach(p=>{p.classList.toggle('active',p.id===b.dataset.tab);p.hidden=p.id!==b.dataset.tab});
  }));
  function overtime() {
    const sal=Number($('#salary').value),div=Number($('#divisor').value),hrs=Number($('#extraHours').value),mult=Number($('#multiplier').value);
    const valid=Number.isFinite(sal)&&sal>=0&&Number.isFinite(div)&&div>0&&Number.isFinite(hrs)&&hrs>=0&&Number.isFinite(mult)&&mult>=1;
    const hour=valid?sal/div:0;
    $('#extraResult').textContent=valid?money(hour*hrs*mult):'—';
    $('#hourly').textContent=valid?money(hour):'—';
    $('#overtimeHourly').textContent=valid?money(hour*mult):'—';
    $('#overtimeCount').textContent=valid?formatNumber.format(hrs)+' saat':'—';
    $('#usedMultiplier').textContent=valid?formatNumber.format(mult)+'×':'—';
    $('#overtimeError').textContent=valid?'':'Lütfen negatif olmayan ücret/saat ve sıfırdan büyük bir bölen gir.';
  }
  ['salary','divisor','extraHours','multiplier'].forEach(id=>$('#'+id).addEventListener('input',overtime));
  function parseMinutes(str) {
    const match=/^(\d{2}):(\d{2})$/.exec(str);
    return match?Number(match[1])*60+Number(match[2]):null;
  }
  function hours() {
    const a=parseMinutes($('#clockIn').value),b=parseMinutes($('#clockOut').value),br=Number($('#breakMin').value);
    const gross=a!==null&&b!==null?((b-a+1440)%1440||1440):0;
    const valid=a!==null&&b!==null&&Number.isFinite(br)&&br>=0&&br<=gross;
    const net=valid?gross-br:0;
    const readable=n=>`${Math.floor(n/60)} sa ${n%60} dk`;
    $('#netTime').textContent=valid?readable(net):'—';
    $('#grossTime').textContent=valid?readable(gross):'—';
    $('#breakOut').textContent=valid?formatNumber.format(br)+' dk':'—';
    $('#decimalTime').textContent=valid?formatNumber.format(net/60)+' saat':'—';
    $('#hoursError').textContent=valid?'':'Geçerli saatler gir ve mola süresini vardiyadan uzun tutma.';
  }
  ['clockIn','clockOut','breakMin'].forEach(id=>$('#'+id).addEventListener('input',hours));
  $('#year').textContent=String(today.getFullYear());
  loadSharedSettings();syncInputs();render();overtime();hours();
  if('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
})();