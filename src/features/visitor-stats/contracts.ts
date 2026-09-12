export type VisitorStatsResponse =
  | {
      enabled: true;
      tracked: true;
      totalVisitors: number;
      todayVisitors: number;
    }
  | {
      enabled: false;
      tracked: false;
      totalVisitors: null;
      todayVisitors: null;
    };

export interface VisitorStatsState {
  status: 'loading' | 'ready' | 'disabled' | 'error';
  totalVisitors: number | null;
  todayVisitors: number | null;
}

export interface VisitorStatsCounts {
  totalVisitors: number;
  todayVisitors: number;
}

export const DISABLED_VISITOR_STATS: VisitorStatsResponse = {
  enabled: false,
  tracked: false,
  totalVisitors: null,
  todayVisitors: null,
};
