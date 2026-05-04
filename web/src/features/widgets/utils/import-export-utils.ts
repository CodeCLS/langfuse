import { z } from "zod";
import { views, metricAggregations } from "@/src/features/query/types";
import { mapLegacyUiTableFilterToView } from "@/src/features/query";
import {
  DashboardWidgetChartType,
  singleFilter,
  type FilterState,
} from "@langfuse/shared";
import { getWidgetImportFilterConfig } from "@/src/features/widgets/utils/filter-config";
export { observationLevelOptions } from "@/src/features/widgets/utils/filter-config";

const dashboardWidgetChartTypeSchema = z.enum(DashboardWidgetChartType);

const widgetDimensionSchema = z.object({
  field: z.string(),
});

const widgetMetricSchema = z.object({
  measure: z.string(),
  agg: metricAggregations,
});

const baseTimeSeriesChartConfig = z.object({});
const baseTotalValueChartConfig = z.object({
  row_limit: z.number().int().positive().lte(1000).optional(),
});

const lineChartTimeSeriesConfig = baseTimeSeriesChartConfig.extend({
  type: z.literal("LINE_TIME_SERIES"),
});
const barChartTimeSeriesConfig = baseTimeSeriesChartConfig.extend({
  type: z.literal("BAR_TIME_SERIES"),
});
const areaChartTimeSeriesConfig = baseTimeSeriesChartConfig.extend({
  type: z.literal("AREA_TIME_SERIES"),
});

const horizontalBarChartConfig = baseTotalValueChartConfig.extend({
  type: z.literal("HORIZONTAL_BAR"),
  show_value_labels: z.boolean().optional(),
});
const verticalBarChartConfig = baseTotalValueChartConfig.extend({
  type: z.literal("VERTICAL_BAR"),
});
const pieChartConfig = baseTotalValueChartConfig.extend({
  type: z.literal("PIE"),
});
const bigNumberChartConfig = baseTotalValueChartConfig.extend({
  type: z.literal("NUMBER"),
});
const histogramChartConfig = baseTotalValueChartConfig.extend({
  type: z.literal("HISTOGRAM"),
  bins: z.number().int().min(1).max(100).optional().default(10),
});
const pivotTableChartConfig = baseTotalValueChartConfig.extend({
  type: z.literal("PIVOT_TABLE"),
  defaultSort: z
    .object({
      column: z.string(),
      order: z.enum(["ASC", "DESC"]),
    })
    .optional(),
});

const chartConfigSchema = z.discriminatedUnion("type", [
  lineChartTimeSeriesConfig,
  barChartTimeSeriesConfig,
  areaChartTimeSeriesConfig,
  horizontalBarChartConfig,
  verticalBarChartConfig,
  pieChartConfig,
  bigNumberChartConfig,
  histogramChartConfig,
  pivotTableChartConfig,
]);

const widgetImportBaseSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    view: views,
    dimensions: z.array(widgetDimensionSchema),
    metrics: z.array(widgetMetricSchema),
    filters: z.array(singleFilter),
    chartType: dashboardWidgetChartTypeSchema,
    chartConfig: chartConfigSchema,
    minVersion: z.number().int().optional(),
  })
  .loose();

export const widgetImportSchema = widgetImportBaseSchema.superRefine(
  (widget, ctx) => {
    if (widget.chartConfig.type !== widget.chartType) {
      ctx.addIssue({
        code: "custom",
        path: ["chartConfig", "type"],
        message: "chartConfig.type must match chartType",
      });
    }
  },
);

type WidgetImport = z.infer<typeof widgetImportSchema>;

export function downloadWidgetJson(widget: {
  name: string;
  description: string;
  view: string;
  dimensions: { field: string }[];
  metrics: { measure: string; agg: string }[];
  filters: z.infer<typeof singleFilter>[];
  chartType: string;
  chartConfig: unknown;
  minVersion?: number;
}) {
  const exportWidget = {
    name: widget.name,
    description: widget.description,
    view: widget.view,
    dimensions: widget.dimensions,
    metrics: widget.metrics,
    filters: widget.filters,
    chartType: widget.chartType,
    chartConfig: widget.chartConfig,
    minVersion: widget.minVersion,
  };

  const blob = new Blob([JSON.stringify(exportWidget, null, 2)], {
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

export function normalizeImportedFilters(params: {
  filters: FilterState;
  view: z.infer<typeof views>;
  allowedValuesByColumn: Map<string, Set<string>>;
}): { filters: FilterState; removedValues: boolean; removedFilters: boolean } {
  let removedValues = false;
  let removedFilters = false;

  const normalizedLegacyFilters = mapLegacyUiTableFilterToView(
    params.view,
    params.filters,
  );

  const { allowedColumns, columnAliases } = getWidgetImportFilterConfig(
    params.view,
  );

  const filters: FilterState = normalizedLegacyFilters.flatMap<
    FilterState[number]
  >((filter) => {
    const normalizedColumn = columnAliases[filter.column] ?? filter.column;
    if (!allowedColumns.has(normalizedColumn)) {
      removedFilters = true;
      return [];
    }

    const normalizedFilter = { ...filter, column: normalizedColumn };

    if (
      normalizedFilter.type !== "stringOptions" &&
      normalizedFilter.type !== "arrayOptions" &&
      normalizedFilter.type !== "categoryOptions"
    ) {
      return [normalizedFilter];
    }

    const allowedValues = params.allowedValuesByColumn.get(
      normalizedFilter.column,
    );
    if (!allowedValues) {
      return [normalizedFilter];
    }

    const nextValues = normalizedFilter.value.filter((value) =>
      allowedValues.has(value),
    );
    if (nextValues.length === normalizedFilter.value.length) {
      return [normalizedFilter];
    }

    removedValues = true;

    if (nextValues.length === 0) {
      return [];
    }

    return [{ ...normalizedFilter, value: nextValues }];
  });

  return { filters, removedValues, removedFilters };
}

export function normalizeImportedWidget(params: {
  widget: WidgetImport;
  allowedValuesByColumn: Map<string, Set<string>>;
}): {
  widget: WidgetImport;
  removedValues: boolean;
  removedFilters: boolean;
} {
  const sanitizedFilters = normalizeImportedFilters({
    view: params.widget.view,
    filters: params.widget.filters,
    allowedValuesByColumn: params.allowedValuesByColumn,
  });

  return {
    widget: {
      ...params.widget,
      filters: sanitizedFilters.filters,
    },
    removedValues: sanitizedFilters.removedValues,
    removedFilters: sanitizedFilters.removedFilters,
  };
}

export function parseAndNormalizeImportedWidget(params: {
  parsedJson: unknown;
  allowedValuesByColumn: Map<string, Set<string>>;
}): {
  widget: WidgetImport;
  removedValues: boolean;
  removedFilters: boolean;
} {
  const parsed = widgetImportSchema.parse(params.parsedJson);
  const normalized = normalizeImportedWidget({
    widget: parsed,
    allowedValuesByColumn: params.allowedValuesByColumn,
  });

  return normalized;
}
