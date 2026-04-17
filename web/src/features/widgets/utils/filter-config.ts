import { type ColumnDefinition, ObservationLevel } from "@langfuse/shared";
import { type z } from "zod";
import { type views } from "@/src/features/query/types";

type WidgetView = z.infer<typeof views>;
type Option = { value: string };

type WidgetFilterColumnDefinition = {
  name: string;
  id: string;
  type: ColumnDefinition["type"];
  internal: string;
  optionsKey?:
    | "environment"
    | "name"
    | "tags"
    | "model"
    | "toolNames"
    | "level";
  aliases?: string[];
  normalizedId?: string;
};

type WidgetFilterOptions = {
  environmentOptions: Option[];
  nameOptions: Option[];
  tagsOptions: Option[];
  modelOptions: Option[];
  toolNamesOptions: Option[];
};

const baseWidgetFilterColumns: WidgetFilterColumnDefinition[] = [
  {
    name: "Environment",
    id: "environment",
    type: "stringOptions",
    optionsKey: "environment",
    internal: "internalValue",
  },
  {
    name: "Trace Name",
    id: "traceName",
    type: "stringOptions",
    optionsKey: "name",
    internal: "internalValue",
  },
  {
    name: "Observation Name",
    id: "observationName",
    type: "string",
    internal: "internalValue",
  },
  {
    name: "Score Name",
    id: "scoreName",
    type: "string",
    internal: "internalValue",
  },
  {
    name: "Tags",
    id: "tags",
    type: "arrayOptions",
    optionsKey: "tags",
    internal: "internalValue",
  },
  {
    name: "Tool Names",
    id: "toolNames",
    type: "arrayOptions",
    optionsKey: "toolNames",
    internal: "internalValue",
  },
  {
    name: "User",
    id: "userId",
    type: "string",
    internal: "internalValue",
  },
  {
    name: "Session",
    id: "sessionId",
    type: "string",
    internal: "internalValue",
  },
  {
    name: "Metadata",
    id: "metadata",
    type: "stringObject",
    internal: "internalValue",
  },
  {
    name: "Release",
    id: "release",
    type: "string",
    aliases: ["traceRelease"],
    internal: "internalValue",
  },
  {
    name: "Version",
    id: "version",
    type: "string",
    internal: "internalValue",
  },
];

const widgetFilterColumnsByView: Record<
  WidgetView,
  WidgetFilterColumnDefinition[]
> = {
  traces: baseWidgetFilterColumns,
  observations: [
    ...baseWidgetFilterColumns,
    {
      name: "Model",
      id: "providedModelName",
      type: "stringOptions",
      optionsKey: "model",
      internal: "internalValue",
    },
    {
      name: "Level",
      id: "level",
      type: "stringOptions",
      optionsKey: "level",
      internal: "internalValue",
    },
  ],
  "scores-categorical": [
    ...baseWidgetFilterColumns,
    {
      name: "Score String Value",
      id: "stringValue",
      type: "string",
      internal: "internalValue",
    },
  ],
  "scores-numeric": [
    ...baseWidgetFilterColumns,
    {
      name: "Score Value",
      id: "value",
      type: "number",
      internal: "internalValue",
    },
  ],
};

export const observationLevelOptions = Object.values(ObservationLevel).map(
  (value) => ({ value }),
);

export function getWidgetFilterColumns(params: {
  view: WidgetView;
  options: WidgetFilterOptions;
}): ColumnDefinition[] {
  const optionsByKey = {
    environment: params.options.environmentOptions,
    name: params.options.nameOptions,
    tags: params.options.tagsOptions,
    model: params.options.modelOptions,
    toolNames: params.options.toolNamesOptions,
    level: observationLevelOptions,
  } as const;

  return widgetFilterColumnsByView[params.view].map((column) => ({
    name: column.name,
    id: column.id,
    type: column.type,
    internal: column.internal,
    ...(column.aliases ? { aliases: column.aliases } : {}),
    ...(column.optionsKey ? { options: optionsByKey[column.optionsKey] } : {}),
  })) as ColumnDefinition[];
}

export function getWidgetImportFilterConfig(view: WidgetView): {
  allowedColumns: Set<string>;
  columnAliases: Record<string, string>;
} {
  const allowedColumns = new Set(
    widgetFilterColumnsByView[view].map(
      (column) => column.normalizedId ?? column.id,
    ),
  );

  const columnAliases: Record<string, string> = {
    user: "userId",
    sessionId: "sessionId",
    session: "sessionId",
    traceRelease: "release",
    traceVersion: "version",
  };

  switch (view) {
    case "traces":
      columnAliases.name = "traceName";
      break;
    case "observations":
      columnAliases.name = "observationName";
      columnAliases.observationModelName = "providedModelName";
      break;
    case "scores-categorical":
    case "scores-numeric":
      columnAliases.name = "scoreName";
      break;
  }

  return { allowedColumns, columnAliases };
}
