"use server";

import { requireUser } from "@/lib/auth";
import { carregarCandidatosVinculo } from "@/lib/nova-mesa-vinculos";
import type { CandidatoVinculo } from "@/lib/nova-mesa-poc/vinculos";

/** Candidatos de vínculo (Estatuto registrado) para a Mesa e para a leitura dos membros. */
export async function listarCandidatosVinculo(): Promise<CandidatoVinculo[]> {
  await requireUser();
  return carregarCandidatosVinculo();
}