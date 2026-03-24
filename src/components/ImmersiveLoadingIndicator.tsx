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
          "radial-gradient(circle at center, rgba(255, 214, 196, 0.07) 0%, rgba(12, 10, 10, 0.2) 24%, rgba(5, 5, 7, 0.34) 62%, rgba(5, 5, 7, 0.52) 100%)",
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
          alignItems: "center",
          gap: 12,
          minWidth: 184,
          padding: "18px 20px",
          borderRadius: 16,
          background: "rgba(0, 0, 0, 0.48)",
          boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.07)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <ProgressCircle
          aria-label={message}
          isIndeterminate
          size="M"
          staticColor="white"
        />
        <Flex direction="column" alignItems="center" gap="size-50">
          <Text
            UNSAFE_style={{
              color: "rgba(255, 255, 255, 0.96)",
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Text>
          <Text
            UNSAFE_style={{
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: 12,
              textAlign: "center",
              lineHeight: 1.45,
              maxWidth: 240,
            }}
          >
            {message}
          </Text>
        </Flex>
      </motion.div>
    </motion.div>
  );
}