import { Flex, ProgressCircle, Text } from "@adobe/react-spectrum";
import { motion } from "framer-motion";

export default function ImmersiveLoadingIndicator({
  title = "Preparing Preview",
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
          "radial-gradient(circle at center, rgba(255, 241, 225, 0.06) 0%, rgba(10, 10, 12, 0.16) 26%, rgba(5, 5, 7, 0.3) 58%, rgba(5, 5, 7, 0.46) 100%)",
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
      key={`${title}:${message}:${overlay ? "overlay" : "inline"}`}
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
          alignItems: "stretch",
          gap: 10,
          minWidth: 220,
          maxWidth: 320,
          padding: overlay ? "16px 18px" : "14px 16px",
          background: "rgba(10, 10, 12, 0.22)",
          boxShadow:
            "inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -12px 40px rgba(0, 0, 0, 0.18)",
          backdropFilter: "blur(8px) saturate(1.12)",
          WebkitBackdropFilter: "blur(8px) saturate(1.12)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.92) 12%, black 24%, black 76%, rgba(0,0,0,0.92) 88%, transparent 100%)",
          maskImage:
            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.92) 12%, black 24%, black 76%, rgba(0,0,0,0.92) 88%, transparent 100%)",
        }}
      >
        <Text
          UNSAFE_style={{
            color: "rgba(255, 255, 255, 0.42)",
            fontSize: 10,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          Preview
        </Text>
        <Flex direction="row" alignItems="center" gap="size-150">
          <div
            style={{
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background:
                "radial-gradient(circle at center, rgba(255, 245, 232, 0.14) 0%, rgba(255, 255, 255, 0.03) 58%, transparent 100%)",
              borderRadius: 999,
            }}
          >
            <ProgressCircle
              aria-label={message}
              isIndeterminate
              size="S"
              staticColor="white"
            />
          </div>
          <Flex direction="column" alignItems="start" gap="size-25" flex>
          <Text
            UNSAFE_style={{
              color: "rgba(255, 255, 255, 0.94)",
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.15,
              textAlign: "left",
            }}
          >
            {title}
          </Text>
          <Text
            UNSAFE_style={{
              color: "rgba(255, 255, 255, 0.62)",
              fontSize: 12,
              textAlign: "left",
              lineHeight: 1.4,
            }}
          >
            {message}
          </Text>
          </Flex>
        </Flex>
      </motion.div>
    </motion.div>
  );
}