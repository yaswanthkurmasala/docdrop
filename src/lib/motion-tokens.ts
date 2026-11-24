export const motionTokens = {
  duration: {
    instant: 0.05,
    fast: 0.15,
    standard: 0.25,
    slow: 0.4,
  },
  ease: {
    standard: [0.2, 0, 0, 1] as const,
    enter: [0, 0, 0.2, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
  },
  spring: {
    snappy: { type: "spring" as const, stiffness: 600, damping: 30 },
    gentle: { type: "spring" as const, stiffness: 300, damping: 25 },
    bouncy: { type: "spring" as const, stiffness: 400, damping: 15 },
  },
} as const;
