import type { ReactDatePickerCustomHeaderProps } from "react-datepicker";
import CustomIcon from "../CustomIcon";

/**
 * Month header shared by CustomDatePicker and CustomDateTimePicker:
 * "November 2026" with chevron buttons, plus a "Today" shortcut.
 */
const CalendarHeader = ({
  date,
  decreaseMonth,
  increaseMonth,
  changeMonth,
  changeYear,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: ReactDatePickerCustomHeaderProps) => {
  const today = new Date();
  const onCurrentMonth =
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return (
    <div className="cdp-header">
      <button
        type="button"
        className="cdp-nav"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        aria-label="Previous month"
      >
        <CustomIcon name="ChevronLeft" size={18} />
      </button>

      <div className="cdp-title">
        <span className="cdp-month">
          {date.toLocaleString("en-US", { month: "long" })}
        </span>
        <span className="cdp-year">{date.getFullYear()}</span>
      </div>

      {!onCurrentMonth && (
        <button
          type="button"
          className="cdp-today"
          onClick={() => {
            changeYear(today.getFullYear());
            changeMonth(today.getMonth());
          }}
        >
          Today
        </button>
      )}

      <button
        type="button"
        className="cdp-nav"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        aria-label="Next month"
      >
        <CustomIcon name="ChevronRight" size={18} />
      </button>
    </div>
  );
};

export default CalendarHeader;
