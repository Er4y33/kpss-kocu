/* =======================================================================
   DEPO
   Küçük kayıtlar (kart ilerlemesi, hatalar, test sonuçları) localStorage'da.
   Fotoğraflar IndexedDB'de - localStorage'ın 5 MB sınırını aşmasınlar diye.
   Hiçbir veri sunucuya gitmez; her şey telefonun kendi hafızasındadır.
   ======================================================================= */

const ANAHTAR = {
  kartDurum: 'kpss:kartDurum',
  hatalar:   'kpss:hatalar',
  oturumlar: 'kpss:oturumlar',
};

/* ---------------------------- localStorage ---------------------------- */
function oku(anahtar, varsayilan) {
  try {
    const ham = localStorage.getItem(anahtar);
    return ham ? JSON.parse(ham) : varsayilan;
  } catch (e) {
    console.warn('Okunamadı:', anahtar, e);
    return varsayilan;
  }
}

function yaz(anahtar, deger) {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger));
    return true;
  } catch (e) {
    console.warn('Yazılamadı:', anahtar, e);
    return false;
  }
}

const Depo = {
  kartDurumOku:  () => oku(ANAHTAR.kartDurum, {}),
  kartDurumYaz:  (d) => yaz(ANAHTAR.kartDurum, d),
  hatalarOku:    () => oku(ANAHTAR.hatalar, []),
  hatalarYaz:    (d) => yaz(ANAHTAR.hatalar, d),
  oturumlarOku:  () => oku(ANAHTAR.oturumlar, []),
  oturumlarYaz:  (d) => yaz(ANAHTAR.oturumlar, d),

  hepsiniSil() {
    Object.values(ANAHTAR).forEach((a) => localStorage.removeItem(a));
    return Foto.hepsiniSil();
  },

  yedegiTopla() {
    return {
      surum: 1,
      olusturma: new Date().toISOString(),
      kartDurum: this.kartDurumOku(),
      hatalar: this.hatalarOku(),
      oturumlar: this.oturumlarOku(),
    };
  },

  yedegiGeriYukle(yedek) {
    if (!yedek || yedek.surum !== 1) throw new Error('Yedek dosyası tanınmıyor.');
    this.kartDurumYaz(yedek.kartDurum || {});
    this.hatalarYaz(yedek.hatalar || []);
    this.oturumlarYaz(yedek.oturumlar || []);
  },
};

/* ------------------------------ IndexedDB ------------------------------ */
/* Fotoğraflar burada. Anahtar = hata kaydının id'si, değer = base64 metin. */
const Foto = (() => {
  const VT_AD = 'kpss-foto';
  const DEPO_AD = 'fotolar';
  let vt = null;

  function ac() {
    if (vt) return Promise.resolve(vt);
    return new Promise((coz, red) => {
      const istek = indexedDB.open(VT_AD, 1);
      istek.onupgradeneeded = () => {
        const db = istek.result;
        if (!db.objectStoreNames.contains(DEPO_AD)) db.createObjectStore(DEPO_AD);
      };
      istek.onsuccess = () => { vt = istek.result; coz(vt); };
      istek.onerror = () => red(istek.error);
    });
  }

  function islem(mod, is) {
    return ac().then((db) => new Promise((coz, red) => {
      const t = db.transaction(DEPO_AD, mod);
      const istek = is(t.objectStore(DEPO_AD));
      istek.onsuccess = () => coz(istek.result);
      istek.onerror = () => red(istek.error);
    }));
  }

  return {
    kaydet: (id, veri) => islem('readwrite', (d) => d.put(veri, id)),
    getir:  (id) => islem('readonly', (d) => d.get(id)),
    sil:    (id) => islem('readwrite', (d) => d.delete(id)),
    hepsiniSil: () => islem('readwrite', (d) => d.clear()).catch(() => {}),
  };
})();

/* --------------------- FOTOĞRAF KÜÇÜLTME --------------------- */
/* Telefon kamerası 3-4 MB'lık dosya üretir. Ekranda okunması için
   1200 pikselden fazlası gerekmiyor; küçültüp yer kazanıyoruz. */
function fotografiKucult(dosya, enBuyukKenar = 1200, kalite = 0.6) {
  return new Promise((coz, red) => {
    const okuyucu = new FileReader();
    okuyucu.onerror = () => red(new Error('Dosya okunamadı.'));
    okuyucu.onload = () => {
      const gorsel = new Image();
      gorsel.onerror = () => red(new Error('Görsel açılamadı.'));
      gorsel.onload = () => {
        let { width: g, height: y } = gorsel;
        const oran = Math.min(1, enBuyukKenar / Math.max(g, y));
        g = Math.round(g * oran);
        y = Math.round(y * oran);

        const tuval = document.createElement('canvas');
        tuval.width = g;
        tuval.height = y;
        tuval.getContext('2d').drawImage(gorsel, 0, 0, g, y);
        coz(tuval.toDataURL('image/jpeg', kalite));
      };
      gorsel.src = okuyucu.result;
    };
    okuyucu.readAsDataURL(dosya);
  });
}

/* --------------------- DEPOLAMA KALICILIĞI --------------------- */
/* Tarayıcıya "bu verileri yer açmak için silme" ricası. iOS'ta her zaman
   kabul edilmez, o yüzden yedek almak yine de önemli. */
async function kaliciDepoIste() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const zaten = await navigator.storage.persisted();
      if (zaten) return true;
      return await navigator.storage.persist();
    }
  } catch (e) {
    console.warn('Kalıcı depolama isteği başarısız:', e);
  }
  return false;
}
