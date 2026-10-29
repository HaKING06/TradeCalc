# HaKING TradeCalc

Tarayıcıda çalışan CS2 takas planlayıcısı. Frontend `index.html` ve `assets/` altında, sunucu uçları `functions/api/` altında ayrı tutulur. Takas geçmişi ve hesaplayıcı taslağı kullanıcının cihazındaki `localStorage` alanında kalır; uygulamanın kendi backend'ine gönderilmez. `_headers` içerik güvenliği ve temel tarayıcı güvenlik başlıklarını uygular.

## Özellikler

- Skin, eldiven, sticker, charm/keychain ve diğer CS2 itemleri için görselli katalog araması.
- Site yatırımı ile komisyon sonrası nakit karşılığı üzerinden oran, hedef maliyeti, kâr ve marj hesabı.
- Yalnız SkinMonkey için sabit ilk yükleme kademeleri: $10 → $0.50, $50 → $2.50, $100 → $5.00; uygunluk kullanıcı tarafından seçilir.
- Takas sonrası platform bakiyesi ile kalan bakiyenin nakit eşdeğerini brüt/net kârdan ayrı gösterme.
- Brüt hedef piyasa değerine uygulanabilen düzenlenebilir satış komisyonu.
- Her hedefte charm dahil mi seçimi (varsayılan: hayır); dahilse charm ve piyasa değeri zorunlu olarak ayrı girilir.
- Piyasa fiyatlarını kullanıcı tarafından manuel girme; site Steam fiyatı çekmez.
- 0–8 gün trade açılma süresi, kayıt anı ve her görüntülemede yenilenen kalan süre.
- Yerel geçmiş, tarih/sonuç filtresi, en yüksek kâr ve marja göre sıralama, günlük kâr grafiği, tekil/tam silme ve JSON içe/dışa aktarma.
- Kâra, eksik girdiye, düşük marja ve yetersiz site bakiyesine göre anlık trade tavsiyesi.
- Responsive arayüz, SVG marka ikonu, paylaşım metaverisi ve web manifest.
- Steam trade linki üzerinden isteğe bağlı geliştirici desteği.

## Hesaplama denetimi

Saf hesap fonksiyonları `assets/trade-math.js` içinde, arayüz ve kayıt akışı `assets/app.js` içindedir. Senaryoları Node.js ile doğrula:

```sh
node --test tests/trade-math.test.js
```

Örnek test; $70 site / $65 net nakit yatırımıyla $6 site alışlı, $6 brüt piyasa değerli silah ve $5 charm için bonus ve ücret kapalıyken $5.43 tahmini kârı doğrular.

## Önemli fiyat notu

Yatırdığın itemin **net nakit karşılığını**, itemi ilgili pazarda sattıktan sonra gerçekten alacağını düşündüğün değer olarak gir. Hedef item için **brüt satış fiyatını** gir; hesaplayıcı hedef satış komisyonunu silah ve dahil edilen charm toplamından düşer. Hedef satış fiyatı zaten net tahsilat ise komisyonu `%0` bırak. Fiyatları işlem yapacağın pazardan manuel doğrula; uygulama Steam fiyatı çekmez.

Hesaplama modeli:

```text
SkinMonkey bonusu = uygunluk açık ve platform SkinMonkey ise tamamlanan yükleme kademesinin sabit ödülü; aksi halde $0
site/nakit oranı = (yatırım site toplamı + uygulanabilir bonus) / yatırım net nakit karşılığı
Takas sonrası site bakiyesi = yatırım site toplamı + bonus - hedef site harcaması
hedef maliyeti = hedef site alış toplamı / site/nakit oranı
brüt kâr = hedef brüt piyasa değeri - hedef maliyeti
hedef net satış = (silah brüt piyasa değeri + dahil charm) × (1 - satış komisyon oranı)
tahmini net kâr = hedef net satış - hedef maliyeti
marj = tahmini kâr / hedef maliyeti
```

Kalan site bakiyesi gerçekleşmiş nakit değildir ve net kâra ikinci kez eklenmez; aynı site/nakit oranıyla nakit eşdeğeri ayrıca gösterilir. Kademeler kullanıcının paylaştığı SkinMonkey ekran görüntüsündeki değerlerdir, SkinMonkey kampanyasının güncel uygunluk koşullarını doğrulamaz. Eski geçmiş kayıtları içe aktarılırken tarihsel bonus tutarları korunur.

CS2 isim, kategori, nadirlik ve görsel kataloğu ByMykel/CSGO-API'den okunur. Canlı katalog araması `/api/catalog` Pages Function üzerinden geçer; upstream kategori yolları sunucu tarafında izin listesiyle sınırlandırılmıştır. Function yanıt vermezse arama tarayıcıdan izin verilen katalog JSON dosyalarına geri döner. Piyasa fiyatı API'si yoktur; fiyatlar kullanıcı tarafından girilir.

## Cloudflare Pages ile yayınlama

1. Bu klasörü GitHub deposunun köküne gönder.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** adımlarından depoyu seç. Workers Builds projesi oluşturma; bu depo Pages dosya yapısını (`functions/` ve `_headers`) kullanır.
3. Framework preset olarak **None** seç; build komutunu boş bırak, build output directory olarak `.` kullan. Root directory depo kökü olsun. `functions/` klasörü proje kökünde kalmalı ki `/api/catalog` Pages Function olarak dağıtılsın.
4. Deploy tamamlanınca Pages projesinde **Custom domains** bölümünden `trade.haking.tr` alan adını ekle ve DNS kaydını Cloudflare'ın önerdiği şekilde doğrula.
5. `/api/catalog?category=keychains&q=charm` adresinin JSON yanıtını ve görselli item aramasını kontrol et. Fiyat alanlarını işlem yaptığın pazardan bulduğun değerlerle elle doldur.

Yerel statik önizleme için proje kökünde `python -m http.server 8000 --bind 127.0.0.1` komutunu çalıştırıp `http://127.0.0.1:8000` adresini açabilirsin. Python sunucusunda `/api/catalog` bulunmadığından frontend CS2 katalog verisini tarayıcıdan doğrudan yükler ve indirdiği listeyi bellekte önbelleğe alır. Görselli katalog için internet bağlantısı gerekir. Fiyatlar her ortamda elle girilir.

Katalog Pages Function'ını yerelde test etmek istersen Wrangler kullan: `npx wrangler pages dev .`. Node.js ve Wrangler kurulu olmalıdır. Build adımı yoktur.

## Yerel veriler ve yedek

Takas geçmişi ve taslak yalnızca geçerli tarayıcı profilinde bulunur. Tarayıcı/site verisi silinirse kayıtlar silinir. Geçmiş sayfasındaki JSON dışa aktarma ile yedek al; içe aktarma yeni kimlikleri mevcut kayıtlarla birleştirir. Bu sistem cihazlar arası senkronizasyon yapmaz.

## Üçüncü taraf bildirimleri

ByMykel CSGO-API projesi MIT lisanslıdır; bildirim `THIRD_PARTY_NOTICES.md` dosyasındadır. CS2/Counter-Strike ve item görselleri Valve/Steam'e aittir. TradeCalc, Valve, Steam, SkinSwap veya başka bir pazar yeri tarafından işletilmez ya da onaylanmaz.
