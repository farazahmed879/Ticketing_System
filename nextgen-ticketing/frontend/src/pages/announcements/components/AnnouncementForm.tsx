import { useEffect, useImperativeHandle, forwardRef } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";

interface AnnouncementFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
}

const AnnouncementForm = forwardRef<any, AnnouncementFormProps>(
  ({ initialData, onSubmit }, ref) => {
    const { handleSubmit, control, reset } = useForm({
      defaultValues: {
        title: "",
        description: "",
        date: "",
        type: "event",
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
          type: initialData.type,
        });
      } else {
        reset({
          title: "",
          description: "",
          date: "",
          type: "event",
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
          placeholder="Announcement title"
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
          />
          <CustomSelect
            name="type"
            control={control}
            label="Type"
            options={[
              { value: "event", label: "Event" },
              { value: "important", label: "Important" },
              { value: "info", label: "Info" },
            ]}
          />
        </div>
      </form>
    );
  },
);

export default AnnouncementForm;
