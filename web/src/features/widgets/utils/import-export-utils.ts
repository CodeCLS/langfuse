import { z } from "zod";
import { metricAggregations } from "@/src/features/query/types";
import { views } from "@/src/features/query/types";
import { singleFilter } from "@langfuse/shared";
import { type FilterState } from "@langfuse/shared";

export function downloadWidgetJson(widget: { name: string }) {
  const blob = new Blob([JSON.stringify(widget, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildWidgetJsonFileName(widget.name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildWidgetJsonFileName(widgetName: string) {
  const fileSafeName = widgetName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${fileSafeName || "widget"}.json`;
}

export const observationLevelOptions = [
  { value: "DEBUG" },
  { value: "DEFAULT" },
  { value: "WARNING" },
  { value: "ERROR" },
];

const widgetImportChartTypes = [
  "NUMBER",
  "LINE_TIME_SERIES",
  "BAR_TIME_SERIES",
  "AREA_TIME_SERIES",
  "HORIZONTAL_BAR",
  "VERTICAL_BAR",
  "PIE",
  "HISTOGRAM",
  "PIVOT_TABLE",
] as const;

export const widgetImportSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    view: views,
    dimensions: z.array(
      z.object({
        field: z.string(),
      }),
    ),
    metrics: z.array(
      z.object({
        measure: z.string(),
        agg: metricAggregations,
      }),
    ),
    filters: z.array(singleFilter),
    chartType: z.enum(widgetImportChartTypes),
    chartConfig: z.object({
      type: z.enum(widgetImportChartTypes),
      row_limit: z.number().int().positive().lte(1000).optional(),
      bins: z.number().int().min(1).max(100).optional(),
      defaultSort: z
        .object({
          column: z.string(),
          order: z.enum(["ASC", "DESC"]),
        })
        .optional(),
    }),
    minVersion: z.number().int().optional(),
  })
  .passthrough();

export function sanitizeImportedFilters(params: {
  filters: FilterState;
  allowedValuesByColumn: Map<string, Set<string>>;
}): { filters: FilterState; removedValues: boolean } {
  let removedValues = false;

  const filters: FilterState = params.filters.flatMap<FilterState[number]>(
    (filter) => {
      if (
        filter.type !== "stringOptions" &&
        filter.type !== "arrayOptions" &&
        filter.type !== "categoryOptions"
      ) {
        return [filter];
      }

      const allowedValues = params.allowedValuesByColumn.get(filter.column);
      if (!allowedValues) {
        return [filter];
      }

      const nextValues = filter.value.filter((value) =>
        allowedValues.has(value),
      );
      if (nextValues.length === filter.value.length) {
        return [filter];
      }

      removedValues = true;

      if (nextValues.length === 0) {
        return [];
      }

      return [{ ...filter, value: nextValues }];
    },
  );

  return { filters, removedValues };
}
