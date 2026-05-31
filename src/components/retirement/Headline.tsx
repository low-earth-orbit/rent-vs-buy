import { Alert, Card, Group, Stack, Text, Title } from "@mantine/core";
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
      <Group justify="space-between" align="flex-end" wrap="nowrap" gap="lg">
        <Stack gap={2}>
          <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
            Estimated retirement age
          </Text>
          <Group gap="xs" align="center">
            <IconBeach size={38} color="var(--mantine-color-teal-6)" />
            <Title order={2} fz={{ base: 40, sm: 48 }} lh={1} c="teal">
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
          <Stack gap={2} align="flex-end" visibleFrom="xs">
            <Text size="sm">Savings at retirement</Text>
            <Text fw={700} fz="xl">
              {formatCAD(result.portfolioAtRetirement)}
            </Text>
            {result.impliedWithdrawalRate != null && (
              <>
                <Text size="sm">
                  Initial withdrawal rate
                </Text>
                <Text fw={700} fz="xl">
                  {(result.impliedWithdrawalRate * 100).toFixed(1)}%
                </Text>
              </>
            )}
          </Stack>
        )}
      </Group>
    </Card>
  );
}
