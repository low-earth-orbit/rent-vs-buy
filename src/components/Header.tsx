import {
  ActionIcon,
  Box,
  Container,
  Group,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";

const Header = () => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const toggle = () =>
    setColorScheme(colorScheme === "dark" ? "light" : "dark");

  return (
    <Container component="header" size="xl" pt="xl" pb="xs">
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
          <Box component="span" darkHidden>
            <IconMoon size={18} />
          </Box>
          <Box component="span" lightHidden>
            <IconSun size={18} />
          </Box>
        </ActionIcon>
      </Group>
    </Container>
  );
};

export default Header;
