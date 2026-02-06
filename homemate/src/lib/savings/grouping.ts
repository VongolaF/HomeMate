import dayjs from "dayjs";

type GoalWithDeadline = {
  deadline?: string | null;
};

type GoalGrouping<T extends GoalWithDeadline> = {
  shortTerm: T[];
  longTerm: T[];
  noDeadline: T[];
};

export function groupGoalsByHorizon<T extends GoalWithDeadline>(goals: T[]): GoalGrouping<T> {
  const shortTerm: T[] = [];
  const longTerm: T[] = [];
  const noDeadline: T[] = [];
  const now = dayjs();

  goals.forEach((goal) => {
    if (!goal.deadline) {
      noDeadline.push(goal);
      return;
    }

    const monthsUntil = dayjs(goal.deadline).diff(now, "month", true);
    if (monthsUntil <= 6) {
      shortTerm.push(goal);
    } else {
      longTerm.push(goal);
    }
  });

  return { shortTerm, longTerm, noDeadline };
}
