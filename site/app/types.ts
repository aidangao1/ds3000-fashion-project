export interface Collection {
  id: number;
  designer: string;
  season: string;
  year: number;
  yearAdj: number;
  numLooks: number;
  pc: number[];
  attributes: Record<string, number>;
}

export interface Loading {
  name: string;
  label: string;
  values: number[];
}

export interface DataSet {
  collections: Collection[];
  loadings: Loading[];
  varianceExplained: number[];
  singularValues: number[];
  centroids: Record<string, { pc: number[]; count: number }>;
  distanceMatrix: {
    labels: string[];
    values: number[][];
  };
  correlation: {
    labels: string[];
    values: number[][];
  };
  attributes: string[];
}
