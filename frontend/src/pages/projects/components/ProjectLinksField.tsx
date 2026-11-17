import React from "react";
import { useFieldArray, type Control } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomIcon from "../../../components/CustomIcon";
import type { ProjectFormData } from "../../../types";
import styles from "./ProjectForm.module.css";

const HTTP_URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
// SSH clone URLs such as git@github.com:org/repo.git
const SSH_GIT_RE = /^[\w.-]+@[\w.-]+:[\w./~-]+$/;

interface ProjectLinksFieldProps {
  control: Control<ProjectFormData>;
  name: "gitRepos" | "siteUrls";
  addText: string;
  labelPlaceholder: string;
  urlPlaceholder: string;
  icon: string;
}

/** Editable list of { label, url } rows - any number of repos / site URLs. */
const ProjectLinksField: React.FC<ProjectLinksFieldProps> = ({
  control,
  name,
  addText,
  labelPlaceholder,
  urlPlaceholder,
  icon,
}) => {
  const { fields, append, remove } = useFieldArray({ control, name });
  const isRepo = name === "gitRepos";

  return (
    <div className={styles.links}>
      {fields.map((field, index) => (
        <div key={field.id} className={styles.linkRow}>
          <CustomInput
            name={`${name}.${index}.label`}
            control={control}
            placeholder={labelPlaceholder}
            maxLength={60}
            containerStyle={{ flex: "0 0 32%", minWidth: 0 }}
          />
          <CustomInput
            name={`${name}.${index}.url`}
            control={control}
            placeholder={urlPlaceholder}
            icon={<CustomIcon name={icon} size={15} />}
            containerStyle={{ flex: 1, minWidth: 0 }}
            rules={{
              validate: (value) => {
                const v = String(value || "").trim();
                if (!v) return true; // empty rows are dropped on save
                if (HTTP_URL_RE.test(v)) return true;
                if (isRepo && SSH_GIT_RE.test(v)) return true;
                return isRepo
                  ? "Enter an https:// link or git@host:org/repo.git"
                  : "Enter a full link starting with https://";
              },
            }}
          />
          <button
            type="button"
            className={styles.linkRemove}
            onClick={() => remove(index)}
            title="Remove"
            aria-label="Remove link"
          >
            <CustomIcon name="Trash2" size={15} />
          </button>
        </div>
      ))}

      <button
        type="button"
        className={styles.linkAdd}
        onClick={() => append({ label: "", url: "" })}
      >
        <CustomIcon name="Plus" size={14} />
        {addText}
      </button>
    </div>
  );
};

export default ProjectLinksField;
