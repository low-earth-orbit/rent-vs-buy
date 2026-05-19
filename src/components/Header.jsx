import {
  ActionIcon,
  Container,
  Group,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const Header = () => {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const toggle = () =>
    setColorScheme(computed === "dark" ? "light" : "dark");

  return (
    <Container size="lg" pt="xl" pb="xs">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Title order={1}>Is it better to rent or buy?</Title>
          <Text c="dimmed">
            A simple and sensible calculator for comparing renting vs owning a
            home.
          </Text>
        </Stack>
        <ActionIcon
          variant="default"
          size="lg"
          onClick={toggle}
          aria-label="Toggle color scheme"
        >
          {computed === "dark" ? <SunIcon /> : <MoonIcon />}
        </ActionIcon>
      </Group>
    </Container>
  );
};

export default Header;
