export type ScheduleOption = {
  id: number;
  startAt: string;
  endAt: string;
  note: string | null;
};

export type PublicSchedule = {
  id: number;
  token: string;
  title: string;
  location: string;
  note: string;
  isProtected: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  options: ScheduleOption[];
};
