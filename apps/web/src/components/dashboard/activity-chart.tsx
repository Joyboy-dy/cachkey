import type { ActivityDay } from "@cachkey/shared";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";

/*
 * Reads and changes per day over the last two weeks (Bklit bar chart). Reads in ink,
 * changes in the brand orange: a spike of reads is what deserves attention.
 */

const dayLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export function ActivityChart({ days }: { days: ActivityDay[] }) {
  const data = days.map((day) => ({
    // Noon UTC: the same calendar day in every time zone.
    label: dayLabel.format(new Date(`${day.date}T12:00:00Z`)),
    reads: day.reads,
    changes: day.changes,
  }));

  return (
    <BarChart
      data={data}
      xDataKey="label"
      aspectRatio="5 / 2"
      margin={{ top: 12, right: 8, bottom: 28, left: 8 }}
      barGap={0.35}
    >
      <Grid horizontal numTicksRows={3} />
      <Bar dataKey="reads" fill="var(--chart-line-primary)" lineCap={3} />
      <Bar dataKey="changes" fill="var(--chart-line-secondary)" lineCap={3} />
      <BarXAxis maxLabels={7} />
      <ChartTooltip
        showDatePill={false}
        rows={(point) => [
          {
            color: "var(--chart-line-primary)",
            label: "Consultations",
            value: Number(point.reads),
          },
          {
            color: "var(--chart-line-secondary)",
            label: "Modifications",
            value: Number(point.changes),
          },
        ]}
      />
    </BarChart>
  );
}
