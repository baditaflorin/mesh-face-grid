import { useState } from "react";
import {
  ArmGate,
  useCamera,
  useFlashOnChange,
  useNamedPeer,
  usePerPeerValue,
  useReactions,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
type Face = { dataUrl: string; ts: number };

const STUB_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const REACTS = ["👍", "❤️", "😂", "🔥"];
const MAX = 20_000;

export function Feature({ room, config }: Props) {
  if (!room)
    return (
      <div className="face-screen">
        <h1>face grid</h1>
        <p className="face-status">Connecting…</p>
      </div>
    );
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const { name, setName, nameOf } = useNamedPeer(config, room);
  const faces = usePerPeerValue<Face>(room, "faces", { dataUrl: "", ts: 0 });
  const reactions = useReactions(room, "face-reactions");
  const [open, setOpen] = useState<string | null>(null);

  const writeFace = (dataUrl: string) => {
    if (!dataUrl || dataUrl.length >= MAX) return;
    faces.setMy({ dataUrl, ts: Date.now() });
  };

  const tiles = faces.entries.filter(([, f]) => f.dataUrl).sort((a, b) => b[1].ts - a[1].ts);
  const present = room.peerCount + 1;

  return (
    <div className="face-screen">
      <header className="face-header">
        <h1>face grid</h1>
        <p className="face-status">
          {tiles.length} {tiles.length === 1 ? "face" : "faces"} · {present}{" "}
          {present === 1 ? "peer" : "peers"}
        </p>
      </header>
      <input
        className="face-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="your name"
        maxLength={48}
        aria-label="your name"
      />
      <ArmGate label="tap to enable camera">
        {(on) => (on ? <CameraSnap onCapture={writeFace} /> : null)}
      </ArmGate>
      <button
        type="button"
        className="face-test-stub"
        aria-label="use stub face"
        onClick={() => writeFace(STUB_PNG)}
      >
        use stub face
      </button>
      <div className="face-grid">
        {tiles.map(([peerId, f]) => (
          <Tile
            key={peerId}
            peerId={peerId}
            face={f}
            peerName={nameOf(peerId) ?? `peer-${peerId.slice(0, 6)}`}
            open={open === peerId}
            onOpen={() => setOpen(open === peerId ? null : peerId)}
            counts={reactions.countsFor(peerId)}
            onReact={(k) => reactions.react(peerId, k)}
          />
        ))}
      </div>
    </div>
  );
}

function CameraSnap({ onCapture }: { onCapture: (d: string) => void }) {
  const cam = useCamera({ facing: "user", width: 320, height: 320 });
  const snap = () => {
    const raw = cam.snapshot(0.85);
    if (!raw) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 200;
      c.height = 200;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const sz = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - sz) / 2, (img.height - sz) / 2, sz, sz, 0, 0, 200, 200);
      onCapture(c.toDataURL("image/jpeg", 0.6));
    };
    img.src = raw;
  };
  return (
    <div className="face-cam">
      <video ref={cam.videoRef} className="face-preview" playsInline muted autoPlay />
      <button
        type="button"
        className="face-snap"
        aria-label="snap selfie"
        onClick={snap}
        disabled={!cam.ready}
      >
        snap selfie
      </button>
    </div>
  );
}

function Tile(p: {
  peerId: string;
  face: Face;
  peerName: string;
  open: boolean;
  onOpen: () => void;
  counts: Record<string, number>;
  onReact: (kind: string) => void;
}) {
  const flash = useFlashOnChange(p.face.ts);
  return (
    <div
      className={`face-tile${flash ? " face-tile-flash" : ""}`}
      data-peer-id={p.peerId}
      data-peer-name={p.peerName}
    >
      <button type="button" className="face-tile-btn" onClick={p.onOpen}>
        <img className="face-img" src={p.face.dataUrl} alt={p.peerName} />
        <span className="face-name-overlay">{p.peerName}</span>
      </button>
      {p.open && (
        <div className="face-reacts" role="group" aria-label="react">
          {REACTS.map((k) => (
            <button key={k} type="button" className="face-react" onClick={() => p.onReact(k)}>
              {k}
              {p.counts[k] ? <em>{p.counts[k]}</em> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
