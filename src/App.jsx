import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, Music, X, Play, Pause, Square, Volume2, SkipBack, SkipForward } from "lucide-react";

const DEFAULT_TAPE_MINUTES = 90;
const SUPPORTED_AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav", ".aiff", ".aif", ".m4a", ".alac"];

function secondsToTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function fileNameToTitle(fileName) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function isSupportedAudioFile(file) {
  const name = file.name.toLowerCase();
  return file.type.startsWith("audio/") || SUPPORTED_AUDIO_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function getMimeTypeForFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".flac")) return "audio/flac";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".aiff") || name.endsWith(".aif")) return "audio/aiff";
  if (name.endsWith(".m4a") || name.endsWith(".alac")) return "audio/mp4";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  return file.type || "audio/*";
}

function readAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([file], { type: getMimeTypeForFile(file) });
    const url = URL.createObjectURL(blob);
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

function createPlayableObjectUrl(file) {
  const blob = new Blob([file], { type: getMimeTypeForFile(file) });
  return URL.createObjectURL(blob);
}

async function audioFilesToTracks(files) {
  const audioFiles = Array.from(files).filter(isSupportedAudioFile);

  const tracks = [];
  for (const file of audioFiles) {
    let duration = 0;
    try {
      duration = await readAudioDuration(file);
    } catch {
      duration = 0;
    }

    tracks.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      title: fileNameToTitle(file.name),
      seconds: Math.round(duration),
      fileName: file.name,
      type: getMimeTypeForFile(file),
      file,
      objectUrl: createPlayableObjectUrl(file),
    });
  }
  return tracks;
}

function TrackRow({ track, index, isCurrent, onChangeTitle, onChangeSeconds, onRemove }) {
  const minutes = Math.floor(track.seconds / 60);
  const seconds = track.seconds % 60;

  return (
    <div className={`grid grid-cols-[32px_1fr_82px_82px_36px] items-center gap-2 rounded-xl border p-2 shadow-sm ${isCurrent ? "border-neutral-900 bg-neutral-100" : "bg-white"}`}>
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

function PlaylistControls({ label, disabled, isPlaying, isPaused, progress, onPlay, onPrevious, onNext, onPause, onStop }) {
  const progressPercent = progress.duration > 0 ? Math.min(100, Math.max(0, (progress.currentTime / progress.duration) * 100)) : 0;

  return (
    <div className="mt-4 rounded-2xl border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-bold">{label}면 전체 재생</div>
        <div className="text-xs font-semibold text-neutral-500">
          {secondsToTime(progress.currentTime)} / {secondsToTime(progress.duration)}
        </div>
      </div>

      <div className="mb-3">
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <button
          className="flex items-center justify-center gap-1 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          onClick={onPlay}
          disabled={disabled}
        >
          <Play size={15} /> 재생
        </button>
        <button
          className="flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onPrevious}
          disabled={disabled}
        >
          <SkipBack size={15} /> 이전
        </button>
        <button
          className="flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onNext}
          disabled={disabled}
        >
          <SkipForward size={15} /> 다음
        </button>
        <button
          className="flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onPause}
          disabled={disabled || (!isPlaying && !isPaused)}
        >
          <Pause size={15} /> 일시정지
        </button>
        <button
          className="flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onStop}
          disabled={disabled || (!isPlaying && !isPaused)}
        >
          <Square size={14} /> 멈춤
        </button>
      </div>
    </div>
  );
}

function TapeSide({ label, tracks, maxSeconds, activeSide, currentTrackId, isPlaying, isPaused, progress, silenceSeconds, \1}) {
  const [dragOver, setDragOver] = useState(false);
  const musicSeconds = tracks.reduce((sum, track) => sum + track.seconds, 0);
  const silenceGapCount = Math.max(0, tracks.length - 1);
  const silenceTotalSeconds = silenceGapCount * Math.max(0, Number(silenceSeconds) || 0);
  const usedSeconds = musicSeconds + silenceTotalSeconds;
  const remainingSeconds = maxSeconds - usedSeconds;
  const isOver = remainingSeconds < 0;
  const isThisSideActive = activeSide === label;
  const playableTracks = tracks.filter((track) => track.objectUrl);
  const sideProgress = isThisSideActive ? progress : { currentTime: 0, duration: 0 };

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
          {silenceTotalSeconds > 0 && (
            <div className="text-xs text-neutral-400">
              무음부 포함: +{secondsToTime(silenceTotalSeconds)} ({silenceGapCount}구간)
            </div>
          )}
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
            isCurrent={isThisSideActive && currentTrackId === track.id}
            onChangeTitle={onChangeTitle}
            onChangeSeconds={onChangeSeconds}
            onRemove={onRemove}
          />
        ))}
      </div>

      <PlaylistControls
        label={label}
        disabled={playableTracks.length === 0}
        isPlaying={isThisSideActive && isPlaying}
        isPaused={isThisSideActive && isPaused}
        progress={sideProgress}
        onPlay={() => onPlaySide(label)}
        onPrevious={() => onPrevious(label)}
        onNext={() => onNext(label)}
        onPause={onPause}
        onStop={onStop}
      />

      <div className={`mt-4 rounded-2xl border-2 border-dashed p-5 text-center ${dragOver ? "border-neutral-900 bg-white" : "border-neutral-300 bg-white/70"}`}>
        <Upload className="mx-auto mb-2" size={24} />
        <p className="text-sm font-semibold">MP3, FLAC, WAV, AIFF, M4A 파일을 이 {label}면 박스에 드래그 앤 드롭</p>
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
  const [activeSide, setActiveSide] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [nowPlayingTitle, setNowPlayingTitle] = useState("");
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const [audioError, setAudioError] = useState("");
  const [silenceSeconds, setSilenceSeconds] = useState(0);
  const [isWaitingSilence, setIsWaitingSilence] = useState(false);
  const audioRef = useRef(null);
  const fileInputARef = useRef(null);
  const fileInputBRef = useRef(null);
  const activeSideRef = useRef(null);
  const currentTrackIndexRef = useRef(-1);
  const sideARef = useRef([]);
  const sideBRef = useRef([]);
  const silenceSecondsRef = useRef(0);
  const selectedOutputDeviceIdRef = useRef("default");
  const silenceTimerRef = useRef(null);

  const sideSeconds = useMemo(() => Math.round((Number(tapeMinutes) || 0) * 60 / 2), [tapeMinutes]);
  const supportsOutputSelection = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

  const currentTracks = activeSide === "A" ? sideA : activeSide === "B" ? sideB : [];
  const currentPlayableTracks = currentTracks.filter((track) => track.objectUrl);
  const currentTrack = currentTrackIndex >= 0 ? currentPlayableTracks[currentTrackIndex] : null;

  useEffect(() => {
    activeSideRef.current = activeSide;
  }, [activeSide]);

  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

  useEffect(() => {
    sideARef.current = sideA;
  }, [sideA]);

  useEffect(() => {
    sideBRef.current = sideB;
  }, [sideB]);

  useEffect(() => {
    silenceSecondsRef.current = silenceSeconds;
  }, [silenceSeconds]);

  useEffect(() => {
    selectedOutputDeviceIdRef.current = selectedOutputDeviceId;
  }, [selectedOutputDeviceId]);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    audioRef.current.onended = () => playNextTrackAfterEnded();
    audioRef.current.ontimeupdate = () => updateProgressFromAudio();
    audioRef.current.onloadedmetadata = () => updateProgressFromAudio();
    audioRef.current.ondurationchange = () => updateProgressFromAudio();
    audioRef.current.onerror = () => {
      setAudioError("이 음원을 재생할 수 없습니다. 브라우저가 해당 무손실 포맷을 지원하는지 확인해주세요. FLAC은 Chrome/Edge에서 가장 안정적입니다.");
      setIsPlaying(false);
      setIsPaused(false);
    };

    loadAudioDevices();

    navigator.mediaDevices?.addEventListener?.("devicechange", loadAudioDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", loadAudioDevices);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      [...sideARef.current, ...sideBRef.current].forEach((track) => {
        if (track.objectUrl) URL.revokeObjectURL(track.objectUrl);
      });
    };
  }, []);

  function updateProgressFromAudio() {
    if (!audioRef.current) return;
    const currentTime = Number.isFinite(audioRef.current.currentTime) ? audioRef.current.currentTime : 0;
    const duration = Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : currentTrack?.seconds || 0;
    setProgress({ currentTime, duration });
  }

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
    } catch {
      setAudioError("오디오 출력 장치 목록을 불러올 수 없습니다.");
    }
  }

  async function requestAudioDevicePermission() {
    setAudioError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await loadAudioDevices();
    } catch {
      setAudioError("장치 이름 표시를 위해 브라우저의 오디오 권한이 필요할 수 있습니다.");
    }
  }

  async function applyOutputDevice(deviceId = selectedOutputDeviceIdRef.current) {
    if (!audioRef.current || !supportsOutputSelection || !audioRef.current.setSinkId) return;
    try {
      await audioRef.current.setSinkId(deviceId || "default");
    } catch {
      setAudioError("선택한 출력 장치로 변경할 수 없습니다. 브라우저 권한 또는 HTTPS 환경을 확인해주세요.");
    }
  }

  function getPlayableTracks(side) {
    const tracks = side === "A" ? sideARef.current : sideBRef.current;
    return tracks.filter((track) => track.objectUrl);
  }

  async function playSpecificTrack(side, index) {
    const playableTracks = getPlayableTracks(side);
    const track = playableTracks[index];
    if (!track?.objectUrl || !audioRef.current) return;

    setAudioError("");
    setProgress({ currentTime: 0, duration: track.seconds || 0 });
    try {
      audioRef.current.pause();
      audioRef.current.src = track.objectUrl;
      audioRef.current.currentTime = 0;

      await applyOutputDevice(selectedOutputDeviceIdRef.current);

      await audioRef.current.play();
      setActiveSide(side);
      activeSideRef.current = side;
      setCurrentTrackIndex(index);
      currentTrackIndexRef.current = index;
      setIsPlaying(true);
      setIsPaused(false);
      setNowPlayingTitle(`${side}면 - ${track.title || track.fileName || "Untitled"}`);
      updateProgressFromAudio();
    } catch {
      setIsPlaying(false);
      setIsPaused(false);
      setAudioError("음원을 재생할 수 없습니다. FLAC/ALAC 같은 무손실 파일은 브라우저별 지원 차이가 있습니다. Chrome 또는 Edge에서 다시 시도해주세요.");
    }
  }

  async function playSide(side) {
    const playableTracks = getPlayableTracks(side);
    if (playableTracks.length === 0) return;

    if (activeSide === side && isPaused && audioRef.current?.src) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
      } catch {
        setAudioError("일시정지된 음원을 다시 재생할 수 없습니다.");
      }
      return;
    }

    const startIndex = activeSide === side && currentTrackIndex >= 0 ? currentTrackIndex : 0;
    playSpecificTrack(side, Math.min(startIndex, playableTracks.length - 1));
  }

  function playNextTrack(sideOverride) {
    const side = sideOverride || activeSide;
    if (!side) return;

    const playableTracks = getPlayableTracks(side);
    if (playableTracks.length === 0) return;

    const nextIndex = currentTrackIndex + 1;
    if (nextIndex >= playableTracks.length) {
      stopPlayback();
      return;
    }

    playSpecificTrack(side, nextIndex);
  }

  function playNextTrackAfterEnded() {
    const side = activeSideRef.current;
    if (!side) return;

    const playableTracks = getPlayableTracks(side);
    if (playableTracks.length === 0) {
      stopPlayback();
      return;
    }

    const nextIndex = currentTrackIndexRef.current + 1;
    if (nextIndex >= playableTracks.length) {
      stopPlayback();
      return;
    }

    const waitSeconds = Math.max(0, Number(silenceSecondsRef.current) || 0);
    if (waitSeconds > 0) {
      setIsWaitingSilence(true);
      setIsPlaying(false);
      setIsPaused(false);
      setNowPlayingTitle(`${side}면 - 다음 곡까지 ${waitSeconds}초 무음`);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        setIsWaitingSilence(false);
        playSpecificTrack(side, nextIndex);
      }, waitSeconds * 1000);
      return;
    }

    playSpecificTrack(side, nextIndex);
  }

  function playPreviousTrack(sideOverride) {
    const side = sideOverride || activeSide;
    if (!side) return;

    const playableTracks = getPlayableTracks(side);
    if (playableTracks.length === 0) return;

    const previousIndex = currentTrackIndex <= 0 ? 0 : currentTrackIndex - 1;
    playSpecificTrack(side, previousIndex);
  }

  function pausePlayback() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    updateProgressFromAudio();
    setIsPlaying(false);
    setIsPaused(true);
  }

  function stopPlayback() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsWaitingSilence(false);
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.src = "";
    setActiveSide(null);
    activeSideRef.current = null;
    setCurrentTrackIndex(-1);
    currentTrackIndexRef.current = -1;
    setIsPlaying(false);
    setIsPaused(false);
    setIsWaitingSilence(false);
    setNowPlayingTitle("");
    setProgress({ currentTime: 0, duration: 0 });
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
      if (currentTrack?.id === id) stopPlayback();
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
                  const nextDeviceId = event.target.value;
                  setSelectedOutputDeviceId(nextDeviceId);
                  selectedOutputDeviceIdRef.current = nextDeviceId;
                  setTimeout(() => applyOutputDevice(nextDeviceId), 0);
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
          <div className="mt-3 rounded-2xl border bg-neutral-50 p-3">
            <label className="flex flex-col gap-2 text-sm font-semibold text-neutral-700 sm:flex-row sm:items-center">
              <span>곡 사이 무음부</span>
              <input
                className="w-28 rounded-xl border bg-white px-3 py-2 text-right text-sm outline-none focus:ring-2 focus:ring-neutral-300"
                type="number"
                min="0"
                step="0.5"
                value={silenceSeconds}
                onChange={(event) => setSilenceSeconds(Math.max(0, Number(event.target.value) || 0))}
              />
              <span className="text-neutral-500">초</span>
            </label>
            <p className="mt-1 text-xs text-neutral-500">한 곡이 끝난 뒤 다음 곡을 재생하기 전에 설정한 시간만큼 기다립니다.</p>
          </div>
          {nowPlayingTitle && (
            <p className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold">
              {isWaitingSilence ? "무음 대기 중" : "현재 재생 중"}: {nowPlayingTitle}
            </p>
          )}
          {audioError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{audioError}</p>
          )}
          <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            무손실 파일 지원: WAV/AIFF는 대부분의 브라우저에서 비교적 안정적이며, FLAC은 Chrome/Edge에서 주로 지원됩니다. ALAC/M4A는 브라우저와 OS 코덱 지원 여부에 따라 달라질 수 있습니다.
          </p>
        </section>

        <div className="mb-4 flex flex-wrap gap-2">
          <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold shadow-sm" onClick={() => fileInputARef.current?.click()}>A면 파일 선택</button>
          <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold shadow-sm" onClick={() => fileInputBRef.current?.click()}>B면 파일 선택</button>
          <input ref={fileInputARef} className="hidden" type="file" multiple accept="audio/*,.mp3,.flac,.wav,.aiff,.aif,.m4a,.alac" onChange={(event) => handleFileInput("A", event)} />
          <input ref={fileInputBRef} className="hidden" type="file" multiple accept="audio/*,.mp3,.flac,.wav,.aiff,.aif,.m4a,.alac" onChange={(event) => handleFileInput("B", event)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TapeSide
            label="A"
            tracks={sideA}
            maxSeconds={sideSeconds}
            activeSide={activeSide}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            isPaused={isPaused}
            progress={progress}
            silenceSeconds={silenceSeconds}
            onDropTracks={(tracks) => setSideA((prev) => [...prev, ...tracks])}
            onAddManual={() => addManual("A")}
            onPlaySide={playSide}
            onPrevious={playPreviousTrack}
            onNext={playNextTrack}
            onPause={pausePlayback}
            onStop={stopPlayback}
            onChangeTitle={(id, title) => updateTrack("A", id, () => ({ title }))}
            onChangeSeconds={(id, seconds) => updateTrack("A", id, () => ({ seconds }))}
            onRemove={(id) => removeTrack("A", id)}
          />
          <TapeSide
            label="B"
            tracks={sideB}
            maxSeconds={sideSeconds}
            activeSide={activeSide}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            isPaused={isPaused}
            progress={progress}
            silenceSeconds={silenceSeconds}
            onDropTracks={(tracks) => setSideB((prev) => [...prev, ...tracks])}
            onAddManual={() => addManual("B")}
            onPlaySide={playSide}
            onPrevious={playPreviousTrack}
            onNext={playNextTrack}
            onPause={pausePlayback}
            onStop={stopPlayback}
            onChangeTitle={(id, title) => updateTrack("B", id, () => ({ title }))}
            onChangeSeconds={(id, seconds) => updateTrack("B", id, () => ({ seconds }))}
            onRemove={(id) => removeTrack("B", id)}
          />
        </div>
      </div>
    </main>
  );
}
