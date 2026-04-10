export type AdminScheduleOption = {
  id: number;
  startAt: string;
  endAt: string;
  note: string | null;
};

export type AdminResponseItem = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  comment: string | null;
  assignedOptionId: number | null;
  createdAt: string;
  selectedOptions: AdminScheduleOption[];
};

export type AdminAggregate = {
  optionId: number;
  startAt: string;
  endAt: string;
  note: string | null;
  responseCount: number;
};

export type AdminDashboardData = {
  schedule: {
    title: string;
    location: string;
    note: string;
  };
  options: AdminScheduleOption[];
  responses: AdminResponseItem[];
  aggregates: AdminAggregate[];
};
