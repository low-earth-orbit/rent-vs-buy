"use client";

import Link from "next/link";
import {
  Badge,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";

type Tool = {
  emoji: string;
  title: string;
  description: string;
  href?: string;
};

const TOOLS: Tool[] = [
  {
    emoji: "🏠",
    title: "Rent vs Buy",
    description:
      "Compare the long-run net worth of renting versus owning a home, with Monte Carlo confidence bands.",
    href: "/rent-vs-buy",
  },
  {
    emoji: "🌴",
    title: "Retirement Planner",
    description:
      "Project your savings, spending, and portfolio through retirement. Coming soon.",
  },
];

function ToolCardBody({ tool }: { tool: Tool }) {
  const available = Boolean(tool.href);
  return (
    <Stack gap="xs">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text fz={32}>{tool.emoji}</Text>
        {!available && (
          <Badge variant="light" color="gray">
            Coming soon
          </Badge>
        )}
      </Group>
      <Title order={2} fz="xl">
        {tool.title}
      </Title>
      <Text c="dimmed" size="sm">
        {tool.description}
      </Text>
    </Stack>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  if (tool.href) {
    return (
      <Card
        component={Link}
        href={tool.href}
        withBorder
        padding="lg"
        radius="md"
        style={{ height: "100%", cursor: "pointer" }}
      >
        <ToolCardBody tool={tool} />
      </Card>
    );
  }

  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      style={{ height: "100%", opacity: 0.65 }}
    >
      <ToolCardBody tool={tool} />
    </Card>
  );
}

export default function HomePage() {
  return (
    <>
      <Header
        title="Personal Finance Tools"
        subtitle="Free, simple calculators to help Canadians make sense of big money decisions."
      />
      <main>
        <Container size="xl" py="xl">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.title} tool={tool} />
            ))}
          </SimpleGrid>
        </Container>
      </main>
      <Footer />
    </>
  );
}
