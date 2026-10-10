import { useEffect, useState, useRef } from "react";
import {
  native,
  post,
  subscribe,
  type Device,
  type Analyzer,
  type Status,
} from "./bridge";
import {
  initialSettings,
  parseSettings,
  type Settings,
  type Profile,
} from "./profile";
const emptyStatus: Status = {
  sourceId: "",
  outputId: "",
  running: false,
  underruns: 0,
  overruns: 0,
  glitches: 0,
  bufferMs: 0,
  callbackMs: 0,
  error: "",
};
function load() {
  try {
    return parseSettings(
      JSON.parse(localStorage.getItem("miyazato.settings.v1") || "null"),
    );
  } catch {
    return structuredClone(initialSettings);
  }
}
export function useAudioSession() {
  const [settings, setSettings] = useState<Settings>(load),
    [devices, setDevices] = useState<Device[]>([]),
    [analyzer, setAnalyzer] = useState<Analyzer | null>(null),
    [status, setStatus] = useState(emptyStatus),
    [error, setError] = useState(""),
    [ready, setReady] = useState(!native);
  const p = settings.profile;
  const pendingProfile = useRef(p);
  const parameterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const off = subscribe((e) => {
      if (e.type === "devices") setDevices(e.devices);
      if (e.type === "settings") {
        if (e.value) setSettings(parseSettings(e.value));
        setReady(true);
      }
      if (e.type === "analyzer") setAnalyzer(e);
      if (e.type === "status") {
        setStatus(e);
        if (!e.running) setAnalyzer(null);
      }
      if (e.type === "error") setError(e.message);
    });
    post("devices.list");
    post("settings.load");
    return off;
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("miyazato.settings.v1", JSON.stringify(settings));
      } catch {
        setError("Local storage unavailable");
      }
      post("settings.save", { value: settings });
    }, 250);
    return () => clearTimeout(timer);
  }, [settings, ready]);
  useEffect(() => {
    pendingProfile.current = p;
    if (!ready || parameterTimer.current !== null) return;
    // Bounded event coalescing still sends updates during continuous slider drags.
    parameterTimer.current = setTimeout(() => {
      post("profile.set", { profile: pendingProfile.current });
      parameterTimer.current = null;
    }, 25);
  }, [p, ready]);
  useEffect(
    () => () => {
      if (parameterTimer.current !== null) clearTimeout(parameterTimer.current);
      parameterTimer.current = null;
    },
    [],
  );
  const patch = (value: Partial<Profile>) =>
    setSettings((s) => ({ ...s, profile: { ...s.profile, ...value } }));
  return {
    settings,
    setSettings,
    devices,
    analyzer,
    status,
    error,
    setError,
    p,
    patch,
  };
}
