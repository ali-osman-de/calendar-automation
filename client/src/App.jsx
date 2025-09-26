import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import trLocale from '@fullcalendar/core/locales/tr';

const API_URL = 'https://calendar-automation-aiua.onrender.com/api/takvim';

const DATE_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric'
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  month: 'long',
  year: 'numeric'
});

const EVENT_PALETTE = [
  { bg: '#2563eb', border: '#1d4ed8' },
  { bg: '#0d9488', border: '#0f766e' },
  { bg: '#e11d48', border: '#be123c' },
  { bg: '#7c3aed', border: '#6d28d9' },
  { bg: '#ca8a04', border: '#a16207' },
  { bg: '#f97316', border: '#ea580c' },
  { bg: '#0284c7', border: '#0369a1' },
  { bg: '#22c55e', border: '#16a34a' },
];

const POPULAR_CATEGORY_SET = new Set([
  'Ders Programlarının İlan Edilmesi',
  'Ders Kayıtları',
  'Bağımsız Ders Kaydı-Tüm Öğrenciler',
  'Güz Yarıyılı Başlangıcı',
  'Bahar Yarıyılı Başlangıcı',
  'Güz Yarıyılı Derslerinin Son Günü',
  'Bahar Yarıyılı Derslerinin Son Günü',
  'Güz Yarıyılı Final Sınavları',
  'Bahar Yarıyılı Final Sınavları',
  'Güz Yarıyılı',
  'Bahar Yarıyılı',
]);

const POPULAR_AKADEMIK_SET = new Set(['Güz-Tatil', 'Bahar-Tatil']);

const POPULAR_TARIH_SET = new Set(['17-22 Kasım 2025', '13-18 Nisan 2026']);

function formatSpan(span) {
  const start = new Date(`${span.start}T00:00:00Z`);
  const end = new Date(`${span.end}T00:00:00Z`);
  const sameDay = start.getTime() === end.getTime();
  const formattedStart = DATE_FORMATTER.format(start);
  if (sameDay) {
    return formattedStart;
  }
  const formattedEnd = DATE_FORMATTER.format(end);
  return `${formattedStart} - ${formattedEnd}`;
}

function formatTarih(tarih) {
  if (!tarih) return '';
  if (tarih.spans && tarih.spans.length > 0) {
    return tarih.spans.map(formatSpan).join(', ');
  }
  return tarih.raw || '';
}

function useCalendar() {
  const [payload, setPayload] = useState({ entries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchCalendar() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`Sunucu hatası: ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setPayload(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCalendar();
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo(() => payload.entries ?? [], [payload]);
  const source = payload.source ?? {};

  return { entries, source, loading, error };
}

function monthKeyFromDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getMonthsBetween(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const months = [];
  while (current <= endMonth) {
    months.push(monthKeyFromDate(current));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return months;
}

function formatMonthLabel(monthKey) {
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
  return MONTH_LABEL_FORMATTER.format(date);
}

function getMonthBounds(monthKey) {
  const [yearStr, monthStr] = monthKey.split('-');
  const start = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
  const end = new Date(Date.UTC(Number(yearStr), Number(monthStr), 1));
  return { start, end };
}

function isoToUTCDate(iso) {
  return new Date(`${iso}T00:00:00Z`);
}

function nextDayISO(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + 1));
  return utc.toISOString().slice(0, 10);
}

function createEvent(entry, span, index, color) {
  const endExclusive = nextDayISO(span.end);
  return {
    id: `${entry.id}-${index}`,
    title: entry.kategori || entry.akademik_donem || 'Etkinlik',
    start: span.start,
    end: endExclusive,
    allDay: true,
    classNames: ['takvim-event'],
    backgroundColor: color.bg,
    borderColor: color.border,
    textColor: '#ffffff',
    extendedProps: {
      rawRange: entry.tarih.raw,
      akademik_donem: entry.akademik_donem,
      kategori: entry.kategori,
    }
  };
}

function formatICSDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

function sanitizeForICS(value) {
  if (!value) {
    return '';
  }
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n|\r/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildICSContent(entries) {
  const now = new Date();
  const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YTU Akademik Takvim//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  entries.forEach((entry, entryIndex) => {
    const summary = sanitizeForICS(entry.kategori || entry.akademik_donem || 'Etkinlik');
    const description = sanitizeForICS(
      [entry.akademik_donem, entry.tarih?.raw].filter(Boolean).join(' - ')
    );

    (entry.tarih?.spans ?? []).forEach((span, spanIndex) => {
      const uid = `${entry.id}-${entryIndex}-${spanIndex}@ytu-akademik-takvim`;
      const dtStart = formatICSDate(span.start);
      const dtEnd = formatICSDate(nextDayISO(span.end));

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtStamp}`);
      lines.push(`SUMMARY:${summary}`);
      if (description) {
        lines.push(`DESCRIPTION:${description}`);
      }
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push('END:VEVENT');
    });
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function App() {
  const { entries, source, loading, error } = useCalendar();
  const [selectedIds, setSelectedIds] = useState([]);

  const normalizedEntries = useMemo(
    () =>
      entries.map((entry, index) => ({
        ...entry,
        id: `${entry.akademik_donem || 'diger'}-${index}`,
      })),
    [entries]
  );

  const groupedEntries = useMemo(() => {
    const buckets = new Map();
    normalizedEntries.forEach((entry) => {
      const key = entry.akademik_donem || 'Belirtilmemiş';
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key).push(entry);
    });
    return Array.from(buckets.entries());
  }, [normalizedEntries]);

  const entryColors = useMemo(() => {
    const colorMap = new Map();
    normalizedEntries.forEach((entry, index) => {
      const paletteColor = EVENT_PALETTE[index % EVENT_PALETTE.length];
      colorMap.set(entry.id, paletteColor);
    });
    return colorMap;
  }, [normalizedEntries]);

  const selectedEntries = useMemo(
    () => normalizedEntries.filter((entry) => selectedIds.includes(entry.id)),
    [normalizedEntries, selectedIds]
  );

  const events = useMemo(
    () =>
      selectedEntries.flatMap((entry) => {
        const color = entryColors.get(entry.id) ?? EVENT_PALETTE[0];
        return (entry.tarih?.spans ?? []).map((span, index) =>
          createEvent(entry, span, index, color)
        );
      }),
    [selectedEntries, entryColors]
  );

  const selectedMonths = useMemo(() => {
    const monthSet = new Set();
    selectedEntries.forEach((entry) => {
      (entry.tarih?.spans ?? []).forEach((span) => {
        getMonthsBetween(span.start, span.end).forEach((monthKey) => monthSet.add(monthKey));
      });
    });
    return Array.from(monthSet).sort(
      (a, b) => new Date(`${a}-01T00:00:00Z`).getTime() - new Date(`${b}-01T00:00:00Z`).getTime()
    );
  }, [selectedEntries]);

  const calendars = useMemo(() => {
    return selectedMonths.map((monthKey) => {
      const { start, end } = getMonthBounds(monthKey);
      const monthEvents = events.filter((event) => {
        const eventStart = isoToUTCDate(event.start);
        const eventEnd = isoToUTCDate(event.end); // exclusive end
        return eventStart < end && eventEnd > start;
      });
      return { monthKey, events: monthEvents };
    });
  }, [selectedMonths, events]);

  const toggleEntry = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(normalizedEntries.map((entry) => entry.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const applyPopularSelection = () => {
    const matchedIds = new Set(selectedIds);

    normalizedEntries.forEach((entry) => {
      const matchesCategory = POPULAR_CATEGORY_SET.has(entry.kategori);
      const matchesAkademik = POPULAR_AKADEMIK_SET.has(entry.akademik_donem);
      const matchesTarih = POPULAR_TARIH_SET.has(entry.tarih?.raw ?? '');

      if (matchesCategory || matchesAkademik || matchesTarih) {
        matchedIds.add(entry.id);
      }
    });

    setSelectedIds(Array.from(matchedIds));
  };

  const handleDownloadICS = () => {
    if (selectedEntries.length === 0) {
      return;
    }
    const icsContent = buildICSContent(selectedEntries);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ytu-akademik-takvim.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-slate-800 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-12">
        <section className="lg:col-span-4 flex h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          <header className="border-b border-slate-100 px-6 py-5">
            <h1 className="text-xl font-semibold text-slate-900">
              YTÜ 2025-2026 Takvim Adımları
            </h1>
            {source.file_name && (
              <p className="mt-2 text-sm text-slate-500">
                Kaynak: <span className="text-slate-700">{source.file_name}</span>
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                onClick={selectAll}
              >
                Tümünü seç
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                onClick={clearSelection}
              >
                Temizle
              </button>
              <button
                type="button"
                className="rounded-lg border border-blue-500 bg-blue-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-600 hover:border-blue-600"
                onClick={applyPopularSelection}
              >
                Popüler seçimi uygula
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            {loading && (
              <p className="px-6 py-4 text-sm text-slate-500">Takvim yükleniyor...</p>
            )}
            {error && (
              <p className="px-6 py-4 text-sm text-rose-500">Hata: {error}</p>
            )}
            {!loading && !error && (
              <div className="h-full overflow-y-auto px-4 py-4">
                {groupedEntries.map(([group, items]) => (
                  <div key={group} className="mb-6">
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {group}
                    </h2>
                    <ul className="space-y-3">
                      {items.map((entry) => {
                        const selected = selectedIds.includes(entry.id);
                        const color = entryColors.get(entry.id) ?? EVENT_PALETTE[0];
                        const baseClass =
                          'flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50';
                        const labelClass = selected
                          ? `${baseClass} border-2 shadow-sm`
                          : `${baseClass} border-slate-200`;
                        const labelStyle = selected
                          ? {
                              borderColor: color.border,
                            }
                          : undefined;
                        return (
                          <li key={entry.id}>
                            <label
                              className={labelClass}
                              style={labelStyle}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleEntry(entry.id)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {entry.kategori || 'Kategori bilgisi yok'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatTarih(entry.tarih) || 'Tarih bilgisi yok'}
                                </p>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-8 flex h-[calc(100vh-4rem)] flex-col rounded-3xl border border-slate-200 bg-white shadow-lg">
          <header className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">Takvim Görünümü</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sol listeden bir veya daha fazla süreç seçerek takvimde görüntüleyin.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleDownloadICS}
                disabled={selectedEntries.length === 0}
                className="rounded-lg border border-blue-500 bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 hover:border-blue-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
              >
                Seçili Etkinlikleri ICS Olarak İndir
              </button>
            </div>
          </header>
          <div className="relative flex-1 overflow-hidden">
            {selectedEntries.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-slate-400">
                Henüz seçim yapmadınız. Sol panelden süreçleri seçtiğinizde burada takvim üzerinde görüntülenir.
              </div>
            ) : (
              <div className="h-full overflow-y-auto px-6 py-6">
                <div className="grid gap-6">
                  {calendars.map(({ monthKey, events: monthEvents }) => (
                    <div
                      key={monthKey}
                      className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <h3 className="text-base font-semibold text-slate-900">
                          {formatMonthLabel(monthKey)}
                        </h3>
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          {monthEvents.length} etkinlik
                        </span>
                      </div>
                      <div className="p-4">
                        <FullCalendar
                          key={monthKey}
                          plugins={[dayGridPlugin]}
                          locales={[trLocale]}
                          locale="tr"
                          initialView="dayGridMonth"
                          initialDate={`${monthKey}-01`}
                          height="auto"
                          events={monthEvents}
                          headerToolbar={false}
                          dayMaxEventRows
                          displayEventTime={false}
                          eventDisplay="block"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
