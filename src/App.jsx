import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, Music, X, Play, Pause, Square, Volume2 } from "lucide-react";

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
      file,
      objectUrl: URL.createObjectURL(file),
    });
  }
  return tracks;
}

function TrackRow({ track, index, isPlaying, onPlay, onPause, onStop, onChangeTitle, onChangeSeconds, onRemove }) {
  const minutes = Math.floor(track.seconds / 60);
  const seconds = track.seconds % 60;
  const canPlay = Boolean(track.objectUrl);

  return (
    <div className="grid grid-cols-[32px_1fr_82px_82px_96px_36px] items-center gap-2 rounded-xl border bg-white p-2 shadow-sm">
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
      <div className="flex items-center justify-center gap-1">
        {isPlaying ? (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white hover:bg-neutral-700"
            onClick={() => onPause(track)}
            aria-label="pause track"
          >
            <Pause size={15} />
          </button>
        ) : (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            onClick={() => onPlay(track)}
            disabled={!canPlay}
            aria-label="play track"
          >
            <Play size={15} />
          </button>
        )}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onStop}
          disabled={!canPlay}
          aria-label="stop track"
        >
          <Square size={14} />
        </button>
      </div>
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

function TapeSide({ label, tracks, maxSeconds, playingTrackId, onDropTracks, onAddManual, onPlay, onPause, onStop, onChangeTitle, onChangeSeconds, onRemove }) {
  const [dragOver, setDragOver] = useState(false);
  const usedSeconds = tracks.reduce((sum, track) => sum + track.seconds, 0);
  const remainingSeconds = maxSeconds - usedSeconds;
  const isOver = remainingSeconds < 0;

  async function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    const droppedTracks = await audioFilesToTracks(event.dataTransfer.files);
    if (droppedTracks.length > 0) onDropTracks(droppedTracks);
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

      <div className="mb-3 grid grid-cols-[32px_1fr_82px_82px_96px_36px] gap-2 px-2 text-xs font-semibold text-neutral-500">
        <div />
        <div>제목</div>
        <div className="text-right">분</div>
        <div className="text-right">초</div>
        <div className="text-center">재생</div>
        <div />
      </div>

      <div className="space-y-2">
        {tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            isPlaying={playingTrackId === track.id}
            onPlay={onPlay}
            onPause={onPause}
            onStop={onStop}
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
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState("default");
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [nowPlayingTitle, setNowPlayingTitle] = useState("");
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef(null);
  const fileInputARef = useRef(null);
  const fileInputBRef = useRef(null);

  const sideSeconds = useMemo(() => Math.round((Number(tapeMinutes) || 0) * 60 / 2), [tapeMinutes]);
  const supportsOutputSelection = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setPlayingTrackId(null);
      setNowPlayingTitle("");
    };

    loadAudioDevices();

    navigator.mediaDevices?.addEventListener?.("devicechange", loadAudioDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", loadAudioDevices);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      [...sideA, ...sideB].forEach((track) => {
        if (track.objectUrl) URL.revokeObjectURL(track.objectUrl);
      });
    };
  }, [sideA, sideB]);

  async function loadAudioDevices() {
    setAudioError("");
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setAudioDevices([]);
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((device) => device.kind === "audiooutput");
      setAudioDevices(outputs);
    } catch (error) {
      setAudioError("오디오 출력 장치 목록을 불러올 수 없습니다.");
    }
  }

  async function requestAudioDevicePermission() {
    setAudioError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await loadAudioDevices();
    } catch (error) {
      setAudioError("장치 이름 표시를 위해 브라우저의 오디오 권한이 필요할 수 있습니다.");
    }
  }

  async function applyOutputDevice() {
    if (!audioRef.current || !supportsOutputSelection) return;
    try {
      await audioRef.current.setSinkId(selectedOutputDeviceId);
    } catch (error) {
      setAudioError("선택한 출력 장치로 변경할 수 없습니다. 브라우저 권한 또는 HTTPS 환경을 확인해주세요.");
    }
  }

  async function playTrack(track) {
    if (!track.objectUrl || !audioRef.current) return;
    setAudioError("");

    try {
      audioRef.current.pause();
      audioRef.current.src = track.objectUrl;
      audioRef.current.currentTime = 0;

      if (supportsOutputSelection && audioRef.current.setSinkId) {
        await audioRef.current.setSinkId(selectedOutputDeviceId);
      }

      await audioRef.current.play();
      setPlayingTrackId(track.id);
      setNowPlayingTitle(track.title || track.fileName || "Untitled");
    } catch (error) {
      setPlayingTrackId(null);
      setNowPlayingTitle("");
      setAudioError("음원을 재생할 수 없습니다. 파일 형식, 브라우저 권한, 출력 장치를 확인해주세요.");
    }
  }

  function pauseTrack() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setPlayingTrackId(null);
  }

  function stopTrack() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setPlayingTrackId(null);
    setNowPlayingTitle("");
  }

  function addManual(side) {
    const track = {
      id: crypto.randomUUID(),
      title: "",
      seconds: 0,
      fileName: "",
      type: "manual",
      file: null,
      objectUrl: "",
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
    setter((prev) => {
      const target = prev.find((track) => track.id === id);
      if (target?.objectUrl) URL.revokeObjectURL(target.objectUrl);
      if (playingTrackId === id) stopTrack();
      return prev.filter((track) => track.id !== id);
    });
  }

  async function handleFileInput(side, event) {
    const tracks = await audioFilesToTracks(event.target.files);
    if (tracks.length > 0) {
      if (side === "A") setSideA((prev) => [...prev, ...tracks]);
      else setSideB((prev) => [...prev, ...tracks]);
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

        <section className="mb-4 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-neutral-700"><Volume2 size={16} /> 오디오 출력 장치</div>
              <div className="mt-1 text-xs text-neutral-500">
                DAC 선택은 Chrome / Edge 계열 브라우저의 HTTPS 또는 localhost 환경에서 주로 지원됩니다.
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className="min-w-72 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300 disabled:bg-neutral-100"
                value={selectedOutputDeviceId}
                onChange={async (event) => {
                  setSelectedOutputDeviceId(event.target.value);
                  setTimeout(applyOutputDevice, 0);
                }}
                disabled={!supportsOutputSelection}
              >
                <option value="default">기본 출력 장치</option>
                {audioDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `오디오 출력 장치 ${index + 1}`}
                  </option>
                ))}
              </select>
              <button
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
                onClick={requestAudioDevicePermission}
              >
                장치 목록 새로고침
              </button>
            </div>
          </div>
          {!supportsOutputSelection && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              현재 브라우저는 출력 장치 직접 선택 기능을 지원하지 않습니다. 이 경우 OS의 사운드 설정에서 DAC를 기본 출력 장치로 선택해주세요.
            </p>
          )}
          {nowPlayingTitle && (
            <p className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold">현재 재생 중: {nowPlayingTitle}</p>
          )}
          {audioError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{audioError}</p>
          )}
        </section>

        <div className="mb-4 flex flex-wrap gap-2">
          <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold shadow-sm" onClick={() => fileInputARef.current?.click()}>A면 파일 선택</button>
          <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold shadow-sm" onClick={() => fileInputBRef.current?.click()}>B면 파일 선택</button>
          <input ref={fileInputARef} className="hidden" type="file" multiple accept="audio/mpeg,audio/mp3,audio/flac,.mp3,.flac" onChange={(event) => handleFileInput("A", event)} />
          <input ref={fileInputBRef} className="hidden" type="file" multiple accept="audio/mpeg,audio/mp3,audio/flac,.mp3,.flac" onChange={(event) => handleFileInput("B", event)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TapeSide
            label="A"
            tracks={sideA}
            maxSeconds={sideSeconds}
            playingTrackId={playingTrackId}
            onDropTracks={(tracks) => setSideA((prev) => [...prev, ...tracks])}
            onAddManual={() => addManual("A")}
            onPlay={playTrack}
            onPause={pauseTrack}
            onStop={stopTrack}
            onChangeTitle={(id, title) => updateTrack("A", id, () => ({ title }))}
            onChangeSeconds={(id, seconds) => updateTrack("A", id, () => ({ seconds }))}
            onRemove={(id) => removeTrack("A", id)}
          />
          <TapeSide
            label="B"
            tracks={sideB}
            maxSeconds={sideSeconds}
            playingTrackId={playingTrackId}
            onDropTracks={(tracks) => setSideB((prev) => [...prev, ...tracks])}
            onAddManual={() => addManual("B")}
            onPlay={playTrack}
            onPause={pauseTrack}
            onStop={stopTrack}
            onChangeTitle={(id, title) => updateTrack("B", id, () => ({ title }))}
            onChangeSeconds={(id, seconds) => updateTrack("B", id, () => ({ seconds }))}
            onRemove={(id) => removeTrack("B", id)}
          />
        </div>
      </div>
    </main>
  );
}
