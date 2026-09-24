export type ActionState = {
  error?: string;
  conflict?: boolean;
  ok?: boolean;
  message?: string;
  /** Versão gravada no servidor (autosave/checkpoint). */
  version?: number;
  /** Texto atual no servidor, devolvido em conflito para revisão manual. */
  serverContent?: string;
};
