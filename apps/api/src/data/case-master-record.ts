import type {
  CaseMasterRow,
} from '@kavach/schema-catalog';

import {
  parseNullableDateTime,
  parseNullableInteger,
  parseNullableString,
  parseRequiredBoolean,
  parseRequiredDate,
  parseRequiredDateTime,
  parseRequiredDecimalInRange,
  parseRequiredInteger,
  parseRequiredString,
} from './value-parsers';

export interface CaseMasterRecord {
  caseMasterId: number;

  crimeNumber: string;
  caseNumber: string;
  crimeRegisteredDate: string;

  policePersonId: number;
  policeStationId: number;

  caseCategoryId: number;
  gravityOffenceId: number;

  crimeMajorHeadId: number;
  crimeMinorHeadId: number;

  caseStatusId: number;
  courtId: number | null;

  incidentFromDate: string;
  incidentToDate: string;
  informationReceivedDate: string | null;

  latitude: number;
  longitude: number;

  briefFacts: string | null;

  locationId: number;
  synthetic: boolean;
}

function context(
  column: string,
  rowNumber: number,
) {
  return {
    table: 'CaseMaster',
    column,
    rowNumber,
  };
}

export function parseCaseMasterRow(
  row: CaseMasterRow,
  index: number,
): CaseMasterRecord {
  const rowNumber = index + 2;

  return {
    caseMasterId: parseRequiredInteger(
      row.CaseMasterID,
      context('CaseMasterID', rowNumber),
    ),

    crimeNumber: parseRequiredString(
      row.CrimeNo,
      context('CrimeNo', rowNumber),
    ),

    caseNumber: parseRequiredString(
      row.CaseNo,
      context('CaseNo', rowNumber),
    ),

    crimeRegisteredDate: parseRequiredDate(
      row.CrimeRegisteredDate,
      context('CrimeRegisteredDate', rowNumber),
    ),

    policePersonId: parseRequiredInteger(
      row.PolicePersonID,
      context('PolicePersonID', rowNumber),
    ),

    policeStationId: parseRequiredInteger(
      row.PoliceStationID,
      context('PoliceStationID', rowNumber),
    ),

    caseCategoryId: parseRequiredInteger(
      row.CaseCategoryID,
      context('CaseCategoryID', rowNumber),
    ),

    gravityOffenceId: parseRequiredInteger(
      row.GravityOffenceID,
      context('GravityOffenceID', rowNumber),
    ),

    crimeMajorHeadId: parseRequiredInteger(
      row.CrimeMajorHeadID,
      context('CrimeMajorHeadID', rowNumber),
    ),

    crimeMinorHeadId: parseRequiredInteger(
      row.CrimeMinorHeadID,
      context('CrimeMinorHeadID', rowNumber),
    ),

    caseStatusId: parseRequiredInteger(
      row.CaseStatusID,
      context('CaseStatusID', rowNumber),
    ),

    courtId: parseNullableInteger(
      row.CourtID,
      context('CourtID', rowNumber),
    ),

    incidentFromDate: parseRequiredDateTime(
      row.IncidentFromDate,
      context('IncidentFromDate', rowNumber),
    ),

    incidentToDate: parseRequiredDateTime(
      row.IncidentToDate,
      context('IncidentToDate', rowNumber),
    ),

    informationReceivedDate:
      parseNullableDateTime(
        row.InfoReceivedPSDate,
        context('InfoReceivedPSDate', rowNumber),
      ),

    latitude: parseRequiredDecimalInRange(
      row.latitude,
      -90,
      90,
      context('latitude', rowNumber),
    ),

    longitude: parseRequiredDecimalInRange(
      row.longitude,
      -180,
      180,
      context('longitude', rowNumber),
    ),

    briefFacts: parseNullableString(
      row.BriefFacts,
    ),

    locationId: parseRequiredInteger(
      row.LocationID,
      context('LocationID', rowNumber),
    ),

    synthetic: parseRequiredBoolean(
      row.SyntheticFlag,
      context('SyntheticFlag', rowNumber),
    ),
  };
}