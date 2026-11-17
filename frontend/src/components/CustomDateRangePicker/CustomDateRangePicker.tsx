import { forwardRef } from "react";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../CustomDatePicker/CustomDatePicker.css";

import styles from "../CustomInput/CustomInput.module.css";
import CustomIcon from "../CustomIcon";
import CalendarHeader from "../CustomDatePicker/CalendarHeader";

/** Parse "YYYY-MM-DD" as a local date (new Date("YYYY-MM-DD") is UTC and can shift a day). */
const parseLocalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const toIsoDay = (date: Date | null) => {
  if (!date) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .split("T")[0];
};

interface RangeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const RangeInput = forwardRef<HTMLInputElement, RangeInputProps>(
  ({ className, error, ...props }, ref) => (
    <div
      className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
      onClick={props.onClick as React.MouseEventHandler<HTMLDivElement>}
    >
      <span className={styles.icon}>
        <CustomIcon name="CalendarRange" size={18} />
      </span>
      <input
        ref={ref}
        className={`${styles.input} ${className || ""}`}
        {...props}
      />
    </div>
  ),
);
RangeInput.displayName = "RangeInput";

interface BaseProps {
  label?: React.ReactNode;
  required?: boolean;
  placeholder?: string;
  /** Earliest selectable day, "YYYY-MM-DD". */
  min?: string;
  disabled?: boolean;
  containerStyle?: React.CSSProperties;
}

interface ViewProps extends BaseProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  error?: string;
}

/** The picker UI: one calendar, first click = start, second click = end. */
const RangeView = ({
  label,
  required,
  placeholder = "Select date range",
  min,
  disabled,
  containerStyle,
  start,
  end,
  onChange,
  error,
}: ViewProps) => (
  <div className={styles.container} style={containerStyle}>
    {label && (
      <label className={styles.label}>
        {label}
        {required && typeof label === "string" && (
          <span style={{ color: "var(--accent-danger)", marginLeft: 4 }}>*</span>
        )}
      </label>
    )}
    <DatePicker
      selectsRange
      startDate={parseLocalDate(start)}
      endDate={parseLocalDate(end)}
      onChange={(dates: [Date | null, Date | null]) => {
        const [s, e] = dates;
        onChange(toIsoDay(s), toIsoDay(e));
      }}
      customInput={<RangeInput error={error} placeholder={placeholder} />}
      // "Nov 20, 2026 - Nov 22, 2026"
      dateFormat="MMM d, yyyy"
      renderCustomHeader={(h) => <CalendarHeader {...h} />}
      minDate={parseLocalDate(min) || undefined}
      isClearable={!disabled}
      disabled={disabled}
      portalId="root-portal"
      popperPlacement="bottom-start"
    />
    {error && <span className={styles.errorText}>{error}</span>}
  </div>
);

interface ControlledProps<T extends FieldValues> extends BaseProps {
  control: Control<T>;
  startName: Path<T>;
  endName: Path<T>;
  /** Validation for the start date (e.g. { required: "..." }). */
  rules?: RegisterOptions<T, Path<T>>;
}

const ControlledRange = <T extends FieldValues>({
  control,
  startName,
  endName,
  rules,
  ...rest
}: ControlledProps<T>) => {
  const { field: startField, fieldState } = useController({
    control,
    name: startName,
    rules,
  });
  const { field: endField } = useController({ control, name: endName });
  return (
    <RangeView
      {...rest}
      required={rest.required || Boolean(rules?.required)}
      start={startField.value || ""}
      end={endField.value || ""}
      onChange={(s, e) => {
        startField.onChange(s);
        endField.onChange(e);
      }}
      error={fieldState.error?.message}
    />
  );
};

export type CustomDateRangePickerProps<T extends FieldValues> =
  | (ControlledProps<T> & { start?: never; end?: never; onChange?: never })
  | (ViewProps & { control?: never });

/**
 * Single-calendar date range picker. Values are "YYYY-MM-DD" strings.
 * - With react-hook-form: pass `control`, `startName`, `endName`.
 * - Otherwise: pass `start`, `end`, `onChange(start, end)`.
 * While only the first day is picked, `end` is "".
 */
const CustomDateRangePicker = <T extends FieldValues>(
  props: CustomDateRangePickerProps<T>,
) =>
  props.control ? (
    <ControlledRange {...(props as ControlledProps<T>)} />
  ) : (
    <RangeView {...(props as ViewProps)} />
  );

export default CustomDateRangePicker;
