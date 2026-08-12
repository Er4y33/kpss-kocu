# KPSS Koçu — Yayınlama Rehberi

Çevrimdışı çalışan web uygulaması. iPhone ve Android'de aynı şekilde çalışır.

---

## Neden İnternet Sadece Bir Kez Gerekiyor

Uygulamanın içinde `sw.js` adında bir **servis çalışanı** var. Kuzenin siteyi ilk açtığında bu dosya tüm uygulamayı (kartlar dahil) telefonun hafızasına kaydediyor. Sonraki açılışlarda hiçbir şey indirilmiyor.

| Durum | İnternet |
|---|---|
| İlk açılış ve ana ekrana ekleme | Gerekli |
| Günlük kullanım | Gerekmez |
| Uçak modu | Çalışır |
| Sen yeni kart eklediğinde | Bir kez, sessizce günceller |

---

## 1. GitHub'a Yükle

Bir GitHub hesabın yoksa `github.com` üzerinden ücretsiz aç.

**Depo oluştur:**

1. GitHub'da sağ üstteki **+** işaretine tıkla → **New repository**
2. Repository name: `kpss-kocu`
3. **Public** seç (Private olursa Pages ücretsiz çalışmaz)
4. **Create repository**

**Dosyaları yükle:**

Açılan sayfada **uploading an existing file** bağlantısına tıkla. Zip'ten çıkardığın klasörün **içindeki** her şeyi sürükle-bırak:

```
index.html
manifest.json
sw.js
css/
js/
ikon/
```

Klasörün kendisini değil, **içindekileri** sürükle. `index.html` en üst seviyede olmalı.

Aşağıdaki **Commit changes** düğmesine bas.

## 2. GitHub Pages'i Aç

1. Deponun **Settings** sekmesine gir
2. Sol menüden **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / klasör: **/ (root)** → **Save**

1-2 dakika sonra sayfanın üstünde adresin çıkar:

```
https://KULLANICIADIN.github.io/kpss-kocu/
```

Bu adres HTTPS olduğu için uygulama ana ekrana eklenebilir. Normal bir dosya paylaşımıyla (Google Drive, Dropbox) bu çalışmaz — servis çalışanı HTTPS şart koşar.

---

## 3. Kuzenin Telefonuna Kurulumu (iPhone)

Adresi kuzenine gönder. Kuzenin:

1. Bağlantıyı **Safari'de** açsın (Chrome veya uygulama içi tarayıcı **olmaz** — iOS'ta ana ekrana ekleme yalnızca Safari'de çalışır)
2. Alttaki **paylaş** düğmesine bassın (kare içinde yukarı ok)
3. Listeyi kaydırıp **Ana Ekrana Ekle**'yi seçsin
4. **Ekle**

Artık ana ekranında ikonu var. Oradan açtığında tam ekran açılır, adres çubuğu görünmez.

**Önemli:** Uygulamayı ana ekrandaki ikondan açması gerekiyor. Safari sekmesinden açarsa veriler ayrı yerde tutulur ve karışır.

### Android (senin telefonun)

Chrome'da adresi aç → sağ üst menü → **Uygulamayı yükle** veya **Ana ekrana ekle**.

---

## 4. Yeni Kart Eklemek

`js/kartlar.js` dosyasını GitHub üzerinden düzenleyebilirsin (dosyaya tıkla → kalem simgesi).

Diziye yeni nesne ekle:

```js
{ id: 'TR038', ders: 'tarih', konu: 'Atatürk İlke ve İnkılapları',
  on: 'Soru yüzü — tek bir şey sorsun',
  arka: 'Cevap yüzü — tam ve doğrulanabilir bilgi' },
```

Kurallar:

- **id benzersiz olmalı.** Aynı id iki kez geçerse ilerleme takibi bozulur.
- **konu adı** birebir aynı yazılmalı. "Yasama" ile "yasama" iki ayrı konu sayılır.
- **Bir kartta bir bilgi.** Üç maddelik cevaplar öğrenmeyi zorlaştırır.

**Kart ekledikten sonra `sw.js` dosyasındaki sürüm numarasını artır:**

```js
const SURUM = 'kpss-v2';   // v1'den v2'ye
```

Bu satır değişmezse telefonlar eski sürümü kullanmaya devam eder. Değiştirdiğinde, kuzenin uygulamayı internetli bir ortamda bir kez açtığında güncelleme sessizce iner.

---

## 5. Dosya Yapısı

```
index.html          Uygulama iskeleti, sekmeler
manifest.json       Ana ekrana ekleme ayarları (isim, ikon, renk)
sw.js               Servis çalışanı — çevrimdışı çalışmayı sağlar
css/style.css       Tüm görsel tasarım
js/kartlar.js       97 kart — düzenleyeceğin tek veri dosyası
js/leitner.js       Aralıklı tekrar algoritması, ders/konu tanımları
js/depo.js          Kayıt saklama, fotoğraf küçültme, yedekleme
js/app.js           Beş ekranın tamamı ve uygulama mantığı
ikon/               Ana ekran ikonları
```

---

## 6. Sistem Nasıl Çalışıyor

**Leitner kutuları:** Her kart 1–5 arası bir kutuda durur.

| Kutu | Tekrar aralığı |
|---|---|
| 1 | Ertesi gün |
| 2 | 3 gün sonra |
| 3 | 1 hafta sonra |
| 4 | 3 hafta sonra |
| 5 | 2 ay sonra |

"Bildim" bir üst kutuya çıkarır, "Bilemedim" doğrudan 1. kutuya düşürür.

**İki modülün bağlantısı:** Hata defterine bir konudan yanlış girildiğinde, o konunun tüm kartları 1. kutuya döner ve ertesi gün tekrar karşıya çıkar. Kuzeninin kendi hataları tekrar programını yeniden düzenler.

**Kapsam:** Tarih 37, Coğrafya 20, Vatandaşlık 20, Türkçe 20 kart. Matematik yüz yüze çalışıldığı için yok. Türkçe'de yalnızca yazım, noktalama ve anlatım bozukluğu var; paragraf ve anlam bilgisi kart ezberiyle gelişmediği için bilinçli olarak dışarıda bırakıldı — ama hata defterinde o konular da seçilebiliyor.

---

## 7. Bilinmesi Gerekenler

**Veriler telefonda.** Kart ilerlemesi ve hata kayıtları tarayıcı hafızasında, fotoğraflar IndexedDB'de. Hiçbiri sunucuya gitmiyor.

**Yedekleme iOS'ta daha önemli.** Safari, uzun süre kullanılmayan sitelerin verilerini silebiliyor. Ana ekrana eklenmiş uygulamalarda bu koruma daha güçlü ama garanti değil. **Ayda bir Ayarlar → Yedek dosyası indir** yapıp kendine göndermesi iyi olur. Geri yükleme de aynı ekrandan, dosya seçerek.

**Bildirim yok.** iOS'ta web uygulamaları için bildirim desteği sınırlı. "Bugün 20 kartın var" hatırlatması gönderemiyoruz; kuzeninin kendi alışkanlığını kurması gerekiyor.

**Fotoğraf çekme çalışıyor.** Hata defterinde "Fotoğraf ekle" düğmesi iPhone'da kamerayı açar. Görsel 1200 piksele küçültülüp sıkıştırılarak saklanır, yer kaplamaz.
