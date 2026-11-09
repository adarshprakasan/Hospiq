import { t as translate, useLocale } from "../i18n";
import OperationalMetrics from "../components/OperationalMetrics";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from "@mui/material";
import axios from "../api/axios";
import { roleLabel, storedUser } from "../utils";
import ManagementEditor from "../components/ManagementEditor";
import BillingSettings from "../components/BillingSettings";
import PharmacyOrderCard from "../components/PharmacyOrderCard";
const resources = [["overview", "Overview"], ["hospitals", "Hospitals & clinics"], ["users", "Accounts & access"], ["patients", "Patients"], ["doctors", "Doctors"], ["departments", "Departments"], ["appointments", "Appointment queue"], ["schedules", "Doctor schedules"], ["medications", "Medication catalogue"], ["pharmacy", "Pharmacy orders"], ["billing", "Banking & payments"], ["audit", "Audit history"]];
const columns = {
  users: [["name", "Name"], ["email", "Login email"], ["role", "Role"], ["hospitalId", "Facility"], ["status", "Status"]],
  patients: [["name", "Name"], ["publicId", "Patient ID"], ["email", "Email"], ["phone", "Phone"]],
  hospitals: [["name", "Name"], ["type", "Type"], ["address", "Address"], ["approvalStatus", "Approval"], ["status", "Status"]],
  doctors: [["name", "Name"], ["department", "Department"], ["hospitalId", "Facility"], ["availabilityStatus", "Availability"]],
  departments: [["name", "Name"], ["hospitalId", "Facility"], ["description", "Description"]],
  medications: [["name", "Medicine / strength"], ["hospitalId", "Facility"], ["unitPriceMinor", "AED per unit"], ["sellingUnit", "Unit"], ["active", "Available"]],
  appointments: [["tokenNumber", "Token"], ["patientName", "Patient / walk-in"], ["doctorId", "Doctor ID"], ["date", "Visit date"], ["status", "Status"]],
  pharmacy: [["tokenLabel", "Pharmacy token"], ["patientName", "Patient"], ["hospitalName", "Facility"], ["status", "Preparation"], ["totalMinor", "Total AED"], ["paymentStatus", "Payment"]],
  schedules: [["doctorId", "Doctor ID"], ["weeklySchedule", "Weekly schedule"], ["updatedAt", "Last updated"]],
  audit: [["createdAt", "Time"], ["actorRole", "Actor role"], ["entity", "Resource"], ["action", "Action"], ["state", "Result"]]
};
export default function AdministrationPage() {
  useLocale();
  const user = storedUser(),
    platform = user?.role === "admin";
  const [entity, setEntity] = useState("overview"),
    [hospitalId, setHospitalId] = useState(platform ? "" : user?.hospitalId || "");
  const [hospitals, setHospitals] = useState([]),
    [summary, setSummary] = useState(null),
    [items, setItems] = useState([]),
    [total, setTotal] = useState(0);
  const [acting, setActing] = useState(false);
  const [page, setPage] = useState(0),
    [limit, setLimit] = useState(20),
    [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [editor, setEditor] = useState(null),
    [detail, setDetail] = useState(null),
    [confirm, setConfirm] = useState(null),
    [credentials, setCredentials] = useState(null),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    if (!platform && !hospitalId) return;
    let live = true;
    axios.get("/management/hospitals", {
      params: {
        limit: 100
      }
    }).then(({
      data
    }) => {
      if (live) setHospitals(data.items);
    }).catch(err => {
      if (live) setError(err.response?.data?.message || "Unable to load facilities");
    });
    return () => {
      live = false;
    };
  }, [platform, hospitalId, revision]);
  useEffect(() => {
    if (!platform && !hospitalId) return;
    let live = true;
    setLoading(true);
    setError("");
    const params = {
      hospitalId: hospitalId || undefined,
      page: page + 1,
      limit,
      q: search || undefined,
      archived
    };
    const request = entity === "overview" ? axios.get("/management/summary", {
      params
    }) : entity === "billing" ? Promise.resolve(null) : axios.get(`/management/${entity}`, {
      params
    });
    request.then(result => {
      if (!live || !result) return;
      if (entity === "overview") setSummary(result.data);else {
        setItems(result.data.items);
        setTotal(result.data.total);
      }
    }).catch(err => {
      if (live) setError(err.response?.data?.message || "Unable to load administration data");
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [entity, platform, hospitalId, page, limit, search, archived, revision]);
  function choose(next) {
    setEntity(next);
    setItems([]);
    setPage(0);
    setQ("");
    setSearch("");
    setArchived(false);
    setError("");
    setNotice("");
  }
  function display(key, value) {
    if (value == null || value === "") return "—";
    if (key === "hospitalId") return hospitals.find(h => h._id === String(value))?.name || String(value);
    if (["role", "actorRole"].includes(key)) return roleLabel(value);
    if (["unitPriceMinor", "totalMinor"].includes(key)) return (Number(value) / 100).toFixed(2);
    if (["createdAt", "updatedAt", "paidAt"].includes(key)) return new Date(value).toLocaleString();
    if (key === "weeklySchedule") return value.map(day => `${day.day}: ${day.isAvailable ? `${day.startTime}–${day.endTime}` : "off"}`).join(" · ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return Object.entries(value).map(([name, item]) => `${name}: ${item}`).join(" · ");
    return String(value);
  }
  async function action() {
    if (acting) return;
    setActing(true);
    setError("");
    try {
      const {
        kind,
        item
      } = confirm;
      if (kind === "reset") {
        const {
          data
        } = await axios.post(`/management/users/${item._id}/reset-password`);
        setCredentials(data.credentials);
      } else if (kind === "restore") await axios.post(`/management/${entity}/${item._id}/restore`);else await axios.delete(`/management/${entity}/${item._id}`);
      setConfirm(null);
      setNotice(kind === "archive" ? "Archived. Historical data is preserved." : kind === "restore" ? "Resource restored" : "Temporary credentials issued; existing sessions revoked");
      refresh();
    } catch (err) {
      setConfirm(null);
      setError(err.response?.data?.message || "Unable to complete this action");
    } finally {
      setActing(false);
    }
  }
  const title = resources.find(([key]) => key === entity)?.[1];
  const canEdit = !["audit", "schedules", "pharmacy"].includes(entity) && !(entity === "patients" && !platform);
  const canCreate = ["users", "doctors", "departments", "medications", "appointments"].includes(entity) || platform && ["hospitals", "patients"].includes(entity);
  const canArchive = !["audit", "schedules"].includes(entity) && !(entity === "patients" && !platform);
  if (!platform && !hospitalId) return <Container sx={{
    mt: 4
  }}><Paper sx={{
      p: 4
    }}><Typography variant="h4">Welcome, hospital administrator</Typography><Typography my={2}>Set up your hospital or clinic, then organize its departments and care team.</Typography><Button component={Link} to="/create-hospital" variant="contained">Set up hospital / clinic</Button></Paper></Container>;
  const cards = summary ? [[translate("Hospitals"), summary.hospitals], [translate("Clinics"), summary.clinics], [platform ? "Registered patients" : "Patients served", summary.counts.patient || 0], ["Doctors", summary.doctorProfiles], ["Hospital admins", summary.counts.hospital_admin || 0], ["Queue staff", summary.counts.staff || 0], ["Pharmacists", summary.counts.pharmacist || 0], ["Departments", summary.departments], ["Visits today", summary.visitsToday], ["Pharmacy pending", summary.pendingPharmacy], [translate("Ready for payment"), summary.readyPharmacy]] : [];
  return <Container maxWidth="xl" sx={{
    mt: 3
  }}>
    <Box className="page-hero"><Typography variant="overline">{platform ? "HOSPIQ PLATFORM CONTROL" : "FACILITY ADMINISTRATION"}</Typography><Typography variant="h4">{platform ? "Hospiq Admin" : `${hospitals.find(h => h._id === hospitalId)?.type || "Hospital / Clinic"} Admin`}</Typography><Typography mt={1}>{platform ? "A complete operational view of facilities, people, access and billing." : "Manage your care team, departments, operations and hospital payment settings."}</Typography></Box>
    {platform && <TextField select fullWidth label="Facility scope" slotProps={{
      select: {
        displayEmpty: true
      },
      inputLabel: {
        shrink: true
      }
    }} value={hospitalId} onChange={e => {
      setHospitalId(e.target.value);
      setPage(0);
    }} sx={{
      mb: 3
    }}><MenuItem value="">All hospitals and clinics</MenuItem>{hospitals.map(h => <MenuItem key={h._id} value={h._id}>{h.name}</MenuItem>)}</TextField>}
    <Box sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        md: "215px minmax(0, 1fr)"
      },
      gap: 3,
      alignItems: "start"
    }}>
      <Paper component="nav" aria-label="Administration sections" sx={{
        p: 1,
        display: "flex",
        flexDirection: {
          xs: "row",
          md: "column"
        },
        flexWrap: {
          xs: "wrap",
          md: "nowrap"
        },
        gap: .5,
        position: {
          md: "sticky"
        },
        top: 100
      }}>{resources.map(([key, label]) => <Button key={key} variant={key === entity ? "contained" : "text"} onClick={() => choose(key)} sx={{
          justifyContent: "flex-start"
        }}>{translate(label)}</Button>)}</Paper>
      <Stack gap={3} minWidth={0}>
        {error && <Alert severity="error" action={<Button onClick={refresh}>{translate("Retry")}</Button>}>{error}</Alert>}{notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}
        <Stack direction="row" gap={2} alignItems="center"><Typography variant="h5" sx={{
            flex: 1
          }}>{translate(title)}</Typography><Button onClick={refresh}>{translate("Refresh")}</Button>{canCreate && <Button variant="contained" onClick={() => setEditor({
            item: null
          })}>+ Add {entity === "users" ? "account" : entity === "appointments" ? "walk-in" : entity.replace(/s$/, "")}</Button>}</Stack>
        {entity === "overview" && <><OperationalMetrics /><Box className="stat-grid">{cards.map(([label, number]) => <Paper key={translate(label)} sx={{
              p: 2.5
            }}><Typography color="text.secondary">{translate(label)}</Typography><Typography variant="h4" mt={1}>{number}</Typography></Paper>)}</Box><Alert severity="info">Clinical records and lab files remain patient-controlled. Administrative patient views contain identity/contact and operational information.</Alert><Paper sx={{
            p: 3
          }}><Typography variant="h6">Clear responsibilities</Typography><Typography mt={1}>Administrators manage people, departments and billing. Staff manage queues and schedules. Pharmacists own medicine availability and dispensing. Doctors own clinical visits and availability.</Typography><Stack direction="row" gap={1} mt={2} flexWrap="wrap"><Button onClick={() => choose("users")}>Manage accounts</Button><Button onClick={() => choose("departments")}>Organize departments</Button><Button onClick={() => choose("billing")}>Payment settings</Button><Button onClick={() => choose("audit")}>Review audit history</Button></Stack></Paper></>}
        {entity === "billing" && <BillingSettings hospitalId={hospitalId} />}
        {!["overview", "billing"].includes(entity) && <>
          <Stack component="form" onSubmit={event => {
            event.preventDefault();
            setSearch(q);
            setPage(0);
          }} direction={{
            xs: "column",
            sm: "row"
          }} gap={2}><TextField fullWidth label="Search name or email" value={q} onChange={e => setQ(e.target.value)} /><Button type="submit" variant="outlined">Search</Button>{!["audit", "schedules"].includes(entity) && <TextField select label="Visibility" value={archived ? "archived" : "active"} onChange={e => {
              setArchived(e.target.value === "archived");
              setPage(0);
            }} sx={{
              minWidth: 170
            }}><MenuItem value="active">Current records</MenuItem><MenuItem value="archived">Archived records</MenuItem></TextField>}</Stack>
          {loading ? <CircularProgress aria-label="Loading administration records" /> : <Paper><TableContainer><Table size="small"><TableHead><TableRow>{(columns[entity] || []).map(([key, label]) => <TableCell key={key}>{translate(label)}</TableCell>)}<TableCell>Actions</TableCell></TableRow></TableHead><TableBody>{items.map(item => <TableRow key={item._id} hover>{(columns[entity] || []).map(([key]) => <TableCell key={key} sx={{
                      maxWidth: 250,
                      overflowWrap: "anywhere"
                    }}>{["status", "paymentStatus", "approvalStatus"].includes(key) ? <Chip size="small" label={display(key, item[key] || "active")} /> : display(key, item[key])}</TableCell>)}<TableCell><Stack direction="row" flexWrap="wrap" gap={.5}><Button size="small" onClick={() => setDetail(item)}>View</Button>{!archived && canEdit && <Button size="small" onClick={() => setEditor({
                          item
                        })}>Edit</Button>}{entity === "doctors" && !archived && <Button component={Link} to={`/schedule?hospitalId=${item.hospitalId}&doctorId=${item._id}`} size="small">Schedule</Button>}{entity === "schedules" && <Button component={Link} to={`/schedule?hospitalId=${hospitalId || ""}&doctorId=${item.doctorId}`} size="small">Edit schedule</Button>}{entity === "users" && !archived && item.role !== "patient" && item._id !== (user?._id || user?.id) && <Button size="small" onClick={() => setConfirm({
                          kind: "reset",
                          item
                        })}>Reset login</Button>}{canArchive && item._id !== (user?._id || user?.id) && <Button size="small" color={archived ? "primary" : "error"} onClick={() => setConfirm({
                          kind: archived ? "restore" : "archive",
                          item
                        })}>{archived ? "Restore" : "Archive"}</Button>}</Stack></TableCell></TableRow>)}</TableBody></Table></TableContainer>{!items.length && <Typography sx={{
              p: 3
            }} color="text.secondary">No records match this view.</Typography>}<TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[20, 50, 100]} onPageChange={(_event, next) => setPage(next)} onRowsPerPageChange={e => {
              setLimit(Number(e.target.value));
              setPage(0);
            }} /></Paper>}
        </>}
      </Stack>
    </Box>
    {editor && <ManagementEditor entity={entity} item={editor.item} hospitals={hospitals} hospitalId={hospitalId} platform={platform} onClose={() => setEditor(null)} onSaved={data => {
      setEditor(null);
      setNotice("Saved successfully");
      if (data.credentials) setCredentials(data.credentials);
      refresh();
    }} />}
    <Dialog open={Boolean(credentials)} onClose={() => setCredentials(null)} fullWidth maxWidth="sm"><DialogTitle>Temporary login credentials</DialogTitle><DialogContent><Stack gap={2}><Alert severity="info">Share securely with the account owner. These credentials are shown only now; the user must change the password at first login.</Alert><TextField label="Login email" value={credentials?.email || ""} slotProps={{
            input: {
              readOnly: true
            }
          }} /><TextField label="Temporary password" value={credentials?.password || ""} slotProps={{
            input: {
              readOnly: true
            }
          }} /></Stack></DialogContent><DialogActions><Button onClick={() => setCredentials(null)}>I have saved the credentials</Button></DialogActions></Dialog>
    <Dialog open={Boolean(confirm)} onClose={acting ? undefined : () => setConfirm(null)} fullWidth maxWidth="xs"><DialogTitle>{confirm?.kind === "archive" ? "Archive this record?" : confirm?.kind === "restore" ? "Restore this record?" : "Issue new temporary credentials?"}</DialogTitle><DialogContent><Typography>{confirm?.kind === "archive" ? "This removes it from active operations while preserving historical references. It can be restored." : confirm?.kind === "restore" ? "The resource will be available again. A restored doctor remains unavailable until reviewed." : "Existing sessions will be revoked. Share the new credentials with the account owner."}</Typography></DialogContent><DialogActions><Button disabled={acting} onClick={() => setConfirm(null)}>{translate("Cancel")}</Button><Button disabled={acting} variant="contained" onClick={action}>{acting ? "Working…" : translate("Confirm")}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="md"><DialogTitle>{translate(title)} details</DialogTitle><DialogContent>{detail && entity === "pharmacy" ? <PharmacyOrderCard order={detail} pharmacist apiBase="/management/pharmacy" onUpdated={data => {
          setDetail(data);
          refresh();
        }} /> : detail && <Stack divider={<Divider />} gap={1}>{Object.entries(detail).filter(([key]) => !["__v", "id"].includes(key)).map(([key, value]) => <Box key={key} py={1}><Typography variant="caption" color="text.secondary">{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</Typography><Typography sx={{
              overflowWrap: "anywhere"
            }}>{display(key, value)}</Typography></Box>)}</Stack>}</DialogContent><DialogActions><Button onClick={() => setDetail(null)}>{translate("Close")}</Button></DialogActions></Dialog>
  </Container>;
}
