import { DashboardWidgetChartType } from "@prisma/client";
import { z } from "zod";

export const BaseTimeSeriesChartConfig = z.object({});
export const BaseTotalValueChartConfig = z.object({
  row_limit: z.number().int().positive().lte(1000).optional(),
});

export const LineChartTimeSeriesConfig = BaseTimeSeriesChartConfig.extend({
  type: z.literal("LINE_TIME_SERIES"),
});
export const BarChartTimeSeriesConfig = BaseTimeSeriesChartConfig.extend({
  type: z.literal("BAR_TIME_SERIES"),
});
export const AreaChartTimeSeriesConfig = BaseTimeSeriesChartConfig.extend({
  type: z.literal("AREA_TIME_SERIES"),
});

export const HorizontalBarChartConfig = BaseTotalValueChartConfig.extend({
  type: z.literal("HORIZONTAL_BAR"),
  show_value_labels: z.boolean().optional(),
});
export const VerticalBarChartConfig = BaseTotalValueChartConfig.extend({
  type: z.literal("VERTICAL_BAR"),
});
export const PieChartConfig = BaseTotalValueChartConfig.extend({
  type: z.literal("PIE"),
});

export const BigNumberChartConfig = BaseTotalValueChartConfig.extend({
  type: z.literal("NUMBER"),
});

export const HistogramChartConfig = BaseTotalValueChartConfig.extend({
  type: z.literal("HISTOGRAM"),
  bins: z.number().int().min(1).max(100).optional().default(10),
});

export const PivotTableChartConfig = BaseTotalValueChartConfig.extend({
  type: z.literal("PIVOT_TABLE"),
  defaultSort: z
    .object({
      column: z.string(),
      order: z.enum(["ASC", "DESC"]),
    })
    .optional(),
});

export const DimensionSchema = z.object({
  field: z.string(),
});

export const MetricSchema = z.object({
  measure: z.string(),
  agg: z.string(),
});

export const DashboardWidgetChartTypeSchema = z.enum(DashboardWidgetChartType);

export const ChartConfigSchema = z.discriminatedUnion("type", [
  LineChartTimeSeriesConfig,
  BarChartTimeSeriesConfig,
  AreaChartTimeSeriesConfig,
  HorizontalBarChartConfig,
  VerticalBarChartConfig,
  PieChartConfig,
  BigNumberChartConfig,
  HistogramChartConfig,
  PivotTableChartConfig,
]);
