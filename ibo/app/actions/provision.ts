export type { ActionState } from "./state";

export {
  updateRedacao,
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
