# Hospital medication catalogue and prescribing

## Manage available medications

Sign in as a hospital-linked **pharmacist** and open **Medications** from the pharmacy dashboard. Add a medicine's name, strength, and form together, for example `Example medicine 500 mg tablet`, plus its AED price and selling unit (pack, tablet, etc.). Different strengths must be separate entries. Only pharmacists manage the catalogue; doctors read the list from their linked clinical hospital. Hospital/Clinic Admins create and assign employee accounts through their console.

Search the list or remove entries that are no longer available. Removal deactivates the entry for new prescriptions, preserving its identity and earlier prescription snapshots. Adding the same exact name again reactivates it. This is an availability catalogue, not stock counts, dispensing, or interaction checking.

## Prescribe during a visit

1. Open the patient's visit record form and select **+ Add medication**.
2. Search the hospital dropdown by medicine name, strength, or form and select an available entry. There is no separate dosage field.
3. Check one or more of **Morning**, **Noon**, and **Night**.
4. The **Start date** defaults to today in the browser's local calendar. Select a required **End date** on or after the start date. Same-day courses are allowed; the start date remains editable.
5. Optionally check **Before food** or **After food**. Choosing one clears the other; both can be cleared.
6. Enter instructions as before. Add more medicines or remove a row, then save the visit.

Ask the pharmacist to maintain the catalogue, then use **Refresh medication list** after catalogue changes without losing the draft. If a selected medicine becomes unavailable before saving, the server rejects it and asks for a refresh. Saving completes the doctor's visit and opens a pharmacy handoff popup; see [Pharmacy](PHARMACY.md).

Patients adding historical/external visits can enter a medicine name and strength manually, with the same schedule controls. They are not limited to medicines currently available at a hospital. Older records retain their previous dose, frequency, and duration text in history.

## Demo test

```powershell
npm --prefix server run seed:medications
```

After the large demo dataset exists, this adds 48 explicitly fictional entries, eight per demo hospital, including two strengths of the same named medicine. Repeated runs preserve existing availability and do not duplicate entries. It does not populate real hospitals.

Run `npm --prefix server run seed:pharmacy` after the medication seed to add pharmacist accounts and prices. Sign in as `pharmacist01@demo.hospiq.invalid`, open **Medications**, and search `Alpha` to see separate 250 mg and 500 mg test entries. As `doctor01@demo.hospiq.invalid`, open a called or completed patient visit and add a medicine with Morning/Night, a date range, After food, and fictional instructions. Save and check the schedule from the patient history. Verify an end date before the start date is rejected. As the pharmacist, remove the medicine from the catalogue and confirm saved histories/bills remain readable.

## API

Catalogue reads require a doctor/staff/pharmacist login and derive the hospital from that account; callers cannot select another hospital in the request. Writes require the pharmacist role.

| Route | Purpose |
|---|---|
| `GET /api/medications` | Sorted active catalogue for the account's hospital |
| `POST /api/medications` | Pharmacist: add/reactivate `{ "name": "Medicine name strength form", "unitPriceMinor": 1250, "sellingUnit": "pack" }` |
| `PATCH /api/medications/:id` | Pharmacist: update integer-fils price and selling unit |
| `DELETE /api/medications/:id` | Deactivate an entry owned by this hospital |

New prescription entries include `name`, `medicationId` (hospital selection), `times` (one or more of `morning`, `noon`, `night`), `startDate`, `endDate` (calendar strings `YYYY-MM-DD`), `foodTiming` (`before`, `after`, or empty), and `instructions`. When a catalogue ID is supplied, the server requires an active entry from the treating doctor's hospital and stores its authoritative name/strength as a historical snapshot. Older API clients may still submit legacy free-text medication entries; saved legacy data remains readable.

The regression suite covers valid schedules, invalid dates, reversed date ranges, duplicate/unknown time slots, invalid food timing, and legacy compatibility. The isolated integration suite checks catalogue role/hospital isolation, authoritative medication names, inactive entry rejection, and history preservation.
