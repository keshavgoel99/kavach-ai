export type HotspotRiskBand =
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'CRITICAL';

export type HotspotTrendDirection =
  | 'RISING'
  | 'STABLE'
  | 'FALLING';

export type HotspotDataSplit =
  | 'train'
  | 'validation'
  | 'test';

export interface HotspotPeriod {
  key: string;

  year: number;
  month: number;

  label: string;
}

export interface HotspotDistrictOption {
  id: number;
  name: string;
}

export interface HotspotPoliceStationOption {
  id: number;
  name: string;

  districtId: number;
}

export interface HotspotLocationReference {
  id: number;

  name: string;
  zoneType: string;

  latitude: number;
  longitude: number;

  district:
    HotspotDistrictOption;

  policeStation:
    HotspotPoliceStationOption;
}

export interface HotspotMonthlyMetric {
  period: HotspotPeriod;

  crimeCount: number;

  lag1CrimeCount: number;

  lag3AverageCrimeCount: number;

  lag12CrimeCount: number;

  averageSeverity: number;

  dominantCrimeType: string;

  pressureScore: number;

  riskBand:
    HotspotRiskBand;

  trendDirection:
    HotspotTrendDirection;

  dataSplit:
    HotspotDataSplit;
}

export interface HotspotSummaryItem
  extends HotspotMonthlyMetric {
  location:
    HotspotLocationReference;
}

export interface HotspotSummaryQuery {
  year?: number;
  month?: number;

  districtIds?: number[];

  policeStationIds?: number[];

  riskBands?:
    HotspotRiskBand[];

  limit?: number;
}

export interface HotspotTrendQuery {
  months?: number;
}

export interface HotspotSummaryResponse {
  period:
    HotspotPeriod;

  matchingLocations: number;

  returnedLocations: number;

  totalCrimeCount: number;

  averagePressureScore: number;

  criticalLocationCount: number;

  highLocationCount: number;

  items:
    HotspotSummaryItem[];

  generatedAt: string;

  methodology: string;

  responsibleUse: string;

  excludedInputs: string[];
}

export interface HotspotFilterOptions {
  periods:
    HotspotPeriod[];

  defaultPeriod:
    HotspotPeriod;

  districts:
    HotspotDistrictOption[];

  policeStations:
    HotspotPoliceStationOption[];

  riskBands:
    HotspotRiskBand[];

  maximumResultLimit: number;
}

export interface HotspotLocationTrendResponse {
  location:
    HotspotLocationReference;

  points:
    HotspotMonthlyMetric[];

  generatedAt: string;

  methodology: string;

  responsibleUse: string;

  excludedInputs: string[];
}
