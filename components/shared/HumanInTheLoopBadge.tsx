"use client";

import React from "react";
import { Badge, Tooltip } from "@mantine/core";
import { IconUserCheck } from "@tabler/icons-react";

interface HumanInTheLoopBadgeProps {
  /** Optional custom label text. Defaults to "Human decision required" */
  label?: string;
  /** Optional tooltip text for additional context */
  tooltip?: string;
  /** Badge size variant */
  size?: "xs" | "sm" | "md" | "lg";
}

/**
 * Badge indicator showing that AI outputs require human approval.
 * Used consistently across QC, slotting, and summary surfaces
 * to signal enterprise-grade human-in-the-loop governance.
 */
export const HumanInTheLoopBadge: React.FC<HumanInTheLoopBadgeProps> = ({
  label = "Human decision required",
  tooltip = "This AI output requires human review and approval before any action is taken.",
  size = "sm",
}) => {
  const badge = (
    <Badge
      variant="light"
      color="orange"
      size={size}
      leftSection={<IconUserCheck size={14} />}
      aria-label={label}
      role="status"
      styles={{
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      }}
    >
      {label}
    </Badge>
  );

  if (tooltip) {
    return (
      <Tooltip label={tooltip} multiline maw={250} withArrow>
        {badge}
      </Tooltip>
    );
  }

  return badge;
};

export default HumanInTheLoopBadge;
