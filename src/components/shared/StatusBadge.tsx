import { Badge } from "@mantine/core";

export type AppStatus = "coming-soon" | "preview" | "new" | "updated";

const STATUS_STYLES: Record<
  AppStatus,
  { label: string; color: string; variant: "filled" | "light" }
> = {
  "coming-soon": {
    label: "Coming soon",
    color: "gray",
    variant: "light",
  },
  preview: {
    label: "Preview",
    color: "orange",
    variant: "light",
  },
  new: {
    label: "New",
    color: "teal",
    variant: "filled",
  },
  updated: {
    label: "Updated",
    color: "blue",
    variant: "light",
  },
};

export default function StatusBadge({ status }: { status: AppStatus }) {
  const { label, color, variant } = STATUS_STYLES[status];

  return (
    <Badge color={color} variant={variant}>
      {label}
    </Badge>
  );
}
