<<<<<<< HEAD
# Release Link
1. https://calendar-automation.netlify.app/ 
2. https://calendar-automation-aiua.onrender.com/
=======
<<<<<<< HEAD
=======
# Release Link
1. https://calendar-automation.netlify.app/ 
2. https://calendar-automation-aiua.onrender.com/
>>>>>>> 8bcfeb7 (Update readme.md)
>>>>>>> bb9534d (Update readme.md)
# Calendar Monitor Agent

This script downloads the most recent academic calendar from https://ogi.yildiz.edu.tr/ogi/3 and keeps a local copy.

## Setup

1. Create and activate the Python virtual environment you already use for the project.
2. Install the dependencies: `pip install -r agent/requirements.txt`.

## Usage

### 1. İzleme komutu

Run the watcher whenever you need to check for updates:

```
python agent/check_calendar.py
```

- If the target link is unchanged, the script exits after printing `No update detected.`
- When the link changes, the file is downloaded to `agent/downloads/` and the state file `agent/state.json` is updated.

### 2. Yapılandırılmış veriyi çıkarma

To convert the latest Excel file into a JSON payload (used by the FastAPI endpoint), run:

```
python agent/extract_calendar.py
```

The script writes `agent/calendar_rows.json` with two keys:

- `source`: filename, download URL, and timestamp of the latest file.
- `entries`: each item contains `akademik_donem`, `kategori`, and a `tarih` object. The `tarih.spans` list is pre-parsed into ISO-8601 start/end pairs so it can later feed ICS generation.

## Suggested schedule

Check three times per year: March, June, and September. Create cron entries (local timezone) similar to:

```
0 9 1 3 * /path/to/python /path/to/repo/agent/check_calendar.py
0 9 1 6 * /path/to/python /path/to/repo/agent/check_calendar.py
0 9 1 9 * /path/to/python /path/to/repo/agent/check_calendar.py
```

Adjust the python executable path if your virtual environment lives elsewhere.

# React Takvim İstemcisi

Bu istemci FastAPI servisinden `/api/takvim` uç noktasını çağırarak 2025-2026 lisans akademik takvim satırlarını kartlar halinde gösterir.

## Geliştirme

1. Gerekli paketleri yükleyin: `npm install`
2. FastAPI sunucusunun `http://127.0.0.1:8000` üzerinde çalıştığından emin olun (`uvicorn server.main:app --reload`).
3. İstemciyi başlatın: `npm run dev`
4. Tarayıcıda `http://localhost:5173` adresini açın.

## Arayüz hakkında

- Stil katmanı Tailwind CSS ile kuruldu; Vite derlemesi sırasında `tailwind.config.js` ve `postcss.config.js` kullanılır.
- Sol panelde akademik dönemlere göre gruplanmış satırlar kaydırılabilir listede gösterilir. Çoklu seçim için kutucukları işaretleyin; "Tümünü seç", "Temizle" ve hazır grup seçimi için "Popüler seçimi uygula" kısayolları üstte bulunur.
- Sağ panelde yalnızca seçili süreçlerin bulunduğu aylar gösterilir; her ay ayrı bir kartta güncellenir ve etkinlik sayısı üst başlıkta yer alır. Ay seçimi otomatik olduğundan nav butonları bulunmaz.
- Seçili satırlar için "ICS olarak indir" düğmesine basarak aynı ayarlar içinde .ics takvim dosyası oluşturabilirsiniz.
- Tarih aralıkları ISO `start`/`end` değerlerinden üretildiği için ileride ICS dosyası üretimine doğrudan aktarılabilir.
