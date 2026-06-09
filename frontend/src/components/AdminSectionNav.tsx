import React, { useEffect, useState } from "react";
import { Badge, Button, Stack } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { NavLink } from "react-router-dom";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { useAuth } from "../auth/AuthContext";
import { getAdminSubmissions } from "../api/library";

const sections = [
  {
    to: "/admin/moderation",
    label: "Модерация",
    icon: <CheckCircleOutlineRoundedIcon fontSize="small" />,
  },
  {
    to: "/admin/documents",
    label: "Документы",
    icon: <DescriptionOutlinedIcon fontSize="small" />,
  },
  {
    to: "/admin/users",
    label: "Пользователи",
    icon: <PeopleAltOutlinedIcon fontSize="small" />,
  },
  {
    to: "/admin/stats",
    label: "Статистика",
    icon: <InsightsOutlinedIcon fontSize="small" />,
  },
  {
    to: "/admin/audit",
    label: "Журнал",
    icon: <HistoryRoundedIcon fontSize="small" />,
  },
  {
    to: "/admin/trash",
    label: "Корзина",
    icon: <DeleteOutlineIcon fontSize="small" />,
  },
];

const AdminSectionNav: React.FC = () => {
  const { token } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    getAdminSubmissions(token, "pending")
      .then((data) => {
        setPendingCount(data.items.length);
      })
      .catch(console.error);
  }, [token]);

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap aria-label="Разделы админки">
      {sections.map((section) => {
        const isModeration = section.to === "/admin/moderation";
        return (
          <Button
            key={section.to}
            component={NavLink}
            to={section.to}
            end
            variant="outlined"
            startIcon={
              isModeration ? (
                <Badge badgeContent={pendingCount} color="error">
                  {section.icon}
                </Badge>
              ) : (
                section.icon
              )
            }
            sx={{
              minHeight: 44,
              px: 2.2,
              borderRadius: 0,
              color: "text.secondary",
              fontWeight: 700,
              textTransform: "none",
              borderColor: (theme) => theme.palette.divider,
              backgroundColor: (theme) => theme.palette.background.paper,
              "&:hover": {
                borderColor: "primary.main",
                color: "text.primary",
                backgroundColor: (theme) => theme.palette.background.paper,
              },
              "&[aria-current='page']": {
                color: "primary.contrastText",
                borderColor: "primary.dark",
                backgroundColor: "primary.main",
              },
            }}
          >
            {section.label}
          </Button>
        );
      })}
    </Stack>
  );
};

export default AdminSectionNav;

