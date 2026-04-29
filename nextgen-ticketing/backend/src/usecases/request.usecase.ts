import { requestRepository } from "../repositories/request.repository";

export const requestUsecase = {
  async getRequests() {
    return requestRepository.findMany();
  },

  async updateRequestStatus(id: string, status: string, message: string) {
    const request = await requestRepository.update(id, {
      status,
      message,
      updatedAt: new Date(),
    });

    if (request.userId) {
      await requestRepository.createNotification({
        title: `Request ${status}`,
        message: `Your ${request.type
          .toLowerCase()
          .replace("_", " ")} request has been ${status.toLowerCase()}. ${
          message || ""
        }`,
        type: "request",
        userId: request.userId,
        data: { requestId: request.id },
      });
    }

    return request;
  },

  async deleteRequest(id: string) {
    return requestRepository.delete(id);
  },
};
