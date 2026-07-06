/** Client-safe workspace context shape (matches API JSON). */
export type EmWorkspaceContextDto = {
  jsrNumber: string | null;
  aarStartDate: string | null;
  aarEndDate: string | null;
  matterNumber: string | null;
  requestingDirector: string | null;
  clientName: string | null;
  requestingDepartment: string | null;
  receivingDepartment: string | null;
  aarLocation: string | null;
  billingPocName: string | null;
  billingPocEmail: string | null;
  clientPocName: string | null;
  legacyClientId: string | null;
  d365ClientId: string | null;
  operationStartDate: string | null;
  operationEndDate: string | null;
  tsheetsBased: boolean;
  aarRequired: boolean;
  costTransferMode: "default" | "custom";
  costTransferDefaultRate: number;
  costTransferCustomRate: number | null;
  secondaryMatterNumber: string | null;
};
