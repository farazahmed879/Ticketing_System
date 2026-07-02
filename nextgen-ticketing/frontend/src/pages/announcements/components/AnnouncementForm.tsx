import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { useForm, Controller } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
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
    const isRestricted = isCustomer || isEmployee;

    const currentDate = new Date().toISOString().split("T")[0];

    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
      if (isCustomer) {
        api
          .get(API_ROUTES.PROJECTS.BASE)
          .then((res) => {
            setProjects(res.data.projects || []);
          })
          .catch((err) => console.error("Failed to fetch projects", err));
      }
    }, [isCustomer]);

    const { handleSubmit, control, reset } = useForm({
      defaultValues: {
        title: "",
        description: "",
        projectId: isCustomer ? "" : undefined,
        date: isCustomer ? currentDate : "",
        type: isCustomer
          ? AnnouncementType.REVIEW
          : isEmployee
            ? AnnouncementType.MOMENT
            : AnnouncementType.EVENT,
        shouldPopout: false,
      },
    });

    const resetToInitial = () => {
      if (initialData) {
        reset({
          title: initialData.title,
          description: initialData.description,
          projectId: initialData.projectId || (isCustomer ? "" : undefined),
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
          projectId: isCustomer ? "" : undefined,
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
        {isCustomer && (
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
            options={[
              { value: AnnouncementType.EVENT, label: "Event" },
              { value: AnnouncementType.IMPORTANT, label: "Important" },
              { value: AnnouncementType.INFO, label: "Info" },
              { value: AnnouncementType.REVIEW, label: "Review" },
              { value: AnnouncementType.MOMENT, label: "Moment" },
            ]}
            disabled={isRestricted}
          />
        </div>
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
        />
      </form>
    );
  },
);

export default AnnouncementForm;
