import React from "react";
import { Button, Stack } from "@mui/material";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import { NavLink } from "react-router-dom";

const sections = [
  {
    to: "/admin/documents",
    label: "Документы",
    icon: <DescriptionRoundedIcon fontSize="small" />,
  },
  {
    to: "/admin/stats",
    label: "Статистика",
    icon: <InsightsRoundedIcon fontSize="small" />,
  },
];

const AdminSectionNav: React.FC = () => {
  return (
    <Stack
      direction="row"
      spacing={1}
      flexWrap="wrap"
      useFlexGap
      aria-label="Разделы админки"
    >
      {sections.map((section) => (
        <Button
          key={section.to}
          component={NavLink}
          to={section.to}
          end
          variant="outlined"
          startIcon={section.icon}
          sx={{
            minHeight: 44,
            px: 2,
            borderRadius: 999,
            color: "text.secondary",
            fontWeight: 700,
            textTransform: "none",
            borderColor: (theme) => theme.palette.divider,
            "&:hover": {
              borderColor: "primary.main",
              color: "text.primary",
            },
            "&[aria-current='page']": {
              color: "primary.contrastText",
              borderColor: "primary.main",
              background: (theme) =>
                `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            },
          }}
        >
          {section.label}
        </Button>
      ))}
    </Stack>
  );
};

export default AdminSectionNav;
