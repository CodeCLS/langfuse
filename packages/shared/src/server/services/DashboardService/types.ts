import { DashboardWidgetChartType, DashboardWidgetViews } from "@prisma/client";
import { z } from "zod";
import { singleFilter } from "../../../";
export {
  BaseTimeSeriesChartConfig,
  BaseTotalValueChartConfig,
  LineChartTimeSeriesConfig,
  BarChartTimeSeriesConfig,
  AreaChartTimeSeriesConfig,
  HorizontalBarChartConfig,
  VerticalBarChartConfig,
  PieChartConfig,
  BigNumberChartConfig,
  HistogramChartConfig,
  PivotTableChartConfig,
  DimensionSchema,
  MetricSchema,
  DashboardWidgetChartTypeSchema,
  ChartConfigSchema,
} from "../../../features/widgets/schema";
import {
  ChartConfigSchema,
  DimensionSchema,
  MetricSchema,
} from "../../../features/widgets/schema";

export const DashboardDefinitionWidgetWidgetSchema = z.object({
  type: z.literal("widget"),
  id: z.string(),
  widgetId: z.string(),
  x: z.number().int().gte(0),
  y: z.number().int().gte(0),
  x_size: z.number().int().positive(),
  y_size: z.number().int().positive(),
});

export const DashboardDefinitionWidgetSchema = z.discriminatedUnion("type", [
  DashboardDefinitionWidgetWidgetSchema,
]);

export const DashboardDefinitionSchema = z.object({
  widgets: z.array(DashboardDefinitionWidgetSchema),
});

export const OwnerEnum = z.enum(["PROJECT", "LANGFUSE"]);

// Define the dashboard domain object
export const DashboardDomainSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  projectId: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  definition: DashboardDefinitionSchema,
  filters: z.array(singleFilter).default([]),
  owner: OwnerEnum,
});

// Define the dashboard list response
export const DashboardListResponseSchema = z.object({
  dashboards: z.array(DashboardDomainSchema),
  totalCount: z.number(),
});

// Define the widget domain object
export const WidgetDomainSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  projectId: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  view: z.enum(DashboardWidgetViews),
  dimensions: z.array(DimensionSchema),
  metrics: z.array(MetricSchema),
  filters: z.array(singleFilter),
  chartType: z.enum(DashboardWidgetChartType),
  chartConfig: ChartConfigSchema,
  minVersion: z.number().int().default(1),
  owner: OwnerEnum,
});

// Define create widget input schema
export const CreateWidgetInputSchema = z.object({
  name: z.string().min(1, "Widget name is required"),
  description: z.string(),
  view: z.enum(DashboardWidgetViews),
  dimensions: z.array(DimensionSchema),
  metrics: z.array(MetricSchema),
  filters: z.array(singleFilter),
  chartType: z.enum(DashboardWidgetChartType),
  chartConfig: ChartConfigSchema,
  minVersion: z.number().int().optional(),
});

// Define the widget list response
export const WidgetListResponseSchema = z.object({
  widgets: z.array(WidgetDomainSchema),
  totalCount: z.number(),
});

// Export types derived from schemas
export type DashboardDomain = z.infer<typeof DashboardDomainSchema>;
export type DashboardListResponse = z.infer<typeof DashboardListResponseSchema>;
export type WidgetDomain = z.infer<typeof WidgetDomainSchema>;
export type CreateWidgetInput = z.infer<typeof CreateWidgetInputSchema>;
export type WidgetListResponse = z.infer<typeof WidgetListResponseSchema>;
