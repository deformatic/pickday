export type ScheduleOption = {
  id: number;
  startAt: string;
  endAt: string;
  note: string | null;
};

export type PublicSchedule = {
  id: number;
  token: string;
  isProtected: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
};

export type VerifiedScheduleDetails = PublicSchedule & {
  title: string;
  location: string;
  note: string;
  options: ScheduleOption[];
};
