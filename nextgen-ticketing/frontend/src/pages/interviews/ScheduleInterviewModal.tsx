import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "../../components/Modal";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import CustomTextArea from "../../components/CustomTextArea";
import CustomButton from "../../components/CustomButton";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import CustomDateTimePicker from "../../components/CustomDateTimePicker";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import type { Interview, Candidate, InterviewFormData, MultiSelectOption } from "../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  interview?: Interview | null;
}

const ScheduleInterviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  interview,
}) => {
  const { showNotification, setIsLoading } = useNotification();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<MultiSelectOption[]>([]);

  const { handleSubmit, control, reset } = useForm<InterviewFormData>({
    defaultValues: {
      title: "",
      candidateId: "",
      scheduledAt: "",
      duration: "60",
      location: "",
      notes: "",
      interviewerIds: [],
    },
  });

  // const interviewerIds = watch("interviewerIds");

  const fetchOptions = async () => {
    try {
      const [cRes, uRes] = await Promise.all([
        api.get(API_ROUTES.CANDIDATES.BASE),
        api.get(API_ROUTES.USERS.BASE, { params: { type: "all", limit: -1 } }),
      ]);

      setCandidates(cRes.data.candidates);

      const userOptions: MultiSelectOption[] = uRes.data.accounts
        .filter((u: any) => !u.role.isCustomer)
        .map((u: any) => ({
          value: u.id,
          label: u.fullname,
          sublabel: u.role.name,
          image: u.image || undefined,
        }));
      setUsers(userOptions);
    } catch (err) {
      console.error("Failed to fetch options", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOptions();

      if (interview) {
        // Format date for datetime-local input
        const d = new Date(interview.scheduledAt);
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60 * 1000);

        reset({
          title: interview.title,
          candidateId: interview.candidate.id,
          scheduledAt: local.toISOString().slice(0, 16),
          duration: String(interview.duration),
          location: interview.location || "",
          notes: interview.notes || "",
          interviewerIds: interview.panelMembers.map((pm) => pm.user.id),
        });
      } else {
        reset({
          title: "",
          candidateId: "",
          scheduledAt: "",
          duration: "60",
          location: "",
          notes: "",
          interviewerIds: [],
        });
      }
    }
  }, [isOpen, interview, reset]);

  const onFormSubmit = async (data: InterviewFormData) => {
    if (data.interviewerIds.length === 0) {
      showNotification("error", "Please select at least one interviewer");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...data,
        duration: parseInt(data.duration),
        location: data.location || undefined,
        notes: data.notes || undefined,
      };

      if (interview) {
        await api.put(API_ROUTES.INTERVIEWS.BY_ID(interview.id), payload);
        showNotification("success", "Interview updated successfully");
      } else {
        await api.post(API_ROUTES.INTERVIEWS.BASE, payload);
        showNotification("success", "Interview scheduled successfully");
      }

      onSuccess();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || err.message || "Operation failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={interview ? "Edit Interview" : "Schedule Interview"}
      maxWidth="650px"
    >
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <CustomInput
            name="title"
            control={control}
            rules={{ required: "Interview title is required" }}
            label="Interview Title"
            type="text"
            placeholder="e.g. Technical Round 1"
            required
          />
          <CustomSelect
            name="candidateId"
            control={control}
            rules={{ required: "Candidate is required" }}
            label="Candidate"
            placeholder="Select Candidate"
            options={candidates.map((c) => ({
              value: c.id,
              label: `${c.name} — ${c.position}`,
            }))}
            required
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <CustomDateTimePicker
            name="scheduledAt"
            control={control}
            rules={{ required: "Date & Time is required" }}
            label="Date & Time"
            required
          />
          <CustomSelect
            name="duration"
            control={control}
            label="Duration"
            options={[
              { value: "30", label: "30 minutes" },
              { value: "45", label: "45 minutes" },
              { value: "60", label: "1 hour" },
              { value: "90", label: "1.5 hours" },
              { value: "120", label: "2 hours" },
            ]}
          />
          <CustomInput
            name="location"
            control={control}
            label="Location / Link"
            type="text"
            placeholder="Room 201 or Zoom link"
          />
        </div>

        <CustomMultiSelect
          name="interviewerIds"
          control={control}
          rules={{ required: "At least one interviewer is required" }}
          label="Interview Panel"
          options={users}
          placeholder="Select interviewers..."
          required
        />

        <CustomTextArea
          name="notes"
          control={control}
          label="Notes"
          placeholder="Any additional instructions..."
          rows={3}
        />

        <CustomButton
          type="submit"
          variant="gradient"
          fullWidth
          style={{ marginTop: 10 }}
        >
          {interview ? "Update Interview" : "Schedule Interview"}
        </CustomButton>
      </form>
    </Modal>
  );
};

export default ScheduleInterviewModal;
