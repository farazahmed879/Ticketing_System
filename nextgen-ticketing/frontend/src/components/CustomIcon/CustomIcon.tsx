import React from "react";
import * as Icons from "lucide-react";

/**
 * CustomIcon Component
 * Centralizes lucide-react icons to avoid multiple imports across the app.
 */

export type IconName = keyof typeof Icons;

interface CustomIconProps extends Omit<Icons.LucideProps, "ref"> {
  name: IconName | string;
}

const CustomIcon: React.FC<CustomIconProps> = ({ name, ...props }) => {
  const IconComponent = (Icons as any)[name] as React.FC<Icons.LucideProps>;

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  return <IconComponent {...props} />;
};

export default CustomIcon;
