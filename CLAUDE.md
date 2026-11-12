# The Snuggest — sipariş sistemi

The Snuggest (bar & mutfak, Zirgu iela 3, Vecrīga, Rīga) için masa sipariş sistemi.
Sahibi: Özgür Adak. **Kullanıcıyla Türkçe konuş**, kısa ve pratik ol; emin olmadığın yerde bunu söyle.
Müşteriye görünen metinler LV / EN (+ çoğu yerde RU). Personel arayüzü Türkçe.

## Dosyalar
| Dosya | Ne | Kim kullanır |
|---|---|---|
| `index.html` | Personel uygulaması: Masalar / Kasa / Rapor / Menü sekmeleri | Personel (tablet, telefon) — giriş gerekli |
| `menu.html` | Müşteri QR menüsü, `menu.html?masa=N` | Müşteri telefonu — giriş yok |
| `ekran.html` | Dikey (1080×1920) müşteri ekranı: menü slaytları + ödeme/teşekkür ekranı | Bara bağlı ekran — personel hesabıyla giriş |
| `online-menu.html` | Bağımsız online menü sayfası (Gloock/Instrument Sans tasarımı) | Herkes |
| `cloudflare/snuggest-notify-worker.js` | Cloudflare Worker `snuggest-notify`: QR sipariş + gün sonu raporu → Telegram | GitHub Actions ile otomatik deploy |
| `firebase/firestore.rules` | Firestore güvenlik kuralları | GitHub Actions ile otomatik deploy |
| `qr/` | Masa QR kartları (PDF) ve tabela/sticker QR'ları | Baskı |

Hepsi tek dosyalık HTML (CSS+JS içinde), build adımı yok. GitHub Pages: `https://ozgadk.github.io/order/` (main / root).
`main`'e push edilen değişiklik 1–2 dakikada yayına çıkar — **canlı sistem, push etmeden önce kullanıcıya sor.**
Otomatik deploy (GitHub Actions, `.github/workflows/`):
- `cloudflare/**` değişince → `wrangler deploy` (secret'lar: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Config: `cloudflare/wrangler.toml`.
- `firebase/**` değişince → Firebase Rules REST API ile yükleme (gcloud token; secret: `FIREBASE_SERVICE_ACCOUNT`, JSON). firebase-tools kullanma: servis hesabında serviceusage izni yok.
- Deploy sonucu GitHub → Actions sekmesinde görünür; hata olursa kullanıcıya söyle.

## Altyapı
- **Firebase** projesi `snuggest-order` (Spark/ücretsiz plan). Firestore (`persistentLocalCache`) + E-posta/şifre Auth, kayıt (sign-up) kapalı. Config HTML'lerin içinde (public, gizli değil).
- **Cloudflare Worker** `https://snuggest-notify.ozguradk.workers.dev` — secret'lar `TG_TOKEN`, `TG_CHAT` Cloudflare'de. Sadece `Origin: https://ozgadk.github.io` kabul eder.
  - `POST /` `{table, who?, lines, note, total}` → sipariş bildirimi; `{type:'report', text}` → gün sonu raporu.
- Personel bildirimleri yalnızca Telegram'dan. QR siparişleri onaysız doğrudan masaya düşer.
- **Token, şifre, API anahtarı asla depoya yazılmaz.**

## Firestore verisi
- `bar/config` `{menu}` — menü (herkes okur). `menu = {ver, tableCount:12, notifyUrl, cats[], events[]}`
  - `cats[] = {id, name, hh?, items[{id, name, v[{l, p(€ sayı)}], out?, stamp?, sug?}]}`
  - `hh` kategorisi = Kokteyl saati (5 €), `{from, to, days[]}` ile görünür.
  - `migrate()` ile sürüm yükseltme (ver 2: hh kategorisi, ver 3: stamp/sug/events). Menü şeması değişirse yeni `ver` ekle, eskiyi bozma.
- Ürün fotoğrafı: item'da `ph` (sürüm, Date.now) varsa foto `photos/{itemId}` `{d: JPEG dataURL ≤~300KB}` içinde (herkes `get` edebilir). Personel Menü düzenleyicisinden yükler (tarayıcıda küçültülür, kaydet'te yazılır); QR menüde 📷 / karta dokununca açılır. Firebase Storage yok (Spark plan).
  - Ayrıca depoda `foto/{itemId}.jpg` + `foto/list.json` `{itemId: sürüm}` (Wolt mağazası `the-snuggest-barcafe`'den alınan kendi fotoğrafları, 1000px). Firestore fotoğrafı varsa o öncelikli.
- `tables/{n}` `{lines[{key, name, l, p(cent), q, who?}], openedAt, notes[], people[]?}` — boş masa dokümanı silinir.
  - `key = itemId|varyant|cent` (+ `|@kişi` kişi etiketi varsa). Hediye satırı `gift|uid`, negatif fiyat.
- `days/{YYYY-MM-DD}` `{bills[]}` — `arrayUnion`. **İş günü 06:00'da değişir.**
- `orders/{id}` — müşteri sadece create edebilir `{table, lang, lines[{id,l,q}], note?, who?, status:'new', t}`; personel uygulaması `runTransaction` ile masaya birleştirir.
- `loyalty/{sha256('snuggest:'+normalizePhone)}` `{stamps, free, total, used, last}` — 10 kokteyl = 1 bedava, telefonla.
- `display/current` — personel uygulaması ödeme ekranı açılınca yazar: `{mode:'bill'|'thanks'|'idle', table, lines, total, part, who?, loy?, method?, at}`; `ekran.html` dinler.

## Özellikler (bozmamaya dikkat)
Masa açma/taşıma, adet +/-, stok (tükendi), notlar, hesap bölme, kişi etiketi (aynı masada K1/K2/isim, kişi başı ödeme),
sadakat kartı, "bunu da dene" önerileri, etkinlikler, Google yorum + Instagram (@thesnuggest) linkleri, gün sonu Telegram raporu,
CSV dışa aktarma, kasa sıfırlama, müşteri ekranı, QR menüde Falcı Panda içki önerici (olduğu gibi kalacak).
Falcı Panda tarot/kahve falı uygulaması **ayrı bir proje**, bu depoda değil.

## Kokteyl saati
`ekran.html` ve `online-menu.html` kendi saatlerini kullanır: Paz–Per 18:00–21:00, Cum–Cmt 18:00–20:00.
`index.html`/`menu.html` ise menüdeki `hh {from,to,days}` ayarını kullanır. Saat değişirse ikisini de güncelle.

## Test
Firebase'e bağlanmadan Playwright ile: Firebase modülünü engelle, `window.FB` (index.html) / `window.FBC` (menu.html) / `window.EK` (ekran.html) sahte nesnesini enjekte et, `fbready`/`ekready` olayını gönder.
Telefon (390px) ve dikey ekran (1080×1920) görünümünü ekran görüntüsüyle kontrol et.
