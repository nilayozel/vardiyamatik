# VardiyaMatik — Render'a yayinlama

React derlemesi, Node.js sunucusu veya veritabani gerektirmez. Saf HTML/JS/CSS statik sitedir. `public/` klasorundeki dosyalar dogrudan yayinlanir.

## Ucretsiz yayina alma
1. GitHub'da yeni **public** bir depo olustur (ornegin `vardiyamatik`). `Add a README file` secenegini isaretlemene gerek yok.
2. Bu ZIP'i bilgisayarda ac. Repo sayfasinda **uploading an existing file** ya da `Add file` > `Upload files` ile ZIP'in icindeki **`render.yaml`, `README.md`, `.gitignore` ve `public/` klasorunu** yukle. ZIP'i tek dosya olarak yukleme; dosyalarin icerigi repo kokunde bulunmali.
3. [Render Dashboard](https://dashboard.render.com/) > **New** > **Static Site** > GitHub deponu sec. Gerekirse once GitHub baglantisini ver.
4. Alana istenirse **Build Command**: `echo "VardiyaMatik statik dosyalar hazir"` ve **Publish Directory**: `public` yaz. **Root Directory** bos kalsin. Basit statik site icin **Web Service** secme.
5. Site olusturulunca Render `https://...onrender.com` adresi verir. Bu adresi once telefon ve bilgisayarda dene.

Istersen Render'da **New > Blueprint** ve repodaki `render.yaml` ile otomatik olusturma yolunu da kullanabilirsin.

## Onemli
- Render statik site barindirma ucretsiz baslayabilir, ancak kullanim limitleri vardir. Secim ekraninda plan ve tahmini ucret kontrol edilmeli.
- Tamamen reklamsiz/orijinal ilk surum. Gelir ya da organik trafik garantisi yok.
- Takvim verisi tarayicida tutulur. Cihaz degistirince otomatik senkronize olmaz.
- `public/_headers` Cloudflare dosyasi olmadigindan Render icin `render.yaml` HTTP basliklari kullanilir.
- Iletisim, gizlilik ve mesai hesaplama metinlerini yayin oncesi gozden gecir.
- Alan adi/net site adresi belli olunca Search Console, site haritasi, canonical ve yasal sayfalar icin ayar yapilabilir.