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
          Even working to age {input.planningAge - 1}, your plan doesn&apos;t
          reach your {input.targetSuccessRate}% confidence target of lasting to
          age {input.planningAge}. Try a lower target income, a higher savings
          rate, more guaranteed income, or a lower confidence target.
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
          {!retireNow && result.retirementAgeRange && (
            <Text size="xs" c="dimmed" mt={4}>
              Depending on market luck, about a 50% chance you retire between
              age {result.retirementAgeRange.p25} and{" "}
              {result.retirementAgeRange.p75}.
            </Text>
          )}
        </Stack>
        {result.portfolioAtRetirement != null && (
          <SimpleGrid
            cols={{ base: 2, sm: 1 }}
            spacing="sm"
            m="auto"
            w={{ base: "100%", sm: "auto" }}
          >
            <StatTile
              label="Savings at retirement"
              value={formatCAD(result.portfolioAtRetirement)}
            />
            {result.guaranteedIncome > 0 && (
              <StatTile
                label="Pension income"
                value={`${formatCAD(result.guaranteedIncome)} /yr`}
                note={`from age ${input.pensionStartAge}`}
              />
            )}
          </SimpleGrid>
        )}
      </Flex>
    </Card>
  );
}
