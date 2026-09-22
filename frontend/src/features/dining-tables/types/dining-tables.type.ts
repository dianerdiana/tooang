export type DiningTable = {
  tableId: string;
  placeId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateDiningTableInput = {
  name: string;
};

export type UpdateDiningTableInput = Partial<{
  name: string;
  isActive: boolean;
}>;

export type DiningTableFormValues = {
  name: string;
};
