import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";
import {
  audioHelp,
  type AudioHelpKey,
  type AudioHelpEntry,
} from "../../content/audioHelp";

export function placeHelp(
  anchor: DOMRect,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const margin = 12,
    gap = 8;
  const below = anchor.bottom + gap;
  const above = anchor.top - gap - height;
  return {
    left: Math.max(
      margin,
      Math.min(anchor.left, viewportWidth - width - margin),
    ),
    top: Math.max(
      margin,
      Math.min(
        below + height <= viewportHeight - margin ? below : above,
        viewportHeight - height - margin,
      ),
    ),
  };
}

export default function HelpTooltip({
  help,
  entry,
}: {
  help?: AudioHelpKey;
  entry?: AudioHelpEntry;
}) {
  const content: AudioHelpEntry | undefined =
    entry ?? (help ? audioHelp[help] : undefined);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const cancel = () => {
    clearTimeout(timer.current);
  };
  const close = () => {
    cancel();
    setOpen(false);
    setPinned(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (
        !button.current?.contains(e.target as Node) &&
        !panel.current?.contains(e.target as Node)
      )
        close();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panel.current?.contains(document.activeElement))
          button.current?.focus();
        close();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (!button.current || !panel.current) return;
      const bounds = panel.current.getBoundingClientRect();
      setPosition(
        placeHelp(
          button.current.getBoundingClientRect(),
          bounds.width,
          bounds.height,
          window.innerWidth,
          window.innerHeight,
        ),
      );
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, pinned, content]);
  if (!content) return null;
  return (
    <>
      <button
        ref={button}
        type="button"
        className="help-trigger"
        aria-label={`Help: ${content.title}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={pinned}
        aria-controls={pinned ? id : undefined}
        onMouseEnter={() => {
          cancel();
          timer.current = setTimeout(() => setOpen(true), 300);
        }}
        onMouseLeave={() => {
          cancel();
          if (!pinned) setOpen(false);
        }}
        onBlur={(e) => {
          if (!pinned && !panel.current?.contains(e.relatedTarget)) close();
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
            e.preventDefault();
            e.currentTarget.click();
          }
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cancel();
          setPinned(!pinned);
          setOpen(!pinned);
        }}
      >
        <CircleHelp size={15} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            className="help-popover"
            role={pinned ? "dialog" : "tooltip"}
            aria-label={pinned ? content.title : undefined}
            style={position}
          >
            <strong>{content.title}</strong>
            <p>{content.description}</p>
            {content.usage && (
              <>
                <span>Best for</span>
                <p>{content.usage}</p>
              </>
            )}
            {content.warning && (
              <>
                <span>Note</span>
                <p>{content.warning}</p>
              </>
            )}
            {pinned && content.learnMore && (
              <a href={content.learnMore.href}>{content.learnMore.label}</a>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
