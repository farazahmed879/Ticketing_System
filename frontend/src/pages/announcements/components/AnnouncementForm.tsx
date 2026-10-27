import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
import CustomIcon from "../../../components/CustomIcon";
import { useAuth } from "../../../context/AuthContext";
import { AnnouncementType } from "../../../utils/constants";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { ROLE_TYPE } from "../../roles/roleConstants";

interface AnnouncementFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
}

const AnnouncementForm = forwardRef<any, AnnouncementFormProps>(
  ({ initialData, onSubmit }, ref) => {
    const { user } = useAuth();
    const isCustomer = user?.role?.roleType === ROLE_TYPE.CUSTOMER;
    const isEmployee = user?.role?.roleType === ROLE_TYPE.EMPLOYEE;
    const isAdminOrManager =
      user?.role?.roleType === ROLE_TYPE.ADMIN ||
      user?.role?.roleType === ROLE_TYPE.AGENT;
    const canSelectProject = isAdminOrManager || isCustomer;
    const isRestricted = isCustomer || isEmployee;

    const typeOptions = isCustomer
      ? [{ value: AnnouncementType.REVIEW, label: "Review" }]
      : [
          { value: AnnouncementType.EVENT, label: "Event" },
          { value: AnnouncementType.IMPORTANT, label: "Important" },
          { value: AnnouncementType.INFO, label: "Info" },
          { value: AnnouncementType.MOMENT, label: "Moment" },
        ];

    const currentDate = new Date().toISOString().split("T")[0];

    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
      if (canSelectProject) {
        api
          .get(API_ROUTES.PROJECTS.BASE)
          .then((res) => {
            setProjects(res.data.projects || []);
          })
          .catch((err) => console.error("Failed to fetch projects", err));
      }
    }, [canSelectProject]);

    const { handleSubmit, control, reset } = useForm({
      defaultValues: {
        title: "",
        description: "",
        projectId: canSelectProject ? "" : undefined,
        isProjectTeamOnly: false,
        date: isCustomer ? currentDate : "",
        type: isCustomer
          ? AnnouncementType.REVIEW
          : isEmployee
            ? AnnouncementType.MOMENT
            : AnnouncementType.EVENT,
        shouldPopout: false,
      },
    });

    const selectedProjectId = useWatch({ control, name: "projectId" });
    const isProjectTeamOnly = useWatch({ control, name: "isProjectTeamOnly" });

    const resetToInitial = () => {
      if (initialData) {
        reset({
          title: initialData.title,
          description: initialData.description,
          projectId:
            initialData.projectId ||
            initialData.project?.id ||
            (canSelectProject ? "" : undefined),
          isProjectTeamOnly: !!initialData.isProjectTeamOnly,
          date: initialData.date
            ? new Date(initialData.date).toISOString().split("T")[0]
            : isCustomer
              ? currentDate
              : "",
          type: isCustomer
            ? AnnouncementType.REVIEW
            : isEmployee
              ? AnnouncementType.MOMENT
              : initialData.type,
          shouldPopout: !!initialData.shouldPopout,
        });
      } else {
        reset({
          title: "",
          description: "",
          projectId: canSelectProject ? "" : undefined,
          isProjectTeamOnly: false,
          date: isCustomer ? currentDate : "",
          type: isCustomer
            ? AnnouncementType.REVIEW
            : isEmployee
              ? AnnouncementType.MOMENT
              : AnnouncementType.EVENT,
          shouldPopout: false,
        });
      }
    };

    useImperativeHandle(ref, () => ({
      reset: resetToInitial,
    }));

    useEffect(() => {
      resetToInitial();
    }, [initialData, reset]);

    return (
      <form
        id="announcement-form"
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <CustomInput
          name="title"
          control={control}
          rules={{ required: "Title is required" }}
          label="Title"
          placeholder="Title"
        />
        <CustomTextArea
          name="description"
          control={control}
          rules={{ required: "Description is required" }}
          label="Description"
          placeholder="Detailed description"
          rows={4}
        />
        {canSelectProject && (
          <CustomSelect
            name="projectId"
            control={control}
            label="Project (Optional)"
            options={[
              { value: "", label: "Select a project..." },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        )}

        {isAdminOrManager && selectedProjectId && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px 14px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "10px",
              border: "1px solid var(--border-glass)",
            }}
          >
            <label
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CustomIcon name="Eye" size={15} />
              Audience Visibility
            </label>

            <Controller
              name="isProjectTeamOnly"
              control={control}
              render={({ field }) => (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    background: "rgba(0, 0, 0, 0.15)",
                    padding: 4,
                    borderRadius: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => field.onChange(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: !field.value
                        ? "var(--accent-primary)"
                        : "transparent",
                      color: !field.value
                        ? "#fff"
                        : "var(--text-secondary)",
                      boxShadow: !field.value
                        ? "0 2px 8px rgba(var(--primary-rgb, 99, 102, 241), 0.3)"
                        : "none",
                    }}
                  >
                    <CustomIcon name="Globe" size={15} />
                    Visible to All Teams
                  </button>

                  <button
                    type="button"
                    onClick={() => field.onChange(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: field.value
                        ? "var(--accent-primary)"
                        : "transparent",
                      color: field.value
                        ? "#fff"
                        : "var(--text-secondary)",
                      boxShadow: field.value
                        ? "0 2px 8px rgba(var(--primary-rgb, 99, 102, 241), 0.3)"
                        : "none",
                    }}
                  >
                    <CustomIcon name="Users" size={15} />
                    Project Team Only
                  </button>
                </div>
              )}
            />

            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
              {isProjectTeamOnly
                ? "🔒 Only team members assigned to this project can view this shoutout."
                : "🌐 Visible to all company members on the dashboard and announcements."}
            </span>
          </div>
        )}
        <div
          style={{
            display: isCustomer ? "none" : "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <CustomInput
            name="date"
            control={control}
            rules={{ required: "Date is required" }}
            label="Scheduled Date"
            type="date"
            min={new Date().toISOString().split("T")[0]}
          />
          <CustomSelect
            name="type"
            control={control}
            label="Type"
            options={typeOptions}
            disabled={isRestricted}
          />
        </div>
        {
          !isCustomer ?
            <Controller
              name="shouldPopout"
              control={control}
              render={({ field }) => (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "4px 0",
                  }}
                >
                  <input
                    id="shouldPopout"
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: "var(--accent-primary)",
                      cursor: "pointer",
                    }}
                  />

                  <label
                    htmlFor="shouldPopout"
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    Popout/Celebrate automatically on Dashboard
                  </label>
                </div>
              )}
            /> : ''
        }
      </form>
    );
  },
);

export default AnnouncementForm;
