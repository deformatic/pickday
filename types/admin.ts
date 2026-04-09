export type AdminScheduleOption = {
  id: number;
  label: string;
  datetime: string;
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
  label: string;
  datetime: string;
  responseCount: number;
};

export type AdminDashboardData = {
  schedule: {
    title: string;
    location: string;
    timeInfo: string;
  };
  options: AdminScheduleOption[];
  responses: AdminResponseItem[];
  aggregates: AdminAggregate[];
};
