import {
  Alert,
  Card,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertTriangle, IconBeach } from "@tabler/icons-react";
import { formatCAD } from "@/utils/format";
import type {
  RetirementInput,
  RetirementResult,
} from "@/utils/retirement/types";

interface HeadlineProps {
  input: RetirementInput;
  result: RetirementResult;
}

function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600} fz="lg" lh={1.2}>
        {value}
      </Text>
      {note && (
        <Text size="xs" c="dimmed">
          {note}
        </Text>
      )}
    </Stack>
  );
}

export default function Headline({ input, result }: HeadlineProps) {
  if (result.earliestRetirementAge === null) {
    return (
      <Alert
        variant="light"
        color="red"
        icon={<IconAlertTriangle />}
        title="Your plan does not reach the target yet"
      >
        <Text size="sm">
          Even working to age {input.planningAge - 1}, your projected portfolio
          does not both fund your income target and last to age{" "}
          {input.planningAge}. Try a lower target income, a higher savings rate,
          more guaranteed income, or a higher withdrawal-rate guardrail.
        </Text>
      </Alert>
    );
  }

  const { earliestRetirementAge, yearsUntilRetirement } = result;
  const retireNow = yearsUntilRetirement === 0;

  return (
    <Card withBorder radius="md" padding="lg">
      <Flex
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "stretch", sm: "flex-end" }}
        gap="lg"
      >
        <Stack gap={2} my="auto">
          <Text size="sm" fw={600}>
            Estimated retirement age
          </Text>
          <Group gap="xs" align="center">
            <IconBeach size={38} color="var(--mantine-color-teal-6)" />
            <Title order={2} fz={{ base: 40, sm: 48 }} lh={1.5} c="teal">
              {retireNow ? "Now" : `Age ${earliestRetirementAge}`}
            </Title>
          </Group>
          <Text size="sm" c="dimmed">
            {retireNow
              ? "Your savings already support your target income"
              : `${yearsUntilRetirement} ${
                  yearsUntilRetirement === 1 ? "year" : "years"
                } from now`}
            , with the portfolio projected to last to age {input.planningAge}.
          </Text>
        </Stack>
        {result.portfolioAtRetirement != null && (
          <SimpleGrid
            cols={1}
            spacing="lg"
            w={{ base: "100%", sm: "auto" }}
            style={{ flexShrink: 0 }}
          >
            <StatTile
              label="Savings at retirement"
              value={formatCAD(result.portfolioAtRetirement)}
            />
            {result.pensionValue != null && (
              <StatTile
                label="Future pension value"
                value={formatCAD(result.pensionValue)}
              />
            )}
            {result.impliedWithdrawalRateFromPortfolio != null && (
              <StatTile
                label="Initial withdrawal from savings"
                value={`${(result.impliedWithdrawalRateFromPortfolio * 100).toFixed(1)}%`}
              />
            )}
          </SimpleGrid>
        )}
      </Flex>
    </Card>
  );
}
