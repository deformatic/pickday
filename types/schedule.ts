export type ScheduleOption = {
  id: number;
  datetime: string;
  label: string;
};

export type PublicSchedule = {
  id: number;
  token: string;
  title: string;
  location: string;
  timeInfo: string;
  isProtected: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  options: ScheduleOption[];
};
