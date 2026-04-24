import React, { useMemo, useRef, useState } from "react";
import { Plus, Upload, Music, X } from "lucide-react";

const DEFAULT_TAPE_MINUTES = 90;

function secondsToTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function fileNameToTitle(fileName) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function readAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name} 파일의 길이를 읽을 수 없습니다.`));
    };
    audio.src = url;
  });
}

async function audioFilesToTracks(files) {
  const audioFiles = Array.from(files).filter((file) => {
    const name = file.name.toLowerCase();
    return file.type.startsWith("audio/") || name.endsWith(".mp3") || name.endsWith(".flac");
  });

  const tracks = [];
  for (const file of audioFiles) {
    const duration = await readAudioDuration(file);
    tracks.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      title: fileNameToTitle(file.name),
      seconds: Math.round(duration),
      fileName: file.name,
      type: file.type || "audio file",
    });
  }
  return tracks;
}

function TrackRow({ track, index, onChangeTitle, onChangeSeconds, onRemove }) {
  const minutes = Math.floor(track.seconds / 60);
  const seconds = track.seconds % 60;

  return (
    <div className="grid grid-cols-[32px_1fr_82px_82px_36px] items-center gap-2 rounded-xl border bg-white p-2 shadow-sm">
      <div className="text-center text-sm font-semibold text-neutral-400">{index + 1}</div>
      <input
        className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
        value={track.title}
        onChange={(event) => onChangeTitle(track.id, event.target.value)}
        placeholder="제목"
      />
      <input
        className="rounded-lg border px-2 py-2 text-right text-sm outline-none focus:ring-2 focus:ring-neutral-300"
        type="number"
        min="0"
        value={minutes}
        onChange={(event) => {
          const nextMinutes = Math.max(0, Number(event.target.value) || 0);
          onChangeSeconds(track.id, nextMinutes * 60 + seconds);
        }}
        aria-label="minutes"
      />
      <input
        className="rounded-lg border px-2 py-2 text-right text-sm outline-none focus:ring-2 focus:ring-neutral-300"
        type="number"
        min="0"
        max="59"
        value={seconds}
        onChange={(event) => {
          const nextSeconds = Math.min(59, Math.max(0, Number(event.target.value) || 0));
          onChangeSeconds(track.id, minutes * 60 + nextSeconds);
        }}
        aria-label="seconds"
      />
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100"
        onClick={() => onRemove(track.id)}
        aria-label="remove track"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function TapeSide({ label, tracks, maxSeconds, onDropTracks, onAddManual, onChangeTitle, onChangeSeconds, onRemove }) {
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const usedSeconds = tracks.reduce((sum, track) => sum + track.seconds, 0);
  const remainingSeconds = maxSeconds - usedSeconds;
  const isOver = remainingSeconds < 0;

  async function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    setErrorMessage("");

    try {
      const droppedTracks = await audioFilesToTracks(event.dataTransfer.files);
      if (droppedTracks.length > 0) onDropTracks(droppedTracks);
      else setErrorMessage("MP3 또는 FLAC 파일만 추가할 수 있습니다.");
    } catch (error) {
      setErrorMessage(error.message || "파일 정보를 읽는 중 문제가 발생했습니다.");
    }
  }

  return (
    <section
      className={`rounded-3xl border p-4 shadow-sm transition ${dragOver ? "border-neutral-900 bg-neutral-100" : "border-neutral-200 bg-neutral-50"}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">{label}</div>
          <h2 className="text-xl font-bold">{label}면</h2>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{secondsToTime(usedSeconds)}</div>
          <div className={`text-sm ${isOver ? "font-semibold text-red-600" : "text-neutral-500"}`}>
            사용 남은 시간: {isOver ? `-${secondsToTime(Math.abs(remainingSeconds))}` : secondsToTime(remainingSeconds)}
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-[32px_1fr_82px_82px_36px] gap-2 px-2 text-xs font-semibold text-neutral-500">
        <div />
        <div>제목</div>
        <div className="text-right">분</div>
        <div className="text-right">초</div>
        <div />
      </div>

      <div className="space-y-2">
        {tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            onChangeTitle={onChangeTitle}
            onChangeSeconds={onChangeSeconds}
            onRemove={onRemove}
          />
        ))}
      </div>

      <div className={`mt-4 rounded-2xl border-2 border-dashed p-5 text-center ${dragOver ? "border-neutral-900 bg-white" : "border-neutral-300 bg-white/70"}`}>
        <Upload className="mx-auto mb-2" size={24} />
        <p className="text-sm font-semibold">MP3 또는 FLAC 파일을 이 {label}면 박스에 드래그 앤 드롭</p>
        <p className="mt-1 text-xs text-neutral-500">파일명은 제목 칸에 자동 입력되고, 음원 길이는 분/초에 자동 표시됩니다.</p>
        {errorMessage && <p className="mt-2 text-xs font-semibold text-red-600">{errorMessage}</p>}
      </div>

      <button
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-700"
        onClick={onAddManual}
      >
        <Plus size={16} /> 곡 추가
      </button>
    </section>
  );
}

export default function CassetteTapePlanner() {
  const [tapeMinutes, setTapeMinutes] = useState(DEFAULT_TAPE_MINUTES);
  const [sideA, setSideA] = useState([]);
  const [sideB, setSideB] = useState([]);
  const [fileError, setFileError] = useState("");
  const fileInputARef = useRef(null);
  const fileInputBRef = useRef(null);

  const sideSeconds = useMemo(() => Math.round((Number(tapeMinutes) || 0) * 60 / 2), [tapeMinutes]);

  function addManual(side) {
    const track = {
      id: crypto.randomUUID(),
      title: "",
      seconds: 0,
      fileName: "",
      type: "manual",
    };
    if (side === "A") setSideA((prev) => [...prev, track]);
    else setSideB((prev) => [...prev, track]);
  }

  function updateTrack(side, id, updater) {
    const setter = side === "A" ? setSideA : setSideB;
    setter((prev) => prev.map((track) => (track.id === id ? { ...track, ...updater(track) } : track)));
  }

  function removeTrack(side, id) {
    const setter = side === "A" ? setSideA : setSideB;
    setter((prev) => prev.filter((track) => track.id !== id));
  }

  async function handleFileInput(side, event) {
    setFileError("");
    try {
      const tracks = await audioFilesToTracks(event.target.files);
      if (tracks.length > 0) {
        if (side === "A") setSideA((prev) => [...prev, ...tracks]);
        else setSideB((prev) => [...prev, ...tracks]);
      } else {
        setFileError("MP3 또는 FLAC 파일만 추가할 수 있습니다.");
      }
    } catch (error) {
      setFileError(error.message || "파일 정보를 읽는 중 문제가 발생했습니다.");
    }
    event.target.value = "";
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-100 to-white p-4 text-neutral-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-500"><Music size={16} /> TAPE</div>
              <h1 className="text-3xl font-black tracking-tight">카세트 테이프 플래너</h1>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-neutral-600">테이프 총 길이</label>
              <input
                className="w-24 rounded-xl border px-3 py-2 text-right text-lg font-bold outline-none focus:ring-2 focus:ring-neutral-300"
                type="number"
                min="1"
                value={tapeMinutes}
                onChange={(event) => setTapeMinutes(Math.max(1, Number(event.target.value) || 1))}
              />
              <span className="text-sm text-neutral-500">분 → 각 면: {secondsToTime(sideSeconds)}</span>
            </div>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold shadow-sm" onClick={() => fileInputARef.current?.click()}>A면 파일 선택</button>
          <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold shadow-sm" onClick={() => fileInputBRef.current?.click()}>B면 파일 선택</button>
          {fileError && <span className="text-sm font-semibold text-red-600">{fileError}</span>}
          <input ref={fileInputARef} className="hidden" type="file" multiple accept="audio/mpeg,audio/mp3,audio/flac,.mp3,.flac" onChange={(event) => handleFileInput("A", event)} />
          <input ref={fileInputBRef} className="hidden" type="file" multiple accept="audio/mpeg,audio/mp3,audio/flac,.mp3,.flac" onChange={(event) => handleFileInput("B", event)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TapeSide
            label="A"
            tracks={sideA}
            maxSeconds={sideSeconds}
            onDropTracks={(tracks) => setSideA((prev) => [...prev, ...tracks])}
            onAddManual={() => addManual("A")}
            onChangeTitle={(id, title) => updateTrack("A", id, () => ({ title }))}
            onChangeSeconds={(id, seconds) => updateTrack("A", id, () => ({ seconds }))}
            onRemove={(id) => removeTrack("A", id)}
          />
          <TapeSide
            label="B"
            tracks={sideB}
            maxSeconds={sideSeconds}
            onDropTracks={(tracks) => setSideB((prev) => [...prev, ...tracks])}
            onAddManual={() => addManual("B")}
            onChangeTitle={(id, title) => updateTrack("B", id, () => ({ title }))}
            onChangeSeconds={(id, seconds) => updateTrack("B", id, () => ({ seconds }))}
            onRemove={(id) => removeTrack("B", id)}
          />
        </div>
      </div>
    </main>
  );
}
