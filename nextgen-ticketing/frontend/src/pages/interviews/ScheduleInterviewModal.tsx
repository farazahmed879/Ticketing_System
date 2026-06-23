import React, { useEffect, useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import Modal from "../../components/Modal";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import CustomTextArea from "../../components/CustomTextArea";
import CustomButton from "../../components/CustomButton";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import CustomDateTimePicker from "../../components/CustomDateTimePicker";
import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { UIMessages } from "../../utils/constants";
import type {
  Candidate,
  InterviewFormData,
  MultiSelectOption,
} from "../../types";
import type { Props } from "./components/interfaces";

const ScheduleInterviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  interview,
}) => {
  const queryClient = useQueryClient();
  const { showNotification, setIsLoading } = useNotification();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<MultiSelectOption[]>([]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const {
    handleSubmit,
    control,
    reset,
    formState: { isDirty },
  } = useForm<InterviewFormData>({
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

  const debounceTimer = useRef<any>(null);

  const handleCandidateSearch = (query: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(API_ROUTES.CANDIDATES.BASE, {
          params: { search: query || undefined },
        });
        setCandidates(res.data.candidates);
      } catch (err) {
        console.error("Candidate search failed", err);
      }
    }, 500);
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

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (interview) {
        return api.put(API_ROUTES.INTERVIEWS.BY_ID(interview.id), payload);
      } else {
        return api.post(API_ROUTES.INTERVIEWS.BASE, payload);
      }
    },
    onMutate: () => setIsLoading(true, UIMessages.LOADING.SAVING_CHANGES),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      showNotification(
        "success",
        interview
          ? "Interview updated successfully"
          : "Interview scheduled successfully",
      );
      onSuccess();
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || err.message || "Operation failed",
      );
    },
  });

  const onFormSubmit = async (data: InterviewFormData) => {
    if (data.interviewerIds.length === 0) {
      showNotification("error", "Please select at least one interviewer");
      return;
    }

    const payload = {
      ...data,
      duration: parseInt(data.duration),
      location: data.location || undefined,
      notes: data.notes || undefined,
    };

    saveMutation.mutate(payload);
  };

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscardConfirm = () => {
    setShowDiscardConfirm(false);
    reset();
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleCloseAttempt}
        title={interview ? "Edit Interview" : "Schedule Interview"}
        maxWidth="650px"
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              width: "100%",
            }}
          >
            <CustomButton
              variant="outline"
              onClick={() => reset()}
              type="button"
            >
              Reset
            </CustomButton>
            <CustomButton
              type="submit"
              form="schedule-interview-form"
              variant="gradient"
            >
              {interview ? "Update Interview" : "Schedule Interview"}
            </CustomButton>
          </div>
        }
      >
        <form
          id="schedule-interview-form"
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
              showSearch
              serverSideSearch
              onSearch={handleCandidateSearch}
              options={candidates.map((c) => ({
                value: c.id,
                label: c.name,
                sublabel: `${c.position} | ${c.email} | ${c.phone || "No phone"} | ${c.cnic || "No CNIC"}`,
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
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleDiscardConfirm}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard"
        cancelText="Keep Editing"
        type="warning"
      />
    </>
  );
};

export default ScheduleInterviewModal;
