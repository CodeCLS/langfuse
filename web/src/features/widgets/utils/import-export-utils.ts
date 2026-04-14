import { z } from "zod";
import { metricAggregations } from "@/src/features/query/types";
import { views } from "@/src/features/query/types";
import { mapLegacyUiTableFilterToView } from "@/src/features/query";
import { singleFilter } from "@langfuse/shared";
import { type FilterState } from "@langfuse/shared";

export function downloadWidgetJson(widget: {
  name: string;
  description: string;
  view: z.infer<typeof views>;
  dimensions: { field: string }[];
  metrics: { measure: string; agg: z.infer<typeof metricAggregations> }[];
  filters: z.infer<typeof singleFilter>[];
  chartType: z.infer<typeof widgetImportChartTypes>;
  chartConfig: z.infer<typeof widgetImportSchema.shape.chartConfig>;
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

const rawWidgetImportSchema = z
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

export const widgetImportSchema = rawWidgetImportSchema;

const supportedWidgetFilterColumnsByView: Record<
  z.infer<typeof views>,
  Set<string>
> = {
  traces: new Set([
    "environment",
    "traceName",
    "observationName",
    "scoreName",
    "tags",
    "user",
    "sessionId",
    "metadata",
    "release",
    "version",
  ]),
  observations: new Set([
    "environment",
    "traceName",
    "observationName",
    "scoreName",
    "tags",
    "toolNames",
    "user",
    "sessionId",
    "metadata",
    "release",
    "version",
    "providedModelName",
    "level",
  ]),
  "scores-numeric": new Set([
    "environment",
    "traceName",
    "observationName",
    "scoreName",
    "tags",
    "user",
    "sessionId",
    "metadata",
    "release",
    "version",
    "value",
  ]),
  "scores-categorical": new Set([
    "environment",
    "traceName",
    "observationName",
    "scoreName",
    "tags",
    "user",
    "sessionId",
    "metadata",
    "release",
    "version",
    "stringValue",
  ]),
};

const widgetFilterColumnNormalizationMap: Record<
  z.infer<typeof views>,
  Record<string, string>
> = {
  traces: {
    name: "traceName",
    userId: "user",
    sessionId: "sessionId",
    release: "release",
    traceRelease: "release",
    version: "version",
    traceVersion: "version",
  },
  observations: {
    name: "observationName",
    userId: "user",
    sessionId: "sessionId",
    release: "release",
    traceRelease: "release",
    version: "version",
    traceVersion: "version",
    observationModelName: "providedModelName",
  },
  "scores-numeric": {
    name: "scoreName",
    userId: "user",
    sessionId: "sessionId",
    release: "release",
    traceRelease: "release",
    version: "version",
    traceVersion: "version",
  },
  "scores-categorical": {
    name: "scoreName",
    userId: "user",
    sessionId: "sessionId",
    release: "release",
    traceRelease: "release",
    version: "version",
    traceVersion: "version",
  },
};

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

  const allowedColumns = supportedWidgetFilterColumnsByView[params.view];
  const columnMap = widgetFilterColumnNormalizationMap[params.view];

  const filters: FilterState = normalizedLegacyFilters.flatMap<
    FilterState[number]
  >((filter) => {
    const normalizedColumn = columnMap[filter.column] ?? filter.column;
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

const normalizedWidgetImportSchema = rawWidgetImportSchema.superRefine(
  (widget, ctx) => {
    if (widget.chartConfig.type !== widget.chartType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["chartConfig", "type"],
        message: "chartConfig.type must match chartType",
      });
    }
  },
);

type WidgetImport = z.infer<typeof rawWidgetImportSchema>;

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
  const parsed = rawWidgetImportSchema.parse(params.parsedJson);
  const normalized = normalizeImportedWidget({
    widget: parsed,
    allowedValuesByColumn: params.allowedValuesByColumn,
  });

  return {
    widget: normalizedWidgetImportSchema.parse(normalized.widget),
    removedValues: normalized.removedValues,
    removedFilters: normalized.removedFilters,
  };
}
