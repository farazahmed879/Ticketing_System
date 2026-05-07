import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "../../components/Modal";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import CustomTextArea from "../../components/CustomTextArea";
import CustomButton from "../../components/CustomButton";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { UserRequest } from "../../types";

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRequest: UserRequest) => void;
}

const RequestModal: React.FC<RequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { control, handleSubmit, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const res = await api.post(API_ROUTES.REQUESTS.BASE, {
        type: data.type,
        message: data.message,
        data: {
          startDate: data.startDate,
          endDate: data.endDate,
        },
      });
      onSuccess(res.data.request);
      reset();
      onClose();
    } catch (err) {
      console.error("Failed to create request", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Request"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <CustomSelect
          name="type"
          control={control}
          label="Request Type"
          placeholder="Select request type"
          options={[
            { value: "HALFDAY_LEAVE", label: "Half-Day Leave" },
            { value: "FULLDAY_LEAVE", label: "Full-Day Leave" },
            { value: "VACATION", label: "Vacation" },
            { value: "OTHER", label: "Other / Custom" },
          ]}
          rules={{ required: "Request type is required" }}
        />

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <CustomInput
            name="startDate"
            control={control}
            type="date"
            label="Start Date"
            rules={{ required: "Start date is required" }}
          />
          <CustomInput
            name="endDate"
            control={control}
            type="date"
            label="End Date"
          />
        </div>

        <CustomTextArea
          name="message"
          control={control}
          label="Message / Reason"
          placeholder="Describe your request..."
          rules={{ required: "Reason is required" }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 10,
          }}
        >
          <CustomButton variant="ghost" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton
            variant="primary"
            type="submit"
            loading={isSubmitting}
          >
            Submit Request
          </CustomButton>
        </div>
      </form>
    </Modal>
  );
};

export default RequestModal;
