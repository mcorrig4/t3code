import type { CSSProperties } from "react";
import type { LoaderVariant } from "@t3tools/shared/branding";

const T3_PATH =
  "M33.4509 93V47.56H15.5309V37H64.3309V47.56H46.4109V93H33.4509ZM86.7253 93.96C82.832 93.96 78.9653 93.4533 75.1253 92.44C71.2853 91.3733 68.032 89.88 65.3653 87.96L70.4053 78.04C72.5386 79.5867 75.0186 80.8133 77.8453 81.72C80.672 82.6267 83.5253 83.08 86.4053 83.08C89.6586 83.08 92.2186 82.44 94.0853 81.16C95.952 79.88 96.8853 78.12 96.8853 75.88C96.8853 73.7467 96.0586 72.0667 94.4053 70.84C92.752 69.6133 90.0853 69 86.4053 69H80.4853V60.44L96.0853 42.76L97.5253 47.4H68.1653V37H107.365V45.4L91.8453 63.08L85.2853 59.32H89.0453C95.9253 59.32 101.125 60.8667 104.645 63.96C108.165 67.0533 109.925 71.0267 109.925 75.88C109.925 79.0267 109.099 81.9867 107.445 84.76C105.792 87.48 103.259 89.6933 99.8453 91.4C96.432 93.1067 92.0586 93.96 86.7253 93.96Z";

const DURATION = "3.2s";
const SPLINE = "0.42 0 0.08 1";
const SHIMMER_DELTA = 1.3;
const GRADIENT_START_X = 0;
const GRADIENT_START_Y = 34;
const GRADIENT_END_X = 120;
const GRADIENT_END_Y = 100;

type LoaderTheme = {
  readonly background: string;
  readonly ambient: string;
  readonly outline: string;
  readonly label: string;
  readonly dot: string;
  readonly mainStops: ReadonlyArray<readonly [number, string, number]>;
  readonly coreStops: ReadonlyArray<readonly [number, string, number]>;
};

const HOST_AWARE_LOADER_THEME: LoaderTheme = {
  background:
    "radial-gradient(ellipse at 50% 48%, var(--t3-boot-start, #0c1a35) 0%, var(--t3-boot-mid, #07101f) 38%, var(--t3-boot-end, #030810) 100%)",
  ambient:
    "radial-gradient(ellipse, var(--t3-loader-ambient-core, rgba(37,99,235,0.10)) 0%, var(--t3-loader-ambient-edge, rgba(30,64,175,0.03)) 50%, transparent 72%)",
  outline: "var(--t3-loader-outline, #2563eb)",
  label: "var(--t3-loader-primary-soft, #3b82f6)",
  dot: "var(--t3-loader-primary-medium, #2563eb)",
  mainStops: [
    [-0.15, "transparent", 1],
    [-0.12, "var(--t3-loader-primary-strong, #1e40af)", 0],
    [-0.07, "var(--t3-loader-primary-medium, #2563eb)", 0.45],
    [-0.03, "var(--t3-loader-primary-soft, #3b82f6)", 0.75],
    [0, "var(--t3-loader-primary-glow, #60a5fa)", 1],
    [0.03, "var(--t3-loader-primary-soft, #3b82f6)", 0.75],
    [0.07, "var(--t3-loader-primary-medium, #2563eb)", 0.45],
    [0.12, "var(--t3-loader-primary-strong, #1e40af)", 0],
    [0.15, "transparent", 1],
  ],
  coreStops: [
    [-0.05, "transparent", 1],
    [-0.02, "var(--t3-loader-core-soft, #93c5fd)", 0.8],
    [0, "var(--t3-loader-core-strong, #dbeafe)", 1],
    [0.02, "var(--t3-loader-core-soft, #93c5fd)", 0.8],
    [0.05, "transparent", 1],
  ],
};

const LOADER_THEME_BY_VARIANT: Record<LoaderVariant | "host", LoaderTheme> = {
  host: HOST_AWARE_LOADER_THEME,
  default: {
    background: "radial-gradient(ellipse at 50% 48%, #0c1a35 0%, #07101f 38%, #030810 100%)",
    ambient:
      "radial-gradient(ellipse, rgba(37,99,235,0.10) 0%, rgba(30,64,175,0.03) 50%, transparent 72%)",
    outline: "#2563eb",
    label: "#3b82f6",
    dot: "#2563eb",
    mainStops: [
      [-0.15, "transparent", 1],
      [-0.12, "#1e40af", 0],
      [-0.07, "#2563eb", 0.45],
      [-0.03, "#3b82f6", 0.75],
      [0, "#60a5fa", 1],
      [0.03, "#3b82f6", 0.75],
      [0.07, "#2563eb", 0.45],
      [0.12, "#1e40af", 0],
      [0.15, "transparent", 1],
    ],
    coreStops: [
      [-0.05, "transparent", 1],
      [-0.02, "#93c5fd", 0.8],
      [0, "#dbeafe", 1],
      [0.02, "#93c5fd", 0.8],
      [0.05, "transparent", 1],
    ],
  },
  dev: {
    background: "radial-gradient(ellipse at 50% 48%, #341016 0%, #170308 38%, #070102 100%)",
    ambient:
      "radial-gradient(ellipse, rgba(244,63,94,0.12) 0%, rgba(153,27,27,0.05) 50%, transparent 72%)",
    outline: "#ef4444",
    label: "#f43f5e",
    dot: "#dc2626",
    mainStops: [
      [-0.15, "transparent", 1],
      [-0.12, "#991b1b", 0],
      [-0.07, "#dc2626", 0.45],
      [-0.03, "#f43f5e", 0.75],
      [0, "#fda4af", 1],
      [0.03, "#f43f5e", 0.75],
      [0.07, "#dc2626", 0.45],
      [0.12, "#991b1b", 0],
      [0.15, "transparent", 1],
    ],
    coreStops: [
      [-0.05, "transparent", 1],
      [-0.02, "#fecdd3", 0.8],
      [0, "#fff1f2", 1],
      [0.02, "#fecdd3", 0.8],
      [0.05, "transparent", 1],
    ],
  },
};

export const T3_LOADER_BACKGROUND = HOST_AWARE_LOADER_THEME.background;

export interface T3LoaderMarkupProps {
  readonly decorative?: boolean;
  readonly label?: string;
  readonly fullScreen?: boolean;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly variant?: LoaderVariant | "host";
}

function animatedStopId(offset: number, color: string, opacity: number): string {
  return `${offset}-${color}-${opacity}`;
}

function AnimatedOffset({ from, to }: { readonly from: number; readonly to: number }) {
  return (
    <animate
      attributeName="offset"
      values={`${from};${to}`}
      dur={DURATION}
      repeatCount="indefinite"
      calcMode="spline"
      keySplines={SPLINE}
      keyTimes="0;1"
    />
  );
}

export function T3LoaderMarkup({
  decorative = false,
  label = "Loading T3 Code",
  fullScreen = true,
  id,
  className,
  style,
  variant = "host",
}: T3LoaderMarkupProps) {
  const theme = LOADER_THEME_BY_VARIANT[variant];
  const rootStyle: CSSProperties = {
    width: fullScreen ? "100vw" : "100%",
    height: fullScreen ? "100vh" : "100%",
    minHeight: fullScreen ? "100vh" : "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: theme.background,
    overflow: "hidden",
    position: "relative",
    ...style,
  };

  const accessibilityProps = decorative
    ? { "aria-hidden": true as const }
    : { role: "status" as const, "aria-label": label };

  return (
    <div id={id} className={className} style={rootStyle} {...accessibilityProps}>
      <div
        style={{
          position: "absolute",
          width: "55%",
          height: "42%",
          top: "29%",
          left: "22.5%",
          background: theme.ambient,
          filter: "blur(55px)",
          pointerEvents: "none",
          animation: "t3Ambient 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
      />

      <div
        style={{
          width: "min(58vw, 420px)",
          aspectRatio: "118 / 80",
        }}
      >
        <svg
          viewBox="4 24 120 84"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: "visible" }}
        >
          <defs>
            <filter id="t3-loader-filter-1" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="t3-loader-filter-2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="b1" />
              <feGaussianBlur stdDeviation="7" result="b2" />
              <feMerge>
                <feMergeNode in="b2" />
                <feMergeNode in="b1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="t3-loader-filter-3" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="14" result="b1" />
              <feGaussianBlur stdDeviation="28" result="b2" />
              <feMerge>
                <feMergeNode in="b2" />
                <feMergeNode in="b1" />
              </feMerge>
            </filter>

            <linearGradient
              id="t3-loader-gradient-primary"
              gradientUnits="userSpaceOnUse"
              x1={GRADIENT_START_X}
              y1={GRADIENT_START_Y}
              x2={GRADIENT_END_X}
              y2={GRADIENT_END_Y}
            >
              {theme.mainStops.map(([offset, color, opacity]) => (
                <stop
                  key={animatedStopId(offset, color, opacity)}
                  offset={offset}
                  stopColor={color}
                  stopOpacity={opacity}
                >
                  <AnimatedOffset from={offset - 0.15} to={offset - 0.15 + SHIMMER_DELTA} />
                </stop>
              ))}
            </linearGradient>

            <linearGradient
              id="t3-loader-gradient-core"
              gradientUnits="userSpaceOnUse"
              x1={GRADIENT_START_X}
              y1={GRADIENT_START_Y}
              x2={GRADIENT_END_X}
              y2={GRADIENT_END_Y}
            >
              {theme.coreStops.map(([offset, color, opacity]) => (
                <stop
                  key={animatedStopId(offset, color, opacity)}
                  offset={offset}
                  stopColor={color}
                  stopOpacity={opacity}
                >
                  <AnimatedOffset from={offset - 0.15} to={offset - 0.15 + SHIMMER_DELTA} />
                </stop>
              ))}
            </linearGradient>
          </defs>

          <path
            d={T3_PATH}
            stroke="url(#t3-loader-gradient-primary)"
            strokeWidth="14"
            fill="none"
            filter="url(#t3-loader-filter-3)"
            strokeLinejoin="round"
            opacity="0.55"
          />

          <path
            d={T3_PATH}
            stroke={theme.outline}
            strokeWidth="1.2"
            fill="none"
            opacity="0.14"
            strokeLinejoin="round"
          />

          <path
            d={T3_PATH}
            stroke="url(#t3-loader-gradient-primary)"
            strokeWidth="5"
            fill="none"
            filter="url(#t3-loader-filter-2)"
            strokeLinejoin="round"
            opacity="0.75"
          />

          <path
            d={T3_PATH}
            stroke="url(#t3-loader-gradient-primary)"
            strokeWidth="1.8"
            fill="none"
            filter="url(#t3-loader-filter-1)"
            strokeLinejoin="round"
          />

          <path
            d={T3_PATH}
            stroke="url(#t3-loader-gradient-core)"
            strokeWidth="0.7"
            fill="none"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div
        style={{
          marginTop: "2.2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.65rem",
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
        <span
          style={{
            fontSize: "clamp(0.58rem, 1.1vw, 0.72rem)",
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: theme.label,
            fontFamily: "'SF Mono','Fira Code','JetBrains Mono','Cascadia Code',monospace",
            animation: "t3Text 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        >
          Loading
        </span>
        <div style={{ display: "flex", gap: "5px" }}>
          <span
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: theme.dot,
              animation: "t3Dot 3.2s cubic-bezier(0.4, 0, 0.2, 1) 0s infinite",
            }}
          />
          <span
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: theme.dot,
              animation: "t3Dot 3.2s cubic-bezier(0.4, 0, 0.2, 1) 0.13s infinite",
            }}
          />
          <span
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: theme.dot,
              animation: "t3Dot 3.2s cubic-bezier(0.4, 0, 0.2, 1) 0.26s infinite",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes t3Ambient {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          36% { opacity: 1; transform: scale(1.06); }
          56% { opacity: 0.6; transform: scale(1.02); }
        }

        @keyframes t3Text {
          0%, 100% { opacity: 0.25; }
          36% { opacity: 0.85; }
          56% { opacity: 0.45; }
        }

        @keyframes t3Dot {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          36% { opacity: 1; transform: scale(1.4); }
          56% { opacity: 0.45; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
