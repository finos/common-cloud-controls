import React from "react";
import { Badge } from "../../ui/badge";

interface MappingCountBadgeProps {
  count: number;
  label?: string;
}

export function MappingCountBadge({ count, label }: MappingCountBadgeProps) {
  const getBadgeVariant = (count: number) => {
    if (count === 0) {
      return "bg-red-100 text-red-800 border-red-300";
    } else if (count === 1) {
      return "bg-orange-100 text-orange-800 border-orange-300";
    } else {
      return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  return (
    <Badge variant="outline" className={`font-medium border ${getBadgeVariant(count)}`}>
      {label ? `${label}: ${count}` : count}
    </Badge>
  );
}
