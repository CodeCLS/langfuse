import { ObservationLevel } from "@langfuse/shared";

export const observationLevelOptions = Object.values(ObservationLevel).map(
  (value) => ({ value }),
);
