import { Flex, Text, View } from "@adobe/react-spectrum";

export default function CameraSettingsSection({
  label,
  children,
  accent = false,
  headerAction,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
  headerAction?: React.ReactNode;
}) {
  return (
    <View
      paddingX={10}
      paddingY={8}
      UNSAFE_style={{
        background: accent
          ? "rgba(72, 201, 255, 0.055)"
          : "rgba(255, 255, 255, 0.028)",
        boxShadow: `inset 0 0 0 1px ${
          accent
            ? "rgba(72, 201, 255, 0.16)"
            : "rgba(255, 255, 255, 0.065)"
        }`,
        borderRadius: 9,
      }}
    >
      <Flex direction="column" gap="size-100">
        <Flex justifyContent="space-between" alignItems="center">
          <Text
            UNSAFE_style={{
              color: accent
                ? "rgba(150, 225, 255, 0.94)"
                : "rgba(255, 255, 255, 0.62)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </Text>
          {headerAction}
        </Flex>
        {children}
      </Flex>
    </View>
  );
}
