import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomButton from "../../../components/CustomButton";

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
  initialData?: { name: string; description: string } | null;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
    } else {
      setName("");
      setDescription("");
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, description);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Department" : "Create New Department"}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <CustomInput
          label="Department Name"
          placeholder="e.g., Engineering, Sales"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <CustomTextArea
          label="Description"
          placeholder="What does this department do?"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          style={{ resize: "none" }}
        />

        <CustomButton type="submit" variant="gradient" style={{ marginTop: 10 }}>
          {initialData ? "Update Department" : "Create Department"}
        </CustomButton>
      </form>
    </Modal>
  );
};

export default DepartmentModal;
