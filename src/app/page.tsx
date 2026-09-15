import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CameraBooth from "@/components/CameraBooth";

export default function Home() {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          py: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            color="primary"
            gutterBottom
          >
            📸 Photobool Booth
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cười thật tươi và sẵn sàng cho những khoảnh khắc tuyệt vời!
          </Typography>
        </Box>

        <CameraBooth />
      </Box>
    </Container>
  );
}
