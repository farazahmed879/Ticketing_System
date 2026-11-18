import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { CompanyProfile, HrDocument } from "./documentConfig";

export const COMPANY_QUERY_KEY = ["hr-company-profile"];

export const useCompanyProfile = () =>
  useQuery({
    queryKey: COMPANY_QUERY_KEY,
    queryFn: async () =>
      ((await api.get(API_ROUTES.DOCUMENTS.COMPANY)).data.company as CompanyProfile) || {
        name: "",
      },
  });

export const useHrDocument = (id: string | null) =>
  useQuery({
    queryKey: ["hr-document", id],
    queryFn: async () =>
      (await api.get(API_ROUTES.DOCUMENTS.BY_ID(id!))).data.document as HrDocument,
    enabled: !!id,
    staleTime: 0,
  });

/** Server error message from an axios error, or `fallback`. */
export const apiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
