"use client";
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#ff4081", // Màu hồng năng động, rất hợp style photobooth
    },
    secondary: {
      main: "#7c4dff",
    },
    background: {
      default: "#f8f9fa",
    },
  },
  typography: {
    fontFamily: "inherit",
  },
});

export default theme;
