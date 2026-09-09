import cap1 from "./seed-data/cap1.json";
import cap2 from "./seed-data/cap2.json";
import cap3 from "./seed-data/cap3.json";
import cap4 from "./seed-data/cap4.json";
import cap5 from "./seed-data/cap5.json";
import cap6 from "./seed-data/cap6.json";
import art27 from "./seed-data/art-27.json";
import cap7 from "./seed-data/cap7.json";

export interface OriginalPosition {
  numero: string | null;
  titulo: string | null;
  parentId: string | null;
  order: number;
}

interface SeedNode {
  id: string;
  numero?: string | null;
  titulo?: string | null;
  filhos?: SeedNode[];
}

// Immutable import metadata, keyed by identity rather than the mutable number.
export const originalPositions = new Map<string, OriginalPosition>();
function collect(nodes: SeedNode[], parentId: string | null) {
  nodes.forEach((node, order) => {
    originalPositions.set(node.id, { numero: node.numero ?? null, titulo: node.titulo ?? null, parentId, order });
    collect(node.filhos ?? [], node.id);
  });
}
collect([cap1, cap2, cap3, cap4, cap5, cap6, art27, cap7], null);
