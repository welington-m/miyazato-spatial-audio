import type { Profile, Mode } from "../profile";
import { variants } from "../profile";
import type { TranslationKey } from "./types";
import type { Translate } from "./index";

export const modeKeys: Record<Mode, TranslationKey> = {
  Music: "audioMode.music",
  Movie: "audioMode.movies",
  Gaming: "audioMode.gaming",
  FPS: "audioMode.fps",
  Voice: "audioMode.voice",
  Streaming: "audioMode.streaming",
  Custom: "audioMode.custom",
};

export const modeDescriptionKeys: Record<Mode, TranslationKey> = {
  Music: "audioMode.musicDescription",
  Movie: "audioMode.moviesDescription",
  Gaming: "audioMode.gamingDescription",
  FPS: "audioMode.fpsDescription",
  Voice: "audioMode.voiceDescription",
  Streaming: "audioMode.streamingDescription",
  Custom: "audioMode.customDescription",
};

export const presetKeys: Record<string, TranslationKey> = {
  Balanced: "preset.balanced",
  "Hi-Fi": "preset.hiFi",
  "Bass Boost": "preset.bassBoost",
  Vocal: "preset.vocal",
  Rock: "preset.rock",
  Electronic: "preset.electronic",
  "Hip-Hop": "preset.hipHop",
  Jazz: "preset.jazz",
  Classical: "preset.classical",
  Acoustic: "preset.acoustic",
  Cinema: "preset.cinema",
  Action: "preset.action",
  Dialogue: "preset.dialogue",
  "Night Mode": "preset.nightMode",
  Immersive: "preset.immersive",
  Competitive: "preset.competitive",
  Tactical: "preset.tactical",
  Meeting: "preset.meeting",
  Podcast: "preset.podcast",
  "Voice Clarity": "preset.voiceClarity",
  General: "preset.general",
  RPG: "preset.rpg",
  Racing: "preset.racing",
  Simulation: "preset.simulation",
  YouTube: "preset.youTube",
  "Streaming Video": "preset.streamingVideo",
  "Live Stream": "preset.liveStream",
  Personal: "preset.personal",
};

export const navKeys: Record<string, TranslationKey> = {
  Home: "nav.home",
  "Audio Profiles": "nav.profiles",
  Equalizer: "nav.equalizer",
  "Spatial Audio": "nav.spatial",
  Advanced: "nav.advanced",
  "Output Device": "nav.output",
  Settings: "nav.settings",
};
// Display only: never mutate the canonical name/category sent to the audio host.
// A saved custom profile keeps its user-provided name, including familiar preset words.
export function profileName(
  profile: Profile,
  t: Translate,
  userDefined = false,
): string {
  if (
    profile.category === "Custom" &&
    (userDefined || profile.name !== "Custom Personal")
  )
    return profile.name;
  const variant = variants[profile.category].find(
    (v) => profile.name === `${profile.category} ${v}`,
  );
  return variant
    ? t("profiles.generatedName", {
        mode: t(modeKeys[profile.category]),
        preset: t(presetKeys[variant]),
      })
    : profile.name;
}
