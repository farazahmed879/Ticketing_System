import React from "react";
import CustomInput from "../../../components/CustomInput";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import CustomSelect from "../../../components/CustomSelect";
import CustomDatePicker from "../../../components/CustomDatePicker";
import styles from "../InterviewList.module.css";

import type { InterviewListFilterProps } from "./interfaces";

export const InterviewListFilter: React.FC<InterviewListFilterProps> = ({
  search,
  setSearch,
  showMoreFilters,
  activeMoreFilters,
  draftSelectedCount,
  toggleMoreFilters,
  filters,
  draftActiveFilter,
  setDraftActiveFilter,
  draftStartDate,
  setDraftStartDate,
  draftEndDate,
  setDraftEndDate,
  clearMoreFilters,
  applyMoreFilters,
  viewMode,
  setViewMode,
}) => {
  const [searchInput, setSearchInput] = React.useState(search);

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  return (
    <div className={styles.filterBar}>
      <div className={styles.filters}>
        <div
          className={styles.search}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            flex: "none",
          }}
        >
          <CustomInput
            placeholder="Search interviews..."
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              setSearchInput(val);
              if (val === "") {
                setSearch("");
              }
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
              }
            }}
            icon={<CustomIcon name="Search" size={18} />}
            containerStyle={{ width: "350px", paddingLeft: "0px" }}
          />
        </div>
        <div className={styles.filterAnchor}>
          <CustomButton
            variant={
              showMoreFilters || activeMoreFilters > 0 ? "primary" : "secondary"
            }
            onClick={toggleMoreFilters}
            icon={<CustomIcon name="SlidersHorizontal" size={18} />}
          >
            Filters
            {activeMoreFilters > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  background: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  borderRadius: 999,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  minWidth: 18,
                  textAlign: "center",
                  padding: "1px 6px",
                }}
              >
                {activeMoreFilters}
              </span>
            )}
            <CustomIcon
              name={showMoreFilters ? "ChevronUp" : "ChevronDown"}
              size={16}
              style={{ marginLeft: 6 }}
            />
          </CustomButton>

          {showMoreFilters && (
            <div className={styles.advancedPanel}>
              <div className={styles.filterField}>
                <span className={styles.filterLabel}>
                  <CustomIcon name="CircleDot" size={12} /> Filter by
                </span>
                <CustomSelect
                  value={draftActiveFilter}
                  onChange={(val) => setDraftActiveFilter(val)}
                  options={filters}
                  style={{ width: "100%" }}
                />
              </div>

              <div className={styles.filterField}>
                <span className={styles.filterLabel}>
                  <CustomIcon name="Calendar" size={12} /> Date Range
                </span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <CustomDatePicker
                    value={draftStartDate}
                    onChange={(val: string) => setDraftStartDate(val)}
                    placeholder="Start Date"
                    containerStyle={{ flex: 1 }}
                  />
                  <CustomDatePicker
                    value={draftEndDate}
                    onChange={(val: string) => setDraftEndDate(val)}
                    placeholder="End Date"
                    containerStyle={{ flex: 1 }}
                  />
                </div>
              </div>

              <div className={styles.filterActions}>
                {(draftSelectedCount > 0 || activeMoreFilters > 0) && (
                  <CustomButton
                    variant="ghost"
                    onClick={clearMoreFilters}
                    icon={<CustomIcon name="X" size={16} />}
                  >
                    Clear all
                  </CustomButton>
                )}
                <CustomButton
                  variant="gradient"
                  onClick={applyMoreFilters}
                  icon={<CustomIcon name="Check" size={16} />}
                >
                  Apply Filters
                </CustomButton>
              </div>
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            borderRadius: 10,
            border: "1px solid var(--border-glass)",
            background: "rgba(255,255,255,0.03)",
            marginLeft: "auto",
          }}
        >
          <CustomButton
            variant={viewMode === "list" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            icon={<CustomIcon name="List" size={16} />}
            title="List view"
            style={{ padding: "6px 10px" }}
          />
          <CustomButton
            variant={viewMode === "grid" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            icon={<CustomIcon name="LayoutGrid" size={16} />}
            title="Grid view"
            style={{ padding: "6px 10px" }}
          />
        </div>
      </div>
    </div>
  );
};
