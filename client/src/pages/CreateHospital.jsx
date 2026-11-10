import { t as translate, useLocale } from "../i18n";
import { useState } from "react";
import axios from "../api/axios";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
export default function CreateHospital() {
  useLocale();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [open, setOpen] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    location: "",
    departments: "",
    type: "Hospital",
    contact: "",
    email: "",
    website: ""
  });
  const handleChange = e => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  const handleSubmit = async () => {
    try {
      const coordinates = formData.location.split(",").map(v => v.trim());
      const [lat, lng] = coordinates.map(Number);
      if (coordinates.length !== 2 || coordinates.some(v => !v) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        alert("Enter valid latitude and longitude separated by a comma");
        return;
      }
      const data = {
        ...formData,
        location: {
          lat,
          lng
        },
        departments: formData.type === "Clinic" && formData.departments ? [formData.departments.trim()] : []
      };
      const { data: registration } = await axios.post("/hospitals/create", data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const profile = await axios.get("/auth/me");
      localStorage.setItem("user", JSON.stringify(profile.data));
      alert(registration.message);
      setOpen(false);
      navigate("/hospital-admin");
    } catch (error) {
      console.error("Error creating hospital:", error);
      alert(error.response?.data?.message || "Failed to create hospital.");
    }
  };
  return (
    <Box sx={{
      p: 3
    }}>
        <Dialog open={open} onClose={() => {
        setOpen(false);
        navigate("/hospital-admin");
      }} fullWidth maxWidth="sm">
          <DialogTitle>Add Hospital or Clinic</DialogTitle>
          <DialogContent>
            <TextField fullWidth margin="normal" label="Name" name="name" value={formData.name} onChange={handleChange} required />
            <TextField fullWidth margin="normal" label="Address" name="address" value={formData.address} onChange={handleChange} required />
            <TextField fullWidth margin="normal" label="Location (lat,lng)" name="location" value={formData.location} onChange={handleChange} required />
            <TextField fullWidth margin="normal" select label="Type" name="type" value={formData.type} onChange={handleChange}>
              <MenuItem value="Hospital">Hospital</MenuItem>
              <MenuItem value="Clinic">Clinic</MenuItem>
            </TextField>
            {formData.type === "Clinic" && <TextField fullWidth margin="normal" label={translate("Department")} name="departments" value={formData.departments} onChange={handleChange} required />}
            <TextField fullWidth margin="normal" label="Contact Number" name="contact" value={formData.contact} onChange={handleChange} />
            <TextField fullWidth margin="normal" label={translate("Email")} name="email" type="email" value={formData.email} onChange={handleChange} />
            <TextField fullWidth margin="normal" label="Website" name="website" value={formData.website} onChange={handleChange} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
            setOpen(false);
            navigate("/hospital-admin");
          }}>{translate("Cancel")}</Button>
            <Button onClick={handleSubmit} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
}
