import { useEffect, useState, useMemo } from "react";
import axios from "axios";

interface ScreenshotMeta {
  fileName: string;
  mtime: string;
  timeframe?: string;
  cropped: boolean;
}

interface Props {
  limit?: number;
  showCroppedToggle?: boolean;
}

export const ScreenshotGallery = ({
  limit = 10,
  showCroppedToggle = true,
}: Props) => {
  const [shots, setShots] = useState<ScreenshotMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCropped, setShowCropped] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("/api/get-screenshots");
        setShots(res.data.screenshots || []);
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, ScreenshotMeta[]> = {};
    for (const s of shots) {
      if (!s.timeframe) continue;
      map[s.timeframe] ||= [];
      map[s.timeframe].push(s);
    }
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => b.mtime.localeCompare(a.mtime))
    );
    return map;
  }, [shots]);

  const timeframes = Object.keys(grouped).sort((a, b) => {
    const order = ["5m", "15m", "1h", "2h", "6h", "12h", "1d"];
    return order.indexOf(a) - order.indexOf(b);
  });

  if (loading)
    return (
      <div className="card">
        <h3>Screenshots</h3>
        <p className="subtitle">Loading...</p>
      </div>
    );
  if (!shots.length)
    return (
      <div className="card">
        <h3>Screenshots</h3>
        <p className="subtitle">No screenshots found.</p>
      </div>
    );

  return (
    <div className="card">
      <h3>Screenshots</h3>
      <div className="screenshot-toolbar">
        {showCroppedToggle && (
          <>
            <label>
              <input
                type="checkbox"
                checked={showCropped}
                onChange={() => setShowCropped((s) => !s)}
              />{" "}
              Cropped
            </label>
            <label>
              <input
                type="checkbox"
                checked={showOriginal}
                onChange={() => setShowOriginal((s) => !s)}
              />{" "}
              Original
            </label>
          </>
        )}
      </div>
      <div className="screenshots-grid">
        {timeframes.map((tf) => {
          const list = grouped[tf]
            .filter(
              (s) => (s.cropped && showCropped) || (!s.cropped && showOriginal)
            )
            .slice(0, limit);
          if (!list.length) return null;
          return (
            <div key={tf} className="tf-block">
              <div className="tf-title">{tf}</div>
              <div className="tf-images">
                {list.map((s) => (
                  <figure key={s.fileName} title={s.fileName}>
                    <img
                      loading="lazy"
                      src={`/api/screenshot/${encodeURIComponent(s.fileName)}`}
                      alt={s.fileName}
                    />
                    <figcaption>
                      {new Date(s.mtime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
