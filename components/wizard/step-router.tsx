"use client";

import { useBooking } from "@/hooks/use-booking";
import { StepService } from "./steps/step-service";
import { StepLocation } from "./steps/step-location";
import { StepProvider } from "./steps/step-provider";
import { StepDateTime } from "./steps/step-datetime";
import { StepPatient } from "./steps/step-patient";
import { StepInsurance } from "./steps/step-insurance";
import { StepConfirm } from "./steps/step-confirm";

export function StepRouter() {
  const { step } = useBooking();
  switch (step) {
    case "service":
      return <StepService />;
    case "location":
      return <StepLocation />;
    case "provider":
      return <StepProvider />;
    case "datetime":
      return <StepDateTime />;
    case "patient":
      return <StepPatient />;
    case "insurance":
      return <StepInsurance />;
    case "confirm":
      return <StepConfirm />;
  }
}
