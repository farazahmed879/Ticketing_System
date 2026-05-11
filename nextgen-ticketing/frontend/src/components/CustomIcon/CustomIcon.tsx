import React from "react";
import * as Icons from "lucide-react";

/**
 * CustomIcon Component
 * Centralizes lucide-react icons to avoid multiple imports across the app.
 */

import type { IconName, CustomIconProps } from "../types";

const CustomIcon: React.FC<CustomIconProps> = ({ name, ...props }) => {
  const IconComponent = (Icons as any)[name] as React.FC<Icons.LucideProps>;

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  return <IconComponent {...props} />;
};

export default CustomIcon;
