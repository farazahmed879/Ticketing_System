import { useEffect, useImperativeHandle, forwardRef } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
import { useAuth } from "../../../context/AuthContext";
import { RoleName, AnnouncementType } from "../../../utils/constants";

interface AnnouncementFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
}

const AnnouncementForm = forwardRef<any, AnnouncementFormProps>(
  ({ initialData, onSubmit }, ref) => {
    const { user } = useAuth();
    const isCustomer = user?.role?.name === RoleName.CUSTOMER;
    const isEmployee = user?.role?.name === RoleName.EMPLOYEE;
    const isRestricted = isCustomer || isEmployee;

    const { handleSubmit, control, reset } = useForm({
      defaultValues: {
        title: "",
        description: "",
        date: "",
        type: isCustomer
          ? AnnouncementType.REVIEW
          : isEmployee
            ? AnnouncementType.MOMENT
            : AnnouncementType.EVENT,
      },
    });

    const resetToInitial = () => {
      if (initialData) {
        reset({
          title: initialData.title,
          description: initialData.description,
          date: initialData.date
            ? new Date(initialData.date).toISOString().split("T")[0]
            : "",
          type: isCustomer
            ? AnnouncementType.REVIEW
            : isEmployee
              ? AnnouncementType.MOMENT
              : initialData.type,
        });
      } else {
        reset({
          title: "",
          description: "",
          date: "",
          type: isCustomer
            ? AnnouncementType.REVIEW
            : isEmployee
              ? AnnouncementType.MOMENT
              : AnnouncementType.EVENT,
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
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
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
      </form>
    );
  },
);

export default AnnouncementForm;
