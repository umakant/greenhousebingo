import type { FieldMapLocationStatus } from "@/lib/field-map-coordinates";

export type FieldMapPinPoint = {
  id: string;
  cityLabel: string;
  status: FieldMapLocationStatus;
  mapIndex: number;
  position: google.maps.LatLngLiteral;
  selected: boolean;
};

const STATUS_COLORS: Record<FieldMapLocationStatus, string> = {
  active: "#22C55E",
  upcoming: "#3B82F6",
  planning: "#A855F7",
  on_hold: "#F97316",
  complete: "#94A3B8",
};

export function fieldMapPinColor(status: FieldMapLocationStatus): string {
  return STATUS_COLORS[status];
}

export function buildFieldMapPinHtml(point: FieldMapPinPoint): string {
  const color = fieldMapPinColor(point.status);
  const scale = point.selected ? 1.08 : 1;
  const z = point.selected ? 1200 : 100;

  return `
    <div style="
      display:flex;
      flex-direction:column;
      align-items:center;
      transform:scale(${scale});
      transform-origin:center bottom;
      z-index:${z};
      pointer-events:auto;
      cursor:pointer;
      font-family:system-ui,-apple-system,sans-serif;
    ">
      <div style="
        background:#fff;
        border:1px solid rgba(15,23,42,0.08);
        border-radius:8px;
        padding:5px 12px;
        font-size:12px;
        font-weight:600;
        color:#0f172a;
        box-shadow:0 4px 14px rgba(15,23,42,0.12);
        white-space:nowrap;
        margin-bottom:6px;
        line-height:1.2;
      ">${escapeHtml(point.cityLabel)}</div>
      <div style="position:relative;width:36px;height:36px;">
        <div style="
          position:absolute;
          inset:0;
          background:${color};
          border-radius:50% 50% 50% 4px;
          transform:rotate(-45deg);
          border:2.5px solid #fff;
          box-shadow:0 3px 10px rgba(15,23,42,0.28);
        "></div>
        <span style="
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:12px;
          font-weight:800;
          color:#fff;
          text-shadow:0 1px 2px rgba(0,0,0,0.2);
        ">${point.mapIndex}</span>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createFieldMapPinOverlay(
  map: google.maps.Map,
  point: FieldMapPinPoint,
  onClick: () => void,
): google.maps.OverlayView {
  class PinOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private selected = point.selected;

    updateSelected(next: boolean) {
      this.selected = next;
      if (this.div) this.div.innerHTML = buildFieldMapPinHtml({ ...point, selected: next });
      this.div!.style.zIndex = next ? "1200" : "100";
    }

    onAdd() {
      this.div = document.createElement("div");
      this.div.style.position = "absolute";
      this.div.style.transform = "translate(-50%, -100%)";
      this.div.style.zIndex = this.selected ? "1200" : "100";
      this.div.innerHTML = buildFieldMapPinHtml({ ...point, selected: this.selected });
      this.div.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
      });
      this.getPanes()?.overlayMouseTarget.appendChild(this.div);
    }

    draw() {
      const projection = this.getProjection();
      if (!projection || !this.div) return;
      const pixel = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(point.position.lat, point.position.lng),
      );
      if (!pixel) return;
      this.div.style.left = `${pixel.x}px`;
      this.div.style.top = `${pixel.y}px`;
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }
  }

  const overlay = new PinOverlay();
  overlay.setMap(map);
  return overlay;
}

export type FieldMapPinOverlay = google.maps.OverlayView & {
  updateSelected?: (next: boolean) => void;
};
