import { useEffect, useState } from "react";

/** Phone breakpoint, matching the `max-width: 768px` media queries in CSS. */
export const MOBILE_QUERY = "(max-width: 768px)";

/** True while the viewport is phone-sized; updates on resize/rotation. */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
};

export default useIsMobile;
