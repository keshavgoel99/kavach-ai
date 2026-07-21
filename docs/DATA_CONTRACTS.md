# Kavach AI Data Contracts

## Raw CSV layer

The raw dataset contracts live in:

`packages/schema-catalog/src/core-rows.ts`

At this layer:

- column names exactly match the supplied CSV files
- every value is represented as a string
- missing values are represented by empty strings
- no database row is exposed directly to the desktop application

## Conversion layer

The API dataset loader will convert:

- integer strings to numbers
- decimal coordinate strings to numbers
- `0` and `1` values to booleans
- empty strings to `null`
- source date strings to consistent ISO strings

Invalid values must produce a dataset validation error rather than
silently becoming `NaN`, `false`, or an invalid date.

## API layer

The public case contracts live in:

`packages/shared-types/src/case.ts`

The API uses:

- camelCase property names
- joined lookup names
- explicit nullable values
- paginated case-list responses
- expanded case-detail responses

## Sensitive demographic fields

Religion and caste remain part of the protected internal dataset.

They are not included in the MVP case API response and must not be used
for person-level risk scoring, suspect ranking, or enforcement decisions.