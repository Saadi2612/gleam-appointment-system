export const MEDICAL_CONDITIONS = [
  "High blood pressure",
  "Diabetes",
  "Heart disease",
  "Heart murmur",
  "Asthma",
  "Thyroid condition",
  "Kidney disease",
  "Liver disease",
  "Bleeding disorder",
  "Pregnant / nursing",
  "Anxiety / depression",
  "Artificial joint or valve",
];

export const COMMON_ALLERGIES = [
  "Penicillin",
  "Amoxicillin",
  "Latex",
  "Codeine",
  "Sulfa drugs",
  "Aspirin / NSAIDs",
  "Local anesthetic",
  "Iodine",
];

export const INTAKE_SECTIONS = ["medical", "allergies", "medications", "hipaa", "signature"] as const;
export type IntakeSectionId = (typeof INTAKE_SECTIONS)[number];
