import { noticeRepository } from "../repositories/notice.repository";

export const noticeUsecase = {
  async getNotices() {
    return noticeRepository.findMany();
  },

  async createNotice(data: any) {
    const noticeData = {
      name: data.name,
      message: data.message,
      color: data.color || "#7c3aed",
      fontColor: data.fontColor || "#ffffff",
    };
    return noticeRepository.create(noticeData);
  },

  async updateNotice(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.message) updateData.message = data.message;
    if (data.color) updateData.color = data.color;
    if (data.fontColor) updateData.fontColor = data.fontColor;

    return noticeRepository.update(id, updateData);
  },

  async activateNotice(id: string) {
    await noticeRepository.deactivateAll();
    return noticeRepository.update(id, { active: true });
  },

  async clearNotices() {
    return noticeRepository.deactivateAll();
  },

  async deleteNotice(id: string) {
    return noticeRepository.delete(id);
  },
};
