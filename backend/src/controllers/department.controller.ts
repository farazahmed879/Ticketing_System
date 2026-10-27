import { Response } from "express";
import { AuthRequest } from "../types";
import { departmentUsecase } from "../usecases/department.usecase";

export const departmentController = {
  async getDepartments(req: AuthRequest, res: Response) {
    try {
      const departments = await departmentUsecase.getDepartments();
      res.json({ success: true, departments });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getDepartmentById(req: AuthRequest, res: Response) {
    try {
      const department = await departmentUsecase.getDepartmentById(
        req.params.id as string,
      );
      if (!department) {
        return res.status(404).json({ success: false, error: "Department not found" });
      }
      res.json({ success: true, department });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createDepartment(req: AuthRequest, res: Response) {
    try {
      const department = await departmentUsecase.createDepartment(req.body);
      res.status(201).json({ success: true, department });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateDepartment(req: AuthRequest, res: Response) {
    try {
      const department = await departmentUsecase.updateDepartment(
        req.params.id as string,
        req.body,
      );
      res.json({ success: true, department });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteDepartment(req: AuthRequest, res: Response) {
    try {
      await departmentUsecase.deleteDepartment(req.params.id as string);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
