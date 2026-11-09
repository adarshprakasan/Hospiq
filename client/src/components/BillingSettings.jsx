import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, Paper, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
export default function BillingSettings({
  hospitalId
}) {
  useLocale();
  const [form, setForm] = useState({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setForm({});
    setError("");
    setNotice("");
    if (hospitalId) axios.get(`/management/billing/${hospitalId}`).then(({
      data
    }) => {
      if (live) setForm({
        ...data,
        iban: ""
      });
    }).catch(err => {
      if (live) setError(err.response?.data?.message || "Unable to load billing settings");
    });
    return () => {
      live = false;
    };
  }, [hospitalId]);
  const change = event => setForm(previous => ({
    ...previous,
    [event.target.name]: event.target.value
  }));
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const {
        data
      } = await axios.put(`/management/billing/${hospitalId}`, {
        billingEmail: form.billingEmail || "",
        taxReference: form.taxReference || "",
        bankName: form.bankName || "",
        accountHolder: form.accountHolder || "",
        iban: form.iban || undefined,
        paymentInstructions: form.paymentInstructions || "",
        onlineEnabled: Boolean(form.onlineEnabled)
      });
      setForm({
        ...data,
        iban: ""
      });
      setNotice("Hospital billing settings saved");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save billing settings");
    } finally {
      setBusy(false);
    }
  }
  async function reveal() {
    try {
      const {
        data
      } = await axios.get(`/management/billing/${hospitalId}?reveal=true`);
      setForm({
        ...data,
        iban: data.iban || ""
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reveal bank details");
    }
  }
  if (!hospitalId) return <Alert severity="info">Select a hospital to manage its banking and payment settings.</Alert>;
  return <Paper component="form" onSubmit={save} sx={{
    p: 3
  }}><Stack gap={3}><Typography variant="h5">Banking & payment settings</Typography><Typography color="text.secondary">AED billing for this facility. Only hospital and Hospiq administrators can view or edit these settings.</Typography>{error && <Alert severity="error">{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}{[["billingEmail", "Billing contact email"], ["taxReference", "Tax / business reference"], ["bankName", "Bank name"], ["accountHolder", "Account holder"]].map(([name, label]) => <TextField key={name} name={name} label={translate(label)} value={form[name] || ""} onChange={change} />)}<TextField name="iban" label={form.bankLast4 ? `IBAN (saved account ends ${form.bankLast4})` : "IBAN"} value={form.iban || ""} onChange={change} helperText="Leave blank to preserve the saved IBAN. Bank identifiers are encrypted." />{form.bankLast4 && <Button onClick={reveal}>Reveal saved IBAN (audited)</Button>}<TextField name="paymentInstructions" label="Payment instructions" multiline minRows={2} value={form.paymentInstructions || ""} onChange={change} /><FormControlLabel control={<Checkbox checked={Boolean(form.onlineEnabled)} onChange={e => setForm(previous => ({
        ...previous,
        onlineEnabled: e.target.checked
      }))} />} label="Allow online checkout when platform Stripe is configured" /><Alert severity="info">Bank details saved here are administrative records. They do not change Stripe payouts. Online payments currently use the configured platform merchant; separate hospital settlement requires Stripe Connect onboarding.</Alert><Button type="submit" variant="contained" disabled={busy}>Save billing settings</Button></Stack></Paper>;
}
