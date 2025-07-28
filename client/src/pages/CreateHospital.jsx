import { useState } from "react";
import axios from "../api/axios";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function CreateHospital() {
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
    website: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const [lat, lng] = formData.location.split(",").map(Number);
      const data = {
        ...formData,
        location: { lat, lng },
        departments:
          formData.type === "Clinic" && formData.departments
            ? [formData.departments.trim()]
            : [],
      };

      await axios.post("/hospitals/create", data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Hospital created successfully!");
      setOpen(false);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating hospital:", error);
      alert("Failed to create hospital.");
    }
  };

  return (
    <Box p={3}>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          navigate("/dashboard");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Hospital or Clinic</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Location (lat,lng)"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            select
            label="Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
          >
            <MenuItem value="Hospital">Hospital</MenuItem>
            <MenuItem value="Clinic">Clinic</MenuItem>
          </TextField>
          {formData.type === "Clinic" && (
            <TextField
              fullWidth
              margin="normal"
              label="Department"
              name="departments"
              value={formData.departments}
              onChange={handleChange}
              required
            />
          )}
          <TextField
            fullWidth
            margin="normal"
            label="Contact Number"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Website"
            name="website"
            value={formData.website}
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
              navigate("/dashboard");
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
