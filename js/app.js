/* =======================================================================
   KPSS Koçu — uygulama mantığı
   Beş ekran, tek sayfa. Durum bellekte tutulur, her değişiklikte diske
   yazılır. Çevrimdışı çalışır; hiçbir istek sunucuya gitmez.
   ======================================================================= */

const D = {
  kartDurum: {},
  hatalar: [],
  oturumlar: [],
  supheli: {},
  sekme: 'bugun',
  /* tekrar oturumu */
  deste: null,
  sira: 0,
  acik: false,
  secilenDers: null,
  oturumSkor: { bildim: 0, bilmedim: 0 },
  /* hata defteri sekmesi */
  hataSekme: 'ekle',
  form: { ders: 'tarih', konu: null, neden: 'bilgi', kaynak: '', foto: null },
  test: { ders: 'tarih', dogru: '', yanlis: '', bos: '' },
  acikDers: 'tarih',
  geriYukleAcik: false,
};

const SEKMELER = [
  { kod: 'bugun',   ad: 'Bugün',   simge: '◉' },
  { kod: 'tekrar',  ad: 'Tekrar',  simge: '⟳' },
  { kod: 'hata',    ad: 'Defter',  simge: '✎' },
  { kod: 'konular', ad: 'Konular', simge: '▦' },
  { kod: 'ayarlar', ad: 'Ayarlar', simge: '⚙' },
];

/* ------------------------- YARDIMCILAR ------------------------- */
const $ = (sec) => document.querySelector(sec);
const kacir = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cubuk(oran, renk) {
  const g = Math.max(0, Math.min(100, oran));
  return `<div class="cubuk-dis"><div class="cubuk-ic" style="width:${g}%${renk ? `;background:${renk}` : ''}"></div></div>`;
}

/* Şüpheli işaretlenen kartlar tekrar destesinden, sayımlardan ve
   hâkimiyet hesabından çıkarılır. Kuzenin kitabıyla çelişen bir kart
   gördüğünde işaretler; o kart düzeltilene kadar karşısına çıkmaz. */
function aktifKartlar() {
  return KARTLAR.filter((k) => !D.supheli[k.id]);
}

function aktifDers(ders) {
  return aktifKartlar().filter((k) => k.ders === ders);
}

function supheliIsaretle(kartId) {
  if (!confirm('Bu kartta hata olduğunu düşünüyorsan işaretle. Kart tekrar destesinden çıkar ve Ayarlar ekranındaki listede birikir.')) return;
  D.supheli[kartId] = { tarih: new Date().toISOString() };
  Depo.supheliYaz(D.supheli);
  /* İşaretlenen kart destede duruyorsa çıkar */
  if (D.deste) {
    const oncekiUzunluk = D.deste.length;
    D.deste = D.deste.filter((k) => k.id !== kartId);
    if (D.deste.length < oncekiUzunluk) D.acik = false;
  }
  ciz();
  duyur('Kart şüpheli olarak işaretlendi.');
}

function supheliKaldir(kartId) {
  delete D.supheli[kartId];
  Depo.supheliYaz(D.supheli);
  ciz();
  duyur('Kart tekrar destesine geri alındı.');
}

/* Şüpheli listesini metin olarak dışa aktar - düzeltilmek üzere paylaşmak için */
function supheliListeyiPaylas() {
  const idler = Object.keys(D.supheli);
  if (idler.length === 0) return;
  const satirlar = idler.map((id) => {
    const k = KARTLAR.find((x) => x.id === id);
    if (!k) return `${id} — (kart bulunamadı)`;
    return `${k.id} | ${DERS_AD[k.ders]} / ${k.konu}\nSORU: ${k.on}\nCEVAP: ${k.arka}\n`;
  });
  const metin = `KPSS Koçu — şüpheli kartlar (${idler.length} adet)\n\n` + satirlar.join('\n');

  if (navigator.share) {
    navigator.share({ title: 'Şüpheli kartlar', text: metin }).catch(() => {});
    return;
  }
  const dosya = new Blob([metin], { type: 'text/plain' });
  const url = URL.createObjectURL(dosya);
  const a = document.createElement('a');
  a.href = url;
  a.download = `supheli-kartlar-${bugun()}.txt`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  duyur('Liste indirildi. Düzeltilmesi için gönderebilirsin.');
}

function sonNGun(kayitlar, n) {
  const sinir = new Date();
  sinir.setDate(sinir.getDate() - n);
  return kayitlar.filter((k) => new Date(k.tarih) >= sinir);
}

function trTarih(iso) {
  return new Date(iso).toLocaleDateString('tr-TR');
}

/* ------------------------- BAŞLATMA ------------------------- */
function baslat() {
  D.kartDurum = Depo.kartDurumOku();
  D.hatalar = Depo.hatalarOku();
  D.oturumlar = Depo.oturumlarOku();
  D.supheli = Depo.supheliOku();
  kaliciDepoIste();
  ciz();
}

/* ------------------------- ÇİZİM ------------------------- */
function ciz() {
  const aktif = SEKMELER.find((t) => t.kod === D.sekme);
  $('#baslikAlt').textContent = aktif.ad;

  const ekranlar = {
    bugun: ekranBugun,
    tekrar: ekranTekrar,
    hata: ekranHata,
    konular: ekranKonular,
    ayarlar: ekranAyarlar,
  };
  $('#govde').innerHTML = ekranlar[D.sekme]();
  $('#govde').scrollTop = 0;

  document.querySelectorAll('.alt-oge').forEach((e) => {
    e.classList.toggle('aktif', e.dataset.sekme === D.sekme);
  });
}

function sekmeGec(kod) {
  D.sekme = kod;
  ciz();
}

/* ===================== EKRAN: BUGÜN ===================== */
function ekranBugun() {
  const vade = {};
  let toplam = 0;
  DERSLER.forEach((d) => {
    vade[d] = vadesiGelenler(aktifDers(d), D.kartDurum).length;
    toplam += vade[d];
  });

  const sayac = {};
  sonNGun(D.hatalar, 7).forEach((h) => {
    const a = `${h.ders}|${h.konu}`;
    sayac[a] = (sayac[a] || 0) + 1;
  });
  const zayif = Object.entries(sayac)
    .map(([a, adet]) => { const [ders, konu] = a.split('|'); return { ders, konu, adet }; })
    .sort((x, y) => y.adet - x.adet).slice(0, 3);

  const son = sonNGun(D.oturumlar, 7);
  const netOzet = son.length ? {
    soru: son.reduce((a, o) => a + o.soru, 0),
    net: son.reduce((a, o) => a + o.net, 0),
  } : null;

  const genel = hakimiyet(aktifKartlar(), D.kartDurum);

  return `
    <div class="yuzey koyu">
      <div class="vurgu-ust">BUGÜN TEKRAR EDİLECEK</div>
      <div class="vurgu-satir">
        <span class="vurgu-sayi">${toplam}</span>
        <span class="vurgu-birim">kart</span>
      </div>
      ${toplam > 0 ? `
        <div class="rozet-serit">
          ${DERSLER.filter((d) => vade[d] > 0).map((d) => `
            <span class="rozet">
              <span class="nokta" style="background:${DERS_RENK[d]}"></span>
              ${DERS_AD[d]} ${vade[d]}
            </span>`).join('')}
        </div>
        <button class="btn btn-birincil bosluk-ust" onclick="tekrarBaslat(null)">Tekrara başla</button>
      ` : `<p class="temiz-yazi">Bugünlük tekrar yok. Yarın yeni kartlar gelecek.</p>`}
    </div>

    <div class="yuzey">
      <div class="bolum-baslik" style="margin-top:0">GENEL HÂKİMİYET</div>
      <div class="hakim-satir">
        <span class="hakim-sayi">%${genel}</span>
        ${cubuk(genel)}
      </div>
      <p class="kucuk" style="margin:0">Kartların Leitner kutularındaki ortalama konumu. 5. kutuya çıkan kart iki ayda bir sorulur.</p>
    </div>

    <div class="bolum-baslik">SON 7 GÜNÜN ZAYIF KONULARI</div>
    ${zayif.length === 0 ? `
      <div class="yuzey"><p class="kucuk" style="margin:0">Bu hafta hata defterine kayıt girilmemiş. Soru çözdükten sonra yanlışlarını eklersen, o konuların kartları tekrar sırasının başına alınır.</p></div>
    ` : zayif.map((z) => `
      <button class="yuzey zayif-kart" style="width:100%;text-align:left" onclick="tekrarBaslat('${z.ders}')">
        <span class="ders-cizgi" style="background:${DERS_RENK[z.ders]}"></span>
        <span class="analiz-sol">
          <span class="zayif-konu" style="display:block">${kacir(z.konu)}</span>
          <span class="kucuk">${DERS_AD[z.ders]}</span>
        </span>
        <span class="zayif-sag">
          <span class="zayif-sayi" style="display:block">${z.adet}</span>
          <span class="zayif-birim">hata</span>
        </span>
      </button>`).join('')}

    <div class="bolum-baslik">SON 7 GÜNÜN TEST SONUÇLARI</div>
    <div class="yuzey">
      ${netOzet ? `
        <div class="satir"><span class="satir-etiket">Çözülen soru</span><span class="satir-deger">${netOzet.soru}</span></div>
        <div class="satir"><span class="satir-etiket">Toplam net</span><span class="satir-deger">${netOzet.net.toFixed(2)}</span></div>
        <div class="satir"><span class="satir-etiket">Başarı oranı</span><span class="satir-deger">%${netOzet.soru ? Math.round((netOzet.net / netOzet.soru) * 100) : 0}</span></div>
      ` : `<p class="kucuk" style="margin:0">Henüz test sonucu girilmemiş. Defter sekmesinden çözdüğün testin doğru-yanlış sayısını girebilirsin.</p>`}
    </div>`;
}

/* ===================== EKRAN: TEKRAR ===================== */
function tekrarBaslat(ders) {
  const havuz = ders ? aktifDers(ders) : aktifKartlar();
  D.deste = karistir(vadesiGelenler(havuz, D.kartDurum));
  D.secilenDers = ders || 'karisik';
  D.sira = 0;
  D.acik = false;
  D.oturumSkor = { bildim: 0, bilmedim: 0 };
  D.sekme = 'tekrar';
  ciz();
}

function desteBirak() {
  D.deste = null;
  D.secilenDers = null;
  ciz();
}

function cevabiGoster() { D.acik = true; ciz(); }

function cevapla(dogruMu) {
  const kart = D.deste[D.sira];
  D.kartDurum[kart.id] = dogruMu ? bildim(D.kartDurum[kart.id]) : bilmedim(D.kartDurum[kart.id]);
  Depo.kartDurumYaz(D.kartDurum);
  D.oturumSkor[dogruMu ? 'bildim' : 'bilmedim'] += 1;
  D.acik = false;
  D.sira += 1;
  ciz();
}

function ekranTekrar() {
  /* --- ders seçimi --- */
  if (!D.deste) {
    const vade = {};
    let toplam = 0;
    DERSLER.forEach((d) => { vade[d] = vadesiGelenler(aktifDers(d), D.kartDurum).length; toplam += vade[d]; });

    return `
      <p class="aciklama-yazi">Hangi dersi tekrar edeceksin? Karışık seçersen tüm derslerin vadesi gelen kartları birlikte sorulur.</p>
      <button class="yuzey koyu" style="width:100%;text-align:left" onclick="tekrarBaslat(null)">
        <div style="font-size:18px;font-weight:700">Karışık tekrar</div>
        <div style="font-size:13px;font-weight:600;color:var(--kalem);margin-top:3px">${toplam} kart bekliyor</div>
      </button>
      ${DERSLER.map((d) => `
        <button class="yuzey ders-kart ${vade[d] === 0 ? 'pasif' : ''}" style="width:100%;text-align:left"
                ${vade[d] === 0 ? 'disabled' : `onclick="tekrarBaslat('${d}')"`}>
          <span class="ders-cizgi" style="background:${DERS_RENK[d]}"></span>
          <span class="analiz-sol">
            <span class="ders-ad" style="display:block">${DERS_AD[d]}</span>
            <span class="kucuk">${aktifDers(d).length} kart toplam</span>
          </span>
          <span class="ders-sag">
            <span class="ders-sayi ${vade[d] === 0 ? 'bos' : ''}" style="display:block">${vade[d]}</span>
            <span class="ders-sayi-alt">bugün</span>
          </span>
        </button>`).join('')}`;
  }

  /* --- deste bitti --- */
  if (D.sira >= D.deste.length) {
    const t = D.oturumSkor.bildim + D.oturumSkor.bilmedim;
    return `
      <div class="yuzey sonuc-kart">
        <div class="bolum-baslik" style="margin-top:0">TEKRAR TAMAMLANDI</div>
        ${t === 0 ? `<p style="margin:8px 0 0">Bu derste bugün tekrar edilecek kart kalmamış.</p>` : `
          <div class="sonuc-sayi">${D.oturumSkor.bildim}/${t}</div>
          <p class="kucuk" style="margin:0">bildiğin kart</p>
          <div style="margin-top:16px">${cubuk((D.oturumSkor.bildim / t) * 100, 'var(--dogru)')}</div>
          ${D.oturumSkor.bilmedim > 0 ? `<p class="kucuk" style="margin-top:14px">Bilemediğin ${D.oturumSkor.bilmedim} kart 1. kutuya düştü, yarın tekrar karşına çıkacak.</p>` : ''}
        `}
        <button class="btn btn-birincil bosluk-ust" onclick="desteBirak()">Derslere dön</button>
      </div>`;
  }

  /* --- kart --- */
  const kart = D.deste[D.sira];
  const durum = D.kartDurum[kart.id];
  const kutu = durum ? durum.kutu : 1;

  return `
    ${cubuk((D.sira / D.deste.length) * 100)}
    <div class="ust-satir">
      <span>${D.sira + 1} / ${D.deste.length}</span>
      <span>${KUTU_AD[kutu - 1]} kutusu</span>
    </div>

    <div class="etiket-satir">
      <span class="etiket ders" style="background:${DERS_RENK[kart.ders]}">${DERS_AD[kart.ders].toUpperCase()}</span>
      <span class="etiket">${kacir(kart.konu)}</span>
    </div>

    <button class="soru-yuzu" onclick="cevabiGoster()">
      <div class="soru-yazi">${kacir(kart.on)}</div>
      ${!D.acik ? `<div class="cevir-ipucu">Cevabı görmek için dokun</div>` : ''}
    </button>

    ${D.acik ? `
      <div class="cevap-yuzu">
        <div class="bolum-baslik" style="margin:0">CEVAP</div>
        <p class="cevap-yazi">${kacir(kart.arka)}</p>
      </div>
      <button class="supheli-btn" onclick="supheliIsaretle('${kart.id}')">
        ⚑ Bu kartta hata var
      </button>
      <div class="btn-sira bosluk-ust">
        <button class="btn btn-olumsuz" onclick="cevapla(false)">Bilemedim</button>
        <button class="btn btn-olumlu" onclick="cevapla(true)">Bildim</button>
      </div>
    ` : `
      <div class="btn-sira bosluk-ust">
        <button class="btn btn-sade" onclick="desteBirak()">Desteyi bırak</button>
        <button class="btn btn-birincil" onclick="cevabiGoster()">Cevabı göster</button>
      </div>
    `}`;
}

/* ===================== EKRAN: HATA DEFTERİ ===================== */
function hataSekmeGec(kod) { D.hataSekme = kod; ciz(); }

function formSec(alan, deger) {
  D.form[alan] = deger;
  if (alan === 'ders') D.form.konu = null;
  ciz();
}

function kaynakYaz(v) { D.form.kaynak = v; }

async function fotoSecildi(girdi) {
  const dosya = girdi.files && girdi.files[0];
  if (!dosya) return;
  try {
    D.form.foto = await fotografiKucult(dosya);
    ciz();
  } catch (e) {
    alert('Fotoğraf işlenemedi. Başka bir görsel dene.');
  }
}

function fotoKaldir() { D.form.foto = null; ciz(); }

async function hataKaydet() {
  if (!D.form.konu) { alert('Hangi konudan yanlış yaptığını seç.'); return; }

  const id = `H${Date.now()}`;
  const kayit = {
    id,
    tarih: new Date().toISOString(),
    ders: D.form.ders,
    konu: D.form.konu,
    neden: D.form.neden,
    kaynak: D.form.kaynak.trim(),
    fotoVar: !!D.form.foto,
  };

  if (D.form.foto) {
    try { await Foto.kaydet(id, D.form.foto); }
    catch (e) { kayit.fotoVar = false; console.warn('Fotoğraf kaydedilemedi:', e); }
  }

  D.hatalar.unshift(kayit);
  Depo.hatalarYaz(D.hatalar);

  /* Bu konunun tüm kartları 1. kutuya döner.
     İki modülü birbirine bağlayan mekanizma burası. */
  const etkilenen = KARTLAR.filter((k) => k.ders === kayit.ders && k.konu === kayit.konu);
  if (etkilenen.length > 0) {
    etkilenen.forEach((k) => { D.kartDurum[k.id] = kartiSifirla(D.kartDurum[k.id]); });
    Depo.kartDurumYaz(D.kartDurum);
  }

  D.form.konu = null;
  D.form.kaynak = '';
  D.form.foto = null;
  ciz();

  const bilgi = etkilenen.length > 0
    ? `Kaydedildi. Bu konudaki ${etkilenen.length} kart tekrar sırasının başına alındı.`
    : 'Kaydedildi.';
  duyur(bilgi);
}

async function hataSil(id) {
  if (!confirm('Bu hata kaydı silinsin mi?')) return;
  D.hatalar = D.hatalar.filter((h) => h.id !== id);
  Depo.hatalarYaz(D.hatalar);
  try { await Foto.sil(id); } catch (e) { /* fotoğraf yoksa sorun değil */ }
  ciz();
}

function testAlan(alan, deger) {
  D.test[alan] = alan === 'ders' ? deger : deger.replace(/[^0-9]/g, '');
  if (alan !== 'ders') netiGuncelle();
  else ciz();
}

function netiGuncelle() {
  const d = parseInt(D.test.dogru, 10) || 0;
  const y = parseInt(D.test.yanlis, 10) || 0;
  const b = parseInt(D.test.bos, 10) || 0;
  const el = $('#netDeger');
  const ts = $('#toplamSoru');
  if (el) el.textContent = (d - y / 4).toFixed(2);
  if (ts) ts.textContent = `${d + y + b} soru üzerinden`;
}

function testKaydet() {
  const d = parseInt(D.test.dogru, 10) || 0;
  const y = parseInt(D.test.yanlis, 10) || 0;
  const b = parseInt(D.test.bos, 10) || 0;
  if (d + y + b === 0) { alert('En az bir doğru, yanlış veya boş sayısı gir.'); return; }

  D.oturumlar.unshift({
    id: `O${Date.now()}`,
    tarih: new Date().toISOString(),
    ders: D.test.ders,
    soru: d + y + b,
    dogru: d, yanlis: y, bos: b,
    net: d - y / 4,
  });
  Depo.oturumlarYaz(D.oturumlar);
  D.test.dogru = ''; D.test.yanlis = ''; D.test.bos = '';
  ciz();
  duyur('Test sonucu kaydedildi.');
}

function ekranHata() {
  const sekmeler = [
    { kod: 'ekle', ad: 'Yanlış ekle' },
    { kod: 'test', ad: 'Test sonucu' },
    { kod: 'analiz', ad: 'Analiz' },
  ];
  const cubukHtml = `
    <div class="sekme-cubuk">
      ${sekmeler.map((t) => `<button class="sekme ${D.hataSekme === t.kod ? 'aktif' : ''}" onclick="hataSekmeGec('${t.kod}')">${t.ad}</button>`).join('')}
    </div>`;

  if (D.hataSekme === 'ekle') return cubukHtml + bolumYanlisEkle();
  if (D.hataSekme === 'test') return cubukHtml + bolumTest();
  return cubukHtml + bolumAnaliz();
}

function bolumYanlisEkle() {
  const konular = hataKonulari(D.form.ders);

  return `
    <p class="aciklama-yazi">Soru metnini yazmana gerek yok. Sadece konuyu seç. Kaydettiğin anda o konunun kartları tekrar sırasının başına alınır.</p>

    <div class="bolum-baslik" style="margin-top:0">DERS</div>
    <div class="secim-satir">
      ${DERSLER.map((d) => `<button class="secim ${D.form.ders === d ? 'aktif' : ''}"
        ${D.form.ders === d ? `style="background:${DERS_RENK[d]};border-color:${DERS_RENK[d]}"` : ''}
        onclick="formSec('ders','${d}')">${DERS_AD[d]}</button>`).join('')}
    </div>

    <div class="bolum-baslik">KONU</div>
    <div class="secim-satir">
      ${konular.map((k) => `<button class="secim ${D.form.konu === k ? 'aktif' : ''}" onclick="formSec('konu',${JSON.stringify(k).replace(/"/g, '&quot;')})">${kacir(k)}</button>`).join('')}
    </div>

    <div class="bolum-baslik">HATA NEDENİ</div>
    <div class="secim-satir">
      ${NEDENLER.map((n) => `<button class="secim ${D.form.neden === n.kod ? 'aktif' : ''}" onclick="formSec('neden','${n.kod}')">${n.ad}</button>`).join('')}
    </div>

    <div class="bolum-baslik">KAYNAK (İSTEĞE BAĞLI)</div>
    <input class="girdi" type="text" placeholder="Örn: Deneme 4, soru 27"
           value="${kacir(D.form.kaynak)}" oninput="kaynakYaz(this.value)">

    <div class="bolum-baslik">SORU FOTOĞRAFI (İSTEĞE BAĞLI)</div>
    ${D.form.foto ? `
      <img class="onizleme" src="${D.form.foto}" alt="Seçilen soru fotoğrafı">
      <button class="btn btn-sade bosluk-ust" onclick="fotoKaldir()">Fotoğrafı kaldır</button>
    ` : `
      <input class="foto-gizli" type="file" id="fotoGirdi" accept="image/*" capture="environment" onchange="fotoSecildi(this)">
      <button class="btn btn-ikincil" onclick="document.getElementById('fotoGirdi').click()">Fotoğraf ekle</button>
    `}

    <button class="btn btn-birincil" style="margin-top:24px" onclick="hataKaydet()">Hatayı kaydet</button>

    <div class="bolum-baslik">SON KAYITLAR</div>
    ${D.hatalar.length === 0 ? `
      <div class="bos-hal"><h3>Defter boş</h3><p>İlk yanlışını kaydettiğinde burada görünecek.</p></div>
    ` : D.hatalar.slice(0, 20).map((h) => `
      <div class="yuzey kayit-kart">
        <span class="ders-cizgi" style="background:${DERS_RENK[h.ders]}"></span>
        <span class="analiz-sol">
          <span class="kayit-konu" style="display:block">${kacir(h.konu)}</span>
          <span class="kucuk">${DERS_AD[h.ders]}${h.kaynak ? ' · ' + kacir(h.kaynak) : ''} · ${(NEDENLER.find((n) => n.kod === h.neden) || {}).ad || h.neden}</span>
          <span class="kayit-tarih" style="display:block">${trTarih(h.tarih)}</span>
        </span>
        ${h.fotoVar ? `<img class="kucuk-foto" id="foto-${h.id}" alt="Soru fotoğrafı" onclick="fotoBuyut('${h.id}')">` : ''}
        <button class="sil-btn" onclick="hataSil('${h.id}')" aria-label="Kaydı sil">×</button>
      </div>`).join('')}`;
}

function bolumTest() {
  const d = parseInt(D.test.dogru, 10) || 0;
  const y = parseInt(D.test.yanlis, 10) || 0;
  const b = parseInt(D.test.bos, 10) || 0;

  return `
    <p class="aciklama-yazi">Çözdüğün testin sonucunu gir. Net, KPSS formülüyle hesaplanır: dört yanlış bir doğruyu götürür.</p>

    <div class="bolum-baslik" style="margin-top:0">DERS</div>
    <div class="secim-satir">
      ${DERSLER.map((x) => `<button class="secim ${D.test.ders === x ? 'aktif' : ''}"
        ${D.test.ders === x ? `style="background:${DERS_RENK[x]};border-color:${DERS_RENK[x]}"` : ''}
        onclick="testAlan('ders','${x}')">${DERS_AD[x]}</button>`).join('')}
    </div>

    <div class="bolum-baslik">SONUÇ</div>
    <div class="sayi-uclu">
      <div class="sayi-kutu">
        <label class="sayi-etiket" style="color:var(--dogru)">Doğru</label>
        <input class="girdi sayi-girdi" type="number" inputmode="numeric" placeholder="0"
               value="${D.test.dogru}" oninput="testAlan('dogru',this.value)">
      </div>
      <div class="sayi-kutu">
        <label class="sayi-etiket" style="color:var(--yanlis)">Yanlış</label>
        <input class="girdi sayi-girdi" type="number" inputmode="numeric" placeholder="0"
               value="${D.test.yanlis}" oninput="testAlan('yanlis',this.value)">
      </div>
      <div class="sayi-kutu">
        <label class="sayi-etiket" style="color:var(--soluk)">Boş</label>
        <input class="girdi sayi-girdi" type="number" inputmode="numeric" placeholder="0"
               value="${D.test.bos}" oninput="testAlan('bos',this.value)">
      </div>
    </div>

    <div class="yuzey net-kutu bosluk-ust">
      <div class="bolum-baslik" style="margin-top:0">HESAPLANAN NET</div>
      <div class="net-buyuk" id="netDeger">${(d - y / 4).toFixed(2)}</div>
      <div class="kucuk" id="toplamSoru">${d + y + b} soru üzerinden</div>
    </div>

    <button class="btn btn-birincil" onclick="testKaydet()">Sonucu kaydet</button>

    <div class="bolum-baslik">GEÇMİŞ</div>
    ${D.oturumlar.length === 0 ? `
      <div class="bos-hal"><h3>Kayıt yok</h3><p>Girdiğin test sonuçları burada birikecek.</p></div>
    ` : D.oturumlar.slice(0, 20).map((o) => `
      <div class="yuzey kayit-kart">
        <span class="ders-cizgi" style="background:${DERS_RENK[o.ders]}"></span>
        <span class="analiz-sol">
          <span class="kayit-konu" style="display:block">${DERS_AD[o.ders]}</span>
          <span class="kucuk">${o.dogru}D · ${o.yanlis}Y · ${o.bos}B — ${o.soru} soru</span>
          <span class="kayit-tarih" style="display:block">${trTarih(o.tarih)}</span>
        </span>
        <span style="text-align:center">
          <span class="net-kucuk" style="display:block">${o.net.toFixed(2)}</span>
          <span class="kayit-tarih">net</span>
        </span>
      </div>`).join('')}`;
}

function bolumAnaliz() {
  if (D.hatalar.length === 0) {
    return `<div class="bos-hal">
      <h3>Analiz için veri yok</h3>
      <p>Birkaç hata kaydı girdikten sonra burada zayıf konuların ve hata nedenlerinin dağılımı çıkacak.</p>
    </div>`;
  }

  const sayac = {};
  D.hatalar.forEach((h) => { const a = `${h.ders}|${h.konu}`; sayac[a] = (sayac[a] || 0) + 1; });
  const konular = Object.entries(sayac)
    .map(([a, adet]) => { const [ders, konu] = a.split('|'); return { ders, konu, adet }; })
    .sort((x, y) => y.adet - x.adet);
  const enCok = konular[0].adet;

  const nedenSayac = {};
  D.hatalar.forEach((h) => { nedenSayac[h.neden] = (nedenSayac[h.neden] || 0) + 1; });
  const nedenler = NEDENLER.map((n) => ({ ...n, adet: nedenSayac[n.kod] || 0 }))
    .sort((a, b) => b.adet - a.adet);

  const yorumlar = {
    dikkat: 'Hataların çoğu dikkatsizlikten. Bu bir bilgi sorunu değil; soru okuma hızını yavaşlatmak ve şıkları eleyerek ilerlemek gerekiyor.',
    sure: 'Süre baskısı öne çıkıyor. Konu bilgisi yeterli olabilir; deneme çözerken kronometre kullanmak faydalı olur.',
    eleme: 'Şık elemede zorlanılıyor. Bu genelde konunun yüzeysel bilinmesinden kaynaklanır; en çok hata yapılan konuyu baştan işlemek gerekebilir.',
    bilgi: 'Hataların çoğu bilgi eksiğinden. En üstteki konuları yeniden çalışmak, kart tekrarından daha öncelikli.',
  };

  return `
    <div class="yuzey koyu">
      <div class="vurgu-ust">TOPLAM HATA KAYDI</div>
      <div class="vurgu-sayi" style="font-size:44px">${D.hatalar.length}</div>
    </div>

    <div class="bolum-baslik">KONUYA GÖRE DAĞILIM</div>
    ${konular.map((k) => `
      <div class="analiz-satir">
        <div class="analiz-sol">
          <div class="analiz-konu">${kacir(k.konu)}</div>
          <div class="analiz-ders">${DERS_AD[k.ders]}</div>
          ${cubuk((k.adet / enCok) * 100, DERS_RENK[k.ders])}
        </div>
        <div class="analiz-sayi">${k.adet}</div>
      </div>`).join('')}

    <div class="bolum-baslik">HATA NEDENİ DAĞILIMI</div>
    <div class="yuzey">
      ${nedenler.map((n) => `<div class="satir"><span class="satir-etiket">${n.ad}</span><span class="satir-deger">${n.adet}</span></div>`).join('')}
    </div>

    <div class="yuzey yorum-kutu">
      <div class="bolum-baslik" style="margin-top:0">NE ANLAMA GELİYOR?</div>
      <p class="kucuk" style="margin:0">${yorumlar[nedenler[0].kod]}</p>
    </div>`;
}

/* ===================== EKRAN: KONULAR ===================== */
function dersAc(ders) {
  D.acikDers = D.acikDers === ders ? null : ders;
  ciz();
}

function ekranKonular() {
  const kutuSayac = [0, 0, 0, 0, 0];
  const aktif = aktifKartlar();
  aktif.forEach((k) => {
    const d = D.kartDurum[k.id];
    kutuSayac[(d ? d.kutu : 1) - 1] += 1;
  });
  const toplam = aktif.length || 1;

  return `
    <div class="bolum-baslik" style="margin-top:0">KUTU DAĞILIMI</div>
    <div class="yuzey">
      ${kutuSayac.map((adet, i) => `
        <div class="kutu-satir">
          <span class="kutu-sol">
            <span class="kutu-no">${i + 1}</span>
            <span>
              <span class="kutu-ad" style="display:block">${KUTU_AD[i]}</span>
              <span class="kutu-aralik">${ARALIKLAR[i]} günde bir</span>
            </span>
          </span>
          ${cubuk((adet / toplam) * 100, i >= 3 ? 'var(--dogru)' : i === 0 ? 'var(--yanlis)' : 'var(--kalem)')}
          <span class="kutu-adet">${adet}</span>
        </div>`).join('')}
      <p class="kucuk" style="margin:8px 0 0;font-size:12px">Amaç, kartları soldan sağa taşımak. 4. ve 5. kutudaki kartlar öğrenilmiş sayılır.</p>
    </div>

    <div class="bolum-baslik">DERSLER</div>
    ${DERSLER.map((d) => {
      const kartlar = aktifDers(d);
      const oran = hakimiyet(kartlar, D.kartDurum);
      const konular = konulariCikar(d)
        .map((k) => {
          const liste = k.liste.filter((x) => !D.supheli[x.id]);
          return { ad: k.ad, adet: liste.length, oran: hakimiyet(liste, D.kartDurum) };
        })
        .filter((k) => k.adet > 0)
        .sort((a, b) => a.oran - b.oran);

      return `
        <button class="yuzey ders-baslik-kart" style="width:100%;text-align:left" onclick="dersAc('${d}')">
          <span class="ders-cizgi" style="background:${DERS_RENK[d]}"></span>
          <span class="analiz-sol">
            <span class="ders-ad" style="display:block">${DERS_AD[d]}</span>
            <span class="kucuk">${kartlar.length} kart · ${konular.length} konu</span>
            <span style="display:block;margin-top:8px">${cubuk(oran, DERS_RENK[d])}</span>
          </span>
          <span class="ders-oran">%${oran}</span>
        </button>
        ${D.acikDers === d ? `
          <div class="konu-liste">
            ${konular.map((k) => `
              <div class="konu-satir">
                <span class="konu-sol">
                  <span class="konu-ad" style="display:block">${kacir(k.ad)}</span>
                  <span class="konu-adet">${k.adet} kart</span>
                </span>
                ${cubuk(k.oran, DERS_RENK[d])}
                <span class="konu-oran">%${k.oran}</span>
              </div>`).join('')}
          </div>` : ''}`;
    }).join('')}`;
}

/* ===================== EKRAN: AYARLAR ===================== */
function yedekAl() {
  const metin = JSON.stringify(Depo.yedegiTopla());
  const dosya = new Blob([metin], { type: 'application/json' });
  const url = URL.createObjectURL(dosya);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kpss-yedek-${bugun()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  duyur('Yedek dosyası indirildi. Kendine e-posta veya WhatsApp ile gönder.');
}

function geriYukleAc() { D.geriYukleAcik = !D.geriYukleAcik; ciz(); }

function yedekDosyaSecildi(girdi) {
  const dosya = girdi.files && girdi.files[0];
  if (!dosya) return;
  const okuyucu = new FileReader();
  okuyucu.onload = () => {
    try {
      Depo.yedegiGeriYukle(JSON.parse(okuyucu.result));
      baslat();
      duyur('Yedekteki kayıtlar geri yüklendi.');
    } catch (e) {
      alert('Bu dosya geçerli bir yedek değil.');
    }
  };
  okuyucu.readAsText(dosya);
}

async function hepsiniSil() {
  if (!confirm('Tüm kart ilerlemesi, hata kayıtları ve test sonuçları silinecek. Bu geri alınamaz. Devam edilsin mi?')) return;
  await Depo.hepsiniSil();
  D.supheli = {};
  baslat();
  duyur('Tüm kayıtlar silindi.');
}

function ekranAyarlar() {
  const calisilan = Object.keys(D.kartDurum).length;
  const supheliListesi = Object.keys(D.supheli)
    .map((id) => KARTLAR.find((k) => k.id === id))
    .filter(Boolean);

  return `
    <div class="bolum-baslik" style="margin-top:0">DURUM</div>
    <div class="yuzey">
      <div class="satir"><span class="satir-etiket">Uygulamadaki kart</span><span class="satir-deger">${KARTLAR.length}</span></div>
      <div class="satir"><span class="satir-etiket">Çalışılmış kart</span><span class="satir-deger">${calisilan}</span></div>
      <div class="satir"><span class="satir-etiket">Hata kaydı</span><span class="satir-deger">${D.hatalar.length}</span></div>
      <div class="satir"><span class="satir-etiket">Test kaydı</span><span class="satir-deger">${D.oturumlar.length}</span></div>
      <div class="satir"><span class="satir-etiket">Şüpheli işaretli</span><span class="satir-deger">${Object.keys(D.supheli).length}</span></div>
    </div>

    <div class="bolum-baslik">ŞÜPHELİ KARTLAR</div>
    <div class="yuzey">
      <p class="kucuk" style="margin:0">Kartları bir yapay zeka yazdı, ders kitabından kopyalanmadı. Kitabınla çelişen bir kart görürsen tekrar ekranındaki <strong>⚑ Bu kartta hata var</strong> düğmesine bas. Kart destesinden çıkar, burada birikir. Çelişki varsa <strong>kitabın haklıdır.</strong></p>
      ${supheliListesi.length === 0 ? `
        <p class="kucuk" style="margin:12px 0 0">Henüz işaretlenmiş kart yok.</p>
      ` : `
        ${supheliListesi.map((k) => `
          <div class="supheli-satir">
            <span class="ders-cizgi" style="background:${DERS_RENK[k.ders]}"></span>
            <span class="analiz-sol">
              <span class="kayit-konu" style="display:block">${kacir(k.on)}</span>
              <span class="kucuk">${DERS_AD[k.ders]} / ${kacir(k.konu)} · ${k.id}</span>
            </span>
            <button class="btn btn-sade supheli-geri" onclick="supheliKaldir('${k.id}')">Geri al</button>
          </div>`).join('')}
        <button class="btn btn-ikincil bosluk-ust" onclick="supheliListeyiPaylas()">Listeyi paylaş</button>
      `}
    </div>

    <div class="bolum-baslik">YEDEKLEME</div>
    <div class="yuzey">
      <p class="kucuk" style="margin:0">Tüm veriler yalnızca bu telefonda tutuluyor. Uygulamayı silersen ya da telefon değiştirirsen kayıtlar gider. Ayda bir yedek alıp kendine göndermeni öneririm.</p>
      <button class="btn btn-birincil bosluk-ust" onclick="yedekAl()">Yedek dosyası indir</button>
      <button class="btn btn-ikincil bosluk-ust" onclick="geriYukleAc()">${D.geriYukleAcik ? 'Geri yüklemeyi kapat' : 'Yedekten geri yükle'}</button>
      ${D.geriYukleAcik ? `
        <p class="kucuk" style="margin:14px 0 8px">Daha önce indirdiğin yedek dosyasını seç. Mevcut kayıtların üzerine yazılır.</p>
        <input class="foto-gizli" type="file" id="yedekGirdi" accept=".json,application/json" onchange="yedekDosyaSecildi(this)">
        <button class="btn btn-ikincil" onclick="document.getElementById('yedekGirdi').click()">Yedek dosyası seç</button>
      ` : ''}
    </div>

    <div class="bolum-baslik">NASIL ÇALIŞIYOR</div>
    <div class="yuzey">
      <p style="font-size:15px;font-weight:600;margin:0 0 4px">Leitner kutu sistemi</p>
      <p class="kucuk" style="margin:0">Her kart 1'den 5'e kadar bir kutuda durur. Bildiğin kart bir üst kutuya çıkar ve daha seyrek sorulur: sırasıyla 1, 3, 7, 21 ve 60 gün. Bilemediğin kart doğrudan 1. kutuya düşer.</p>

      <p style="font-size:15px;font-weight:600;margin:14px 0 4px">Hata defteri bağlantısı</p>
      <p class="kucuk" style="margin:0">Bir konudan yanlış kaydı girdiğinde, o konunun tüm kartları 1. kutuya döner ve ertesi gün tekrar karşına çıkar. İki modülü birbirine bağlayan mekanizma budur.</p>

      <p style="font-size:15px;font-weight:600;margin:14px 0 4px">Kapsam dışı olanlar</p>
      <p class="kucuk" style="margin:0">Matematik yüz yüze çalışılıyor, uygulamada yok. Türkçe'de yalnızca yazım, noktalama ve anlatım bozukluğu var; paragraf ve anlam bilgisi kart ezberiyle gelişmediği için bilinçli olarak dışarıda bırakıldı.</p>
    </div>

    <div class="bolum-baslik">TEHLİKELİ BÖLGE</div>
    <div class="yuzey" style="border-color:#E8C4BF">
      <p class="kucuk" style="margin:0">Aşağıdaki işlem tüm ilerlemeyi siler. Önce yedek almanı öneririm.</p>
      <button class="btn btn-olumsuz bosluk-ust" onclick="hepsiniSil()">Her şeyi sil</button>
    </div>`;
}

/* ===================== FOTOĞRAF GÖRÜNTÜLEME ===================== */
/* Küçük önizlemeler çizimden sonra IndexedDB'den yüklenir. */
function fotolariYukle() {
  D.hatalar.filter((h) => h.fotoVar).forEach(async (h) => {
    const el = document.getElementById(`foto-${h.id}`);
    if (!el || el.src) return;
    try {
      const veri = await Foto.getir(h.id);
      if (veri) el.src = veri;
    } catch (e) { /* fotoğraf bulunamadı */ }
  });
}

async function fotoBuyut(id) {
  try {
    const veri = await Foto.getir(id);
    if (!veri) return;
    const kat = document.createElement('div');
    kat.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:100;display:grid;place-items:center;padding:16px';
    kat.innerHTML = `<img src="${veri}" style="max-width:100%;max-height:100%;border-radius:8px" alt="Soru fotoğrafı">`;
    kat.onclick = () => kat.remove();
    document.body.appendChild(kat);
  } catch (e) { /* yok sayılır */ }
}

/* ===================== BİLDİRİM ŞERİDİ ===================== */
let duyuruZaman = null;
function duyur(metin) {
  let el = $('#duyuru');
  if (!el) {
    el = document.createElement('div');
    el.id = 'duyuru';
    el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));background:var(--lacivert);color:#fff;padding:12px 16px;border-radius:12px;font-size:14px;z-index:60;box-shadow:0 8px 24px rgba(0,0,0,.25)';
    document.body.appendChild(el);
  }
  el.textContent = metin;
  el.style.display = 'block';
  clearTimeout(duyuruZaman);
  duyuruZaman = setTimeout(() => { el.style.display = 'none'; }, 3200);
}

/* ===================== ÇİZİM SONRASI ===================== */
const asilCiz = ciz;
ciz = function () {
  asilCiz();
  fotolariYukle();
};

document.addEventListener('DOMContentLoaded', baslat);
