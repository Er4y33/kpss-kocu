/* =======================================================================
   LEITNER KUTU SİSTEMİ
   Her kart 1-5 arası bir kutuda durur. "Bildim" bir üst kutuya çıkarır,
   "Bilemedim" doğrudan 1. kutuya düşürür. Hata defterine bir konudan
   yanlış girildiğinde de o konunun kartları 1. kutuya döner.
   ======================================================================= */

const ARALIKLAR = [1, 3, 7, 21, 60];
const KUTU_AD = ['Yeni', '3 günlük', 'Haftalık', '3 haftalık', 'Aylık'];

const DERSLER = ['tarih', 'cografya', 'vatandaslik', 'turkce'];

const DERS_AD = {
  tarih: 'Tarih',
  cografya: 'Coğrafya',
  vatandaslik: 'Vatandaşlık',
  turkce: 'Türkçe',
};

const DERS_RENK = {
  tarih: '#C2703D',
  cografya: '#3F7A54',
  vatandaslik: '#6B4E9E',
  turkce: '#B08300',
};

const NEDENLER = [
  { kod: 'bilgi',  ad: 'Bilgi eksiği' },
  { kod: 'dikkat', ad: 'Dikkatsizlik' },
  { kod: 'sure',   ad: 'Süre yetmedi' },
  { kod: 'eleme',  ad: 'Şık elemede hata' },
];

/* Kartı olmayan ama sınavda çıkan konular. Hata defterinde seçilebilsin
   diye ayrı tutuluyor - kart ezberiyle gelişmeyen konular bunlar. */
const EK_KONULAR = {
  turkce: ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragraf', 'Ses Bilgisi',
           'Cümlenin Öğeleri', 'Sözel Mantık'],
  tarih: [],
  cografya: [],
  vatandaslik: [],
};

/* ------------------------------ TARİH ------------------------------ */
function gunKodu(d) {
  const y = d.getFullYear();
  const a = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${a}-${g}`;
}

function bugun() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return gunKodu(d);
}

function gunEkle(sayi) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + sayi);
  return gunKodu(d);
}

/* --------------------------- KART DURUMU --------------------------- */
function yeniDurum() {
  return { kutu: 1, sonraki: bugun(), dogru: 0, yanlis: 0, sonGorulme: null };
}

function bildim(durum) {
  const d = durum || yeniDurum();
  const yeniKutu = Math.min(d.kutu + 1, ARALIKLAR.length);
  return {
    ...d,
    kutu: yeniKutu,
    sonraki: gunEkle(ARALIKLAR[yeniKutu - 1]),
    dogru: d.dogru + 1,
    sonGorulme: bugun(),
  };
}

function bilmedim(durum) {
  const d = durum || yeniDurum();
  return {
    ...d,
    kutu: 1,
    sonraki: gunEkle(ARALIKLAR[0]),
    yanlis: d.yanlis + 1,
    sonGorulme: bugun(),
  };
}

/* Hata defteri tetiklemesi: kutuyu sıfırla ama istatistiği bozma */
function kartiSifirla(durum) {
  const d = durum || yeniDurum();
  return { ...d, kutu: 1, sonraki: bugun() };
}

/* --------------------------- SORGULAR --------------------------- */
function vadesiGelenler(kartlar, durumlar) {
  const b = bugun();
  return kartlar.filter((k) => {
    const d = durumlar[k.id];
    if (!d) return true;
    return d.sonraki <= b;
  });
}

function hakimiyet(kartlar, durumlar) {
  if (kartlar.length === 0) return 0;
  const toplam = kartlar.reduce((acc, k) => {
    const d = durumlar[k.id];
    return acc + (d ? d.kutu - 1 : 0);
  }, 0);
  return Math.round((toplam / (kartlar.length * (ARALIKLAR.length - 1))) * 100);
}

function derseGore(ders) {
  return KARTLAR.filter((k) => k.ders === ders);
}

function konulariCikar(ders) {
  const harita = {};
  derseGore(ders).forEach((k) => {
    if (!harita[k.konu]) harita[k.konu] = [];
    harita[k.konu].push(k);
  });
  return Object.entries(harita).map(([ad, liste]) => ({ ad, liste }));
}

function hataKonulari(ders) {
  const kartli = konulariCikar(ders).map((k) => k.ad);
  return [...kartli, ...(EK_KONULAR[ders] || [])];
}

function karistir(dizi) {
  const k = [...dizi];
  for (let i = k.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [k[i], k[j]] = [k[j], k[i]];
  }
  return k;
}
