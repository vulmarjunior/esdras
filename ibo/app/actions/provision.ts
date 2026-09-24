export type { ActionState } from "./state";

export {
  updateRedacao,
  autosaveRedacao,
  sobrescreverRedacao,
  getRedacaoVersions,
  restoreRedacaoVersion,
  updateJustificativa,
  updateHistoricalText,
  setStatus,
  setAlteracaoTipo,
} from "./redacao";

export {
  createProvision,
  updateProvision,
  updateProvisionTitle,
  setTagNovo,
  setOrigemReferencia,
  moveProvision,
  moveProposalProvision,
  deleteProvision,
  restoreProvision,
} from "./dispositivos";

export {
  createSuggestion,
  updateSuggestionStatus,
  createComment,
  createPendingIssue,
  resolvePending,
  createReference,
  addProvisionRelation,
  removeProvisionRelation,
} from "./colaboracao";

export {
  getTodasCorrespondencias,
  getCorrespondencias,
  addCorrespondence,
  updateCorrespondence,
  removeCorrespondence,
} from "./correspondencias";
export type { CorrespondenciaRegistro } from "./correspondencias";
