import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "../../components/Modal";
import CustomDatePicker from "../../components/CustomDatePicker";
import CustomDateRangePicker from "../../components/CustomDateRangePicker";
import CustomSelect from "../../components/CustomSelect";
import CustomButton from "../../components/CustomButton";
import { TaskDescriptionEditor } from "../timesheet/components/TaskDescriptionEditor";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { UserRequest } from "../../types";
import { useNotification } from "../../context/NotificationContext";
import CustomInput from "../../components/CustomInput";
import {
  DOCUMENT_REQUEST,
  REQUESTABLE_DOCUMENTS,
  recentMonthOptions,
} from "./documentRequest";

export const REQUEST_TYPE_OPTIONS = [
  { value: "HALFDAY_LEAVE", label: "Half-Day Leave" },
  { value: "FULLDAY_LEAVE", label: "Full-Day Leave" },
  { value: "VACATION", label: "Vacation" },
  { value: "WFH", label: "Work From Home (WFH)" },
  { value: "REIMBURSEMENT", label: "Reimbursement" },
  { value: DOCUMENT_REQUEST, label: "Document (pay slip, letter, certificate…)" },
  { value: "OTHER", label: "Other / Custom" },
];

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRequest: UserRequest) => void;
}

const RequestModal: React.FC<RequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { control, handleSubmit, reset, watch } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();
  // Today as a local "YYYY-MM-DD" (toISOString alone is UTC and can be a day off).
  const now = new Date();
  const todayIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
  const watchedType = watch("type");
  const isSingleDate =
    watchedType === "HALFDAY_LEAVE" || watchedType === "REIMBURSEMENT";
  const isReimbursement = watchedType === "REIMBURSEMENT";
  const isDocument = watchedType === DOCUMENT_REQUEST;
  const watchedDocType = watch("documentType");
  // Document requests only need details for "Other document".
  const detailsRequired = !isDocument || watchedDocType === "custom";

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const res = await api.post(API_ROUTES.REQUESTS.BASE, {
        type: data.type,
        message: data.message,
        data: isDocument
          ? {
              documentType: data.documentType,
              payMonth: data.documentType === "payslip" ? data.payMonth : undefined,
              addressedTo:
                data.documentType === "salary_certificate" ? data.addressedTo : undefined,
              purpose:
                data.documentType === "salary_certificate" ? data.purpose : undefined,
            }
          : {
              startDate: data.startDate,
              endDate: isSingleDate
                ? data.startDate
                : data.endDate || data.startDate,
            },
      });
      onSuccess(res.data.request);
      reset();
      onClose();
    } catch (err) {
      console.error("Failed to create request", err);
      const data = (err as { response?: { data?: { error?: string } } })
        .response?.data;
      showNotification("error", data?.error || "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Request">
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <CustomSelect
          name="type"
          control={control}
          label="Request Type"
          placeholder="Select request type"
          options={REQUEST_TYPE_OPTIONS}
          rules={{ required: "Request type is required" }}
        />

        {isDocument ? (
          <>
            <CustomSelect
              name="documentType"
              control={control}
              label="Document"
              placeholder="Which document do you need?"
              options={REQUESTABLE_DOCUMENTS}
              rules={{ required: "Please choose a document" }}
              showSearch={false}
            />
            {watchedDocType === "payslip" && (
              <CustomSelect
                name="payMonth"
                control={control}
                label="Month"
                placeholder="Select month"
                options={recentMonthOptions()}
                rules={{ required: "Please choose the month" }}
                showSearch={false}
              />
            )}
            {watchedDocType === "salary_certificate" && (
              <>
                <CustomInput
                  name="addressedTo"
                  control={control}
                  label="Addressed To"
                  placeholder="e.g. The Manager, Meezan Bank (optional)"
                />
                <CustomInput
                  name="purpose"
                  control={control}
                  label="Purpose"
                  placeholder="e.g. bank account opening, visa (optional)"
                />
              </>
            )}
          </>
        ) : isSingleDate ? (
          <CustomDatePicker
            name="startDate"
            control={control}
            label={isReimbursement ? "Expense Date" : "Date"}
            min={isReimbursement ? undefined : todayIso}
            rules={{
              required: `${
                isReimbursement ? "Expense date" : "Date"
              } is required`,
            }}
          />
        ) : (
          // One calendar: first click = start, second click = end.
          // Picking a single day leaves the end empty; it's sent as start.
          <CustomDateRangePicker
            control={control}
            startName="startDate"
            endName="endDate"
            label="Dates"
            placeholder="Select start and end date"
            min={todayIso}
            rules={{ required: "Please select the dates" }}
          />
        )}

        <TaskDescriptionEditor
          name="message"
          control={control}
          label={
            !isDocument
              ? "Message / Reason"
              : detailsRequired
                ? "Which document do you need?"
                : "Details (optional)"
          }
          placeholder={
            isDocument
              ? "Anything the document should include…"
              : "Describe your request..."
          }
          required={detailsRequired}
          rules={
            detailsRequired
              ? { required: isDocument ? "Please describe the document" : "Reason is required" }
              : undefined
          }
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
