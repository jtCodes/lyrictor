import { ProgressCircle } from "@adobe/react-spectrum";
import { motion } from "framer-motion";

export default function ImmersiveLoadingIndicator({
  title,
  message = "Loading...",
  overlay = true,
}: {
  title?: string;
  message?: string;
  overlay?: boolean;
}) {
  const containerStyle = overlay
    ? {
        position: "absolute" as const,
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse 150% 120% at center, rgba(255, 248, 240, 0.008) 0%, rgba(8, 8, 10, 0.018) 26%, rgba(8, 8, 10, 0.038) 52%, rgba(8, 8, 10, 0.065) 74%, rgba(8, 8, 10, 0.095) 100%)",
        pointerEvents: "none" as const,
        zIndex: 3,
      }
    : {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      };

  return (
    <motion.div
      key={`${message}:${overlay ? "overlay" : "inline"}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.08, ease: "easeOut" }}
      style={containerStyle}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          height: "100%",
          padding: overlay ? "28px 36px" : "22px 28px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(10, 10, 12, 0.08) 0%, rgba(10, 10, 12, 0.03) 18%, rgba(10, 10, 12, 0.015) 34%, rgba(10, 10, 12, 0.015) 66%, rgba(10, 10, 12, 0.03) 82%, rgba(10, 10, 12, 0.08) 100%), radial-gradient(ellipse 135% 110% at center, rgba(255, 247, 236, 0.02) 0%, rgba(16, 16, 18, 0.028) 24%, rgba(16, 16, 18, 0.018) 46%, rgba(16, 16, 18, 0.008) 68%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, rgba(0,0,0,0.82) 0%, black 16%, black 84%, rgba(0,0,0,0.82) 100%)",
            maskImage:
              "linear-gradient(180deg, rgba(0,0,0,0.82) 0%, black 16%, black 84%, rgba(0,0,0,0.82) 100%)",
          }}
        />
        <ProgressCircle
          aria-label={message}
          isIndeterminate
          size="S"
          staticColor="white"
        />
      </motion.div>
    </motion.div>
  );
}