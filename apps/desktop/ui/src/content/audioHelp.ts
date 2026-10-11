export interface AudioHelpEntry {
  title: string;
  description: string;
  usage?: string;
  warning?: string;
  learnMore?: { label: string; href: string };
}

export const audioHelp = {
  stereoWidth: {
    title: "Stereo Width",
    description:
      "Scales the difference between left and right channels: 0% is mono, 100% preserves width, and higher values widen stereo.",
    usage: "Adjust stereo music or headphone listening.",
    warning:
      "Wide settings can exaggerate out-of-phase material; mono content does not become surround.",
  },
  bass: {
    title: "Bass",
    description:
      "Boosts low frequencies with a low-shelf filter, adding weight and impact.",
    usage: "Music, movies and games needing more low end.",
    warning:
      "Boosts consume headroom and may mask speech or increase limiter activity.",
  },
  clarity: {
    title: "Clarity",
    description:
      "Adds a broad presence boost centered at 2.4 kHz, making voices and detail more prominent.",
    usage: "Dialogue and speech.",
    warning: "High settings can sound sharp; this is EQ, not voice isolation.",
  },
  spatial: {
    title: "Spatial / Immersion",
    description:
      "Planned feature. HRTF, virtual surround, upmix and room modeling are currently bypassed; this preview adds no spatial DSP.",
    usage: "Previewing the planned spatial layout.",
    warning: "Only stereo width and basic crossfeed work in this build.",
  },
  frequency: {
    title: "Frequency",
    description:
      "Sets the center frequency for a bell filter, or the transition/cutoff frequency for shelves and pass filters.",
    usage: "Choosing which part of the spectrum to shape.",
    warning:
      "Changes near the top of the spectrum are limited by the active sample rate.",
  },
  gain: {
    title: "Gain",
    description: "Boosts or cuts the selected bell or shelf band in decibels.",
    usage: "Tonal balance and reducing resonances.",
    warning:
      "Boosts consume headroom. Gain has no effect on low-pass or high-pass filters.",
  },
  q: {
    title: "Q",
    description:
      "Controls filter bandwidth or resonance. Higher Q makes bell adjustments narrower and changes shelf/pass transition shape.",
    usage: "Targeted corrections or broader tonal shaping.",
    warning: "High Q can produce ringing or resonant peaks.",
  },
  filter: {
    title: "Filter type",
    description:
      "Selects bell/peak, low shelf, high shelf, low pass or high pass for this band.",
    usage: "Choosing a local adjustment, broad shelf or frequency cutoff.",
    warning:
      "Changing type changes how Frequency, Gain and Q shape the response.",
  },
  lowShelf: {
    title: "Low Shelf",
    description: "Boosts or cuts frequencies below the transition frequency.",
    usage: "Broad bass balance.",
    warning: "Large boosts may mask mids and reduce headroom.",
  },
  highShelf: {
    title: "High Shelf",
    description: "Boosts or cuts frequencies above the transition frequency.",
    usage: "Brightness and treble balance.",
    warning: "Boosts can emphasize hiss or harshness.",
  },
  peak: {
    title: "Bell / Peak",
    description:
      "Boosts or cuts a region around the selected frequency; Q sets its width.",
    usage: "Presence shaping and resonance correction.",
    warning: "Narrow boosts can sound resonant.",
  },
  lowPass: {
    title: "Low Pass",
    description:
      "Attenuates frequencies above the cutoff; Q affects resonance.",
    usage: "Reducing high-frequency noise or brightness.",
    warning: "May remove useful detail. Gain is unused.",
  },
  highPass: {
    title: "High Pass",
    description:
      "Attenuates frequencies below the cutoff; Q affects resonance.",
    usage: "Reducing rumble or excess low end.",
    warning: "May thin voices and bass. Gain is unused.",
  },
  bandEnabled: {
    title: "EQ band enabled",
    description: "Includes this band in the equalizer response when checked.",
    usage: "Comparing a band correction.",
    warning: "Disabling one band leaves the other processing active.",
  },
  crossfeed: {
    title: "Crossfeed",
    description:
      "Directly blends left and right channels, reducing stereo separation. At maximum, the channels converge to mono.",
    usage: "Softening hard-panned headphone recordings.",
    warning:
      "Frequency-dependent crossfeed is planned; this blend can narrow positional cues.",
  },
  compressor: {
    title: "Compressor",
    description:
      "Uses a stereo-linked peak envelope to reduce levels above the threshold, making dynamics more even.",
    usage: "Speech or quieter listening.",
    warning: "Strong compression can flatten impact or cause pumping.",
  },
  Threshold: {
    title: "Threshold",
    description:
      "Sets the envelope level above which compression reduces gain. Lower values affect more of the signal.",
    usage: "Controlling louder passages.",
    warning: "Only affects sound when the compressor is enabled.",
  },
  Ratio: {
    title: "Ratio",
    description:
      "Sets compression strength above the threshold. 1:1 applies no reduction; higher ratios restrain loud passages more.",
    usage: "Evening out level differences.",
    warning: "High ratios reduce dynamic contrast; compressor must be enabled.",
  },
  Attack: {
    title: "Attack",
    description:
      "Sets how quickly the compressor envelope responds to rising peaks.",
    usage: "Balancing transient punch and level control.",
    warning:
      "Fast attack can soften impacts; slow attack lets peaks through. Compressor must be enabled.",
  },
  Release: {
    title: "Release",
    description:
      "Sets how quickly the compressor envelope falls after a peak, allowing gain to recover.",
    usage: "Matching compression recovery to the material.",
    warning:
      "Short times can pump; long times may suppress following sounds. Compressor must be enabled.",
  },
  Makeup: {
    title: "Makeup Gain",
    description: "Adds gain after compression when the compressor is enabled.",
    usage: "Restoring level reduced by compression.",
    warning: "Extra gain can increase final limiter activity.",
  },
  "Input headroom": {
    title: "Input Gain / Headroom",
    description:
      "Attenuates input before EQ and other processing to leave space for boosts.",
    usage: "Preventing boosted signals from driving the limiter heavily.",
    warning:
      "More attenuation lowers listening level; it does not repair clipped source audio.",
  },
  "Output gain": {
    title: "Output Gain",
    description:
      "Adjusts processed level after compression and before the final safety limiter.",
    usage: "Setting the processed listening level.",
    warning:
      "Boosts may cause limiter reduction; bypass uses its own fixed reference.",
  },
  limiter: {
    title: "Limiter",
    description:
      "The final stereo-linked sample-peak limiter protects output with a 0.98 ceiling (about \u22120.18 dBFS).",
    usage: "Containing output peaks; always retained during bypass.",
    warning:
      "Heavy reduction can affect dynamics. True-peak oversampling is not implemented.",
  },
  bypass: {
    title: "Bypass",
    description:
      "Fades to the original input at a fixed \u22126 dB reference, retaining final limiter protection.",
    usage: "Comparing processing with the source.",
    warning:
      "This is not loudness-matched A/B; level differences can influence comparisons.",
  },
  sampleRate: {
    title: "Sample Rate",
    description:
      "Shows the endpoint format in samples per second. The prototype requires matching stereo float32 source and output rates.",
    usage: "Checking route compatibility.",
    warning:
      "This is a readout, not a resampling control; higher rates do not restore missing source detail.",
  },
  channels: {
    title: "Channels",
    description:
      "Shows the endpoint channel count. The current route processes stereo (two channels).",
    usage: "Checking endpoint compatibility.",
    warning: "Multichannel virtualization and upmix are bypassed.",
  },
  buffer: {
    title: "Buffer",
    description:
      "Shows the render stream latency plus the duration of its allocated buffer.",
    usage: "Monitoring the output buffering estimate.",
    warning: "Not an adjustable buffer or measured end-to-end latency.",
  },
  latency: {
    title: "Latency",
    description:
      "Buffer telemetry estimates output stream latency and allocated render-buffer duration.",
    usage: "Understanding part of the playback delay.",
    warning:
      "Capture, queue and device delays are not fully measured; no end-to-end latency readout exists.",
  },
  callback: {
    title: "Callback time",
    description:
      "Shows elapsed time for the latest audio event handling pass, including capture, DSP and render work.",
    usage: "Monitoring processing workload.",
    warning:
      "Not an average, DSP-only timing or end-to-end latency measurement.",
  },
  glitches: {
    title: "Glitches",
    description:
      "Counts capture packets flagged by WASAPI as data discontinuities.",
    usage: "Investigating possible clicks or gaps.",
    warning:
      "A counter is diagnostic; it does not measure audible severity. Reset on route start.",
  },
  underruns: {
    title: "Underruns",
    description:
      "Counts render fills with too few queued frames; missing samples are replaced with silence.",
    usage: "Investigating playback gaps.",
    warning: "Also may occur during startup. Reset on route start.",
  },
  overruns: {
    title: "Overruns",
    description:
      "Counts oversized capture packets or queue overflow that discards queued audio.",
    usage: "Investigating lost audio under load.",
    warning: "Can cause discontinuities; reset on route start.",
  },
  source: {
    title: "Capture source",
    description: "Selects the endpoint whose playback is captured by loopback.",
    usage: "Routing audio from a source endpoint to a separate output.",
    warning:
      "Source and output must differ and have matching stereo float32 formats.",
  },
  output: {
    title: "Output device",
    description:
      "Selects the endpoint that plays the processed loopback signal when the route starts.",
    usage: "Choosing where to listen.",
    warning:
      "Changing selection does not restart an active route; start the route with the desired endpoints.",
  },
  intensity: {
    title: "Spatial Intensity",
    description:
      "Planned feature. This build has no active spatial intensity processing or adjustable control.",
    usage: "Understanding the planned spatial engine.",
    warning: "Currently bypassed; no audible effect in this build.",
  },
  room: {
    title: "Room Size",
    description:
      "Planned feature. This build has no active room size processing or adjustable control.",
    usage: "Understanding the planned spatial engine.",
    warning: "Currently bypassed; no audible effect in this build.",
  },
  front: {
    title: "Front Distance",
    description:
      "Planned feature. This build has no active front distance processing or adjustable control.",
    usage: "Understanding the planned spatial engine.",
    warning: "Currently bypassed; no audible effect in this build.",
  },
  rear: {
    title: "Rear Presence",
    description:
      "Planned feature. This build has no active rear presence processing or adjustable control.",
    usage: "Understanding the planned spatial engine.",
    warning: "Currently bypassed; no audible effect in this build.",
  },
  height: {
    title: "Height Presence",
    description:
      "Planned feature. This build has no active height presence processing or adjustable control.",
    usage: "Understanding the planned spatial engine.",
    warning: "Currently bypassed; no audible effect in this build.",
  },
  center: {
    title: "Center Focus",
    description:
      "Planned feature. This build has no active center focus processing or adjustable control.",
    usage: "Understanding the planned spatial engine.",
    warning: "Currently bypassed; no audible effect in this build.",
  },
  hrtf: {
    title: "HRTF",
    description:
      "Planned feature. This build has no active hrtf processing or adjustable control.",
    usage: "Understanding the planned spatial engine.",
    warning: "Currently bypassed; no audible effect in this build.",
  },
  surround: {
    title: "Virtual Surround",
    description:
      "Planned feature. This build has no active virtual surround processing or adjustable control.",
    usage: "Understanding the planned spatial engine.",
    warning: "Currently bypassed; no audible effect in this build.",
  },
  upmix: {
    title: "Upmix",
    description:
      "Planned feature. This build has no active upmix processing or adjustable control.",
    usage: "Understanding the planned spatial engine.",
    warning: "Currently bypassed; no audible effect in this build.",
  },
  modeMusic: {
    title: "Music",
    description:
      "Uses a tonal EQ curve with bass and presence shaping; Hi-Fi and Classical variants flatten EQ and disable those boosts.",
    usage: "A starting point; choose a variant and adjust by ear.",
    warning:
      "Presets use current stereo DSP, not HRTF or surround. Browser preview does not process audio.",
  },
  modeMovie: {
    title: "Movies",
    description:
      "Uses bass and presence shaping; Night Mode enables stronger compression and reduces bass.",
    usage: "A starting point; choose a variant and adjust by ear.",
    warning:
      "Presets use current stereo DSP, not HRTF or surround. Browser preview does not process audio.",
  },
  modeGaming: {
    title: "Gaming",
    description:
      "Uses a detail-oriented EQ curve and wider stereo; immersive variants add width and bass.",
    usage: "A starting point; choose a variant and adjust by ear.",
    warning:
      "Presets use current stereo DSP, not HRTF or surround. Browser preview does not process audio.",
  },
  modeFPS: {
    title: "FPS",
    description:
      "Reduces low-frequency EQ and emphasizes upper mids for positional detail; bass enhancement is off.",
    usage: "A starting point; choose a variant and adjust by ear.",
    warning:
      "Presets use current stereo DSP, not HRTF or surround. Browser preview does not process audio.",
  },
  modeVoice: {
    title: "Voice",
    description:
      "Reduces low frequencies and emphasizes speech presence; the base preset enables compression.",
    usage: "A starting point; choose a variant and adjust by ear.",
    warning:
      "Presets use current stereo DSP, not HRTF or surround. Browser preview does not process audio.",
  },
  modeStreaming: {
    title: "Streaming",
    description:
      "Uses mild EQ and presence shaping; Live Stream enables compression.",
    usage: "A starting point; choose a variant and adjust by ear.",
    warning:
      "Presets use current stereo DSP, not HRTF or surround. Browser preview does not process audio.",
  },
  modeCustom: {
    title: "Custom",
    description: "Starts with flat EQ and editable stereo processing settings.",
    usage: "A starting point; choose a variant and adjust by ear.",
    warning:
      "Presets use current stereo DSP, not HRTF or surround. Browser preview does not process audio.",
  },
} satisfies Record<string, AudioHelpEntry>;
export type AudioHelpKey = keyof typeof audioHelp;
