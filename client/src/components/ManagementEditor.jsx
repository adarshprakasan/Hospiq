import { t as translate, useLocale } from "../i18n";
import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
import { roleLabel } from "../utils";
export default function ManagementEditor({
  entity,
  item,
  hospitals,
  hospitalId,
  platform,
  onClose,
  onSaved
}) {
  useLocale();
  const editing = Boolean(item),
    accounts = ["users", "doctors", "patients"].includes(entity);
  const [form, setForm] = useState(() => ({
    ...(item || {}),
    name: item?.name || "",
    email: item?.email || "",
    role: item?.role || (entity === "doctors" ? "doctor" : entity === "patients" ? "patient" : "staff"),
    hospitalId: item?.hospitalId || hospitalId || "",
    departmentId: item?.departmentId || "",
    type: item?.type || "Hospital",
    address: item?.address || "",
    lat: item?.location?.lat ?? "",
    lng: item?.location?.lng ?? "",
    status: item?.status || "active",
    price: item?.unitPriceMinor == null ? "" : (item.unitPriceMinor / 100).toFixed(2),
    sellingUnit: item?.sellingUnit || "pack"
  }));
  const [departments, setDepartments] = useState([]),
    [doctors, setDoctors] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const selectedHospital = platform ? form.hospitalId : hospitalId;
  const doctor = entity === "doctors" || entity === "users" && form.role === "doctor";
  useEffect(() => {
    let live = true;
    setDepartments([]);
    setDoctors([]);
    if (selectedHospital && (doctor || entity === "appointments")) {
      axios.get(`/management/${doctor ? "departments" : "doctors"}`, {
        params: {
          hospitalId: selectedHospital,
          limit: 100
        }
      }).then(({
        data
      }) => {
        if (live) doctor ? setDepartments(data.items) : setDoctors(data.items);
      }).catch(() => {
        if (live) setError("Unable to load hospital choices");
      });
    }
    return () => {
      live = false;
    };
  }, [selectedHospital, doctor, entity]);
  const change = event => setForm(previous => ({
    ...previous,
    [event.target.name]: event.target.value
  }));
  function input(name, label, options = {}) {
    return <TextField key={name} fullWidth name={name} label={translate(label)} value={form[name] ?? ""} onChange={change} {...options} />;
  }
  function select(name, label, choices, disabled = false) {
    return <TextField key={name} select required fullWidth name={name} label={translate(label)} value={form[name] || ""} onChange={change} disabled={disabled}>{choices.map(([value, text]) => <MenuItem key={value} value={value}>{text}</MenuItem>)}</TextField>;
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let data;
      if (accounts) {
        data = editing && entity !== "doctors" ? {
          name: form.name,
          email: form.email,
          phone: form.phone || "",
          status: form.status
        } : {
          name: form.name,
          email: form.email,
          phone: form.phone || "",
          role: form.role,
          hospitalId: selectedHospital || undefined,
          departmentId: form.departmentId || undefined,
          password: form.password || undefined,
          specialization: form.specialization || "",
          qualifications: (Array.isArray(form.qualifications) ? form.qualifications.join(",") : form.qualifications || "").split(",").map(v => v.trim()).filter(Boolean)
        };
        if (entity === "doctors" && editing) data = {
          name: form.name,
          departmentId: form.departmentId,
          specialization: form.specialization || "",
          qualifications: data.qualifications,
          availabilityStatus: form.availabilityStatus
        };
      } else if (entity === "hospitals") data = {
        name: form.name,
        type: form.type,
        address: form.address,
        location: {
          lat: Number(form.lat),
          lng: Number(form.lng)
        },
        contact: form.contact || "",
        email: form.email || "",
        website: form.website || "",
        ...(editing ? {
          status: form.status,
          ...(platform ? {
            approvalStatus: form.approvalStatus
          } : {})
        } : {})
      };else if (entity === "departments") data = {
        name: form.name,
        ...(form.description ? {
          description: form.description
        } : {}),
        hospitalId: selectedHospital
      };else if (entity === "medications") {
        if (!/^\d+(\.\d{1,2})?$/.test(form.price)) throw new Error("Enter a valid AED price with up to two decimal places");
        data = {
          name: form.name,
          unitPriceMinor: Math.round(Number(form.price) * 100),
          sellingUnit: form.sellingUnit,
          hospitalId: selectedHospital,
          ...(editing ? {
            active: form.active !== false
          } : {})
        };
      } else if (entity === "appointments") data = editing ? {
        status: form.status
      } : {
        hospitalId: selectedHospital,
        doctorId: form.doctorId,
        patientName: form.patientName
      };
      const result = editing ? await axios.patch(`/management/${entity}/${item._id}`, data) : await axios.post(`/management/${entity}`, data);
      onSaved(result.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save this resource");
    } finally {
      setBusy(false);
    }
  }
  const showHospital = platform && entity !== "hospitals" && !editing && !(accounts && ["patient", "admin"].includes(form.role));
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm"><Stack component="form" onSubmit={save}><DialogTitle>{editing ? "Edit" : "Add"} {entity === "users" ? "account" : entity === "appointments" ? "queue visit" : entity.replace(/s$/, "")}</DialogTitle><DialogContent><Stack
      sx={{
        gap: 2,
        pt: 1
      }}>
      {error && <Alert severity="error">{error}</Alert>}
      {entity === "users" && select("role", "Role", (platform ? ["patient", "hospital_admin", "staff", "doctor", "pharmacist", "admin"] : ["staff", "doctor", "pharmacist"]).map(role => [role, roleLabel(role)]), editing)}
      {showHospital && select("hospitalId", translate("Hospital / clinic"), hospitals.map(h => [h._id, h.name]))}
      {entity !== "appointments" && input("name", "Name", {
              required: true
            })}
      {accounts && entity !== "doctors" && input("email", "Login email", {
              required: true,
              type: "email"
            })}
      {accounts && entity === "doctors" && !editing && input("email", "Doctor login email", {
              required: true,
              type: "email"
            })}
      {accounts && !editing && input("password", "Temporary password (optional)", {
              type: "password",
              autoComplete: "new-password",
              helperText: "Leave blank to generate credentials. The user must change them on first login."
            })}
      {accounts && entity !== "doctors" && input("phone", "Contact phone")}
      {accounts && editing && entity !== "doctors" && select("status", "Account status", [["active", "Active"], ["suspended", "Suspended"]])}
      {doctor && <>{select("departmentId", translate("Department"), departments.map(d => [d._id, d.name]))}{input("specialization", "Specialization")}{input("qualifications", "Qualifications (comma separated)")}{editing && entity === "doctors" && select("availabilityStatus", "Availability", [["available", "Available"], ["unavailable", "Unavailable"]])}</>}
      {entity === "hospitals" && <>{select("type", translate("Facility type"), [["Hospital", "Hospital"], ["Clinic", "Clinic"]])}{input("address", "Address", {
                required: true
              })}{input("lat", "Latitude", {
                required: true,
                type: "number",
                slotProps: {
                  htmlInput: {
                    min: -90,
                    max: 90,
                    step: "any"
                  }
                }
              })}{input("lng", "Longitude", {
                required: true,
                type: "number",
                slotProps: {
                  htmlInput: {
                    min: -180,
                    max: 180,
                    step: "any"
                  }
                }
              })}{input("contact", "Contact phone")}{input("email", "Contact email", {
                type: "email"
              })}{input("website", "Website")}{editing && <>{select("status", translate("Status"), [["active", "Active"], ["suspended", "Suspended"]])}{platform && select("approvalStatus", "Registration approval", [["pending", "Pending"], ["approved", "Approved"]])}</>}</>}
      {entity === "departments" && input("description", "Description", {
              multiline: true,
              minRows: 2
            })}
      {entity === "medications" && <>{input("price", "AED per selling unit", {
                required: true
              })}{input("sellingUnit", "Selling unit", {
                required: true
              })}{editing && <FormControlLabel label="Available" control={<Checkbox checked={form.active !== false} onChange={e => setForm(previous => ({
                ...previous,
                active: e.target.checked
              }))} />} />}</>}
      {entity === "appointments" && (editing ? <><Typography>Only valid queue status transitions are accepted. Completed/cancelled visits stay terminal.</Typography>{select("status", translate("Status"), ["pending", "called", "skipped", "completed", "cancelled"].map(value => [value, value]))}</> : <>{select("doctorId", translate("Doctor"), doctors.map(d => [d._id, `${d.name} · ${d.department}`]))}{input("patientName", "Walk-in patient name", {
                required: true
              })}</>)}
    </Stack></DialogContent><DialogActions><Button onClick={onClose} disabled={busy}>{translate("Cancel")}</Button><Button type="submit" variant="contained" disabled={busy}>Save</Button></DialogActions></Stack></Dialog>
  );
}
