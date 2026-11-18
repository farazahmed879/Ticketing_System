import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Controller, type FieldValues } from "react-hook-form";
import DatePicker, { CalendarContainer } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../CustomDatePicker/CustomDatePicker.css";

import styles from "../CustomInput/CustomInput.module.css";
import CustomIcon from "../CustomIcon";
import CalendarHeader from "../CustomDatePicker/CalendarHeader";
import type { CustomDateTimePickerProps } from "../types";

type Period = "AM" | "PM";

const TIME_INTERVAL_MIN = 15;

// Minutes past the start of the period: 0 = 12:00, 15 = 12:15 … 705 = 11:45.
const PERIOD_SLOTS = Array.from(
  { length: (12 * 60) / TIME_INTERVAL_MIN },
  (_, i) => i * TIME_INTERVAL_MIN,
);

const slotLabel = (m: number) => {
  const h = Math.floor(m / 60);
  return `${h === 0 ? 12 : h}:${String(m % 60).padStart(2, "0")}`;
};

const DateTimeCustomInput = forwardRef<HTMLInputElement, any>(
  ({ className, error, ...props }, ref) => (
    <div
      className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ""} glass-card`}
      onClick={props.onClick}
    >
      <span className={styles.icon}>
        <CustomIcon name="CalendarClock" size={18} />
      </span>
      <input
        ref={ref}
        className={`${styles.input} ${className || ""}`}
        {...props}
      />
    </div>
  ),
);

DateTimeCustomInput.displayName = "DateTimeCustomInput";

// The calendar container must be a stable component (a new one each render
// would remount the popup), so the time column gets its state via context.
interface TimeColumnState {
  selected: Date | null;
  period: Period;
  setPeriod: (p: Period) => void;
  pickTime: (minutesOfDay: number) => void;
}
const TimeColumnContext = createContext<TimeColumnState | null>(null);

const TimeColumn = () => {
  const ctx = useContext(TimeColumnContext);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = ctx?.selected ?? null;
  const period = ctx?.period ?? "AM";
  const selectedMinutes = selected
    ? selected.getHours() * 60 + selected.getMinutes()
    : null;
  const offset = period === "PM" ? 12 * 60 : 0;

  // Bring the selected (or 9:00 AM / 12:00 PM) slot into view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const target =
      list.querySelector<HTMLElement>("[aria-selected='true']") ||
      list.querySelector<HTMLElement>(`[data-slot='${period === "AM" ? 9 * 60 : 0}']`);
    if (target) list.scrollTop = target.offsetTop - list.clientHeight / 2 + target.clientHeight / 2;
  }, [period]);

  if (!ctx) return null;

  return (
    <div className="dt-time-column">
      <div className="dt-time-header">
        {(["AM", "PM"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`dt-period-btn ${period === p ? "dt-period-btn--active" : ""}`}
            aria-pressed={period === p}
            onClick={() => ctx.setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <ul ref={listRef} className="dt-time-list" role="listbox" aria-label={`Time (${period})`}>
        {PERIOD_SLOTS.map((m) => {
          const minutesOfDay = offset + m;
          const isSelected = selectedMinutes === minutesOfDay;
          return (
            <li
              key={m}
              data-slot={m}
              role="option"
              aria-selected={isSelected}
              className={`dt-time-item ${isSelected ? "dt-time-item--selected" : ""}`}
              onClick={() => ctx.pickTime(minutesOfDay)}
            >
              {slotLabel(m)}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const DateTimeCalendarContainer = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => (
  <CalendarContainer className={className}>
    <div className="dt-calendar-layout">
      <div>{children}</div>
      <TimeColumn />
    </div>
  </CalendarContainer>
);

interface FieldProps {
  value: string;
  onChange?: (v: string) => void;
  error?: string;
  label?: React.ReactNode;
  required?: boolean;
  containerStyle?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  inputProps: any;
}

const DateTimeField = ({
  value,
  onChange,
  error,
  label,
  required,
  containerStyle,
  className,
  placeholder,
  inputProps,
}: FieldProps) => {
  const pickerRef = useRef<any>(null);
  const selectedDate = value ? new Date(value) : null;
  const [period, setPeriodState] = useState<Period>(
    selectedDate && selectedDate.getHours() >= 12 ? "PM" : "AM",
  );

  const emit = (date: Date | null) => {
    if (!onChange) return;
    if (!date) return onChange("");
    // Local wall time as "yyyy-MM-ddTHH:mm" (what the forms store).
    const offset = date.getTimezoneOffset();
    onChange(new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16));
  };

  const handleDayChange = (date: Date | null) => {
    if (date && !selectedDate) {
      // First pick: default to 9:00 AM / 12:00 PM of the chosen period.
      const d = new Date(date);
      d.setHours(period === "PM" ? 12 : 9, 0, 0, 0);
      return emit(d);
    }
    // Later picks keep the chosen time (react-datepicker carries it over).
    emit(date);
  };

  const setPeriod = (p: Period) => {
    setPeriodState(p);
    // Keep the same clock time, just flip AM/PM.
    if (selectedDate) {
      const h = selectedDate.getHours();
      if (p === "PM" && h < 12) emit(new Date(selectedDate.getTime() + 12 * 3600 * 1000));
      if (p === "AM" && h >= 12) emit(new Date(selectedDate.getTime() - 12 * 3600 * 1000));
    }
  };

  const pickTime = (minutesOfDay: number) => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    base.setHours(Math.floor(minutesOfDay / 60), minutesOfDay % 60, 0, 0);
    emit(base);
    pickerRef.current?.setOpen(false);
  };

  return (
    <div className={styles.container} style={containerStyle}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && typeof label === "string" && (
            <span style={{ color: "var(--accent-danger)", marginLeft: 4 }}>*</span>
          )}
        </label>
      )}
      <TimeColumnContext.Provider
        value={{ selected: selectedDate, period, setPeriod, pickTime }}
      >
        <DatePicker
          ref={pickerRef}
          selected={selectedDate}
          onChange={handleDayChange as any}
          onCalendarOpen={() =>
            setPeriodState(selectedDate && selectedDate.getHours() >= 12 ? "PM" : "AM")
          }
          shouldCloseOnSelect={false}
          dateFormat={["MMM d, yyyy h:mm aa", "yyyy-MM-dd h:mm aa", "yyyy-MM-dd HH:mm"]}
          renderCustomHeader={(h) => <CalendarHeader {...h} />}
          calendarContainer={DateTimeCalendarContainer}
          popperPlacement="bottom-start"
          isClearable
          portalId="root-portal"
          customInput={
            <DateTimeCustomInput
              error={error}
              className={className}
              placeholder={placeholder}
              {...inputProps}
            />
          }
          disabled={inputProps.disabled}
        />
      </TimeColumnContext.Provider>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

const CustomDateTimePicker = <T extends FieldValues>({
  label,
  error: manualError,
  containerStyle,
  className,
  name,
  control,
  rules,
  value: manualValue,
  onChange: manualOnChange,
  placeholder,
  ...props
}: CustomDateTimePickerProps<T>) => {
  const common = {
    label,
    required: Boolean(props.required || rules?.required),
    containerStyle,
    className,
    placeholder,
    inputProps: props,
  };

  if (control && name) {
    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <DateTimeField
            {...common}
            value={manualValue || field.value || ""}
            onChange={manualOnChange || field.onChange}
            error={manualError || error?.message}
          />
        )}
      />
    );
  }

  return (
    <DateTimeField
      {...common}
      value={manualValue || ""}
      onChange={manualOnChange}
      error={manualError}
    />
  );
};

export default CustomDateTimePicker;
